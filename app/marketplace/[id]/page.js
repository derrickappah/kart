import { createClient } from '@/utils/supabase/server';
import ProductDetailsClient from './ProductDetailsClient';
import Link from 'next/link';
import { toSentenceCase, formatPrice } from '@/utils/formatters';

/**
 * ISR revalidation: 60 seconds keeps sold/removed listings from being
 * visible for too long while still benefiting from caching.
 */
export const revalidate = 60;

/**
 * Allow product pages to be rendered on-demand for any valid ID
 * (i.e. IDs not pregenerated still work, they're just rendered fresh).
 */
export const dynamicParams = true;

/**
 * generateMetadata — produces per-product SEO title, description, and OG tags
 * so that shared product links look rich in social previews.
 */
export async function generateMetadata({ params }) {
    const resolvedParams = await params;
    const id = decodeURIComponent(resolvedParams.id);
    const supabase = await createClient();

    const { data: product } = await supabase
        .from('products')
        .select('title, description, price, images, image_url, category, campus')
        .eq('id', id)
        .maybeSingle();

    if (!product) {
        return {
            title: 'Product Not Found | KART',
            description: 'This item may have been removed or is no longer available.',
        };
    }

    const title = toSentenceCase(product.title);
    const price = formatPrice(product.price);
    const description = product.description
        ? `${product.description.slice(0, 140).trim()}…`
        : `Buy ${title} for ₵${price} on KART — the campus marketplace.`;
    const ogImage = product.images?.[0] || product.image_url || '/icon.png';

    return {
        title: `${title} — ₵${price} | KART Marketplace`,
        description,
        openGraph: {
            title: `${title} — ₵${price}`,
            description,
            images: [{ url: ogImage, width: 800, height: 1000, alt: title }],
            type: 'website',
            url: `https://www.kart.cx/marketplace/${id}`,
        },
        twitter: {
            card: 'summary_large_image',
            title: `${title} — ₵${price}`,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: `https://www.kart.cx/marketplace/${id}`,
        },
    };
}

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
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-5 text-center">
                <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
                <p className="text-gray-500 mb-6">The item you&apos;re looking for might have been removed or is no longer available.</p>
                <Link href="/marketplace" className="btn-primary">Back to Marketplace</Link>
            </div>
        );
    }

    return <ProductDetailsClient key={product.id} product={product} />;
}
