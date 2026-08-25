import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { sendMoolreSMS, normalizePhoneNumber } from '@/lib/moolre';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const rawPhone = body.phone;

        if (!rawPhone || typeof rawPhone !== 'string') {
            return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
        }

        const cleanPhone = normalizePhoneNumber(rawPhone);
        if (cleanPhone.length < 9 || cleanPhone.length > 15) {
            return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 });
        }

        // Generate cryptographically secure 5-digit OTP (CSPRNG)
        const otp = crypto.randomInt(10000, 99999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

        const adminSupabase = createServiceRoleClient();

        // Rate Limiting Check: Check if user has requested an OTP in the last 60 seconds
        const { data: existingVerification, error: checkError } = await adminSupabase
            .from('phone_verifications')
            .select('created_at')
            .eq('user_id', user.id)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error querying phone_verifications table:', checkError);
            if (checkError.message?.includes('does not exist')) {
                return NextResponse.json({
                    error: 'Database table "phone_verifications" does not exist. Please execute the SQL migration in Supabase.'
                }, { status: 500 });
            }
        }

        if (existingVerification) {
            const timeElapsed = Date.now() - new Date(existingVerification.created_at).getTime();
            const cooldownMs = 60 * 1000;
            if (timeElapsed < cooldownMs) {
                const secondsLeft = Math.ceil((cooldownMs - timeElapsed) / 1000);
                return NextResponse.json({
                    error: `Please wait ${secondsLeft} seconds before requesting a new code.`
                }, { status: 429 });
            }
        }

        // Remove any existing pending OTPs for this user
        await adminSupabase
            .from('phone_verifications')
            .delete()
            .eq('user_id', user.id);

        // Store new OTP session
        const { error: insertError } = await adminSupabase
            .from('phone_verifications')
            .insert({
                user_id: user.id,
                phone: rawPhone,
                otp: otp,
                attempts: 0,
                expires_at: expiresAt
            });

        if (insertError) {
            console.error('Error storing phone OTP in database:', insertError);
            return NextResponse.json({
                error: insertError.message || 'Failed to generate verification code'
            }, { status: 500 });
        }

        // Dispatch SMS via Moolre SMS Gateway
        try {
            const smsMessage = `Your Kart verification code is ${otp}. Valid for 10 minutes.`;
            await sendMoolreSMS({
                recipient: rawPhone,
                message: smsMessage,
            });
        } catch (smsError) {
            console.error('Moolre SMS sending failed:', smsError);

            // Clean up the created OTP session so rate-limiting doesn't lock the user out after a delivery failure
            await adminSupabase
                .from('phone_verifications')
                .delete()
                .eq('user_id', user.id)
                .catch(() => null);

            const errorMessage = smsError?.message || 'Failed to deliver SMS. Please check the phone number and try again.';

            if (process.env.NODE_ENV === 'development') {
                return NextResponse.json({
                    error: `SMS Error: ${errorMessage}`,
                    otp: otp
                }, { status: 200 });
            }

            return NextResponse.json({
                error: errorMessage
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: 'Verification code sent successfully to your phone',
            ...(process.env.NODE_ENV === 'development' ? { otp } : {})
        });

    } catch (error) {
        console.error('Send phone OTP fatal error:', error);
        return NextResponse.json({
            error: error?.message || 'Internal server error'
        }, { status: 500 });
    }
}
