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
        const { otp } = body;

        if (!otp) {
            return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
        }

        const adminSupabase = createServiceRoleClient();

        // Check if OTP exists and is valid
        const { data: verification, error: fetchError } = await adminSupabase
            .from('email_verifications')
            .select('*')
            .eq('user_id', user.id)
            .eq('otp', otp)
            .single();

        if (fetchError || !verification) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // Check if expired
        if (new Date(verification.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Verification code has expired' }, { status: 400 });
        }

        // Mark email as verified in profiles
        const { error: profileError } = await adminSupabase
            .from('profiles')
            .update({ email_verified: true })
            .eq('id', user.id);

        if (profileError) {
            console.error('Error updating profile:', profileError);
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }

        // Delete the verification record
        await adminSupabase
            .from('email_verifications')
            .delete()
            .eq('id', verification.id);

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully'
        });

    } catch (error) {
        console.error('Verify email error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
