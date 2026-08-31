import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const tokenType = body.tokenType || (body.subscription ? 'web' : null);
    const platform = body.platform || (tokenType === 'fcm' ? 'android' : 'web');
    const deviceInfo = body.deviceInfo || {};

    if (!tokenType) {
      return NextResponse.json({ error: 'Invalid subscription payload: tokenType is required' }, { status: 400 });
    }

    let token = '';
    let subscriptionData = {};

    if (tokenType === 'web') {
      const subscription = body.subscription;
      if (!subscription || !subscription.endpoint) {
        return NextResponse.json({ error: 'Invalid web push subscription payload' }, { status: 400 });
      }
      token = subscription.endpoint;
      subscriptionData = subscription;
    } else if (tokenType === 'fcm') {
      token = body.token;
      if (!token) {
        return NextResponse.json({ error: 'Missing FCM token' }, { status: 400 });
      }
      subscriptionData = { fcmToken: token };
    } else {
      return NextResponse.json({ error: `Unsupported token type: ${tokenType}` }, { status: 400 });
    }

    const adminClient = createServiceRoleClient ? await createServiceRoleClient() : supabase;

    // 1. Upsert into push_subscriptions table
    const { error: dbError } = await adminClient
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          token_type: tokenType,
          platform,
          token,
          subscription_data: subscriptionData,
          device_info: deviceInfo,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id, token' }
      );

    if (dbError) {
      console.warn('[Subscribe API] Database upsert warning:', dbError.message);
    }

    // 2. Also keep profiles.notification_prefs updated for backward compatibility
    try {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('notification_prefs')
        .eq('id', user.id)
        .maybeSingle();

      const prefs = profile?.notification_prefs || {
        push_orders: true,
        push_messages: true,
        push_promotions: false,
        email_weekly: true
      };

      if (tokenType === 'web') {
        const subs = prefs.web_push_subscriptions || [];
        const newSubs = subs.filter(s => s?.endpoint !== token);
        newSubs.push(subscriptionData);

        await adminClient
          .from('profiles')
          .update({
            notification_prefs: {
              ...prefs,
              web_push_subscriptions: newSubs
            }
          })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('[Subscribe API] Backward compatibility update error:', err.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription registered successfully',
      platform,
      tokenType
    });
  } catch (err) {
    console.error('[Subscribe API] Handler error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, token, platform, removeAllForDevice } = body;

    const targetToken = token || endpoint;
    const adminClient = createServiceRoleClient ? await createServiceRoleClient() : supabase;

    // 1. Deactivate / remove in push_subscriptions
    if (targetToken) {
      await adminClient
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('token', targetToken);
    } else if (removeAllForDevice && platform) {
      await adminClient
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('platform', platform);
    }

    // 2. Cleanup legacy profiles.notification_prefs if web endpoint was provided
    if (endpoint) {
      try {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('notification_prefs')
          .eq('id', user.id)
          .maybeSingle();

        const prefs = profile?.notification_prefs || {};
        const subs = prefs.web_push_subscriptions || [];
        const newSubs = subs.filter(s => s?.endpoint !== endpoint);

        await adminClient
          .from('profiles')
          .update({
            notification_prefs: {
              ...prefs,
              web_push_subscriptions: newSubs
            }
          })
          .eq('id', user.id);
      } catch (err) {
        console.error('[Unsubscribe API] Profile cleanup error:', err.message);
      }
    }

    return NextResponse.json({ success: true, message: 'Subscription deactivated successfully' });
  } catch (err) {
    console.error('[Unsubscribe API] Error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
