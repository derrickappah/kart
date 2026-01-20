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

        // Get advertisement
        const { data: ad, error: adError } = await supabase
            .from('advertisements')
            .select('*')
            .eq('id', adId)
            .eq('seller_id', user.id)
            .single();

        if (adError || !ad) {
            return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 });
        }

        if (ad.status === 'Active') {
            return NextResponse.json({ success: true, message: 'Advertisement already active' });
        }

        // Verify with Paystack
        const verification = await verifyTransaction(reference);

        if (verification.data.status !== 'success') {
            return NextResponse.json({ success: false, message: 'Payment not successful' });
        }

        // Check metadata to be sure
        const metadata = verification.data.metadata || {};
        if (metadata.advertisement_id !== adId) {
            return NextResponse.json({ error: 'Payment reference mismatch' }, { status: 400 });
        }

        // Update advertisement status
        const { error: updateAdError } = await supabase
            .from('advertisements')
            .update({ status: 'Active', updated_at: new Date().toISOString() })
            .eq('id', adId);

        if (updateAdError) throw updateAdError;

        // Update product columns
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

        // Create notification
        await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'PromotionActivated',
            title: 'Promotion Activated!',
            message: `Your listing "${ad.ad_type}" promotion has been activated.`,
        });

        return NextResponse.json({ success: true, message: 'Promotion activated successfully' });

    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
