import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyTransaction } from '@/lib/paystack';

export async function POST(request) {
  try {
    console.log('[Verify] Subscription verification request received');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('[Verify] Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscriptionId, reference } = body;

    console.log('[Verify] Request data:', {
      subscription_id: subscriptionId,
      reference: reference,
      user_id: user.id,
    });

    if (!subscriptionId || !reference) {
      console.error('[Verify] Missing required fields');
      return NextResponse.json(
        { error: 'Subscription ID and reference are required' },
        { status: 400 }
      );
    }

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      console.error('[Verify] Subscription not found:', {
        subscription_id: subscriptionId,
        user_id: user.id,
        error: subError?.message,
      });
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    console.log('[Verify] Found subscription:', {
      subscription_id: subscription.id,
      current_status: subscription.status,
      payment_reference: subscription.payment_reference,
    });

    // If subscription is already active, return success
    if (subscription.status === 'Active') {
      console.log('[Verify] Subscription already active');
      return NextResponse.json({
        success: true,
        message: 'Subscription already active',
        subscription,
      });
    }

    // Verify transaction with Paystack
    console.log('[Verify] Verifying transaction with Paystack:', reference);
    let verification;
    try {
      verification = await verifyTransaction(reference);
      console.log('[Verify] Paystack verification result:', {
        status: verification.data?.status,
        reference: verification.data?.reference,
        amount: verification.data?.amount,
      });
    } catch (verifyError) {
      console.error('[Verify] Paystack verification failed:', verifyError);
      return NextResponse.json({
        success: false,
        message: 'Failed to verify transaction with Paystack',
        error: verifyError.message,
      }, { status: 500 });
    }

    if (verification.data.status !== 'success') {
      return NextResponse.json({
        success: false,
        message: 'Payment not successful',
        status: verification.data.status,
      });
    }

    // Check if payment reference matches (case-insensitive, trim whitespace)
    const storedReference = (subscription.payment_reference || '').trim();
    const providedReference = (reference || '').trim();
    
    console.log('[Verify] Reference matching:', {
      subscription_id: subscription.id,
      stored_reference: storedReference,
      provided_reference: providedReference,
      exact_match: storedReference === providedReference,
      case_insensitive_match: storedReference.toLowerCase() === providedReference.toLowerCase(),
    });

    // Try exact match first
    if (storedReference !== providedReference) {
      // Try case-insensitive match
      if (storedReference.toLowerCase() !== providedReference.toLowerCase()) {
        // Try to find subscription by reference in Paystack transaction metadata
        console.log('[Verify] Reference mismatch, checking Paystack transaction metadata...');
        try {
          const verificationData = await verifyTransaction(providedReference);
          // Check if transaction metadata contains subscription ID
          const metadata = verificationData.data?.metadata || {};
          if (metadata.subscription_id === subscription.id || metadata.subscription_id === subscriptionId) {
            console.log('[Verify] Found subscription ID in transaction metadata, updating reference');
            // Update the subscription's payment_reference to match
            await supabase
              .from('subscriptions')
              .update({ payment_reference: providedReference })
              .eq('id', subscription.id);
          } else {
            return NextResponse.json({
              success: false,
              message: 'Payment reference mismatch',
              debug: {
                stored_reference: storedReference,
                provided_reference: providedReference,
                subscription_id: subscription.id,
              },
            });
          }
        } catch (metaError) {
          console.error('[Verify] Error checking metadata:', metaError);
          return NextResponse.json({
            success: false,
            message: 'Payment reference mismatch and could not verify via metadata',
            debug: {
              stored_reference: storedReference,
              provided_reference: providedReference,
            },
          });
        }
      } else {
        // Case-insensitive match found, update the stored reference to match exactly
        console.log('[Verify] Case-insensitive match found, updating stored reference');
        await supabase
          .from('subscriptions')
          .update({ payment_reference: providedReference })
          .eq('id', subscription.id);
      }
    }

    // Update subscription if still pending
    if (subscription.status === 'Pending') {
      console.log('[Verify] Updating subscription status to Active');
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'Active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Verify] Error updating subscription:', {
          subscription_id: subscription.id,
          error: updateError.message,
          error_details: updateError,
        });
        return NextResponse.json(
          { error: 'Failed to update subscription', debug: updateError },
          { status: 500 }
        );
      }

      console.log('[Verify] Subscription updated successfully:', {
        subscription_id: updatedSubscription?.id,
        new_status: updatedSubscription?.status,
      });

      // Create notification
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: subscription.user_id,
        type: 'SubscriptionActivated',
        title: 'Subscription Activated',
        message: 'Your subscription has been activated successfully!',
      });

      if (notifError) {
        console.error('[Verify] Error creating notification:', notifError);
      } else {
        console.log('[Verify] Notification created successfully');
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription activated successfully',
        subscription: updatedSubscription,
      });
    }

    console.log('[Verify] Subscription status is not Pending, returning current status');
    return NextResponse.json({
      success: true,
      message: 'Payment verified',
      subscription,
    });
  } catch (error) {
    console.error('[Verify] Subscription verification error:', {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
    });
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
