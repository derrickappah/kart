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

    // Fetch messages for these conversations to check unread status
    const { data: allMsgs, error: msgError } = await adminClient
      .from('messages')
      .select('conversation_id, sender_id, is_read')
      .in('conversation_id', convIds);

    if (msgError || !allMsgs || allMsgs.length === 0) {
      return NextResponse.json({ unreadCount: 0, unreadConversations: [] });
    }

    // Filter unread messages sent by others
    const unreadMsgs = allMsgs.filter(m => m.sender_id !== user.id && m.is_read !== true);
    const unreadConversationIds = new Set(unreadMsgs.map(m => m.conversation_id));

    return NextResponse.json({
      unreadCount: unreadConversationIds.size,
      unreadConversations: Array.from(unreadConversationIds)
    });
  } catch (err) {
    console.error('[Unread Count] Error:', err);
    return NextResponse.json({ unreadCount: 0, unreadConversations: [], error: err.message });
  }
}
