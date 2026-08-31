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
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    }

    const adminClient = createServiceRoleClient ? await createServiceRoleClient() : supabase;

    // Verify conversation exists and user is a participant
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mark unread messages sent by others in this conversation as read
    const { error: updateError, count } = await adminClient
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    if (updateError) {
      console.error('[Mark Read] DB Error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: count ?? 0 });
  } catch (err) {
    console.error('[Mark Read] Server Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
