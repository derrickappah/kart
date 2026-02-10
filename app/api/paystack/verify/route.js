import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
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
    console.log('[Verify] Verifying transaction with Paystack:', reference);
    let verification;
    try {
      verification = await verifyTransaction(reference);
      console.log('[Verify] Paystack verification response:', {
        status: verification.data?.status,
        amount: verification.data?.amount,
        reference: verification.data?.reference,
        id: verification.data?.id,
      });
    } catch (verifyError) {
      console.error('[Verify] Paystack verification failed:', verifyError);
      return NextResponse.json({
        success: false,
        message: 'Failed to verify with Paystack: ' + verifyError.message,
      });
    }

    if (verification.data.status !== 'success') {
      console.log('[Verify] Payment not successful, status:', verification.data.status);
      return NextResponse.json({
        success: false,
        message: 'Payment not successful',
      });
    }

    // Check if payment reference matches
    // Handle cases where payment_reference might be null or reference format variations
    const referenceMatches =
      order.payment_reference === reference ||
      !order.payment_reference || // Allow if payment_reference is null (race condition during order creation)
      reference.includes(order.id); // Fallback: check if reference contains order ID

    if (!referenceMatches) {
      console.error('Payment reference mismatch:', {
        order_payment_reference: order.payment_reference,
        provided_reference: reference,
        order_id: order.id
      });
      return NextResponse.json({
        success: false,
        message: 'Payment reference mismatch',
      });
    }

    // Use service role client for system updates to bypass RLS
    const adminSupabase = createServiceRoleClient();

    // Update payment_reference if it was null
    if (!order.payment_reference) {
      await adminSupabase
        .from('orders')
        .update({ payment_reference: reference })
        .eq('id', order.id);
    }

    // Update order if still pending
    console.log('[Verify] Order status check:', {
      order_id: order.id,
      current_status: order.status,
      will_update: order.status === 'Pending'
    });

    if (order.status === 'Pending') {
      console.log('[Verify] Updating order to Paid status...');
      const { error: updateError } = await adminSupabase
        .from('orders')
        .update({
          status: 'Paid',
          paystack_transaction_id: verification.data.id.toString(),
          escrow_status: 'Held',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('[Verify] Error updating order:', updateError);
        return NextResponse.json(
          { error: 'Failed to update order: ' + updateError.message },
          { status: 500 }
        );
      }

      console.log('[Verify] Order updated successfully to Paid');

      // Update product stock
      const { data: product } = await adminSupabase
        .from('products')
        .select('*')
        .eq('id', order.product_id)
        .single();

      if (product) {
        if (product.stock_quantity !== null) {
          const newStock = Math.max(0, product.stock_quantity - order.quantity);
          const productStatus = newStock === 0 ? 'Sold' : product.status;

          await adminSupabase
            .from('products')
            .update({
              stock_quantity: newStock,
              status: productStatus,
            })
            .eq('id', order.product_id);
        } else if (order.quantity === 1) {
          await adminSupabase
            .from('products')
            .update({ status: 'Sold' })
            .eq('id', order.product_id);
        }
      }

      // Get or create seller wallet
      const { data: wallet } = await adminSupabase
        .from('wallets')
        .select('*')
        .eq('user_id', order.seller_id)
        .single();

      if (!wallet) {
        await adminSupabase
          .from('wallets')
          .insert({
            user_id: order.seller_id,
            balance: 0,
            pending_balance: order.seller_payout_amount,
            currency: 'GHS',
          });
      } else {
        await adminSupabase
          .from('wallets')
          .update({
            pending_balance: (parseFloat(wallet.pending_balance) || 0) + parseFloat(order.seller_payout_amount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', wallet.id);
      }

      // Create notifications
      await adminSupabase.from('notifications').insert([
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
      await adminSupabase.from('order_status_history').insert({
        order_id: order.id,
        old_status: 'Pending',
        new_status: 'Paid',
        changed_by: null,
        notes: 'Payment verified via callback',
      });

      console.log('[Verify] Order processing complete, returning success');
      return NextResponse.json({
        success: true,
        message: 'Payment verified and order updated',
      });
    } else {
      // Order is not pending - might have been processed already
      console.log('[Verify] Order is not pending, current status:', order.status);
      return NextResponse.json({
        success: order.status === 'Paid', // Only success if already paid
        message: order.status === 'Paid' ? 'Order already paid' : `Order status is ${order.status}, cannot verify payment`,
        currentStatus: order.status,
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
