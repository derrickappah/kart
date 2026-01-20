import { createClient } from '@/utils/supabase/server';
import ReviewClient from './ReviewClient';
import { redirect } from 'next/navigation';

export default async function ReviewPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Try to fetch order details, but fallback for demo
    let seller = null;
    let product = null;

    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                product:products(*),
                seller:profiles!orders_seller_id_fkey(*)
            `)
            .eq('id', id)
            .single();

        if (order) {
            seller = order.seller;
            product = order.product;
        }
    } catch (err) {
        console.log("Error fetching order for review:", err);
    }

    // Fallback data if DB fetch fails or for testing with arbitrary IDs
    if (!seller) {
        seller = {
            id: 'sample-seller',
            display_name: 'Sarah Jenkins',
            avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKEcYrN9TwP-tsBns7angRTIGCGvEtYCAhNOSVI5LLUnHEwwlu6BscB-k1JnMHrBlQoXMoNi835zfE5h-CD2WjMDTwDrIswuYic0KgWkJM7oJ2qGGJTNXTUzK_eQQvfJAkKyicDUqR93avYeZFdCPfpmaZy2WHcOV2haVlXW069ufSN6xlOQCW9-gwEuUVyAbsVzFsNnHOKDLM2HvfjTXvBH9T3DWFsUaDNwwNwKTsJXE3cypnCGwpHm7NCNlFUti5eteYWiVqD6mA',
            is_verified: true
        };
        product = {
            title: 'Design Textbooks Bundle'
        };
    }

    return <ReviewClient orderId={id} seller={seller} product={product} />;
}
