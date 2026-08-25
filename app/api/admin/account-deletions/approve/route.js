import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/account-deletions/approve
 * Body: { requestId, userId }
 * Approves an account deletion request and deletes the user account.
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
        const { requestId, userId } = body;

        if (!requestId || !userId) {
            return NextResponse.json({ error: 'Missing requestId or userId' }, { status: 400 });
        }

        const adminSupabase = createServiceRoleClient();

        // Prevent deleting another admin
        const { data: targetProfile } = await adminSupabase
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .maybeSingle();

        if (targetProfile?.is_admin) {
            return NextResponse.json({ error: 'Cannot delete an admin account' }, { status: 403 });
        }

        // 1. Update the deletion request status to approved
        const { error: updateError } = await adminSupabase
            .from('account_deletion_requests')
            .update({
                status: 'approved',
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);

        if (updateError) {
            console.error('Error updating deletion request status:', updateError);
        }

        // 2. Clean up user's active products / listings
        try {
            await adminSupabase
                .from('products')
                .update({ status: 'archived' })
                .eq('seller_id', userId);
        } catch (cleanupErr) {
            console.warn('Product cleanup notice:', cleanupErr.message);
        }

        // 3. Delete the auth user (this cascades to profile and other tables)
        const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(userId);

        if (authDeleteError) {
            console.error('Error deleting auth user:', authDeleteError);
            // If auth delete fails, at least ban the user
            await adminSupabase
                .from('profiles')
                .update({ banned: true })
                .eq('id', userId);

            return NextResponse.json({
                success: true,
                warning: 'User deactivated, but auth record could not be removed: ' + authDeleteError.message
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Account deletion approved and user purged successfully'
        });
    } catch (error) {
        console.error('Approve deletion error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to approve deletion request' },
            { status: 500 }
        );
    }
}
