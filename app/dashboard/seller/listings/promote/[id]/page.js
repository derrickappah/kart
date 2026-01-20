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

    return <PromotionClient product={product} />;
}
