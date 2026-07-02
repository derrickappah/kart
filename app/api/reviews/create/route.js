import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, productId, sellerId, rating, comment } = body;

    if (!orderId || !productId || !sellerId || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    // Server-side comment length cap (mirrors client 500-char limit)
    if (comment && typeof comment === 'string' && comment.length > 600) {
      return NextResponse.json({ error: 'Review comment exceeds maximum length' }, { status: 400 });
    }

    // Verify order belongs to user and is in a reviewable state
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, buyer_id')
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'Delivered' && order.status !== 'Completed') {
      return NextResponse.json(
        { error: 'Reviews can only be submitted for delivered or completed orders' },
        { status: 400 }
      );
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (existingReview) {
      return NextResponse.json({ error: 'Review already exists for this order' }, { status: 400 });
    }

    // Create review
    const { error: reviewError } = await supabase
      .from('reviews')
      .insert({
        order_id: orderId,
        product_id: productId,
        seller_id: sellerId,
        buyer_id: user.id,
        rating,
        comment: comment || null,
      });

    if (reviewError) {
      console.error('Error creating review:', reviewError);
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
    }

    // Seller stats will be updated automatically by database trigger

    return NextResponse.json({ message: 'Review created successfully' });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
