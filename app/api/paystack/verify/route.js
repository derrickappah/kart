import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyTransaction } from '@/lib/paystack';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, reference } = body;

    if (!orderId || !reference) {
      return NextResponse.json(
        { error: 'Order ID and reference are required' },
        { status: 400 }
      );
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If order is already paid, return success
    if (order.status === 'Paid') {
      return NextResponse.json({
        success: true,
        message: 'Order already paid',
        order,
      });
    }

    // Verify transaction with Paystack
    const verification = await verifyTransaction(reference);

    if (verification.data.status !== 'success') {
      return NextResponse.json({
        success: false,
        message: 'Payment not successful',
      });
    }

    // Check if payment reference matches
    if (order.payment_reference !== reference) {
      return NextResponse.json({
        success: false,
        message: 'Payment reference mismatch',
      });
    }

    // Update order if still pending
    if (order.status === 'Pending') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'Paid',
          paystack_transaction_id: verification.data.id.toString(),
          escrow_status: 'Held',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Error updating order:', updateError);
        return NextResponse.json(
          { error: 'Failed to update order' },
          { status: 500 }
        );
      }

      // Update product stock
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', order.product_id)
        .single();

      if (product) {
        if (product.stock_quantity !== null) {
          const newStock = Math.max(0, product.stock_quantity - order.quantity);
          const productStatus = newStock === 0 ? 'Sold' : product.status;

          await supabase
            .from('products')
            .update({
              stock_quantity: newStock,
              status: productStatus,
            })
            .eq('id', order.product_id);
        } else if (order.quantity === 1) {
          await supabase
            .from('products')
            .update({ status: 'Sold' })
            .eq('id', order.product_id);
        }
      }

      // Get or create seller wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', order.seller_id)
        .single();

      if (!wallet) {
        await supabase
          .from('wallets')
          .insert({
            user_id: order.seller_id,
            balance: 0,
            pending_balance: order.seller_payout_amount,
            currency: 'GHS',
          });
      } else {
        await supabase
          .from('wallets')
          .update({
            pending_balance: (parseFloat(wallet.pending_balance) || 0) + parseFloat(order.seller_payout_amount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', wallet.id);
      }

      // Create notifications
      await supabase.from('notifications').insert([
        {
          user_id: order.buyer_id,
          type: 'PaymentReceived',
          title: 'Payment Successful',
          message: `Your payment for order #${order.id.slice(0, 8)} has been received.`,
          related_order_id: order.id,
        },
        {
          user_id: order.seller_id,
          type: 'OrderPlaced',
          title: 'New Order Received',
          message: `You have received a new order.`,
          related_order_id: order.id,
        },
      ]);

      // Record status change
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        old_status: 'Pending',
        new_status: 'Paid',
        changed_by: null,
        notes: 'Payment verified via callback',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order updated',
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
