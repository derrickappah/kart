import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile || !profile.is_admin) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { orderId, reason } = body;

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        // Get order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.escrow_status !== 'Held') {
            return NextResponse.json(
                { error: `Order escrow status is ${order.escrow_status}, not Held. Only 'Held' orders can be refunded.` },
                { status: 400 }
            );
        }

        // Use service role client for wallet operations
        let adminSupabase;
        try {
            adminSupabase = createServiceRoleClient();
        } catch (serviceRoleError) {
            console.error('Service role client not available, falling back to regular client:', serviceRoleError);
            adminSupabase = supabase;
        }

        // Get or create buyer wallet
        let { data: wallet, error: walletFetchError } = await adminSupabase
            .from('wallets')
            .select('*')
            .eq('user_id', order.buyer_id)
            .single();

        if (walletFetchError && walletFetchError.code !== 'PGRST116') {
            console.error('Error fetching wallet:', walletFetchError);
            return NextResponse.json({ error: 'Failed to fetch buyer wallet' }, { status: 500 });
        }

        if (!wallet) {
            const { data: newWallet, error: walletCreateError } = await adminSupabase
                .from('wallets')
                .insert({
                    user_id: order.buyer_id,
                    balance: 0,
                    pending_balance: 0,
                    currency: 'GHS',
                })
                .select()
                .single();

            if (walletCreateError || !newWallet) {
                return NextResponse.json({ error: 'Failed to create buyer wallet' }, { status: 500 });
            }
            wallet = newWallet;
        }

        const refundAmount = parseFloat(order.total_amount);
        const currentBalance = parseFloat(wallet.balance || 0);
        const newBalance = currentBalance + refundAmount;

        // 1. Credit buyer's wallet
        const { error: walletUpdateError } = await adminSupabase
            .from('wallets')
            .update({
                balance: newBalance,
                updated_at: new Date().toISOString(),
            })
            .eq('id', wallet.id);

        if (walletUpdateError) {
            console.error('Error updating wallet:', walletUpdateError);
            return NextResponse.json({ error: 'Failed to credit buyer wallet' }, { status: 500 });
        }

        // 2. Record wallet transaction
        const { error: transactionError } = await adminSupabase
            .from('wallet_transactions')
            .insert({
                wallet_id: wallet.id,
                order_id: order.id,
                transaction_type: 'Credit',
                amount: refundAmount,
                balance_before: currentBalance,
                balance_after: newBalance,
                status: 'Completed',
                reference: `refund_${order.id}`,
                description: 'Order Refund',
                admin_notes: `Order #${order.id.slice(0, 8)} refunded by admin. Reason: ${reason || 'N/A'}`,
            });

        if (transactionError) {
            console.error('Error recording transaction:', transactionError);
            // Non-critical if wallet was updated, but still worth noting
        }

        // 3. Update order status
        const { error: orderUpdateError } = await adminSupabase
            .from('orders')
            .update({
                status: 'Refunded',
                escrow_status: 'Refunded',
                updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

        if (orderUpdateError) {
            console.error('Error updating order:', orderUpdateError);
            return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
        }

        // 4. Record history
        await adminSupabase.from('order_status_history').insert({
            order_id: order.id,
            old_status: order.status,
            new_status: 'Refunded',
            changed_by: user.id,
            notes: `Order refunded by admin. Reason: ${reason || 'Manual refund'}`,
        });

        // 5. Notify buyer
        await adminSupabase.from('notifications').insert({
            user_id: order.buyer_id,
            type: 'Refunded',
            title: 'Order Refunded',
            message: `Your payment of GH₵ ${refundAmount.toFixed(2)} for order #${order.id.slice(0, 8)} has been refunded to your wallet.`,
            related_order_id: order.id,
        });

        return NextResponse.json({
            success: true,
            message: 'Order refunded successfully',
        });
    } catch (error) {
        console.error('Refund error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to process refund',
            details: error.code || undefined
        }, { status: 500 });
    }
}
