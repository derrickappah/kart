import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile || !profile.is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { verificationId, adminNotes } = body;

        if (!verificationId) {
            return NextResponse.json({ error: 'Verification ID is required' }, { status: 400 });
        }

        if (!adminNotes || !adminNotes.trim()) {
            return NextResponse.json({ error: 'Admin notes are required' }, { status: 400 });
        }

        // Get verification request
        const { data: verification, error: verError } = await supabase
            .from('verification_requests')
            .select('*, user_id')
            .eq('id', verificationId)
            .single();

        if (verError || !verification) {
            return NextResponse.json({ error: 'Verification request not found' }, { status: 404 });
        }

        // Update verification request status
        const { error: updateError } = await supabase
            .from('verification_requests')
            .update({
                status: 'Rejected',
                admin_notes: adminNotes.trim(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', verificationId);

        if (updateError) {
            console.error('Error updating verification request:', updateError);
            return NextResponse.json({ error: 'Failed to update verification request' }, { status: 500 });
        }

        // Update user's profile verification status
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                verification_status: 'Rejected',
            })
            .eq('id', verification.user_id);

        if (profileError) {
            console.error('Error updating profile:', profileError);
            // Don't fail the request, but log the error
        }

        // Create notification for user
        await supabase.from('notifications').insert({
            user_id: verification.user_id,
            type: 'VerificationRejected',
            title: 'Verification Rejected',
            message: `Your verification request was rejected. Reason: ${adminNotes.trim()}`,
        });

        return NextResponse.json({ success: true, message: 'Verification rejected successfully' });
    } catch (error) {
        console.error('Error rejecting verification:', error);
        return NextResponse.json(
            { error: error.message || 'Server error' },
            { status: 500 }
        );
    }
}
