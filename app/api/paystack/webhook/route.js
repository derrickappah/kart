import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { verifyTransaction } from '@/lib/paystack';
import crypto from 'crypto';

// Disable body parsing, we need raw body for signature verification
export const runtime = 'nodejs';

function verifyPaystackSignature(bodyText, signature, secret) {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(bodyText)
    .digest('hex');
  return hash === signature;
}

export async function POST(request) {
  try {
    console.log('[Webhook] Paystack webhook received');
    const supabase = await createClient(); // Still needed for some initial context if used
    const adminSupabase = createServiceRoleClient(); // Use this for all mutations
    const signature = request.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!signature || !secret) {
      console.error('[Webhook] Missing signature or secret key');
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 401 });
    }

    // Get raw body for signature verification
    const bodyText = await request.text();
    const payload = JSON.parse(bodyText);

    console.log('[Webhook] Event received:', {
      event: payload.event,
      reference: payload.data?.reference,
      has_signature: !!signature,
    });

    // Verify webhook signature using raw body text
    if (!verifyPaystackSignature(bodyText, signature, secret)) {
      console.error('[Webhook] Invalid signature - webhook rejected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = payload.event;
    const data = payload.data;

    // Handle payment success
    if (event === 'charge.success') {
      const reference = data.reference;
      console.log('[Webhook] Processing charge.success for reference:', reference);

      // Verify transaction with Paystack
      let verification;
      try {
        verification = await verifyTransaction(reference);
        console.log('[Webhook] Transaction verification result:', {
          reference: reference,
          status: verification.data?.status,
          amount: verification.data?.amount,
          currency: verification.data?.currency,
        });
      } catch (verifyError) {
        console.error('[Webhook] Transaction verification failed:', verifyError);
        return NextResponse.json({ error: 'Transaction verification failed' }, { status: 400 });
      }

      if (verification.data.status !== 'success') {
        console.error('[Webhook] Transaction not successful:', verification.data.status);
        return NextResponse.json({ error: 'Transaction not successful' }, { status: 400 });
      }

      // Check if this is a subscription payment
      // Try exact match first
      console.log('[Webhook] Looking for subscription with payment_reference:', reference);
      let { data: subscription, error: subError } = await adminSupabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('payment_reference', reference)
        .single();

      // If not found, try case-insensitive match
      if (subError && subError.code === 'PGRST116') {
        console.log('[Webhook] Exact match not found, trying case-insensitive search...');
        const { data: allSubs } = await adminSupabase
          .from('subscriptions')
          .select('*, plan:subscription_plans(*)')
          .ilike('payment_reference', reference);

        if (allSubs && allSubs.length > 0) {
          console.log('[Webhook] Found subscription with case-insensitive match');
          subscription = allSubs[0];
          subError = null;
          // Update the reference to match exactly
          await adminSupabase
            .from('subscriptions')
            .update({ payment_reference: reference })
            .eq('id', subscription.id);
        }
      }

      // If still not found, try to find by metadata
      if (subError && verification.data?.metadata) {
        const metadata = verification.data.metadata;
        if (metadata.subscription_id) {
          console.log('[Webhook] Trying to find subscription by metadata subscription_id:', metadata.subscription_id);
          const { data: metaSub, error: metaError } = await adminSupabase
            .from('subscriptions')
            .select('*, plan:subscription_plans(*)')
            .eq('id', metadata.subscription_id)
            .single();

          if (!metaError && metaSub) {
            console.log('[Webhook] Found subscription by metadata, updating payment_reference');
            subscription = metaSub;
            subError = null;
            // Update the payment reference
            await adminSupabase
              .from('subscriptions')
              .update({ payment_reference: reference })
              .eq('id', subscription.id);
          }
        }
      }

      console.log('[Webhook] Subscription lookup result:', {
        found: !subError && !!subscription,
        error: subError?.message,
        subscription_id: subscription?.id,
        current_status: subscription?.status,
        payment_reference: subscription?.payment_reference,
      });

      if (!subError && subscription) {
        console.log('[Webhook] Found subscription, updating status to Active:', {
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          current_status: subscription.status,
          plan_name: subscription.plan?.name,
        });

        // Handle subscription payment
        const { data: updatedSubscription, error: updateSubError } = await adminSupabase
          .from('subscriptions')
          .update({
            status: 'Active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id)
          .select()
          .single();

        if (updateSubError) {
          console.error('[Webhook] Error updating subscription:', {
            subscription_id: subscription.id,
            error: updateSubError.message,
            error_details: updateSubError,
          });
          throw updateSubError;
        }

        console.log('[Webhook] Subscription updated successfully:', {
          subscription_id: updatedSubscription?.id,
          new_status: updatedSubscription?.status,
        });

        // Create notification
        const { error: notifError } = await adminSupabase.from('notifications').insert({
          user_id: subscription.user_id,
          type: 'SubscriptionActivated',
          title: 'Subscription Activated',
          message: `Your ${subscription.plan?.name || 'subscription'} has been activated successfully!`,
        });

        if (notifError) {
          console.error('[Webhook] Error creating notification:', notifError);
        } else {
          console.log('[Webhook] Notification created successfully');
        }

        console.log('[Webhook] Subscription payment processed successfully');
        return NextResponse.json({ message: 'Subscription payment processed successfully' }, { status: 200 });
      } else {
        console.log('[Webhook] No subscription found for reference, checking orders...');
      }

      // Find order by payment reference
      console.log('[Webhook] Looking for order with payment_reference:', reference);
      let { data: order, error: orderError } = await adminSupabase
        .from('orders')
        .select('*, product:products(*)')
        .eq('payment_reference', reference)
        .single();

      // If not found by exact match, try to find by metadata or reference pattern
      if (orderError && orderError.code === 'PGRST116' && verification.data?.metadata) {
        const metadata = verification.data.metadata;
        if (metadata.order_id) {
          console.log('[Webhook] Trying to find order by metadata order_id:', metadata.order_id);
          const { data: metaOrder, error: metaError } = await adminSupabase
            .from('orders')
            .select('*, product:products(*)')
            .eq('id', metadata.order_id)
            .single();

          if (!metaError && metaOrder) {
            console.log('[Webhook] Found order by metadata, updating payment_reference');
            order = metaOrder;
            orderError = null;
            // Update the payment reference
            await adminSupabase
              .from('orders')
              .update({ payment_reference: reference })
              .eq('id', order.id);
          }
        }
      }

      if (orderError || !order) {
        console.error('[Webhook] Order not found for reference:', {
          reference: reference,
          error: orderError?.message,
          metadata: verification.data?.metadata,
        });
        // Also try to find subscription by partial reference or metadata
        console.log('[Webhook] Attempting to find subscription by partial reference match...');
        const { data: allSubs } = await adminSupabase
          .from('subscriptions')
          .select('id, payment_reference, status, user_id')
          .ilike('payment_reference', `%${reference}%`)
          .limit(10);

        console.log('[Webhook] Subscriptions with similar references:', allSubs);

        return NextResponse.json({
          error: 'Order not found',
          debug: {
            reference: reference,
            similar_subscriptions: allSubs,
          }
        }, { status: 404 });
      }

      console.log('[Webhook] Found order:', {
        order_id: order.id,
        current_status: order.status,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
      });

      // Only process if order is still pending
      if (order.status !== 'Pending') {
        return NextResponse.json({ message: 'Order already processed' }, { status: 200 });
      }

      // Update order status to Paid
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
        console.error('Error updating order:', updateError);
        throw updateError;
      }

      // Update product stock
      if (order.product && order.product.stock_quantity !== null) {
        const newStock = Math.max(0, order.product.stock_quantity - order.quantity);
        const productStatus = newStock === 0 ? 'Sold' : order.product.status;

        await adminSupabase
          .from('products')
          .update({
            stock_quantity: newStock,
            status: productStatus,
          })
          .eq('id', order.product_id);
      } else if (order.product) {
        // If stock_quantity is null, mark as sold if quantity is 1
        if (order.quantity === 1) {
          await adminSupabase
            .from('products')
            .update({ status: 'Sold' })
            .eq('id', order.product_id);
        }
      }

      // Create or get seller wallet
      const { data: wallet } = await adminSupabase
        .from('wallets')
        .select('*')
        .eq('user_id', order.seller_id)
        .single();

      if (!wallet) {
        // Create wallet if it doesn't exist
        await adminSupabase
          .from('wallets')
          .insert({
            user_id: order.seller_id,
            balance: 0,
            pending_balance: order.seller_payout_amount,
            currency: 'GHS',
          });
      } else {
        // Update pending balance
        await adminSupabase
          .from('wallets')
          .update({
            pending_balance: (parseFloat(wallet.pending_balance) || 0) + parseFloat(order.seller_payout_amount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', wallet.id);
      }

      // Create notifications
      const notifications = [
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
          message: `You have received a new order for ${order.quantity}x ${order.product?.title || 'product'}.`,
          related_order_id: order.id,
        },
      ];

      await adminSupabase.from('notifications').insert(notifications);

      // Record status change
      await adminSupabase.from('order_status_history').insert({
        order_id: order.id,
        old_status: 'Pending',
        new_status: 'Paid',
        changed_by: null, // System change
        notes: 'Payment confirmed via Paystack webhook',
      });

      return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
    }

    // Handle other events if needed
    console.log('[Webhook] Event not handled:', event);
    return NextResponse.json({ message: 'Event not handled' }, { status: 200 });
  } catch (error) {
    console.error('[Webhook] Webhook processing error:', {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
    });
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
