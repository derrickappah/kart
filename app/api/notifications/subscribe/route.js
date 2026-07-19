import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await req.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
    }

    // Fetch existing profile
    const { data: profile, error: getError } = await supabase
      .from('profiles')
      .select('notification_prefs')
      .eq('id', user.id)
      .single();

    if (getError) {
      return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
    }

    const prefs = profile.notification_prefs || {};
    const subs = prefs.web_push_subscriptions || [];

    // Filter out duplicate endpoints and append new one
    const newSubs = subs.filter(s => s.endpoint !== subscription.endpoint);
    newSubs.push(subscription);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        notification_prefs: {
          ...prefs,
          web_push_subscriptions: newSubs
        }
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Subscription registered successfully' });
  } catch (err) {
    console.error('[Subscribe API] Error:', err.message);
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

    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    const { data: profile, error: getError } = await supabase
      .from('profiles')
      .select('notification_prefs')
      .eq('id', user.id)
      .single();

    if (getError) {
      return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
    }

    const prefs = profile.notification_prefs || {};
    const subs = prefs.web_push_subscriptions || [];

    const newSubs = subs.filter(s => s.endpoint !== endpoint);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        notification_prefs: {
          ...prefs,
          web_push_subscriptions: newSubs
        }
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Subscription removed successfully' });
  } catch (err) {
    console.error('[Unsubscribe API] Error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
