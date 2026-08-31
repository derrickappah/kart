import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ unreadCount: 0 });
    }

    const adminClient = createServiceRoleClient ? await createServiceRoleClient() : supabase;

    // Find all conversations where current user is a participant
    const { data: convs, error: convError } = await adminClient
      .from('conversations')
      .select('id')
      .contains('participants', [user.id]);

    if (convError || !convs || convs.length === 0) {
      return NextResponse.json({ unreadCount: 0 });
    }

    const convIds = convs.map(c => c.id);

    // Find unread messages in these conversations sent by other users
    const { data: unreadMsgs, error: msgError } = await adminClient
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    if (msgError || !unreadMsgs) {
      return NextResponse.json({ unreadCount: 0 });
    }

    // Count unique conversation threads that have unread messages
    const unreadConversationIds = new Set(unreadMsgs.map(m => m.conversation_id));

    return NextResponse.json({
      unreadCount: unreadConversationIds.size,
      unreadConversations: Array.from(unreadConversationIds)
    });
  } catch (err) {
    console.error('[Unread Count] Error:', err);
    return NextResponse.json({ unreadCount: 0, error: err.message });
  }
}
