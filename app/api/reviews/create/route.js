import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request) {
  try {
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to submit a review.' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, productId, rating, comment } = body;

    if ((!orderId && !productId) || !rating) {
      return NextResponse.json({ error: 'Missing required fields (rating and either orderId or productId are required)' }, { status: 400 });
    }

    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    // Server-side comment length cap (mirrors client 500-char limit)
    if (comment && typeof comment === 'string' && comment.length > 600) {
      return NextResponse.json({ error: 'Review comment exceeds maximum length' }, { status: 400 });
    }

    // Use service role client if available to ensure RLS doesn't block updates/stats
    const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : authClient;

    let targetSellerId = null;
    let targetProductId = null;
    let createdOrUpdatedReview = null;

    if (orderId) {
      // Verify order belongs to user and is in a reviewable state, fetching seller_id and product_id
      const { data: order, error: orderError } = await db
        .from('orders')
        .select('id, status, buyer_id, seller_id, product_id')
        .eq('id', orderId)
        .eq('buyer_id', user.id)
        .single();

      if (orderError || !order) {
        return NextResponse.json({ error: 'Order not found or you do not have permission' }, { status: 404 });
      }

      if (order.status !== 'Delivered' && order.status !== 'Completed') {
        return NextResponse.json(
          { error: 'Reviews can only be submitted for delivered or completed orders' },
          { status: 400 }
        );
      }

      // Check if review already exists for this order
      const { data: existingReview } = await db
        .from('reviews')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingReview) {
        return NextResponse.json({ error: 'Review already exists for this order' }, { status: 400 });
      }

      targetSellerId = order.seller_id;
      targetProductId = order.product_id;

      // Create review using verified database entity values
      const { data: insertedReview, error: reviewError } = await db
        .from('reviews')
        .insert({
          order_id: order.id,
          product_id: order.product_id,
          seller_id: order.seller_id,
          buyer_id: user.id,
          rating,
          comment: comment || null,
        })
        .select()
        .single();

      if (reviewError) {
        console.error('Error creating order review:', reviewError);
        return NextResponse.json({ error: reviewError.message || 'Failed to create review' }, { status: 500 });
      }

      createdOrUpdatedReview = insertedReview;
    } else if (productId) {
      // Fetch product to verify and get seller_id
      const { data: product, error: productError } = await db
        .from('products')
        .select('id, seller_id, title')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      if (product.seller_id === user.id) {
        return NextResponse.json({ error: 'You cannot review your own listing' }, { status: 400 });
      }

      targetSellerId = product.seller_id;
      targetProductId = product.id;

      // Check if user already reviewed this product
      const { data: existingReview } = await db
        .from('reviews')
        .select('id, buyer_id')
        .eq('product_id', productId)
        .eq('buyer_id', user.id)
        .maybeSingle();

      if (existingReview) {
        // Update existing review
        const { data: updatedReview, error: updateError } = await db
          .from('reviews')
          .update({
            rating,
            comment: comment || null,
          })
          .eq('id', existingReview.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating review:', updateError);
          return NextResponse.json({ error: updateError.message || 'Failed to update review' }, { status: 500 });
        }

        createdOrUpdatedReview = updatedReview;
      } else {
        // Insert new review
        const { data: insertedReview, error: insertError } = await db
          .from('reviews')
          .insert({
            product_id: product.id,
            seller_id: product.seller_id,
            buyer_id: user.id,
            rating,
            comment: comment || null,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating product review:', insertError);
          return NextResponse.json({ error: insertError.message || 'Failed to create review' }, { status: 500 });
        }

        createdOrUpdatedReview = insertedReview;
      }
    }

    // Sync seller aggregate stats in profiles
    if (targetSellerId) {
      try {
        const { data: sellerReviews } = await db
          .from('reviews')
          .select('rating')
          .eq('seller_id', targetSellerId);

        if (sellerReviews && sellerReviews.length > 0) {
          const avgRating = sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length;
          const totalReviews = sellerReviews.length;

          await db
            .from('profiles')
            .update({
              average_rating: avgRating,
              total_reviews: totalReviews,
            })
            .eq('id', targetSellerId);
        }
      } catch (statsErr) {
        console.error('Error syncing seller rating stats:', statsErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Review saved successfully',
      review: createdOrUpdatedReview,
    });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
