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

    // Fetch only what the success screen needs
    let seller = null;
    let product = null;

    try {
        const { data: order } = await supabase
            .from('orders')
            .select(`
                id,
                buyer_id,
                product:products(id, title, images, image_url),
                seller:profiles!orders_seller_id_profiles_fkey(id, display_name, avatar_url)
            `)
            .eq('id', id)
            .eq('buyer_id', user.id) // Ensure only the buyer can see their success screen
            .single();

        if (order) {
            seller = order.seller;
            product = order.product;
        }
    } catch (err) {
        console.log('Error fetching order for success screen:', err);
    }

    // Render with whatever data we have (page is non-critical, gracefully degrades)
    return <SuccessClient seller={seller} product={product} />;
}
