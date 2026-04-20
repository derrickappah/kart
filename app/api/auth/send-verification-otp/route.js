import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { Resend } from 'resend';

export async function POST(request) {
    try {
        const apiKey = process.env.RESEND_API_KEY;
        const resend = apiKey ? new Resend(apiKey) : null;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Generate 5-digit OTP
        const otp = Math.floor(10000 + Math.random() * 90000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes expiry

        const adminSupabase = createServiceRoleClient();

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
                    from: 'Kart <onboarding@resend.dev>',
                    to: [user.email],
                    subject: 'Verify your email - Kart',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                            <h2 style="color: #1daddd; font-size: 24px; font-weight: 800; text-transform: uppercase;">Verify Your Email</h2>
                            <p style="color: #666; font-size: 16px;">Hello,</p>
                            <p style="color: #666; font-size: 16px;">Please use the following 5-digit code to verify your email address on Kart:</p>
                            <div style="background: #f6f7f8; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
                                <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0e181b;">${otp}</span>
                            </div>
                            <p style="color: #999; font-size: 12px;">This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                            <p style="color: #999; font-size: 10px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">&copy; ${new Date().getFullYear()} Kart Marketplace</p>
                        </div>
                    `,
                });

                if (emailError) {
                    console.error('Resend API Error:', emailError);
                    if (process.env.NODE_ENV === 'development') {
                        return NextResponse.json({
                            error: 'Resend Error: ' + emailError.message,
                            details: emailError,
                            otp: otp // Still return OTP for testing if email fails
                        }, { status: 400 });
                    }
                } else {
                    console.log('Email sent successfully:', data);
                }
            } catch (err) {
                console.error('Failed to send email:', err);
                if (process.env.NODE_ENV === 'development') {
                    return NextResponse.json({ 
                        error: 'Mail Client Error: ' + err.message,
                        otp: otp // Still return OTP for testing if email fails
                    }, { status: 500 });
                }
            }
        } else {
            console.warn('Resend instance is null. Check RESEND_API_KEY environment variable.');
            if (process.env.NODE_ENV === 'development') {
                return NextResponse.json({ 
                    error: 'RESEND_API_KEY is missing. Code generated for testing.',
                    otp: otp 
                }, { status: 200 });
            }
        }

        return NextResponse.json({
            success: true,
            // Only return OTP in development for testing convenience
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });

    } catch (error) {
        console.error('Send verification OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
