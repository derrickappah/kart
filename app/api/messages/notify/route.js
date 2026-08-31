import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { triggerPushNotification, createNotification } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, messageContent } = body;

    if (!conversationId || !messageContent) {
      return NextResponse.json({ error: 'Missing required parameters: conversationId, messageContent' }, { status: 400 });
    }

    const adminClient = createServiceRoleClient ? await createServiceRoleClient() : supabase;

    // 1. Fetch conversation details to verify membership and find recipient
    const { data: conversation, error: convError } = await adminClient
      .from('conversations')
      .select('id, participants')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const participants = conversation.participants || [];
    if (!participants.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden: You are not a participant in this conversation' }, { status: 403 });
    }

    const recipientId = participants.find(p => p !== user.id);
    if (!recipientId) {
      return NextResponse.json({ success: true, message: 'No other participant to notify' });
    }

    // 2. Fetch sender profile display name and avatar photo
    const { data: senderProfile } = await adminClient
      .from('profiles')
      .select('display_name, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    const senderName = senderProfile?.display_name || senderProfile?.full_name || 'Someone on KART';
    const senderAvatar = senderProfile?.avatar_url || null;

    const cleanContent = messageContent.startsWith('http') && (messageContent.includes('storage') || messageContent.includes('chat-attachments'))
      ? '📷 Sent an attachment'
      : messageContent.length > 100 ? `${messageContent.slice(0, 97)}...` : messageContent;

    const title = `Message from ${senderName}`;

    // 3. Create in-app notification & dispatch push notification with profile photo
    try {
      await createNotification(adminClient, {
        userId: recipientId,
        type: 'message',
        title: title,
        message: cleanContent,
        relatedOrderId: null,
        options: {
          icon: senderAvatar || '/icon.png',
          avatarUrl: senderAvatar,
          url: `/dashboard/messages/${conversationId}`,
          data: {
            conversation_id: conversationId,
            avatar_url: senderAvatar,
            sender_id: user.id
          }
        }
      });
    } catch (notifErr) {
      console.warn('[Message Notify] createNotification error, falling back to direct push:', notifErr.message);
      await triggerPushNotification(recipientId, title, cleanContent, null, {
        type: 'message',
        icon: senderAvatar || '/icon.png',
        avatarUrl: senderAvatar,
        url: `/dashboard/messages/${conversationId}`,
        data: {
          conversation_id: conversationId,
          avatar_url: senderAvatar,
          sender_id: user.id
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Push notification triggered with sender profile photo' });
  } catch (err) {
    console.error('[Message Notify] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
