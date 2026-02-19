import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { productId } = body;

        if (!productId) {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
        }

        // 1. Fetch product and seller details
        let product;
        let productError;

        // Handle sample ID for dev testing
        if (productId === '021ec46d-43e5-4891-9439-2e59d53bbf28') {
            return NextResponse.json({
                success: true,
                orderId: 'sample-order-' + Date.now(),
                message: 'Purchase completed successfully (Demo Mode)'
            });
        } else {
            const result = await supabase
                .from('products')
                .select('*, seller:profiles!products_seller_id_profiles_fkey(id, email, display_name)')
                .eq('id', productId)
                .single();

            product = result.data;
            productError = result.error;

            // Try fallback relationship name if first one fails
            if (productError) {
                const retry = await supabase
                    .from('products')
                    .select('*, seller:profiles!products_seller_id_fkey(id, email, display_name)')
                    .eq('id', productId)
                    .single();
                product = retry.data;
                productError = retry.error;
            }
        }

        if (productError || !product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // 2. Check product availability
        if (product.status !== 'Active' && product.status !== 'active') {
            return NextResponse.json({ error: 'Product is no longer available' }, { status: 400 });
        }

        if (product.seller_id === user.id) {
            return NextResponse.json({ error: 'You cannot buy your own product' }, { status: 400 });
        }

        // 3. Calculate totals (using same logic as Paystack if possible)
        const price = parseFloat(product.price);

        // Use service role client to bypass RLS for administrative updates
        const adminSupabase = createServiceRoleClient();

        // Fetch dynamic fees from settings
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

        // Calculate platform fee
        const percentageFee = (price * feePercent) / 100;
        const platformFeeTotal = percentageFee + feeFixed + marketplaceFee;

        const totalAmount = price + platformFeeTotal;
        const sellerPayoutAmount = price; // In this flow, service fee is on top of price

        // 4. Check buyer wallet balance
        const { data: buyerWallet, error: walletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (walletError || !buyerWallet || parseFloat(buyerWallet.balance) < totalAmount) {
            return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
        }

        // 5. Perform transaction
        // A. Deduct balance from buyer (Using admin client for sequential consistency)
        const { error: deductError } = await adminSupabase
            .from('wallets')
            .update({
                balance: parseFloat(buyerWallet.balance) - totalAmount,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        if (deductError) throw deductError;

        // B. Create Order
        const { data: order, error: orderError } = await adminSupabase
            .from('orders')
            .insert({
                buyer_id: user.id,
                seller_id: product.seller_id,
                product_id: productId,
                quantity: 1,
                unit_price: price,
                total_amount: totalAmount,
                platform_fee_percentage: feePercent,
                platform_fee_fixed: feeFixed + marketplaceFee,
                platform_fee_total: platformFeeTotal,
                seller_payout_amount: sellerPayoutAmount,
                status: 'Paid',
                escrow_status: 'Held',
                currency: 'GHS'
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // C. Update Product Status to Sold
        const { error: productUpdateError } = await adminSupabase
            .from('products')
            .update({ status: 'Sold' })
            .eq('id', productId);

        if (productUpdateError) throw productUpdateError;

        // D. Update Seller Pending Balance
        const { data: sellerWallet } = await adminSupabase
            .from('wallets')
            .select('*')
            .eq('user_id', product.seller_id)
            .single();

        if (sellerWallet) {
            await adminSupabase
                .from('wallets')
                .update({
                    pending_balance: (parseFloat(sellerWallet.pending_balance) || 0) + sellerPayoutAmount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', sellerWallet.id);
        } else {
            // Create wallet for seller if it doesn't exist
            await adminSupabase
                .from('wallets')
                .insert({
                    user_id: product.seller_id,
                    balance: 0,
                    pending_balance: sellerPayoutAmount,
                    currency: 'GHS'
                });
        }

        // E. Record Transactions
        await adminSupabase.from('wallet_transactions').insert([
            {
                wallet_id: buyerWallet.id,
                order_id: order.id,
                transaction_type: 'Debit',
                amount: totalAmount,
                balance_before: parseFloat(buyerWallet.balance),
                balance_after: parseFloat(buyerWallet.balance) - totalAmount,
                status: 'Completed',
                reference: order.id,
                description: 'Product Purchase',
                admin_notes: `Purchase of ${product.title}`,
            }
        ]);

        // F. Create Notifications
        const notifications = [
            {
                user_id: user.id,
                type: 'PaymentReceived',
                title: 'Purchase Successful',
                message: `Your payment for "${product.title}" was successful. The funds are held in escrow.`,
                related_order_id: order.id
            },
            {
                user_id: product.seller_id,
                type: 'OrderPlaced',
                title: 'Item Sold!',
                message: `Your item "${product.title}" has been bought. Please coordinate with the buyer for handover.`,
                related_order_id: order.id
            }
        ];
        await adminSupabase.from('notifications').insert(notifications);

        // G. Record Status History
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
