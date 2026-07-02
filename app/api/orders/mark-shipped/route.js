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
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        // 1. Get order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // 2. Verify user is the seller
        if (order.seller_id !== user.id) {
            return NextResponse.json({ error: 'Only the seller can mark the item as shipped' }, { status: 403 });
        }

        // 3. Verify order status is Paid (case-insensitive check)
        const orderStatus = order.status ? order.status.toLowerCase() : '';
        if (orderStatus !== 'paid') {
            return NextResponse.json(
                { error: `Order status must be Paid to mark as shipped. Current status: ${order.status}` },
                { status: 400 }
            );
        }

        // 4. Use service role client to update status to Shipped
        const adminSupabase = createServiceRoleClient();
        const { error: updateError } = await adminSupabase
            .from('orders')
            .update({
                status: 'Shipped',
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (updateError) {
            console.error('Error updating status to Shipped:', updateError);
            return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
        }

        // 5. Create status history record
        await adminSupabase.from('order_status_history').insert({
            order_id: orderId,
            old_status: order.status,
            new_status: 'Shipped',
            changed_by: user.id,
            notes: 'Order marked as shipped by seller'
        });

        // 6. Create notification for buyer
        await adminSupabase.from('notifications').insert({
            user_id: order.buyer_id,
            type: 'ItemShipped',
            title: 'Order Shipped',
            message: `The seller has marked your order #${orderId.slice(0, 8)} as shipped.`,
            related_order_id: orderId
        });

        return NextResponse.json({
            success: true,
            message: 'Order marked as shipped successfully'
        });
    } catch (error) {
        console.error('Mark as shipped error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
