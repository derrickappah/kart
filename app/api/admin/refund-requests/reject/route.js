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

        // 1. Get refund request
        const { data: refundRequest, error: fetchError } = await adminSupabase
            .from('refund_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (fetchError || !refundRequest) {
            return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
        }

        if (refundRequest.status !== 'Pending') {
            return NextResponse.json({ error: 'Request is already resolved' }, { status: 400 });
        }

        // 2. Update refund request status
        const { error: updateRequestError } = await adminSupabase
            .from('refund_requests')
            .update({
                status: 'Rejected',
                admin_notes: reason || 'Refund request rejected by admin.',
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);

        if (updateRequestError) {
            return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
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
