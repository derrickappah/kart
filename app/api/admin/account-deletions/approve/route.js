import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/account-deletions/approve
 * Body: { requestId, userId }
 * Approves an account deletion request, marks the account as inactive/banned,
 * disables login access, and archives listings without permanently deleting records.
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

        // Prevent modifying another admin
        const { data: targetProfile } = await adminSupabase
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .maybeSingle();

        if (targetProfile?.is_admin) {
            return NextResponse.json({ error: 'Cannot deactivate an admin account' }, { status: 403 });
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
            return NextResponse.json({ error: 'Failed to update request status' }, { status: 500 });
        }

        // 2. Mark profile as inactive / banned
        const { error: profileError } = await adminSupabase
            .from('profiles')
            .update({
                banned: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (profileError) {
            console.error('Error updating profile status:', profileError);
        }

        // 3. Archive user's active products / listings
        try {
            await adminSupabase
                .from('products')
                .update({ status: 'archived' })
                .eq('seller_id', userId);
        } catch (cleanupErr) {
            console.warn('Product archiving notice:', cleanupErr.message);
        }

        // 4. Disable login in Supabase Auth (ban session for 100 years)
        try {
            await adminSupabase.auth.admin.updateUserById(userId, {
                ban_duration: '876000h'
            });
        } catch (authError) {
            console.error('Failed to update auth ban status:', authError);
        }

        return NextResponse.json({
            success: true,
            message: 'Account marked as inactive/deleted and login access disabled.'
        });
    } catch (error) {
        console.error('Approve deletion error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process deletion approval' },
            { status: 500 }
        );
    }
}
