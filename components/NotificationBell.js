'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../utils/supabase/client';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let insertChannel;
    let updateChannel;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch initial count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
      setLoading(false);

      // Subscribe to new notifications
      insertChannel = supabase
        .channel('notifications-insert')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => setUnreadCount((prev) => prev + 1)
        )
        .subscribe();

      // Subscribe to read status updates
      updateChannel = supabase
        .channel('notifications-updates')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          async () => {
            const { count: newCount } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('is_read', false);
            setUnreadCount(newCount || 0);
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (insertChannel) supabase.removeChannel(insertChannel);
      if (updateChannel) supabase.removeChannel(updateChannel);
    };
  }, []);

  if (loading) {
    return <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-[#2d2d32] animate-pulse" />;
  }

  return (
    <button
      className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-[#2d2d32] overflow-hidden"
      onClick={() => router.push('/dashboard/notifications')}
      aria-label="Notifications"
    >
      <span className="material-symbols-outlined text-gray-900 dark:text-white w-[28px] h-[28px] overflow-hidden flex justify-center items-center" style={{ fontSize: '28px' }}>
        notifications
      </span>
      {unreadCount > 0 && (
        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#242428]"></span>
      )}
    </button>
  );
}

