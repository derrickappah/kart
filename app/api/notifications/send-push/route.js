import { triggerPushNotification } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, title, message, related_order_id } = body;

    if (!user_id || !title || !message) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Trigger push notification delivery and await it
    try {
      await triggerPushNotification(user_id, title, message, related_order_id);
    } catch (err) {
      console.error('[Push Webhook] Delivery failed:', err.message);
    }

    return NextResponse.json({ success: true, message: 'Push notification triggered' });
  } catch (err) {
    console.error('[Push Webhook] Request error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
