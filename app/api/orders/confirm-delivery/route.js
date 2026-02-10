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
        const { orderId } = body;

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

        // Verify user is the buyer
        if (order.buyer_id !== user.id) {
            return NextResponse.json({ error: 'Only the buyer can confirm delivery' }, { status: 403 });
        }

        // Check if order is paid
        if (order.status !== 'Paid' && order.status !== 'Shipped') {
            return NextResponse.json(
                { error: `Order must be Paid or Shipped to confirm delivery. Current status: ${order.status}` },
                { status: 400 }
            );
        }

        // Update order status to Delivered
        const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({
                status: 'Delivered',
                updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

        if (orderUpdateError) {
            console.error('Error updating order status:', orderUpdateError);
            return NextResponse.json(
                { error: 'Failed to update order status' },
                { status: 500 }
            );
        }

        // Record status change in history
        const { error: historyError } = await supabase
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
            // Non-critical error - continue execution
        }

        // Create notification for seller
        const { error: notificationError } = await supabase
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
            // Non-critical error - continue execution
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
