import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile || !profile.is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { reviewId } = body;

        if (!reviewId) {
            return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
        }

        // Get review details before deleting
        const { data: review, error: reviewError } = await supabase
            .from('reviews')
            .select('*, product_id, seller_id')
            .eq('id', reviewId)
            .single();

        if (reviewError || !review) {
            return NextResponse.json({ error: 'Review not found' }, { status: 404 });
        }

        // Delete the review
        const { error: deleteError } = await supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId);

        if (deleteError) {
            console.error('Error deleting review:', deleteError);
            return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
        }

        // Recalculate average rating for the product
        const { data: productReviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('product_id', review.product_id);

        if (productReviews && productReviews.length > 0) {
            const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
            await supabase
                .from('products')
                .update({ 
                    // Note: products table might not have average_rating, but we'll try
                })
                .eq('id', review.product_id);
        }

        // Recalculate average rating for the seller
        const { data: sellerReviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('seller_id', review.seller_id);

        if (sellerReviews && sellerReviews.length > 0) {
            const avgRating = sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length;
            const totalReviews = sellerReviews.length;
            
            await supabase
                .from('profiles')
                .update({
                    average_rating: avgRating,
                    total_reviews: totalReviews,
                })
                .eq('id', review.seller_id);
        } else {
            // No reviews left, reset to 0
            await supabase
                .from('profiles')
                .update({
                    average_rating: 0,
                    total_reviews: 0,
                })
                .eq('id', review.seller_id);
        }

        return NextResponse.json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Error deleting review:', error);
        return NextResponse.json(
            { error: error.message || 'Server error' },
            { status: 500 }
        );
    }
}
