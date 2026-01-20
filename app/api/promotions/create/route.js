import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { initializePayment } from '@/lib/paystack';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { productId, tierId, adType, amount } = body;

        if (!productId || !tierId || !adType || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Calculate end date based on tier
        const startDate = new Date();
        const endDate = new Date();
        if (tierId === 'daily') {
            endDate.setHours(endDate.getHours() + 24);
        } else if (tierId === 'weekly') {
            endDate.setDate(endDate.getDate() + 7);
        } else if (tierId === 'featured') {
            // Lifetime: set to far future or handle specifically
            endDate.setFullYear(endDate.getFullYear() + 10);
        }

        // Create advertisement record (pending payment)
        const { data: advertisement, error: adError } = await supabase
            .from('advertisements')
            .insert({
                product_id: productId,
                seller_id: user.id,
                ad_type: adType,
                status: 'Paused', // Wait for payment verification
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                cost: amount
            })
            .select()
            .single();

        if (adError) {
            console.error('Error creating advertisement:', adError);
            return NextResponse.json({ error: 'Failed to create advertisement' }, { status: 500 });
        }

        // Get user profile for email
        const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', user.id)
            .single();

        // Initialize payment with Paystack
        const reference = `ad_${advertisement.id}_${Date.now()}`;

        try {
            const paymentRequest = {
                amount: amount,
                email: profile?.email || user.email,
                reference,
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL || (request.headers.get('origin') || 'http://localhost:3000')}/dashboard/seller/listings/promote/success?adId=${advertisement.id}&productId=${productId}`,
                currency: undefined,
                metadata: {
                    advertisement_id: advertisement.id,
                    product_id: productId,
                    user_id: user.id,
                    tier_id: tierId,
                    type: 'promotion',
                },
            };

            const paymentData = await initializePayment(paymentRequest);

            // Update advertisement with payment reference (if you have such a column, otherwise use metadata)
            // The ad schema doesn't have payment_reference, but we can update status later via webhook or manual verification

            return NextResponse.json({
                success: true,
                authorization_url: paymentData.data.authorization_url,
                reference: reference
            });
        } catch (paymentError) {
            console.error('Payment initialization error:', paymentError);
            // Delete pending ad if payment fails
            await supabase.from('advertisements').delete().eq('id', advertisement.id);
            return NextResponse.json({ error: paymentError.message || 'Failed to initialize payment' }, { status: 500 });
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
