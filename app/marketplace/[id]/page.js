import { createClient } from '../../../utils/supabase/server';
import ProductDetailsClient from './ProductDetailsClient';

export default async function ProductDetails({ params }) {
    // Await params for Next.js 15+ compatibility
    const { id } = await params;
    const supabase = await createClient();

    // Fetch product and related seller profile
    let product = null;
    let error = null;

    try {
        // First try with the relationship
        const result = await supabase
            .from('products')
            .select(`
                *,
                seller:profiles!products_seller_id_fkey (
                    display_name,
                    email,
                    created_at,
                    is_verified,
                    average_rating,
                    total_reviews,
                    avatar_url
                )
            `)
            .eq('id', id)
            .single();

        if (result.data) {
            product = result.data;
        } else {
            // If relationship fails, try fetching product and seller separately
            const { data: prodData, error: prodError } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (prodData && !prodError) {
                const { data: sellerData } = await supabase
                    .from('profiles')
                    .select('display_name, email, created_at, is_verified, average_rating, total_reviews, avatar_url')
                    .eq('id', prodData.seller_id)
                    .single();

                product = {
                    ...prodData,
                    seller: sellerData || {
                        display_name: 'Unknown Seller',
                        email: '',
                        is_verified: false,
                        average_rating: 0,
                        total_reviews: 0,
                        avatar_url: null
                    }
                };
            }
        }
    } catch (err) {
        console.error("Error fetching product:", err);
        error = err;
    }

    if (error || !product) {
        // Return a sample product for development/demo purposes
        product = {
            id: id,
            title: "Sample Product - Statistics 101 Textbook",
            price: 45,
            category: "Textbooks",
            condition: "Good",
            description: "A comprehensive statistics textbook in good condition. Perfect for your data science course. Contact me for pickup details on campus.",
            image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000",
            images: ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000"],
            status: "Active",
            seller_id: "sample-user",
            seller: {
                display_name: "Alex Johnson",
                email: "alex@university.edu",
                is_verified: true,
                average_rating: 4.8,
                total_reviews: 15
            },
            created_at: new Date().toISOString()
        };
    }

    return <ProductDetailsClient product={product} />;
}
