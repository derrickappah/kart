import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyTransaction } from '@/lib/paystack';

/**
 * Manual activation endpoint for subscriptions
 * Useful for recovery and testing when webhook/verification fails
 * Can be called with either subscriptionId or payment reference
 */
export async function POST(request) {
  try {
    console.log('[Manual Activate] Manual activation request received');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('[Manual Activate] Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscriptionId, reference } = body;

    console.log('[Manual Activate] Request data:', {
      subscription_id: subscriptionId,
      reference: reference,
      user_id: user.id,
    });

    if (!subscriptionId && !reference) {
      return NextResponse.json(
        { error: 'Either subscriptionId or reference is required' },
        { status: 400 }
      );
    }

    let subscription;

    // Find subscription by ID or reference
    if (subscriptionId) {
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('id', subscriptionId)
        .eq('user_id', user.id)
        .single();

      if (subError || !sub) {
        console.error('[Manual Activate] Subscription not found by ID:', {
          subscription_id: subscriptionId,
          error: subError?.message,
        });
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }
      subscription = sub;
    } else if (reference) {
      // Find by payment reference
      const { data: subs, error: subError } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .or(`payment_reference.eq.${reference},payment_reference.ilike.${reference}`)
        .eq('user_id', user.id)
        .limit(1);

      if (subError || !subs || subs.length === 0) {
        console.error('[Manual Activate] Subscription not found by reference:', {
          reference: reference,
          error: subError?.message,
        });
        return NextResponse.json({ error: 'Subscription not found for this reference' }, { status: 404 });
      }
      subscription = subs[0];
    }

    // 2.5 Fetch user profile to check for admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    console.log('[Manual Activate] Found subscription:', {
      subscription_id: subscription.id,
      current_status: subscription.status,
      payment_reference: subscription.payment_reference,
    });

    // If already active, return success
    if (subscription.status === 'Active') {
      return NextResponse.json({
        success: true,
        message: 'Subscription is already active',
        subscription,
      });
    }

    // Verify payment with Paystack using the payment reference
    const paymentReference = reference || subscription.payment_reference;

    if (!paymentReference) {
      if (profile?.is_admin) {
        console.warn('[Manual Activate] No payment reference but user is admin. Bypassing.');
      } else {
        return NextResponse.json({
          error: 'No payment reference found. Cannot verify payment.',
        }, { status: 400 });
      }
    }

    let verificationSucceeded = false;
    if (paymentReference) {
      console.log('[Manual Activate] Verifying transaction with Paystack:', paymentReference);
      try {
        const verification = await verifyTransaction(paymentReference);
        console.log('[Manual Activate] Paystack verification result:', {
          status: verification.data?.status,
          reference: verification.data?.reference,
        });

        if (verification.data.status === 'success') {
          verificationSucceeded = true;
        }
      } catch (verifyError) {
        console.error('[Manual Activate] Paystack verification failed:', verifyError);
        // Only error out if NOT an admin
        if (!profile?.is_admin) {
          return NextResponse.json({
            error: 'Failed to verify payment with Paystack',
            details: verifyError.message,
          }, { status: 500 });
        }
      }
    }

    // Check if we can proceed (either verification succeeded or user is admin)
    if (!verificationSucceeded && !profile?.is_admin) {
      return NextResponse.json({
        error: 'Payment not successful. Please ensure you have completed the payment.',
      }, { status: 400 });
    }

    if (!verificationSucceeded && profile?.is_admin) {
      console.warn('[Manual Activate] Force-activating subscription for admin user');
    }

    // Update subscription to Active
    console.log('[Manual Activate] Updating subscription status to Active');
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'Active',
        updated_at: new Date().toISOString(),
        payment_reference: paymentReference, // Ensure reference is set
      })
      .eq('id', subscription.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Manual Activate] Error updating subscription:', {
        subscription_id: subscription.id,
        error: updateError.message,
      });
      return NextResponse.json(
        { error: 'Failed to update subscription', details: updateError },
        { status: 500 }
      );
    }

    console.log('[Manual Activate] Subscription activated successfully:', {
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
      console.error('[Manual Activate] Error creating notification:', notifError);
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error('[Manual Activate] Error:', {
      error_message: error.message,
      error_stack: error.stack,
    });
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
