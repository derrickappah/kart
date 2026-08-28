import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { Resend } from 'resend';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const apiKey = process.env.RESEND_API_KEY;
        const resend = apiKey ? new Resend(apiKey) : null;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Generate cryptographically secure 5-digit OTP (CSPRNG)
        const otp = crypto.randomInt(10000, 99999).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes expiry

        const adminSupabase = createServiceRoleClient();

        // Rate Limiting Check: Check if user has requested an OTP in the last 60 seconds
        const { data: existingVerification } = await adminSupabase
            .from('email_verifications')
            .select('created_at')
            .eq('user_id', user.id)
            .maybeSingle();

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

        // Remove any existing OTPs for this user
        await adminSupabase
            .from('email_verifications')
            .delete()
            .eq('user_id', user.id);

        // Store new OTP
        const { error: insertError } = await adminSupabase
            .from('email_verifications')
            .insert({
                user_id: user.id,
                email: user.email,
                otp: otp,
                expires_at: expiresAt
            });

        if (insertError) {
            console.error('Error storing OTP:', insertError);
            return NextResponse.json({ error: 'Failed to generate verification code' }, { status: 500 });
        }

        // Send Email via Resend
        if (resend) {
            console.log('Attempting to send verification email to:', user.email);
            try {
                const { data, error: emailError } = await resend.emails.send({
                    from: 'Kart <noreply@kart.cx>',
                    to: [user.email],
                    subject: 'Verify your email - Kart',
                    html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px;">
                            <p style="color: #333; font-size: 15px; margin: 0 0 16px;">Hi there,</p>
                            <p style="color: #333; font-size: 15px; margin: 0 0 16px;">Here's your verification code for Kart:</p>
                            <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 6px;">
                                <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111;">${otp}</span>
                            </div>
                            <p style="color: #555; font-size: 14px; margin: 0 0 8px;">This code expires in 15 minutes.</p>
                            <p style="color: #888; font-size: 13px; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
                            <p style="color: #aaa; font-size: 12px; margin: 32px 0 0; border-top: 1px solid #eee; padding-top: 16px;">Kart</p>
                        </div>
                    `,
                });

                if (emailError) {
                    console.error('Resend API Error:', emailError);
                    if (process.env.NODE_ENV === 'development') {
                        return NextResponse.json({
                            error: 'Resend Error: ' + emailError.message,
                            details: emailError
                        }, { status: 400 });
                    }
                } else {
                    console.log('Email sent successfully:', data);
                }
            } catch (err) {
                console.error('Failed to send email:', err);
                if (process.env.NODE_ENV === 'development') {
                    return NextResponse.json({ 
                        error: 'Mail Client Error: ' + err.message
                    }, { status: 500 });
                }
            }
        } else {
            console.warn('Resend instance is null. Check RESEND_API_KEY environment variable.');
            if (process.env.NODE_ENV === 'development') {
                return NextResponse.json({ 
                    error: 'RESEND_API_KEY is missing. Please configure your email service provider.'
                }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Verification code sent to your email'
        });

    } catch (error) {
        console.error('Send verification OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
