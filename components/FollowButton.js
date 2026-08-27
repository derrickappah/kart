'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { createClient } from '@/utils/supabase/client';

export default function FollowButton({
    targetUserId,
    initialIsFollowing = false,
    onFollowChange,
    className = '',
    size = 'md'
}) {
    const router = useRouter();
    const supabase = createClient();
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const [loading, setLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        setIsFollowing(initialIsFollowing);
    }, [initialIsFollowing]);

    useEffect(() => {
        let isMounted = true;
        async function checkUser() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (isMounted && user) {
                    setCurrentUserId(user.id);
                    // Fetch real-time initial follow state if targetUserId is set
                    if (targetUserId && user.id !== targetUserId) {
                        const { data } = await supabase
                            .from('follows')
                            .select('id')
                            .eq('follower_id', user.id)
                            .eq('following_id', targetUserId)
                            .maybeSingle();

                        if (isMounted) {
                            setIsFollowing(!!data);
                        }
                    }
                }
            } catch (err) {
                console.error('Error getting current user:', err);
            }
        }
        checkUser();
        return () => { isMounted = false; };
    }, [targetUserId, supabase]);

    // Don't render follow button if viewing own profile
    if (currentUserId && currentUserId === targetUserId) {
        return null;
    }

    const handleToggleFollow = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!currentUserId) {
            router.push('/login');
            return;
        }

        if (loading) return;

        const previousState = isFollowing;
        const nextState = !previousState;
        
        // Optimistic UI update
        setIsFollowing(nextState);
        setLoading(true);

        try {
            const res = await fetch('/api/follow/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followingId: targetUserId })
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                // Revert on error
                setIsFollowing(previousState);
                console.error('Failed to toggle follow:', data.error);
            } else {
                setIsFollowing(data.isFollowing);
                if (onFollowChange) {
                    onFollowChange(data);
                }
            }
        } catch (err) {
            setIsFollowing(previousState);
            console.error('Network error toggling follow:', err);
        } finally {
            setLoading(false);
        }
    };

    const sizeClasses = size === 'sm'
        ? 'py-2 px-3.5 text-xs'
        : (size === 'lg' ? 'py-4 px-6 text-base' : 'py-3 px-4 text-sm');

    if (isFollowing) {
        return (
            <button
                type="button"
                onClick={handleToggleFollow}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={loading}
                className={`flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all duration-200 active:scale-[0.98] ${
                    isHovered
                        ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                } ${sizeClasses} ${className}`}
                title={isHovered ? 'Unfollow' : 'Following'}
            >
                <DynamicLucideIcon
                    name={isHovered ? 'person_remove' : 'check'}
                    className="text-base transition-transform"
                />
                <span>{isHovered ? 'Unfollow' : 'Following'}</span>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleToggleFollow}
            disabled={loading}
            className={`flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#2d2d32] dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold border border-slate-200 dark:border-slate-700/60 shadow-sm active:scale-[0.98] transition-all duration-200 ${sizeClasses} ${className}`}
            title="Follow Seller"
        >
            <DynamicLucideIcon name="person_add" className="text-base" />
            <span>Follow</span>
        </button>
    );
}