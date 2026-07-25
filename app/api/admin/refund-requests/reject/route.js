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
        const { requestId, reason } = body;

        if (!requestId) {
            return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
        }

        const adminSupabase = createServiceRoleClient();

        // 1. Get refund request or fallback to order by ID
        let refundRequest = null;
        try {
            const { data: fetchedRequest } = await adminSupabase
                .from('refund_requests')
                .select('*')
                .eq('id', requestId)
                .maybeSingle();

            refundRequest = fetchedRequest;
        } catch (e) {
            console.warn('Notice: refund_requests fetch skipped:', e?.message || e);
        }

        if (!refundRequest) {
            const { data: order } = await adminSupabase
                .from('orders')
                .select('*')
                .eq('id', requestId)
                .maybeSingle();

            if (order) {
                refundRequest = {
                    id: order.id,
                    order_id: order.id,
                    buyer_id: order.buyer_id,
                    status: order.refund_status === 'Requested' ? 'Pending' : order.refund_status
                };
            }
        }

        if (!refundRequest) {
            return NextResponse.json({ error: 'Refund request or associated order not found' }, { status: 404 });
        }

        if (refundRequest.status !== 'Pending') {
            return NextResponse.json({ error: 'Request is already resolved' }, { status: 400 });
        }

        // 2. Update refund request status if table exists
        try {
            await adminSupabase
                .from('refund_requests')
                .update({
                    status: 'Rejected',
                    admin_notes: reason || 'Refund request rejected by admin.',
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId);
        } catch (e) {
            console.warn('Notice: refund_requests update skipped:', e?.message || e);
        }

        // 3. Update order refund_status
        await adminSupabase
            .from('orders')
            .update({ refund_status: 'Rejected' })
            .eq('id', refundRequest.order_id);

        // 4. Record history
        await adminSupabase.from('order_status_history').insert({
            order_id: refundRequest.order_id,
            old_status: 'Paid', // Assuming it was paid
            new_status: 'Paid', 
            changed_by: user.id,
            notes: `Refund request rejected by admin. Reason: ${reason || 'N/A'}`,
        });

        // 5. Notify buyer
        await adminSupabase.from('notifications').insert({
            user_id: refundRequest.buyer_id,
            type: 'RefundRejected',
            title: 'Refund Request Rejected',
            message: `Your refund request for order #${refundRequest.order_id.slice(0, 8)} was rejected. Reason: ${reason || 'N/A'}`,
            related_order_id: refundRequest.order_id,
        });

        return NextResponse.json({
            success: true,
            message: 'Refund request rejected successfully',
        });

    } catch (error) {
        console.error('Reject refund error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
