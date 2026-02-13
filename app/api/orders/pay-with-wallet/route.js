import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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
        const serviceFee = 1.50; // Matching CheckoutClient.js fixed fee
        const totalAmount = price + serviceFee;
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

        // 5. Perform transaction (using Supabase transaction would be better, but we'll do sequential updates)
        // In a production app, this should be a stored procedure or use a service role for atomic operations

        // A. Deduct balance from buyer
        const { error: deductError } = await supabase
            .from('wallets')
            .update({
                balance: parseFloat(buyerWallet.balance) - totalAmount,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        if (deductError) throw deductError;

        // B. Create Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                buyer_id: user.id,
                seller_id: product.seller_id,
                product_id: productId,
                quantity: 1,
                unit_price: price,
                total_amount: totalAmount,
                platform_fee_total: serviceFee,
                seller_payout_amount: sellerPayoutAmount,
                status: 'Paid',
                escrow_status: 'Held',
                currency: 'GHS'
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // C. Update Product Status to Sold
        const { error: productUpdateError } = await supabase
            .from('products')
            .update({ status: 'Sold' })
            .eq('id', productId);

        if (productUpdateError) throw productUpdateError;

        // D. Update Seller Pending Balance
        const { data: sellerWallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', product.seller_id)
            .single();

        if (sellerWallet) {
            await supabase
                .from('wallets')
                .update({
                    pending_balance: (parseFloat(sellerWallet.pending_balance) || 0) + sellerPayoutAmount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', sellerWallet.id);
        } else {
            // Create wallet for seller if it doesn't exist
            await supabase
                .from('wallets')
                .insert({
                    user_id: product.seller_id,
                    balance: 0,
                    pending_balance: sellerPayoutAmount,
                    currency: 'GHS'
                });
        }

        // E. Record Transactions
        await supabase.from('wallet_transactions').insert([
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
        await supabase.from('notifications').insert(notifications);

        // G. Record Status History
        await supabase.from('order_status_history').insert({
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
