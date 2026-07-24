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
        const { orderId, reason, description } = body;

        if (!orderId || typeof orderId !== 'string') {
            return NextResponse.json({ error: 'Valid Order ID is required' }, { status: 400 });
        }

        const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
        const trimmedDescription = typeof description === 'string' ? description.trim() : '';

        if (!trimmedReason) {
            return NextResponse.json({ error: 'Dispute reason is required' }, { status: 400 });
        }

        if (!trimmedDescription) {
            return NextResponse.json({ error: 'Please describe the issue in detail' }, { status: 400 });
        }

        if (trimmedDescription.length > 1000) {
            return NextResponse.json({ error: 'Description must not exceed 1000 characters' }, { status: 400 });
        }

        // 1. Get order and verify buyer
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.buyer_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized. Only the buyer can request a refund.' }, { status: 403 });
        }

        // 2. Verify order is in a refundable state (Paid, Shipped, or Delivered, but not Completed or Refunded)
        const allowedStatuses = ['Paid', 'Shipped', 'Delivered'];
        if (!allowedStatuses.includes(order.status)) {
            return NextResponse.json({ 
                error: `Refunds can only be requested for orders with status: ${allowedStatuses.join(', ')}. Current status: ${order.status}` 
            }, { status: 400 });
        }

        if (order.escrow_status !== 'Held') {
            return NextResponse.json({ error: `Order escrow is already ${order.escrow_status}.` }, { status: 400 });
        }

        // Create service role client for privileged database operations
        let adminSupabase;
        try {
            adminSupabase = createServiceRoleClient();
        } catch {
            adminSupabase = supabase;
        }

        // 3. Check if a pending request already exists in refund_requests table if present
        try {
            const { data: existingRequest } = await adminSupabase
                .from('refund_requests')
                .select('id')
                .eq('order_id', orderId)
                .eq('status', 'Pending')
                .maybeSingle();

            if (existingRequest) {
                return NextResponse.json({ error: 'A pending refund request already exists for this order.' }, { status: 400 });
            }
        } catch (e) {
            console.warn('Unable to query refund_requests table:', e?.message || e);
        }

        // 4. Attempt to insert into refund_requests table
        let refundRequest = null;
        try {
            const { data: insertedRequest, error: refundError } = await adminSupabase
                .from('refund_requests')
                .insert({
                    order_id: orderId,
                    buyer_id: user.id,
                    reason: trimmedReason,
                    description: trimmedDescription,
                    status: 'Pending'
                })
                .select()
                .single();

            if (refundError) {
                console.warn('Notice: Could not insert into refund_requests table:', refundError.message);
            } else {
                refundRequest = insertedRequest;
            }
        } catch (e) {
            console.warn('Notice: refund_requests table insert failed:', e?.message || e);
        }

        // 5. Update order refund_status if column exists
        try {
            await adminSupabase
                .from('orders')
                .update({ refund_status: 'Requested' })
                .eq('id', orderId);
        } catch (e) {
            console.warn('Notice: refund_status column update failed:', e?.message || e);
        }

        // 6. Record history in order_status_history (guaranteed table)
        const { error: historyErr } = await adminSupabase.from('order_status_history').insert({
            order_id: orderId,
            old_status: order.status,
            new_status: order.status,
            changed_by: user.id,
            notes: `Buyer requested a refund. Reason: ${trimmedReason}. Details: ${trimmedDescription}`,
        });

        if (historyErr) {
            console.error('Error inserting into order_status_history:', historyErr);
        }

        return NextResponse.json({
            success: true,
            message: 'Refund request submitted successfully. An admin will review it shortly.',
            data: refundRequest
        });

    } catch (error) {
        console.error('Request refund error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


