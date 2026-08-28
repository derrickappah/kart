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
                delivery_verification_expires_at: expiresAt,
                delivery_otp_attempts: 0, // Reset attempt counter on new OTP issuance
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
                    // Use verified domain kart.cx
                    from: 'Kart <noreply@kart.cx>',
                    to: [order.buyer.email],
                    subject: 'Verify your order delivery - Kart',
                    html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px;">
                            <p style="color: #333; font-size: 15px; margin: 0 0 16px;">Hi there,</p>
                            <p style="color: #333; font-size: 15px; margin: 0 0 16px;">Here's your delivery verification code for order <strong>#${order.id.slice(0, 8)}</strong>:</p>
                            <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 6px;">
                                <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111;">${otp}</span>
                            </div>
                            <p style="color: #555; font-size: 14px; margin: 0 0 8px;">This code expires in 10 minutes.</p>
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
                    error: 'RESEND_API_KEY is missing. Please configure email service.'
                }, { status: 500 });
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
            message: 'Delivery verification code dispatched to email'
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
