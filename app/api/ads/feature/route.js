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
    const { productId, durationDays = 30 } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Verify product belongs to user
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('seller_id', user.id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Calculate feature expiry
    const featureExpiresAt = new Date();
    featureExpiresAt.setDate(featureExpiresAt.getDate() + durationDays);

    // Update product to be featured
    const { error: updateError } = await supabase
      .from('products')
      .update({
        is_featured: true,
      })
      .eq('id', productId);

    if (updateError) {
      console.error('Error featuring product:', updateError);
      return NextResponse.json({ error: 'Failed to feature product' }, { status: 500 });
    }

    // Create advertisement record
    const { data: ad, error: adError } = await supabase
      .from('advertisements')
      .insert({
        product_id: productId,
        seller_id: user.id,
        ad_type: 'Featured',
        status: 'Active',
        start_date: new Date().toISOString(),
        end_date: featureExpiresAt.toISOString(),
        cost: durationDays * 5, // Example: 5 GHS per day
      })
      .select()
      .single();

    if (adError) {
      console.error('Error creating ad record:', adError);
    }

    return NextResponse.json({ 
      message: 'Product featured successfully',
      featureExpiresAt: featureExpiresAt.toISOString()
    });
  } catch (error) {
    console.error('Feature product error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
