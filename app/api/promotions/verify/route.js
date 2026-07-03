import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyTransaction } from '@/lib/paystack';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { adId, reference } = body;

        if (!adId || !reference) {
            return NextResponse.json({ error: 'Ad ID and reference are required' }, { status: 400 });
        }

        // Get advertisement — only belonging to this user
        const { data: ad, error: adError } = await supabase
            .from('advertisements')
            .select('*')
            .eq('id', adId)
            .eq('seller_id', user.id)
            .single();

        if (adError || !ad) {
            return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 });
        }

        // Idempotency guard — already activated, return success without re-processing
        if (ad.status === 'Active') {
            return NextResponse.json({ success: true, message: 'Advertisement already active' });
        }

        // Verify with Paystack
        const verification = await verifyTransaction(reference);

        if (verification.data.status !== 'success') {
            return NextResponse.json({ success: false, message: 'Payment not successful' });
        }

        // --- SECURITY: Validate that the payment currency is GHS ---
        const paidCurrency = verification.data.currency;
        if (!paidCurrency || paidCurrency.toUpperCase() !== 'GHS') {
            console.error('[PromoVerify] Currency mismatch. Expected GHS, got:', paidCurrency);
            return NextResponse.json({ error: 'Payment currency must be GHS' }, { status: 400 });
        }

        // --- SECURITY: Validate that the paid amount matches the expected ad cost ---
        // Paystack returns amounts in pesewas (GHS * 100)
        const paidAmountGHS = verification.data.amount / 100;
        const expectedCost = parseFloat(ad.cost);
        if (Math.abs(paidAmountGHS - expectedCost) > 0.01) {
            console.error('[PromoVerify] Amount mismatch. Paid:', paidAmountGHS, 'Expected:', expectedCost);
            return NextResponse.json({ error: 'Payment amount does not match promotion cost' }, { status: 400 });
        }

        // --- SECURITY: Validate metadata and reference pattern to confirm reference belongs to this ad ---
        if (!reference || !reference.startsWith(`ad_${adId}_`)) {
            console.error('[PromoVerify] Reference pattern mismatch:', reference, 'for adId:', adId);
            return NextResponse.json({ error: 'Invalid reference format' }, { status: 400 });
        }

        const metadata = verification.data.metadata || {};
        // Coerce both sides to strings for a safe comparison regardless of Paystack serialisation
        const metaAdId = metadata.advertisement_id != null ? String(metadata.advertisement_id) : null;
        if (!metaAdId || metaAdId !== String(adId)) {
            console.error('[PromoVerify] Metadata advertisement_id mismatch or missing:', metaAdId, 'vs', adId);
            return NextResponse.json({ error: 'Payment reference mismatch' }, { status: 400 });
        }
        if (metadata.type !== 'promotion') {
            console.error('[PromoVerify] Metadata type mismatch:', metadata.type);
            return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
        }

        // --- Atomic update: only update if status is still Paused to prevent race conditions ---
        const { error: updateAdError, count } = await supabase
            .from('advertisements')
            .update({ status: 'Active', updated_at: new Date().toISOString() })
            .eq('id', adId)
            .eq('status', 'Paused') // Atomic guard — will no-op if already activated by webhook
            .select('id');

        if (updateAdError) throw updateAdError;

        // Update product promotion columns based on ad type
        const productUpdates = {};
        if (ad.ad_type === 'Featured') {
            productUpdates.is_featured = true;
        } else if (ad.ad_type === 'Boost') {
            productUpdates.is_boosted = true;
            productUpdates.boost_expires_at = ad.end_date;
        }

        if (Object.keys(productUpdates).length > 0) {
            const { error: updateProdError } = await supabase
                .from('products')
                .update(productUpdates)
                .eq('id', ad.product_id);

            if (updateProdError) throw updateProdError;
        }

        // Create in-app notification
        await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'PromotionActivated',
            title: 'Promotion Activated!',
            message: `Your "${ad.ad_type}" promotion for your listing has been activated successfully.`,
        });

        return NextResponse.json({ success: true, message: 'Promotion activated successfully' });

    } catch (error) {
        console.error('[PromoVerify] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
