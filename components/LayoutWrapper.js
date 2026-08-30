"use client";

import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { createClient } from '../utils/supabase/client';
import Navbar from './Navbar';
import MobileBottomNav from './MobileBottomNav';
import AppDeepLinkHandler from './AppDeepLinkHandler';
import PageTransition from './PageTransition';
import PullToRefresh from './PullToRefresh';
import FilterSidebar from './FilterSidebar';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

const supabase = createClient();

const userFetcher = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user) return user;

        // If getUser had a network/transient error, fall back to local session so user stays logged in
        if (error) {
            const isNetworkError =
                error.message?.toLowerCase().includes('fetch') ||
                error.message?.toLowerCase().includes('network') ||
                error.name === 'AuthRetryableFetchError' ||
                error.status === 0;

            if (isNetworkError) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    return session.user;
                }
            }
        }
        return null;
    } catch {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return session?.user || null;
        } catch {
            return null;
        }
    }
};

// Lightweight fetcher for maintenance mode — replaces the middleware DB query
const maintenanceFetcher = async () => {
    const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();
    return data?.value === true || data?.value === 'true';
};

// Lightweight fetcher for profile status (banned/admin) — replaces the middleware DB query
const profileStatusFetcher = async ([key, userId]) => {
    if (!userId) return null;
    const { data } = await supabase
        .from('profiles')
        .select('banned, is_admin')
        .eq('id', userId)
        .single();
    return data;
};

export default function LayoutWrapper({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: user, mutate } = useSWR('layout-user', userFetcher, {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
    });

    // Maintenance mode check (cached, revalidates every 60s)
    const { data: isMaintenance } = useSWR('maintenance-mode', maintenanceFetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
        fallbackData: false,
    });

    // Profile banned/admin check (only when user exists)
    const { data: profileStatus } = useSWR(
        user ? ['profile-status', user.id] : null,
        profileStatusFetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                // Brief delay to ensure cookies are fully committed before revalidating
                setTimeout(() => {
                    mutate(session?.user || null, false);
                    mutate();
                    router.refresh();
                }, 100);
            } else if (event === 'SIGNED_OUT') {
                mutate(null, false);
                router.refresh();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [mutate, router]);

    // Banned user redirect
    useEffect(() => {
        if (profileStatus?.banned && !pathname?.startsWith('/banned') && !pathname?.startsWith('/auth/')) {
            router.replace('/banned');
        }
    }, [profileStatus?.banned, pathname, router]);

    // Maintenance mode redirect (skip for admins and exempt paths)
    useEffect(() => {
        const isExempt =
            pathname?.startsWith('/maintenance') ||
            pathname?.startsWith('/auth/') ||
            pathname?.startsWith('/login') ||
            pathname?.startsWith('/signup');

        if (isMaintenance && !profileStatus?.is_admin && !isExempt) {
            router.replace('/maintenance');
        } else if (!isMaintenance && pathname?.startsWith('/maintenance')) {
            router.replace('/');
        }
    }, [isMaintenance, profileStatus?.is_admin, pathname, router]);

    const handleRefresh = async () => {
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    // Check if we are on a product details page
    const isProductPage = pathname?.startsWith('/marketplace/') && pathname !== '/marketplace/categories';
    const isMarketplacePage = pathname === '/marketplace';

    // List of paths that should hide global navigation components
    const isEditingPage = (pathname === '/login' ||
        pathname === '/signup' ||
        pathname === '/forgot-password' ||
        pathname === '/reset-password' ||
        pathname === '/maintenance' ||
        pathname?.includes('/create') ||
        pathname?.includes('/edit') ||
        pathname?.includes('/promote/') ||
        pathname?.includes('/withdraw') ||
        pathname?.includes('/buy') ||
        pathname?.includes('/review') ||
        pathname?.includes('/verify') ||
        pathname?.includes('/success') ||
        pathname?.startsWith('/dashboard/admin') ||
        (pathname?.startsWith('/dashboard/messages/') && pathname !== '/dashboard/messages') ||
        (pathname?.startsWith('/dashboard/seller/listings/') && pathname.split('/').length > 4)) &&
        !pathname?.includes('/profile/edit');

    const paddingClass = isProductPage
        ? "" 
        : (isEditingPage ? "" : "pt-16 pb-[66px]");

    const isFullViewportPage = pathname === '/dashboard/settings/verify/id-capture' || pathname === '/dashboard/settings/verify/face-capture';

    if (isFullViewportPage) {
        return (
            <>
                <AppDeepLinkHandler />
                {children}
            </>
        );
    }

    return (
        <>
            <AppDeepLinkHandler />
            {!isEditingPage && <Navbar user={user} />}
            <main className={`overflow-x-clip bg-white dark:bg-[#242428] ${paddingClass}`}>
                <PullToRefresh onRefresh={handleRefresh} disabled={isEditingPage}>
                    <PageTransition>
                        {children}
                    </PageTransition>
                </PullToRefresh>
            </main>
            {!isEditingPage && <MobileBottomNav user={user} />}
            <Suspense fallback={null}>
                <FilterSidebar />
            </Suspense>
        </>
    );
}
