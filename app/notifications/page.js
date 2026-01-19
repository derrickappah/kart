'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import Link from 'next/link';

export default function NotificationsPage() {
    const supabase = createClient();
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = '/login';
                return;
            }
            setUser(user);

            // Fetch notifications
            const { data: notifications, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (notifications) {
                setNotifications(notifications);
            }
            setLoading(false);
        };

        fetchNotifications();
    }, [supabase]);

    const markAllAsRead = async () => {
        if (!user) return;

        // Update all unread notifications to read
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        // Update local state
        setNotifications(prev =>
            prev.map(notification => ({ ...notification, is_read: true }))
        );
    };

    if (loading) {
        return (
            <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display text-gray-900 dark:text-gray-100 min-h-screen flex flex-col antialiased">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    // Group notifications by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groupedNotifications = notifications.reduce((groups, notification) => {
        const notificationDate = new Date(notification.created_at);
        notificationDate.setHours(0, 0, 0, 0);

        const isToday = notificationDate.getTime() === today.getTime();
        const groupKey = isToday ? 'Today' : 'Earlier';

        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(notification);
        return groups;
    }, {});

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display text-gray-900 dark:text-gray-100 min-h-screen flex flex-col antialiased notifications-page">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 w-full bg-[#f6f7f8]/90 dark:bg-[#111d21]/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
                <div className="flex items-end justify-between px-5 pb-3 pt-6 max-w-lg mx-auto w-full">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Notifications
                    </h1>
                    <button
                        onClick={markAllAsRead}
                        className="text-[#1daddd] hover:text-[#1daddd]/80 active:scale-95 transition-all text-sm font-bold mb-1"
                    >
                        Mark all as read
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-lg mx-auto px-4 pb-24 overflow-y-auto pt-2">
                {/* Group: TODAY */}
                {groupedNotifications['Today'] && (
                    <section className="mt-4">
                        <div className="flex items-center justify-between px-1 mb-3">
                            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Today</h2>
                        </div>
                        <div className="space-y-3">
                            {groupedNotifications['Today'].map((notification) => (
                                <NotificationItem key={notification.id} notification={notification} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Group: EARLIER */}
                {groupedNotifications['Earlier'] && (
                    <section className="mt-8">
                        <div className="flex items-center justify-between px-1 mb-3">
                            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Earlier</h2>
                        </div>
                        <div className="space-y-3">
                            {groupedNotifications['Earlier'].map((notification) => (
                                <NotificationItem key={notification.id} notification={notification} />
                            ))}
                        </div>
                    </section>
                )}

                {notifications.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">notifications</span>
                        <p className="text-gray-500 dark:text-gray-400 text-center">No notifications yet</p>
                    </div>
                )}

                {/* End of list padding */}
                <div className="h-8"></div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 z-50 w-full bg-white dark:bg-[#2A3036] border-t border-gray-200 dark:border-gray-800">
                <div className="flex justify-around items-center h-[60px] max-w-lg mx-auto">
                    <Link href="/" className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-[#1daddd] transition-colors">
                        <span className="material-symbols-outlined text-2xl mb-0.5">home</span>
                        <span className="text-[10px] font-medium">Home</span>
                    </Link>
                    <Link href="/marketplace" className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-[#1daddd] transition-colors">
                        <span className="material-symbols-outlined text-2xl mb-0.5">search</span>
                        <span className="text-[10px] font-medium">Browse</span>
                    </Link>
                    <Link href="/dashboard/seller/create" className="flex flex-col items-center justify-center w-full relative -top-6">
                        <div className="size-14 bg-[#1daddd] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-3xl">add</span>
                        </div>
                    </Link>
                    <Link href="/notifications" className="flex flex-col items-center justify-center w-full h-full text-[#1daddd]">
                        <span className="material-symbols-outlined text-2xl mb-0.5 fill-current">notifications</span>
                        <span className="text-[10px] font-medium">Alerts</span>
                    </Link>
                    <Link href="/profile" className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-[#1daddd] transition-colors">
                        <span className="material-symbols-outlined text-2xl mb-0.5">person</span>
                        <span className="text-[10px] font-medium">Profile</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}

function NotificationItem({ notification }) {
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        } else if (diffInMinutes < 1440) { // 24 hours
            return `${Math.floor(diffInMinutes / 60)}h ago`;
        } else {
            const diffInDays = Math.floor(diffInMinutes / 1440);
            if (diffInDays === 1) return 'Yesterday';
            return `${diffInDays} days ago`;
        }
    };

    const getNotificationContent = () => {
        // This is a simplified version - you might want to expand this based on notification types
        return {
            title: notification.title || 'Notification',
            message: notification.message || 'You have a new notification',
            type: notification.type || 'system',
            image: notification.image_url,
            avatar: notification.avatar_url
        };
    };

    const content = getNotificationContent();

    // Sample notifications to match the design
    const sampleNotifications = [
        {
            id: 'sample-1',
            type: 'price_drop',
            title: 'Statistics 101 Textbook',
            message: 'price dropped.',
            price: 'Now $45',
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCw2lhXuAw9JUwW8ISP2dXOqUvlpah2n7pQIdoK9DADfxJN35II58VGYtBvbXzU3bTLUPtX5n2mWUwEcI93apzULB8nTkVf01mzFxW-_TpFMEbUyKBRdqXJ2Gejmv16KsMNEqdpPtZJysu1SPu6d0mEl59JBin5nmrXLnZveAuJfrfgMMg4O7dFYfJ50CnVu1l2gytefNQeOLk7uWun4GeWGJyb6kBPedKG7i5m7QBr0KaF1s0n08rIP5dpEIosjpLIKB-6OmkhQQRJ',
            is_read: false,
            created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() // 2 minutes ago
        },
        {
            id: 'sample-2',
            type: 'message',
            title: 'Sarah J.',
            message: 'sent you an offer for "Dorm Lamp"',
            preview: '"Hey! Would you take $15 if I pick it up..."',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqB50VRBSflybSLeHyfJHKuXIlrqqk4Ab_EnY8bmTMYV9nbv7j2iNE6QtYJzg-EzoKNckdVKGAcl5g5rWkHTZsiOrQV_D3HL79VFBhf-9R-ujL2yUo858QoBjJC6e307fQQhlsvpYJnBBkBW26oa3m8gbjvqZd4jEMyJfJZUF0AwTfgo_Jo8I9zsu-nvHj0bEBZYGDhglqqFtBZNUcoOqU68XgGqe2W8PwYpX-r1g2rokn65rRpBUME7u6sUxsRsYtS5hIZv2QJdU_',
            is_read: false,
            created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
        },
        {
            id: 'sample-3',
            type: 'system',
            title: 'Listing Approved',
            message: 'Your listing "Graphing Calculator" is now live on the marketplace.',
            is_read: true,
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        },
        {
            id: 'sample-4',
            type: 'message',
            title: 'Mike T.',
            message: 'replied to your message.',
            preview: '"Sounds good. See you at the library."',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMU4T6GRCDyTBZ2swcEKPABogaEc5wZUIJ4pfSrc8byPVlcfgiCnLevUn_NdTei40yapyt9_Rbhd0NjixlsCIVL6uP4rtbpklxXRPM3wn5i0w8o5_p-T96Pk0VwSAyPUHFabCetsJccX7waKo6bzDJeigmvvrUbLyP7MjPrxxXlXBV9_qZwsPc1oPrBaME2fpe5RVRZRW91akG5Lls6jYyK3nUqfE6Oiwlw0adJv55a8r2RWoZMZz9TxzbVIiqkRU2ycbX1I8KO36G',
            is_read: true,
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
        },
        {
            id: 'sample-5',
            type: 'system',
            title: 'Hot Item Alert',
            message: '3 people saved your "Calculus II Notes" listing today.',
            is_read: true,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
        }
    ];

    // Use real notifications if available, otherwise show sample data
    const displayNotification = notifications.length > 0 ? notification : sampleNotifications.find(n => n.id === notification?.id) || sampleNotifications[0];

    return (
        <div className={`group relative flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-transform active:scale-[0.99] border ${
            !displayNotification.is_read
                ? 'bg-[#1daddd]/5 dark:bg-[#1daddd]/10 border-transparent dark:border-[#1daddd]/10'
                : 'bg-white dark:bg-[#2A3036] border-gray-100 dark:border-gray-700/50'
        }`}>
            {/* Unread Indicator */}
            {!displayNotification.is_read && (
                <div className="absolute top-5 right-4 size-2.5 bg-[#1daddd] rounded-full"></div>
            )}

            {/* Thumbnail/Icon */}
            <div className="shrink-0 relative">
                {displayNotification.type === 'price_drop' && displayNotification.image && (
                    <div className="size-14 rounded-lg bg-gray-200 dark:bg-gray-700 bg-cover bg-center shadow-sm"
                         style={{ backgroundImage: `url('${displayNotification.image}')` }}>
                        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-[#2A3036] shadow-sm">
                            -$15
                        </div>
                    </div>
                )}
                {displayNotification.type === 'message' && displayNotification.avatar && (
                    <div className="size-14 rounded-full bg-gray-200 dark:bg-gray-700 bg-cover bg-center border-2 border-white dark:border-gray-600 shadow-sm"
                         style={{ backgroundImage: `url('${displayNotification.avatar}')` }}>
                        <div className="absolute bottom-0 right-0 bg-[#1daddd] text-white p-1 rounded-full border-2 border-white dark:border-[#2A3036] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[10px] leading-none">chat</span>
                        </div>
                    </div>
                )}
                {displayNotification.type === 'system' && (
                    <div className="size-14 rounded-full bg-[#1daddd]/10 dark:bg-[#1daddd]/20 flex items-center justify-center text-[#1daddd]">
                        <span className="material-symbols-outlined text-2xl">
                            {displayNotification.title.includes('Approved') ? 'verified' : 'local_fire_department'}
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 pr-6">
                <p className="text-[15px] leading-snug text-gray-900 dark:text-white">
                    <span className="font-bold">{displayNotification.title}</span> {displayNotification.message}
                </p>
                {displayNotification.price && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{displayNotification.price}</p>
                )}
                {displayNotification.preview && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{displayNotification.preview}</p>
                )}
                <p className={`text-xs font-semibold mt-2 ${
                    !displayNotification.is_read ? 'text-[#1daddd]' : 'text-gray-400 dark:text-gray-500'
                }`}>
                    {formatTime(displayNotification.created_at)}
                </p>
            </div>
        </div>
    );
}