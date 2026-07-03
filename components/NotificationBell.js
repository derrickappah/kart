'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '../utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const router = useRouter();

  // Stable Supabase client: created once per component instance, never re-created.
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  useEffect(() => {
    let insertChannel;
    let updateChannel;
    let cancelled = false;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      // Fetch initial unread count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!cancelled) {
        setUnreadCount(count || 0);
        setLoading(false);
      }

      // Subscribe to new notifications (INSERT)
      insertChannel = supabase
        .channel('bell-notifications-insert')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (!cancelled) setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();

      // Subscribe to read-status changes (UPDATE) — re-fetch count for accuracy
      updateChannel = supabase
        .channel('bell-notifications-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            if (cancelled) return;
            const { count: newCount } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('is_read', false);
            if (!cancelled) setUnreadCount(newCount || 0);
          }
        )
        .subscribe();
    };

    init();

    return () => {
      cancelled = true;
      if (insertChannel) supabase.removeChannel(insertChannel);
      if (updateChannel) supabase.removeChannel(updateChannel);
    };
  }, []); // supabase is stable via ref — no deps needed

  // Badge label: cap display at 99 for readability, show the full count to screen readers
  const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);
  const ariaLabel    = unreadCount > 0
    ? `Notifications — ${unreadCount} unread`
    : 'Notifications';

  return (
    <button
      className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-[#2d2d32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1daddd] focus-visible:ring-offset-1"
      onClick={() => router.push('/dashboard/notifications')}
      aria-label={ariaLabel}
    >
      <DynamicLucideIcon name="notifications" size={26} className="text-gray-900 dark:text-white" />

      {/* Badge — shown once loading is done and there are unread items */}
      {!loading && unreadCount > 0 && (
        <span
          aria-hidden="true"
          className={`absolute flex items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-[#242428] text-white font-bold leading-none ${
            unreadCount > 9
              ? 'right-0.5 top-0.5 h-[18px] min-w-[18px] px-1 text-[9px]'
              : 'right-1.5 top-1.5 h-3 w-3 text-[8px]'
          }`}
        >
          {unreadCount > 9 ? displayCount : ''}
        </span>
      )}
    </button>
  );
}
