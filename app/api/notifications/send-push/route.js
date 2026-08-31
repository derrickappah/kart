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
    const { user_id, title, message, related_order_id, type, url, data, force } = body;

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
    const result = await triggerPushNotification(user_id, title, message, related_order_id, {
      type: type || 'order',
      url: url || null,
      data: data || {},
      force: force || (user && user.id === user_id) // Allow test pushes to same user to bypass category toggles
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.message || 'Push delivery failed',
        result
      }, { status: result.total === 0 ? 400 : 500 });
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Push notification triggered successfully',
      result
    });
  } catch (err) {
    console.error('[Push API] Request error:', err.message);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
