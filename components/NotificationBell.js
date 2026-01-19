'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);
      setLoading(false);
    };

    fetchUnreadCount();

    // Subscribe to new notifications
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();

      return channel;
    };

    let channel;
    setupSubscription().then((ch) => {
      channel = ch;
    });

    // Also listen for updates (when notifications are marked as read)
    const updateChannel = supabase
      .channel('notifications-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (updateChannel) supabase.removeChannel(updateChannel);
    };
  }, [supabase]);

  if (loading) {
    return null;
  }

  return (
    <button
      className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-[#2d2d32]"
      onClick={() => router.push('/dashboard/notifications')}
      aria-label="Notifications"
    >
      <span className="material-symbols-outlined text-gray-900 dark:text-white" style={{ fontSize: '28px' }}>
        notifications
      </span>
      {unreadCount > 0 && (
        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#242428]"></span>
      )}
    </button>
  );
}
