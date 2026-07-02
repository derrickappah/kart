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
        const { orderId, verificationCode } = body;

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        if (!verificationCode) {
            return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
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

        // Verify user is the buyer
        if (order.buyer_id !== user.id) {
            return NextResponse.json({ error: 'Only the buyer can confirm delivery' }, { status: 403 });
        }

        // Verify OTP
        if (!order.delivery_verification_otp || order.delivery_verification_otp !== verificationCode) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // Check if OTP is expired
        if (new Date(order.delivery_verification_expires_at) < new Date()) {
            return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
        }

        // Check if order is paid
        if (order.status !== 'Paid' && order.status !== 'Shipped') {
            return NextResponse.json(
                { error: `Order must be Paid or Shipped to confirm delivery. Current status: ${order.status}` },
                { status: 400 }
            );
        }

        // Use service role client for updates to bypass RLS
        const adminSupabase = createServiceRoleClient();

        // Update order status to Delivered and escrow to Released
        const { error: orderUpdateError } = await adminSupabase
            .from('orders')
            .update({
                status: 'Delivered',
                escrow_status: 'Released',
                escrow_released_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                delivery_verification_otp: null,
                delivery_verification_expires_at: null,
            })
            .eq('id', order.id);

        if (orderUpdateError) {
            console.error('Error updating order status:', orderUpdateError);
            return NextResponse.json(
                { error: 'Failed to update order status: ' + orderUpdateError.message },
                { status: 500 }
            );
        }

        // Release escrow funds to seller wallet automatically
        try {
            let { data: wallet, error: walletFetchError } = await adminSupabase
                .from('wallets')
                .select('*')
                .eq('user_id', order.seller_id)
                .single();

            if (walletFetchError && walletFetchError.code !== 'PGRST116') {
                console.error('Error fetching seller wallet:', walletFetchError);
            } else {
                if (!wallet) {
                    const { data: newWallet, error: walletCreateError } = await adminSupabase
                        .from('wallets')
                        .insert({
                            user_id: order.seller_id,
                            balance: 0,
                            pending_balance: 0,
                            currency: 'GHS',
                        })
                        .select()
                        .single();

                    if (walletCreateError) {
                        console.error('Error creating seller wallet:', walletCreateError);
                    } else {
                        wallet = newWallet;
                    }
                }

                if (wallet) {
                    const payoutAmount = parseFloat(order.seller_payout_amount);
                    const currentBalance = parseFloat(wallet.balance || 0);
                    const currentPending = parseFloat(wallet.pending_balance || 0);
                    const newBalance = currentBalance + payoutAmount;
                    const newPending = Math.max(0, currentPending - payoutAmount);

                    const { error: walletUpdateError } = await adminSupabase
                        .from('wallets')
                        .update({
                            balance: newBalance,
                            pending_balance: newPending,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', wallet.id);

                    if (walletUpdateError) {
                        console.error('Error updating seller wallet balance:', walletUpdateError);
                    } else {
                        // Create wallet transaction using admin client
                        await adminSupabase.from('wallet_transactions').insert({
                            wallet_id: wallet.id,
                            order_id: order.id,
                            transaction_type: 'Credit',
                            amount: payoutAmount,
                            balance_before: currentBalance,
                            balance_after: newBalance,
                            status: 'Completed',
                            reference: order.id,
                            description: 'Escrow Released',
                            admin_notes: 'Escrow released automatically upon delivery confirmation',
                        });

                        // Create notification for seller
                        await adminSupabase.from('notifications').insert({
                            user_id: order.seller_id,
                            type: 'EscrowReleased',
                            title: 'Escrow Released',
                            message: `GHS ${payoutAmount.toFixed(2)} has been released to your wallet for order #${order.id.slice(0, 8)}.`,
                            related_order_id: order.id,
                        });
                    }
                }
            }
        } catch (escrowError) {
            console.error('Escrow release process error:', escrowError);
        }

        // Record status change in history
        const { error: historyError } = await adminSupabase
            .from('order_status_history')
            .insert({
                order_id: order.id,
                old_status: order.status,
                new_status: 'Delivered',
                changed_by: user.id,
                notes: 'Delivery confirmed by buyer',
            });

        if (historyError) {
            console.error('Error recording order status history:', historyError);
        }

        // Create notification for seller
        const { error: notificationError } = await adminSupabase
            .from('notifications')
            .insert({
                user_id: order.seller_id,
                type: 'DeliveryConfirmed',
                title: 'Delivery Confirmed',
                message: `The buyer has confirmed delivery for order #${order.id.slice(0, 8)}.`,
                related_order_id: order.id,
            });

        if (notificationError) {
            console.error('Error creating notification:', notificationError);
        }

        return NextResponse.json({
            success: true,
            message: 'Delivery confirmed successfully',
        });
    } catch (error) {
        console.error('Confirm delivery error:', error);
        return NextResponse.json(
            {
                error: error.message || 'Failed to confirm delivery',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}
