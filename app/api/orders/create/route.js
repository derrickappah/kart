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

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, seller:profiles!products_seller_id_fkey(id, email, display_name)')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if product is available
    if (product.status !== 'Active' && product.status !== 'active') {
      return NextResponse.json(
        { error: 'Product is not available for purchase' },
        { status: 400 }
      );
    }

    // Check if user is trying to buy their own product
    if (product.seller_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot purchase your own product' },
        { status: 400 }
      );
    }

    // Validate stock availability
    if (product.stock_quantity !== null) {
      if (product.stock_quantity < quantity) {
        return NextResponse.json(
          { error: `Only ${product.stock_quantity} item(s) available in stock` },
          { status: 400 }
        );
      }
    }

    // Calculate amounts
    const unitPrice = parseFloat(product.price);
    const subtotal = unitPrice * quantity;
    const platformFeePercentage = (subtotal * PLATFORM_FEE_PERCENTAGE) / 100;
    const platformFeeTotal = platformFeePercentage + PLATFORM_FEE_FIXED;
    const totalAmount = subtotal + platformFeeTotal;
    const sellerPayoutAmount = subtotal - platformFeeTotal; // Platform fee deducted from seller

    // Get buyer profile for email
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    // Create order
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
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Generate payment reference
    const reference = `order_${order.id}_${Date.now()}`;

    // Initialize payment with Paystack
    try {
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || (request.headers.get('origin') || 'http://localhost:3000')}/dashboard/orders/${order.id}`;
      
      const paymentData = await initializePayment({
        amount: totalAmount,
        email: buyerProfile?.email || user.email,
        reference,
        callback_url: callbackUrl,
        metadata: {
          order_id: order.id,
          buyer_id: user.id,
          product_id: productId,
          custom_fields: [
            { display_name: 'Order ID', variable_name: 'order_id', value: order.id },
            { display_name: 'Product', variable_name: 'product_title', value: product.title },
          ],
        },
      });

      // Update order with payment reference
      await supabase
        .from('orders')
        .update({
          payment_reference: reference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Record initial status
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        old_status: null,
        new_status: 'Pending',
        changed_by: user.id,
        notes: 'Order created',
      });

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          total_amount: totalAmount,
          currency: order.currency,
        },
        payment: {
          authorization_url: paymentData.data.authorization_url,
          reference: paymentData.data.reference,
        },
      });
    } catch (paymentError) {
      console.error('Payment initialization error:', paymentError);
      
      // Update order status to indicate payment failure
      await supabase
        .from('orders')
        .update({ status: 'Cancelled' })
        .eq('id', order.id);

      return NextResponse.json(
        { error: paymentError.message || 'Failed to initialize payment' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
