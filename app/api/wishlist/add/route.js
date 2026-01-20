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
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if already in wishlist
    const { data: existing } = await supabase
      .from('wishlist')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: 'Product already in wishlist' });
    }

    // Add to wishlist
    const { error } = await supabase
      .from('wishlist')
      .insert({
        user_id: user.id,
        product_id: productId,
      });

    if (error) {
      console.error('Error adding to wishlist:', error);
      return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Added to wishlist successfully' });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
