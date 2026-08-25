import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/account-deletions/reject
 * Body: { requestId, reason }
 * Rejects an account deletion request and notifies the user.
 */
export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Server-side admin check
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { requestId, rejectionReason } = body;

        if (!requestId) {
            return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
        }

        const adminSupabase = createServiceRoleClient();

        // 1. Fetch the deletion request to know the user_id
        const { data: deletionReq, error: fetchError } = await adminSupabase
            .from('account_deletion_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (fetchError || !deletionReq) {
            return NextResponse.json({ error: 'Deletion request not found' }, { status: 404 });
        }

        // 2. Update status to rejected
        const { error: updateError } = await adminSupabase
            .from('account_deletion_requests')
            .update({
                status: 'rejected',
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);

        if (updateError) {
            console.error('Error updating deletion request status:', updateError);
            return NextResponse.json({ error: 'Failed to update request status' }, { status: 500 });
        }

        // 3. Notify the user
        try {
            await adminSupabase.from('notifications').insert({
                user_id: deletionReq.user_id,
                type: 'AccountDeletionRejected',
                title: 'Account Deletion Request Rejected',
                message: rejectionReason?.trim()
                    ? `Your account deletion request was rejected. Reason: ${rejectionReason.trim()}`
                    : 'Your account deletion request was rejected. Please contact support if you need assistance.',
            });
        } catch (notifErr) {
            console.warn('Could not create rejection notification:', notifErr.message);
        }

        return NextResponse.json({
            success: true,
            message: 'Account deletion request rejected successfully'
        });
    } catch (error) {
        console.error('Reject deletion error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to reject deletion request' },
            { status: 500 }
        );
    }
}
