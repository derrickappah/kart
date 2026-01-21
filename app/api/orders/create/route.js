import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { initializePayment } from '@/lib/paystack';

const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '3');
const PLATFORM_FEE_FIXED = parseFloat(process.env.PLATFORM_FEE_FIXED || '1');

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    if (quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }

    // 1. Handle sample ID for dev testing (Early Return)
    if (productId === '021ec46d-43e5-4891-9439-2e59d53bbf28') {
      const sampleOrderId = 'sample-' + Date.now();
      return NextResponse.json({
        success: true,
        order: {
          id: sampleOrderId,
          total_amount: 46.50,
          currency: 'GHS',
        },
        payment: {
          authorization_url: `${process.env.NEXT_PUBLIC_APP_URL || (request.headers.get('origin') || 'http://localhost:3000')}/dashboard/orders?success=true&sample=true`,
          reference: 'sample-ref-' + Date.now(),
        },
      });
    }

    // 2. Fetch real product from database
    let product;
    const result = await supabase
      .from('products')
      .select('*, seller:profiles!products_seller_id_profiles_fkey(id, email, display_name)')
      .eq('id', productId)
      .single();

    if (result.error) {
      // Try fallback relationship name
      const retry = await supabase
        .from('products')
        .select('*, seller:profiles!products_seller_id_fkey(id, email, display_name)')
        .eq('id', productId)
        .single();
      product = retry.data;
    } else {
      product = result.data;
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 3. Status and Safety Checks
    if (product.status !== 'Active' && product.status !== 'active') {
      return NextResponse.json({ error: 'Product is not available' }, { status: 400 });
    }

    if (product.seller_id === user.id) {
      return NextResponse.json({ error: 'You cannot buy your own product' }, { status: 400 });
    }

    if (product.stock_quantity !== null && product.stock_quantity < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
    }

    // 4. Calculate amounts
    const unitPrice = parseFloat(product.price);
    const subtotal = unitPrice * quantity;
    const platformFeeTotal = ((subtotal * PLATFORM_FEE_PERCENTAGE) / 100) + PLATFORM_FEE_FIXED;
    const totalAmount = subtotal + platformFeeTotal;
    const sellerPayoutAmount = subtotal - platformFeeTotal;

    // 5. Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: product.seller_id,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        platform_fee_percentage: PLATFORM_FEE_PERCENTAGE,
        platform_fee_fixed: PLATFORM_FEE_FIXED,
        platform_fee_total: platformFeeTotal,
        seller_payout_amount: sellerPayoutAmount,
        status: 'Pending',
        currency: product.currency || 'GHS',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order Error:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // 6. Initialize Paystack (Using main try-catch for error handling)
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const reference = `order_${order.id}_${Date.now()}`;
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || (request.headers.get('origin') || 'http://localhost:3000')}/dashboard/orders/${order.id}`;

    const paymentData = await initializePayment({
      amount: totalAmount,
      email: buyerProfile?.email || user.email,
      reference,
      callback_url: callbackUrl,
      metadata: {
        order_id: order.id,
        buyer_id: user.id,
        product_id: productId
      }
    });

    // 7. Success! Update and finish
    await supabase.from('orders').update({ payment_reference: reference }).eq('id', order.id);
    await supabase.from('order_status_history').insert({
      order_id: order.id,
      new_status: 'Pending',
      changed_by: user.id,
      notes: 'Order initiated via Paystack'
    });

    return NextResponse.json({
      success: true,
      order: { id: order.id, total_amount: totalAmount },
      payment: {
        authorization_url: paymentData.data.authorization_url,
        reference: paymentData.data.reference
      }
    });

  } catch (error) {
    console.error('Final Error Handler:', error);
    // If we have an order but payment failed, we don't necessarily cancel it here
    // unless it was a fatal error before payment initialization finished
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
