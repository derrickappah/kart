import { triggerPushNotification } from '@/lib/notifications';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const internalSecret = req.headers.get('x-internal-secret');
    const isValidSecret = internalSecret && internalSecret === process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!user && !isValidSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { user_id, title, message, related_order_id, type, url, data } = body;

    if (!user_id || !title || !message) {
      return NextResponse.json({ error: 'Missing required parameters: user_id, title, message' }, { status: 400 });
    }

    // If calling as normal user, check if they are admin or sending to themselves
    if (user && !isValidSecret) {
      if (user.id !== user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (!profile?.is_admin) {
          return NextResponse.json({ error: 'Forbidden: Admin access required to notify other users' }, { status: 403 });
        }
      }
    }

    // Trigger push notification delivery
    await triggerPushNotification(user_id, title, message, related_order_id, {
      type: type || 'order',
      url: url || null,
      data: data || {}
    });

    return NextResponse.json({ success: true, message: 'Push notification triggered successfully' });
  } catch (err) {
    console.error('[Push API] Request error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
