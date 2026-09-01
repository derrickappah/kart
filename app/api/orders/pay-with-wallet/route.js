import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { createNotifications } from '@/lib/notifications';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { productId, quantity = 1 } = body;

        if (!productId) {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
        }

        const adminSupabase = createServiceRoleClient();

        // 1. Fetch dynamic platform fees
        const { data: settings } = await adminSupabase
            .from('platform_settings')
            .select('key, value')
            .in('key', ['transaction_fee_percent', 'transaction_fee_fixed', 'marketplace_service_fee']);

        const getParam = (key, fallback) => {
            const setting = settings?.find(s => s.key === key);
            if (!setting) return fallback;
            return typeof setting.value === 'number' ? setting.value : parseFloat(setting.value);
        };

        const feePercent = getParam('transaction_fee_percent', 3);
        const feeFixed = getParam('transaction_fee_fixed', 1);
        const marketplaceFee = getParam('marketplace_service_fee', 0);

        // 2. Try Atomic Transaction via PostgreSQL RPC first
        const { data: rpcResult, error: rpcError } = await adminSupabase.rpc('execute_wallet_payment', {
            p_buyer_id: user.id,
            p_product_id: productId,
            p_quantity: quantity,
            p_fee_percent: feePercent,
            p_fee_fixed: feeFixed,
            p_marketplace_fee: marketplaceFee
        });

        if (!rpcError && rpcResult && rpcResult.success) {
            return NextResponse.json({
                success: true,
                orderId: rpcResult.order_id,
                message: 'Purchase completed successfully'
            });
        }

        if (rpcError && !rpcError.message?.includes('function public.execute_wallet_payment') && !rpcError.message?.includes('does not exist')) {
            return NextResponse.json({ error: rpcError.message }, { status: 400 });
        }

        // 3. Fallback: Sequential execution with atomic row validation
        const { data: product, error: productError } = await adminSupabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (productError || !product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        if (product.status !== 'Active' && product.status !== 'active') {
            return NextResponse.json({ error: 'Product is no longer available' }, { status: 400 });
        }

        if (product.seller_id === user.id) {
            return NextResponse.json({ error: 'You cannot buy your own product' }, { status: 400 });
        }

        const price = parseFloat(product.price);
        const subtotal = price * quantity;
        const totalAmount = subtotal + marketplaceFee;
        const percentageFee = (subtotal * feePercent) / 100;
        const sellerPayoutAmount = Math.max(0, subtotal - percentageFee - feeFixed);
        const platformFeeTotal = marketplaceFee + percentageFee + feeFixed;

        // Check buyer wallet
        const { data: buyerWallet, error: walletError } = await adminSupabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (walletError || !buyerWallet || parseFloat(buyerWallet.balance) < totalAmount) {
            return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
        }

        const currentBuyerBalance = parseFloat(buyerWallet.balance);
        const newBuyerBalance = currentBuyerBalance - totalAmount;

        // Atomically lock product status to Sold
        const { data: updatedProduct, error: prodUpdateError } = await adminSupabase
            .from('products')
            .update({ status: 'Sold', updated_at: new Date().toISOString() })
            .eq('id', productId)
            .in('status', ['Active', 'active'])
            .select('id')
            .maybeSingle();

        if (prodUpdateError || !updatedProduct) {
            return NextResponse.json({ error: 'Product is no longer available or was just sold' }, { status: 400 });
        }

        // Deduct buyer wallet
        const { error: deductError } = await adminSupabase
            .from('wallets')
            .update({
                balance: newBuyerBalance,
                updated_at: new Date().toISOString()
            })
            .eq('id', buyerWallet.id);

        if (deductError) {
            // Revert product status
            await adminSupabase.from('products').update({ status: 'Active' }).eq('id', productId);
            throw deductError;
        }

        // Create Order
        const { data: order, error: orderError } = await adminSupabase
            .from('orders')
            .insert({
                buyer_id: user.id,
                seller_id: product.seller_id,
                product_id: productId,
                quantity,
                unit_price: price,
                total_amount: totalAmount,
                platform_fee_percentage: feePercent,
                platform_fee_fixed: feeFixed + marketplaceFee,
                platform_fee_total: platformFeeTotal,
                seller_payout_amount: sellerPayoutAmount,
                status: 'Paid',
                escrow_status: 'Held',
                currency: 'GHS',
                payment_method: 'Wallet'
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // Update seller pending balance
        const { data: sellerWallet } = await adminSupabase
            .from('wallets')
            .select('*')
            .eq('user_id', product.seller_id)
            .maybeSingle();

        if (sellerWallet) {
            await adminSupabase
                .from('wallets')
                .update({
                    pending_balance: (parseFloat(sellerWallet.pending_balance) || 0) + sellerPayoutAmount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', sellerWallet.id);
        } else {
            await adminSupabase
                .from('wallets')
                .insert({
                    user_id: product.seller_id,
                    balance: 0,
                    pending_balance: sellerPayoutAmount,
                    currency: 'GHS'
                });
        }

        // Record Ledger
        await adminSupabase.from('wallet_transactions').insert([
            {
                wallet_id: buyerWallet.id,
                order_id: order.id,
                transaction_type: 'Debit',
                amount: totalAmount,
                balance_before: currentBuyerBalance,
                balance_after: newBuyerBalance,
                status: 'Completed',
                reference: order.id,
                description: 'Product Purchase',
                admin_notes: `Purchase of ${product.title}`,
            }
        ]);

        // Create Notifications & Trigger Push
        try {
            await createNotifications(adminSupabase, [
                {
                    userId: user.id,
                    type: 'PaymentReceived',
                    title: 'Purchase Successful',
                    message: `Your payment for "${product.title}" was successful. The funds are held in escrow.`,
                    relatedOrderId: order.id
                },
                {
                    userId: product.seller_id,
                    type: 'OrderPlaced',
                    title: 'Item Sold!',
                    message: `Your item "${product.title}" has been bought. Please coordinate with the buyer for handover.`,
                    relatedOrderId: order.id
                }
            ]);
        } catch (notifErr) {
            console.error('[PayWithWallet] Notification error:', notifErr);
        }

        // Status History
        await adminSupabase.from('order_status_history').insert({
            order_id: order.id,
            old_status: null,
            new_status: 'Paid',
            changed_by: user.id,
            notes: 'Order paid using KART Wallet'
        });

        return NextResponse.json({
            success: true,
            orderId: order.id,
            message: 'Purchase completed successfully'
        });

    } catch (error) {
        console.error('Wallet payment error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process payment' }, { status: 500 });
    }
}
