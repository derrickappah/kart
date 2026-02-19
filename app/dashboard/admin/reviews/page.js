import { createClient } from '../../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import ReviewsClient from './ReviewsClient';

export default async function AdminReviewsPage({ searchParams }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Admin check is handled by layout
    // Get filter from search params
    const resolvedSearchParams = await searchParams;
    const ratingFilter = resolvedSearchParams?.rating || 'all';

    // Build query
    // Build query
    let query = supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

    // Apply rating filter
    if (ratingFilter !== 'all') {
        query = query.eq('rating', parseInt(ratingFilter));
    }

    const { data: rawReviews, error } = await query;
    let reviews = rawReviews || [];

    // Manually fetch related data
    if (reviews.length > 0) {
        const productIds = [...new Set(reviews.map(r => r.product_id).filter(Boolean))];
        const buyerIds = [...new Set(reviews.map(r => r.buyer_id).filter(Boolean))];
        const sellerIds = [...new Set(reviews.map(r => r.seller_id).filter(Boolean))];
        const allProfileIds = [...new Set([...buyerIds, ...sellerIds])];

        const [productsResult, profilesResult] = await Promise.all([
            productIds.length > 0 ? supabase.from('products').select('id, title').in('id', productIds) : { data: [] },
            allProfileIds.length > 0 ? supabase.from('profiles').select('id, email, display_name').in('id', allProfileIds) : { data: [] }
        ]);

        const products = productsResult.data || [];
        const profiles = profilesResult.data || [];

        const productMap = new Map(products.map(p => [p.id, p]));
        const profileMap = new Map(profiles.map(p => [p.id, p]));

        reviews = reviews.map(r => ({
            ...r,
            product: productMap.get(r.product_id) || null,
            buyer: profileMap.get(r.buyer_id) || null,
            seller: profileMap.get(r.seller_id) || null
        }));
    }

    // Calculate stats
    const totalCount = reviews?.length || 0;
    const rating5Count = reviews?.filter(r => r.rating === 5).length || 0;
    const rating4Count = reviews?.filter(r => r.rating === 4).length || 0;
    const rating3Count = reviews?.filter(r => r.rating === 3).length || 0;
    const rating2Count = reviews?.filter(r => r.rating === 2).length || 0;
    const rating1Count = reviews?.filter(r => r.rating === 1).length || 0;
    const averageRating = totalCount > 0
        ? (reviews?.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1)
        : 0;

    return (
        <div className="space-y-8 pb-12">

            <ReviewsClient
                initialReviews={reviews || []}
                stats={{
                    total: totalCount,
                    average: averageRating,
                    rating5: rating5Count,
                    rating4: rating4Count,
                    rating3: rating3Count,
                    rating2: rating2Count,
                    rating1: rating1Count
                }}
            />
        </div>
    );
}
