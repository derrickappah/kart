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
        const { productId, tierId, adType, amount, isApp } = body;

        if (!productId || !tierId || !adType || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if product exists and belongs to the user
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, seller_id')
            .eq('id', productId)
            .single();

        if (productError || !product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        if (product.seller_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized: You do not own this product' }, { status: 403 });
        }

        // Fetch dynamic promotion pricing from platform settings
        const { data: promoSettings } = await supabase
            .from('platform_settings')
            .select('key, value')
            .eq('category', 'promotion');

        const pricing = {};
        (promoSettings || []).forEach(s => {
            pricing[s.key] = typeof s.value === 'number' ? s.value : parseFloat(s.value) || 0;
        });

        // Calculate expected price based on tier
        let expectedPrice = 0;
        if (tierId === 'daily') {
            expectedPrice = pricing.promo_daily_price || 5;
        } else if (tierId === 'weekly') {
            expectedPrice = pricing.promo_weekly_price || 25;
        } else if (tierId === 'featured') {
            expectedPrice = pricing.promo_featured_price || 50;
        } else {
            return NextResponse.json({ error: 'Invalid tier ID' }, { status: 400 });
        }

        // Validate amount against expected price
        if (parseFloat(amount) !== expectedPrice) {
            return NextResponse.json({ error: `Price mismatch. Expected ${expectedPrice} GHS.` }, { status: 400 });
        }

        // Check for any active promotion of the same type to support extension
        const { data: activeAd } = await supabase
            .from('advertisements')
            .select('end_date')
            .eq('product_id', productId)
            .eq('ad_type', adType)
            .eq('status', 'Active')
            .order('end_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        const baseDate = activeAd ? new Date(Math.max(new Date().getTime(), new Date(activeAd.end_date).getTime())) : new Date();
        const startDate = baseDate;
        const endDate = new Date(startDate.getTime());
        if (tierId === 'daily') {
            endDate.setHours(endDate.getHours() + 24);
        } else if (tierId === 'weekly') {
            endDate.setDate(endDate.getDate() + 7);
        } else if (tierId === 'featured') {
            endDate.setDate(endDate.getDate() + 30);
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
                callback_url: isApp 
                    ? `${process.env.NEXT_PUBLIC_APP_URL || (request.headers.get('origin') || 'http://localhost:3000')}/api/payment-redirect?path=checkout-success&adId=${advertisement.id}&productId=${productId}`
                    : `${process.env.NEXT_PUBLIC_APP_URL || (request.headers.get('origin') || 'http://localhost:3000')}/dashboard/seller/listings/promote/success?adId=${advertisement.id}&productId=${productId}`,
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
