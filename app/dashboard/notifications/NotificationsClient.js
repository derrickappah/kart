'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// Stable Supabase client – created once per module, never re-created on render.
const supabase = createClient();

/** Map a notification type string to a Lucide icon name */
function getIconForType(type) {
  switch (type) {
    case 'order':       return 'shopping_bag';
    case 'message':     return 'chat';
    case 'price_drop':  return 'trending_down';
    case 'system':      return 'notifications';
    case 'review':      return 'star';
    case 'payment':     return 'payments';
    case 'shipping':    return 'local_shipping';
    case 'promotion':   return 'campaign';
    default:            return 'notifications';
  }
}

/** Human-readable time elapsed since a date string */
function getTimeAgo(dateString) {
  const now  = new Date();
  const past = new Date(dateString);
  const diffInMs   = now - past;
  const diffInMins  = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays  = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins  <  1)  return 'Just now';
  if (diffInMins  < 60)  return `${diffInMins}m ago`;
  if (diffInHours < 24)  return `${diffInHours}h ago`;
  if (diffInDays  === 1) return 'Yesterday';
  if (diffInDays  <  7)  return `${diffInDays} days ago`;
  // Older: show the actual date
  return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const PAGE_SIZE = 20;

export default function NotificationsClient({ initialNotifications, initialUnreadCount }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount]     = useState(initialUnreadCount);
  const [loading, setLoading]             = useState(false);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [hasMore, setHasMore]             = useState(initialNotifications.length >= PAGE_SIZE);
  const [error, setError]                 = useState(null);
  const [newArrivals, setNewArrivals]     = useState(0); // for aria-live
  const router = useRouter();
  // Stable ref for the realtime channel so cleanup is reliable regardless of timing
  const channelRef = useRef(null);

  /* ─── Realtime subscription ─────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new, ...prev]);
            setUnreadCount((prev) => prev + 1);
            setNewArrivals((prev) => prev + 1);
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupSubscription();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []); // no deps — supabase is module-scoped and stable

  /* ─── Mark one notification as read ─────────────────────────────────── */
  const markAsRead = useCallback(async (notificationId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      setError('Failed to mark notification as read. Please try again.');
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  /* ─── Mark all notifications as read ────────────────────────────────── */
  const markAllAsRead = async () => {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      setError('Failed to mark all as read. Please try again.');
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
    setLoading(false);
  };

  /* ─── Navigate on click ──────────────────────────────────────────────── */
  const handleNotificationClick = useCallback((notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.related_order_id) {
      router.push(`/dashboard/orders/${notification.related_order_id}`);
    } else if (notification.type === 'message' && notification.related_conversation_id) {
      router.push(`/dashboard/messages/${notification.related_conversation_id}`);
    }
  }, [markAsRead, router]);

  /* ─── Load more (pagination) ─────────────────────────────────────────── */
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingMore(false); return; }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(notifications.length, notifications.length + PAGE_SIZE - 1);

    if (error) {
      setError('Failed to load more notifications.');
    } else {
      setNotifications((prev) => [...prev, ...(data || [])]);
      setHasMore((data || []).length >= PAGE_SIZE);
    }
    setLoadingMore(false);
  };

  /* ─── Keyboard handler for notification items ────────────────────────── */
  const handleKeyDown = (e, notification) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNotificationClick(notification);
    }
  };

  return (
    <div className="bg-white dark:bg-[#242428] font-display text-gray-900 dark:text-gray-100 min-h-screen flex flex-col antialiased">

      {/* ── aria-live region for real-time announcements (screen readers) ── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {newArrivals > 0 && `${newArrivals} new notification${newArrivals > 1 ? 's' : ''} arrived`}
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="w-full bg-white dark:bg-[#242428]">
        <div className="flex items-end justify-between px-5 pb-3 pt-6 max-w-lg mx-auto w-full">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={loading}
              aria-label="Mark all notifications as read"
              className="flex items-center gap-1.5 text-[#387d94] hover:text-[#387d94]/80 active:scale-95 transition-all text-sm font-bold mb-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && (
                <DynamicLucideIcon
                  name="progress_activity"
                  size={14}
                  className="animate-spin"
                />
              )}
              Mark all as read
            </button>
          )}
        </div>
      </header>

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {error && (
        <div
          role="alert"
          className="mx-auto max-w-lg w-full px-4 mb-2"
        >
          <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <DynamicLucideIcon name="error" size={16} className="shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="ml-auto text-red-500 hover:text-red-700 transition-colors"
            >
              <DynamicLucideIcon name="close" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main
        className="flex-1 w-full max-w-lg mx-auto px-4 pb-24 pt-4 overflow-y-auto no-scrollbar"
        aria-label="Notifications list"
      >
        {notifications.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────────── */
          <div
            className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500"
            aria-label="No notifications"
          >
            <DynamicLucideIcon
              name="notifications_off"
              size={56}
              className="mb-4 opacity-30"
            />
            <p className="font-semibold text-base">{"You're all caught up!"}</p>
            <p className="text-sm mt-1 text-gray-400">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3" role="list" aria-label="Notification items">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                role="listitem"
              >
                {/* Using a button for full keyboard + screen-reader accessibility */}
                <button
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(e) => handleKeyDown(e, notification)}
                  aria-label={`${notification.is_read ? '' : 'Unread: '}${notification.title}. ${notification.message}. ${getTimeAgo(notification.created_at)}`}
                  className={`group relative flex w-full items-start gap-4 p-4 rounded-xl transition-all text-left active:scale-[0.99] border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#387d94] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#242428] ${
                    !notification.is_read
                      ? 'bg-[#387d94]/5 dark:bg-[#387d94]/10 border-transparent dark:border-[#387d94]/10 shadow-[0_0_12px_rgba(56,125,148,0.15)]'
                      : 'bg-white dark:bg-[#2A3036] border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  {/* ── Unread indicator dot ────────────────────────────── */}
                  {!notification.is_read && (
                    <span
                      aria-hidden="true"
                      className="absolute top-5 right-4 size-2.5 bg-[#387d94] rounded-full shadow-[0_0_8px_rgba(56,125,148,0.6)]"
                    />
                  )}

                  {/* ── Icon / Avatar ────────────────────────────────────── */}
                  <span aria-hidden="true" className="shrink-0">
                    <span className="size-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[#387d94]">
                      <DynamicLucideIcon
                        name={getIconForType(notification.type)}
                        size={22}
                      />
                    </span>
                  </span>

                  {/* ── Content ──────────────────────────────────────────── */}
                  <span className="flex-1 pr-5 min-w-0">
                    <span
                      className={`block text-[15px] leading-snug font-semibold truncate ${
                        !notification.is_read
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {notification.title}
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 text-left">
                      {notification.message}
                    </span>
                    <span
                      className={`block text-xs font-semibold mt-1.5 ${
                        !notification.is_read ? 'text-[#387d94]' : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {getTimeAgo(notification.created_at)}
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Load More button ─────────────────────────────────────────── */}
        {hasMore && notifications.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A3036] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? (
                <>
                  <DynamicLucideIcon name="progress_activity" size={16} className="animate-spin" />
                  Loading…
                </>
              ) : (
                'Load more'
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
