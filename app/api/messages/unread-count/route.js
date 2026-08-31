import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ unreadCount: 0, unreadConversations: [] });
    }

    const adminClient = createServiceRoleClient ? createServiceRoleClient() : supabase;

    // Find all conversations where current user is a participant
    let convs = [];
    const { data: directConvs, error: convError } = await adminClient
      .from('conversations')
      .select('id, participants')
      .contains('participants', [user.id]);

    if (convError || !directConvs || directConvs.length === 0) {
      // Fallback: fetch conversations and filter in JS
      const { data: allConvs } = await adminClient
        .from('conversations')
        .select('id, participants');
      convs = (allConvs || []).filter(c => Array.isArray(c.participants) && c.participants.includes(user.id));
    } else {
      convs = directConvs;
    }

    if (!convs || convs.length === 0) {
      return NextResponse.json({ unreadCount: 0, unreadConversations: [] });
    }

    const convIds = convs.map(c => c.id);

    // Find unread messages in these conversations sent by other users
    // Matches messages where is_read is false OR is_read IS NULL
    const { data: unreadMsgs, error: msgError } = await adminClient
      .from('messages')
      .select('conversation_id, sender_id, is_read')
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .or('is_read.eq.false,is_read.is.null');

    if (msgError || !unreadMsgs || unreadMsgs.length === 0) {
      return NextResponse.json({ unreadCount: 0, unreadConversations: [] });
    }

    // Filter to ensure sender_id is not current user and message is unread
    const filteredUnread = unreadMsgs.filter(m => m.sender_id !== user.id && m.is_read !== true);
    const unreadConversationIds = new Set(filteredUnread.map(m => m.conversation_id));

    return NextResponse.json({
      unreadCount: unreadConversationIds.size,
      unreadConversations: Array.from(unreadConversationIds)
    });
  } catch (err) {
    console.error('[Unread Count] Error:', err);
    return NextResponse.json({ unreadCount: 0, unreadConversations: [], error: err.message });
  }
}
