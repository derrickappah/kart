import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import ListingDetailsManagementClient from '../ListingDetailsManagementClient';

export default async function ListingDetailsPage({ params }) {
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

    return <ListingDetailsManagementClient product={product} />;
}
