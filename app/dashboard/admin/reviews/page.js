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
    let query = supabase
        .from('reviews')
        .select('*, product:products(id, title), buyer:profiles!buyer_id(email, display_name), seller:profiles!seller_id(email, display_name)')
        .order('created_at', { ascending: false });

    // Apply rating filter
    if (ratingFilter !== 'all') {
        query = query.eq('rating', parseInt(ratingFilter));
    }

    const { data: reviews, error } = await query;

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
