'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

/**
 * WishlistButton — toggles a product in/out of the current user's wishlist.
 *
 * The Supabase client is created inside the component (not at module level)
 * to prevent cross-user data leakage in SSR scenarios and avoid stale sessions.
 */
export default function WishlistButton({ productId, initialIsSaved }) {
    const [isSaved, setIsSaved] = useState(initialIsSaved);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleToggle = async (e) => {
        // CRITICAL: Prevent navigation to the product detail page
        e.preventDefault();
        e.stopPropagation();

        if (loading) return;

        // Create client per-interaction to ensure fresh session context
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        setLoading(true);
        // Optimistic UI
        const previousState = isSaved;
        setIsSaved(!previousState);

        try {
            const apiEndpoint = previousState ? '/api/wishlist/remove' : '/api/wishlist/add';
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            });

            if (!response.ok) {
                throw new Error('Failed to update wishlist');
            }
        } catch (error) {
            console.error('Wishlist error:', error);
            // Revert on error
            setIsSaved(previousState);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            type="button"
            aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
            aria-pressed={isSaved}
            disabled={loading}
            className="absolute top-2 right-2 h-9 w-9 bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 dark:text-white hover:text-red-500 hover:bg-white transition-all active:scale-90 z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
        >
            <DynamicLucideIcon
                name="favorite"
                style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
                className={`text-[20px] ${isSaved ? 'text-red-500' : ''}`}
                aria-hidden="true"
            />
        </button>
    );
}
