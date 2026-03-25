import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
    try {
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
        if (process.env.RESEND_API_KEY) {
            try {
                const { data, error: emailError } = await resend.emails.send({
                    from: 'Kart <notifications@kart.com>',
                    to: [order.buyer.email],
                    subject: `Verification Code for Order #${orderId.slice(0, 8)}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                            <h2 style="color: #1a202c; margin-bottom: 16px;">Confirm Your Delivery</h2>
                            <p style="color: #4a5568; line-height: 1.5;">Hello ${order.buyer.display_name || 'there'},</p>
                            <p style="color: #4a5568; line-height: 1.5;">You are about to mark your order as delivered. Please use the verification code below to confirm this action:</p>
                            <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
                                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3182ce;">${otp}</span>
                            </div>
                            <p style="color: #718096; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                            <p style="color: #a0aec0; font-size: 12px; text-align: center;">Kart - Your Student Marketplace</p>
                        </div>
                    `,
                });

                if (emailError) {
                    console.error('Resend error:', emailError);
                    // Continue anyway in development if key is 're_...' mock or something
                }
            } catch (err) {
                console.error('Email sending failed:', err);
            }
        } else {
            console.warn('RESEND_API_KEY not found. Email not sent.');
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
