"use client";

import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { createClient } from '../utils/supabase/client';
import Navbar from './Navbar';
import MobileBottomNav from './MobileBottomNav';
import AppDeepLinkHandler from './AppDeepLinkHandler';
import PageTransition from './PageTransition';
import PullToRefresh from './PullToRefresh';
import { useRouter } from 'next/navigation';

const supabase = createClient();

const userFetcher = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
};

export default function LayoutWrapper({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: user, mutate } = useSWR('layout-user', userFetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

    const handleRefresh = async () => {
        // Refresh the user data
        await mutate();
        // Refresh all Server Components
        router.refresh();
        // Add a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800));
    };

    // Check if we are on a product details page
    const isProductPage = pathname?.startsWith('/marketplace/') && pathname !== '/marketplace/categories';

    // List of paths that should hide global navigation components
    const isEditingPage = (pathname === '/login' ||
        pathname === '/signup' ||
        pathname === '/forgot-password' ||
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

    return (
        <>
            <AppDeepLinkHandler />
            {!isEditingPage && <Navbar user={user} />}
            <main className={`overflow-hidden bg-white dark:bg-[#242428] ${isProductPage ? "" : (isEditingPage ? "" : "pt-16 pb-[66px]")}`}>
                <PullToRefresh onRefresh={handleRefresh} disabled={isEditingPage}>
                    <PageTransition>
                        {children}
                    </PageTransition>
                </PullToRefresh>
            </main>
            {!isEditingPage && <MobileBottomNav user={user} />}
        </>
    );
}
