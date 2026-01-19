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
    const { productId, durationDays = 7 } = body;

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

    // Calculate boost expiry
    const boostExpiresAt = new Date();
    boostExpiresAt.setDate(boostExpiresAt.getDate() + durationDays);

    // Update product to be boosted
    const { error: updateError } = await supabase
      .from('products')
      .update({
        is_boosted: true,
        boost_expires_at: boostExpiresAt.toISOString(),
      })
      .eq('id', productId);

    if (updateError) {
      console.error('Error boosting product:', updateError);
      return NextResponse.json({ error: 'Failed to boost product' }, { status: 500 });
    }

    // Create advertisement record
    const { data: ad, error: adError } = await supabase
      .from('advertisements')
      .insert({
        product_id: productId,
        seller_id: user.id,
        ad_type: 'Boost',
        status: 'Active',
        start_date: new Date().toISOString(),
        end_date: boostExpiresAt.toISOString(),
        cost: durationDays * 2, // Example: 2 GHS per day
      })
      .select()
      .single();

    if (adError) {
      console.error('Error creating ad record:', adError);
    }

    return NextResponse.json({ 
      message: 'Product boosted successfully',
      boostExpiresAt: boostExpiresAt.toISOString()
    });
  } catch (error) {
    console.error('Boost product error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
