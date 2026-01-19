'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function NotificationsClient({ initialNotifications, initialUnreadCount }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
          }
        )
        .subscribe();

      return channel;
    };

    let channel;
    setupSubscription().then(ch => channel = ch);

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  const markAsRead = async (notificationId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
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

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
    setLoading(false);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.related_order_id) {
      router.push(`/dashboard/orders/${notification.related_order_id}`);
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now - past;
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  };

  return (
    <div className="bg-[#f4f5f6] dark:bg-[#22262a] font-display text-gray-900 dark:text-gray-100 min-h-screen flex flex-col antialiased">
      {/* Notifications Header */}
      <header className="w-full bg-[#f4f5f6] dark:bg-[#22262a]">
        <div className="flex items-end justify-between px-5 pb-3 pt-6 max-w-lg mx-auto w-full">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              disabled={loading}
              className="text-[#387d94] hover:text-[#387d94]/80 active:scale-95 transition-all text-sm font-bold mb-1"
            >
              Mark all as read
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 pb-24 pt-4 overflow-y-auto no-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-20">notifications_off</span>
            <p className="font-medium">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`group relative flex items-start gap-4 p-4 rounded-xl transition-all cursor-pointer active:scale-[0.99] border ${
                  !notification.is_read 
                    ? 'bg-[#387d94]/5 dark:bg-[#387d94]/10 border-transparent dark:border-[#387d94]/10 shadow-glow' 
                    : 'bg-white dark:bg-[#2A3036] border-gray-100 dark:border-gray-700/50 shadow-soft'
                }`}
              >
                {/* Unread Indicator */}
                {!notification.is_read && (
                  <div className="absolute top-5 right-4 size-2.5 bg-[#387d94] rounded-full shadow-[0_0_10px_rgba(56,125,148,0.5)]"></div>
                )}

                {/* Icon/Avatar Placeholder */}
                <div className="shrink-0 relative">
                  <div className="size-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[#387d94]">
                    <span className="material-symbols-outlined text-2xl">
                      {notification.type === 'order' ? 'shopping_bag' : 
                       notification.type === 'message' ? 'chat' : 'notifications'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pr-6">
                  <p className={`text-[15px] leading-snug ${!notification.is_read ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                    <span className="font-bold">{notification.title}</span>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
                  <p className="text-xs text-[#387d94] font-semibold mt-2">{getTimeAgo(notification.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
