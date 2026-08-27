'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';

export default function FollowersListModal({
    isOpen,
    onClose,
    userId,
    type = 'followers', // 'followers' or 'following'
    title = null
}) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !userId) return;

        let isMounted = true;
        setLoading(true);
        setError(null);

        async function fetchList() {
            try {
                const res = await fetch(`/api/follow/list?userId=${userId}&type=${type}`);
                const data = await res.json();

                if (!res.ok || data.error) {
                    throw new Error(data.error || 'Failed to load list');
                }

                if (isMounted) {
                    setUsers(data.data || []);
                }
            } catch (err) {
                console.error('Error fetching follow list:', err);
                if (isMounted) {
                    setError('Unable to load users. Please try again.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchList();

        return () => {
            isMounted = false;
        };
    }, [isOpen, userId, type]);

    if (!isOpen) return null;

    const modalTitle = title || (type === 'followers' ? 'Followers' : 'Following');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
                className="relative w-full max-w-md bg-white dark:bg-[#242428] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh] animate-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {modalTitle}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                        aria-label="Close modal"
                    >
                        <DynamicLucideIcon name="close" className="text-xl" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-slate-800/60">
                    {loading ? (
                        <div className="flex flex-col gap-3 py-4">
                            {[1, 2, 3, 4].map((n) => (
                                <div key={n} className="flex items-center gap-3 animate-pulse">
                                    <div className="size-11 rounded-full bg-slate-200 dark:bg-slate-700" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                                        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-sm text-red-500 font-medium">
                            {error}
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-10 flex flex-col items-center justify-center gap-2">
                            <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                <DynamicLucideIcon name="groups" className="text-2xl" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                            </p>
                        </div>
                    ) : (
                        users.map((user) => (
                            <Link
                                key={user.id}
                                href={`/profile/${user.id}`}
                                onClick={onClose}
                                className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-11 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-200 dark:border-slate-700">
                                        {user.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={user.display_name || user.username || 'User'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-base">
                                                {(user.display_name?.[0] || user.username?.[0] || 'U').toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {user.display_name || user.username || 'Anonymous User'}
                                            </p>
                                            {user.is_verified && (
                                                <DynamicLucideIcon name="verified" className="text-primary text-[14px]" />
                                            )}
                                        </div>
                                        {user.username && user.display_name && (
                                            <p className="text-xs text-slate-400 truncate">
                                                @{user.username}
                                            </p>
                                        )}
                                        {(user.campus || user.university) && (
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                {user.campus || user.university}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <DynamicLucideIcon
                                    name="chevron_right"
                                    className="text-slate-400 text-sm group-hover:translate-x-0.5 transition-transform"
                                />
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}