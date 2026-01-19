import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import ListingDetailsManagementClient from '../ListingDetailsManagementClient';

export default async function ListingDetailsPage({ params }) {
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

    return <ListingDetailsManagementClient product={product} />;
}
