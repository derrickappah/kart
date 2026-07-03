import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import PromotionClient from './PromotionClient';

export const metadata = {
    title: 'Promote Listing | Kart',
    description: 'Select a promotion package to boost your listing traffic and reach more campus buyers.',
};

export default async function PromotionSelectionPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        redirect('/login');
    }

    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !product) {
        notFound();
    }

    if (product.seller_id !== user.id) {
        notFound();
    }

    if (product.status?.toLowerCase() !== 'active') {
        redirect('/dashboard/seller/listings');
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

    // Fetch active promotions for this listing to show exact extension end dates
    const { data: activeAds } = await supabase
        .from('advertisements')
        .select('ad_type, end_date')
        .eq('product_id', id)
        .eq('status', 'Active')
        .order('end_date', { ascending: false });

    return <PromotionClient product={product} pricing={pricing} activeAds={activeAds || []} />;
}
