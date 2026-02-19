import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import PromotionClient from './PromotionClient';

export default async function PromotionSelectionPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !product) {
        notFound();
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

    return <PromotionClient product={product} pricing={pricing} />;
}
