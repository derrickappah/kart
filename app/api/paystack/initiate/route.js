import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { initializePayment } from '@/lib/paystack';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, amount, email, callbackUrl } = body;

    if (!orderId || !amount || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, amount, email' },
        { status: 400 }
      );
    }

    // Verify order exists and belongs to user
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, buyer:profiles!buyer_id(email)')
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'Pending') {
      return NextResponse.json(
        { error: 'Order is not in pending status' },
        { status: 400 }
      );
    }

    // Generate unique reference
    const reference = `order_${orderId}_${Date.now()}`;

    // Initialize payment with Paystack
    const paymentData = await initializePayment({
      amount,
      email: email || order.buyer?.email || user.email,
      reference,
      callback_url: callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL || (request.headers.get('origin') || 'http://localhost:3000')}/dashboard/orders/${orderId}`,
      metadata: {
        order_id: orderId,
        buyer_id: user.id,
        custom_fields: [
          { display_name: 'Order ID', variable_name: 'order_id', value: orderId },
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
      .eq('id', orderId);

    return NextResponse.json({
      success: true,
      authorization_url: paymentData.data.authorization_url,
      reference: paymentData.data.reference,
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}
