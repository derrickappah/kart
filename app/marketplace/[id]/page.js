import { createClient } from '@/utils/supabase/server';
import ProductDetailsClient from './ProductDetailsClient';

export const revalidate = 3600;

export default async function ProductDetails({ params }) {
    const resolvedParams = await params;
    const id = decodeURIComponent(resolvedParams.id);
    const supabase = await createClient();

    const { data: product, error } = await supabase
        .from('products')
        .select(`
            *,
            seller:profiles (
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
        .maybeSingle();

    if (error || !product) {
        // Fallback for missing products or errors
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-5 text-center">
                <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
                <p className="text-gray-500 mb-6">The item you're looking for might have been removed or is no longer available.</p>
                <a href="/marketplace" className="btn-primary">Back to Marketplace</a>
            </div>
        );
    }

    return <ProductDetailsClient product={product} />;
}
