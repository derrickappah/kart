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

        const body = await request.json();
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        // Get order and buyer profile
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                buyer:profiles!orders_buyer_id_profiles_fkey(email, display_name)
            `)
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Verify user is the buyer
        if (order.buyer_id !== user.id) {
            return NextResponse.json({ error: 'Only the buyer can request a verification code' }, { status: 403 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

        // Use service role client for update
        const adminSupabase = createServiceRoleClient();
        const { error: updateError } = await adminSupabase
            .from('orders')
            .update({
                delivery_verification_otp: otp,
                delivery_verification_expires_at: expiresAt
            })
            .eq('id', orderId);

        if (updateError) {
            console.error('Error updating OTP:', updateError);
            return NextResponse.json({ error: 'Failed to generate verification code' }, { status: 500 });
        }

        // Send Email via Resend
        if (resend) {
            console.log('Attempting to send OTP email to:', order.buyer.email);
            try {
                const { data, error: emailError } = await resend.emails.send({
                    // Use onboarding@resend.dev if kart.com isn't verified yet
                    from: 'Kart <onboarding@resend.dev>',
                    to: [order.buyer.email],
                    subject: 'Verify your order delivery - Kart',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 12px;">
                            <h2 style="color: #1daddd; font-size: 24px; font-weight: 800; text-transform: uppercase;">Verify Delivery</h2>
                            <p style="color: #666; font-size: 16px;">Hello,</p>
                            <p style="color: #666; font-size: 16px;">Please use the following 6-digit code to verify your delivery for order <strong>#${order.id.slice(0, 8)}</strong>:</p>
                            <div style="background: #f6f7f8; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
                                <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0e181b;">${otp}</span>
                            </div>
                            <p style="color: #999; font-size: 12px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                            <p style="color: #999; font-size: 10px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">&copy; ${new Date().getFullYear()} Kart Marketplace</p>
                        </div>
                    `,
                });

                if (emailError) {
                    console.error('Resend API Error:', emailError);
                    // Return specific Resend errors in development to help debug
                    if (process.env.NODE_ENV === 'development') {
                        return NextResponse.json({
                            error: 'Resend Error: ' + emailError.message,
                            details: emailError
                        }, { status: 400 });
                    }
                    // Continue anyway in development if key is 're_...' mock or something
                } else {
                    console.log('Email sent successfully:', data);
                }
            } catch (err) {
                console.error('Failed to send email:', err);
                if (process.env.NODE_ENV === 'development') {
                    return NextResponse.json({ error: 'Mail Client Error: ' + err.message }, { status: 500 });
                }
            }
        } else {
            console.warn('Resend instance is null. Check RESEND_API_KEY environment variable.');
            if (process.env.NODE_ENV === 'development') {
                return NextResponse.json({ error: 'RESEND_API_KEY is missing in .env.local' }, { status: 500 });
            }
        }

        // Record in history
        await adminSupabase.from('order_status_history').insert({
            order_id: order.id,
            old_status: order.status,
            new_status: order.status,
            changed_by: user.id,
            notes: 'Delivery verification code requested'
        });

        return NextResponse.json({
            success: true,
            // Only return OTP in development for testing convenience
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
