import { createClient } from '@/utils/supabase/server';
import SuccessClient from './SuccessClient';
import { redirect } from 'next/navigation';

export default async function ReviewSuccessPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Fetch order details for the success screen
    let seller = null;
    let product = null;

    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                product:products(*),
                seller:profiles!orders_seller_id_profiles_fkey(*)
            `)
            .eq('id', id)
            .single();

        if (order) {
            seller = order.seller;
            product = order.product;
        }
    } catch (err) {
        console.log("Error fetching order for success screen:", err);
    }

    // Minimal fallback if everything fails, but we should have data if we reached here from the review page
    return <SuccessClient seller={seller} product={product} />;
}
