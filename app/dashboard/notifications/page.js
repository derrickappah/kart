import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import NotificationsClient from './NotificationsClient';

export const metadata = {
  title: 'Notifications | KART',
  description: 'Stay up to date with your orders, messages, and activity on KART.',
};

const PAGE_SIZE = 20;

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch the first page of notifications
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (notifError) {
    // Log server-side; client will see an empty list with the ability to retry
    console.error('[NotificationsPage] Failed to fetch notifications:', notifError.message);
  }

  // Get unread count (separate COUNT query is fast even on large tables)
  const { count: unreadCount, error: countError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (countError) {
    console.error('[NotificationsPage] Failed to fetch unread count:', countError.message);
  }

  return (
    <NotificationsClient
      initialNotifications={notifications || []}
      initialUnreadCount={unreadCount || 0}
    />
  );
}
