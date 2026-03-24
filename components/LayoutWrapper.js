"use client";

import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { createClient } from '../utils/supabase/client';
import Navbar from './Navbar';
import MobileBottomNav from './MobileBottomNav';

const supabase = createClient();

const userFetcher = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
};

export default function LayoutWrapper({ children }) {
    const pathname = usePathname();

    const { data: user } = useSWR('layout-user', userFetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

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
            {!isEditingPage && <Navbar user={user} />}
            <main className={isProductPage ? "" : (isEditingPage ? "" : "pt-16 pb-[66px]")}>
                {children}
            </main>
            {!isEditingPage && <MobileBottomNav user={user} />}
        </>
    );
}
