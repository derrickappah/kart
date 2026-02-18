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
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Check if user already has an active or pending subscription
    const { data: existingSub, error: existingError } = await supabase
      .from('subscriptions')
      .select('status, end_date')
      .eq('user_id', user.id)
      .in('status', ['Active', 'Pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSub) {
      return NextResponse.json({
        error: existingSub.status === 'Active'
          ? 'You already have an active subscription. Please wait for it to expire before renewing.'
          : 'You have a pending subscription purchase. Please complete it or wait for it to expire.'
      }, { status: 400 });
    }

    // Fetch plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.duration_months);

    // Create subscription record (pending payment)
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        status: 'Pending',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        auto_renew: false,
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    // Initialize payment with Paystack
    const reference = `sub_${subscription.id}_${Date.now()}`;

    try {
      // Initialize payment - DO NOT send currency parameter
      // Paystack will automatically use your account's default currency
      // This prevents "Currency not supported" errors
      const paymentRequest = {
        amount: plan.price,
        email: profile?.email || user.email,
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || (request.headers.get('origin') || 'http://localhost:3000')}/subscriptions/success?subscriptionId=${subscription.id}`,
        // Explicitly pass undefined to ensure no currency is sent
        currency: undefined,
        metadata: {
          subscription_id: subscription.id,
          user_id: user.id,
          plan_id: plan.id,
          type: 'subscription',
        },
      };

      console.log('[Subscription API] Initializing payment:', {
        subscription_id: subscription.id,
        plan_id: plan.id,
        plan_name: plan.name,
        amount: paymentRequest.amount,
        email: paymentRequest.email,
        reference: paymentRequest.reference,
        currency_sent: paymentRequest.currency || '(not sent)',
      });

      const paymentData = await initializePayment(paymentRequest);

      // Update subscription with payment reference
      await supabase
        .from('subscriptions')
        .update({ payment_reference: reference })
        .eq('id', subscription.id);

      // Validate payment data before returning
      if (!paymentData.data) {
        console.error('[Subscription API] Invalid payment data structure:', paymentData);
        await supabase.from('subscriptions').delete().eq('id', subscription.id);
        return NextResponse.json({
          error: 'Invalid payment response from Paystack. Please try again.'
        }, { status: 500 });
      }

      if (!paymentData.data.authorization_url && !paymentData.data.access_code) {
        console.error('[Subscription API] Missing authorization_url and access_code:', paymentData);
        await supabase.from('subscriptions').delete().eq('id', subscription.id);
        return NextResponse.json({
          error: 'Payment initialization failed. Missing authorization data.'
        }, { status: 500 });
      }

      console.log('[Subscription API] Payment initialized successfully:', {
        has_authorization_url: !!paymentData.data.authorization_url,
        has_access_code: !!paymentData.data.access_code,
        reference: paymentData.data.reference || reference,
      });

      // Return payment details for popup
      return NextResponse.json({
        success: true,
        authorization_url: paymentData.data.authorization_url,
        access_code: paymentData.data.access_code,
        reference: paymentData.data.reference || reference,
        subscription_id: subscription.id,
        email: profile?.email || user.email,
        amount: plan.price,
        paystack_public_key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''
      });
    } catch (paymentError) {
      // Detailed error logging
      console.error('[Subscription API] Payment initialization error:', {
        error_message: paymentError.message,
        error_stack: paymentError.stack,
        subscription_id: subscription.id,
        plan_id: plan.id,
        plan_price: plan.price,
        user_email: profile?.email || user.email,
        reference: reference,
        environment: {
          PAYSTACK_USE_CURRENCY: process.env.PAYSTACK_USE_CURRENCY || '(not set)',
          PAYSTACK_CURRENCY: process.env.PAYSTACK_CURRENCY || '(not set)',
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '(not set)',
        },
        request_details: {
          amount: plan.price,
          email: profile?.email || user.email,
          reference: reference,
          currency_parameter: 'undefined (not sent)',
        },
      });

      // If currency error, automatically retry without currency parameter
      if (paymentError.message && (paymentError.message.includes('Currency') || paymentError.message.includes('currency'))) {
        try {
          console.log('Currency error detected, retrying without currency parameter...');
          // Retry without currency parameter - let Paystack use account default
          const retryPaymentData = await initializePayment({
            amount: plan.price,
            email: profile?.email || user.email,
            reference: `sub_${subscription.id}_${Date.now()}_retry`,
            callback_url: `${process.env.NEXT_PUBLIC_APP_URL || (request.headers.get('origin') || 'http://localhost:3000')}/subscriptions/success?subscriptionId=${subscription.id}`,
            currency: undefined, // Explicitly don't send currency
            metadata: {
              subscription_id: subscription.id,
              user_id: user.id,
              plan_id: plan.id,
              type: 'subscription',
            },
          });

          // Update subscription with new payment reference
          await supabase
            .from('subscriptions')
            .update({ payment_reference: retryPaymentData.data.reference })
            .eq('id', subscription.id);

          return NextResponse.json({
            success: true,
            authorization_url: retryPaymentData.data.authorization_url,
            access_code: retryPaymentData.data.access_code,
            reference: retryPaymentData.data.reference,
            subscription_id: subscription.id,
            email: profile?.email || user.email,
            amount: plan.price,
            paystack_public_key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''
          });
        } catch (retryError) {
          console.error('[Subscription API] Retry payment error:', {
            error_message: retryError.message,
            error_stack: retryError.stack,
            subscription_id: subscription.id,
            retry_reference: `sub_${subscription.id}_${Date.now()}_retry`,
          });
          // If retry also fails, continue to error handling below
        }
      }

      // Delete subscription if payment fails
      await supabase.from('subscriptions').delete().eq('id', subscription.id);

      let errorMessage = paymentError.message || 'Failed to initialize payment';

      // Provide helpful messages for common errors
      if (paymentError.message?.includes('Currency') || paymentError.message?.includes('currency')) {
        errorMessage = 'Currency not supported. Please check your Paystack account settings. The system does not send currency by default - this error suggests a Paystack account configuration issue. Please verify your account currency in the Paystack dashboard.';
      } else if (paymentError.message?.includes('channel') || paymentError.message?.includes('No active channel')) {
        errorMessage = 'No active payment channel. Please activate your Paystack account and set up payment channels in the Paystack dashboard.';
      }

      console.error('[Subscription API] Returning error to client:', {
        error_message: errorMessage,
        original_error: paymentError.message,
        subscription_id: subscription.id,
      });

      return NextResponse.json({
        error: errorMessage,
        debug_info: process.env.NODE_ENV === 'development' ? {
          original_error: paymentError.message,
          subscription_id: subscription.id,
          plan_id: plan.id,
        } : undefined,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Subscription API] Unexpected error:', {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
    });
    return NextResponse.json({
      error: error.message || 'Server error',
      debug_info: process.env.NODE_ENV === 'development' ? {
        error_name: error.name,
        error_message: error.message,
      } : undefined,
    }, { status: 500 });
  }
}
