import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { otp } = body;

        if (!otp || typeof otp !== 'string') {
            return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
        }

        const adminSupabase = createServiceRoleClient();

        // Fetch the verification session for the user
        const { data: verification, error: fetchError } = await adminSupabase
            .from('phone_verifications')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (fetchError) {
            console.error('Error querying phone_verifications table:', fetchError);
            return NextResponse.json({
                error: fetchError.message || 'Database error occurred'
            }, { status: 500 });
        }

        if (!verification) {
            return NextResponse.json({
                error: 'No active verification session found. Please request a new verification code.'
            }, { status: 400 });
        }

        const MAX_ATTEMPTS = 5;

        // If user already exceeded attempts, delete record and block
        if ((verification.attempts || 0) >= MAX_ATTEMPTS) {
            await adminSupabase
                .from('phone_verifications')
                .delete()
                .eq('id', verification.id);

            return NextResponse.json({
                error: 'Too many incorrect attempts. Please request a new verification code.'
            }, { status: 429 });
        }

        // Validate the OTP
        if (verification.otp !== otp.trim()) {
            const nextAttempts = (verification.attempts || 0) + 1;

            if (nextAttempts >= MAX_ATTEMPTS) {
                // Delete verification record on final failure
                await adminSupabase
                    .from('phone_verifications')
                    .delete()
                    .eq('id', verification.id);

                return NextResponse.json({
                    error: 'Too many incorrect attempts. Please request a new verification code.'
                }, { status: 429 });
            }

            // Increment attempts counter
            await adminSupabase
                .from('phone_verifications')
                .update({ attempts: nextAttempts })
                .eq('id', verification.id);

            const remaining = MAX_ATTEMPTS - nextAttempts;
            return NextResponse.json({
                error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            }, { status: 400 });
        }

        // Check if expired
        if (new Date(verification.expires_at) < new Date()) {
            await adminSupabase
                .from('phone_verifications')
                .delete()
                .eq('id', verification.id);

            return NextResponse.json({
                error: 'Verification code has expired. Please request a new one.'
            }, { status: 400 });
        }

        // Update profile with new verified phone number
        const { error: profileError } = await adminSupabase
            .from('profiles')
            .update({
                phone: verification.phone,
                phone_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (profileError) {
            console.error('Error updating profile with verified phone:', profileError);
            return NextResponse.json({
                error: profileError.message || 'Failed to update user profile'
            }, { status: 500 });
        }

        // Delete the verification record
        await adminSupabase
            .from('phone_verifications')
            .delete()
            .eq('id', verification.id);

        return NextResponse.json({
            success: true,
            message: 'Phone number verified and updated successfully',
            phone: verification.phone
        });

    } catch (error) {
        console.error('Verify phone fatal error:', error);
        return NextResponse.json({
            error: error?.message || 'Internal server error'
        }, { status: 500 });
    }
}
