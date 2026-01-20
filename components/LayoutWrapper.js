"use client";

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from './Navbar';
import MobileBottomNav from './MobileBottomNav';

export default function LayoutWrapper({ children, user }) {
    const pathname = usePathname();

    // Check if we are on a product details page
    const isProductPage = pathname?.startsWith('/marketplace/') && pathname !== '/marketplace/categories';

    // List of paths that should hide global navigation components
    const isEditingPage = (pathname?.includes('/create') ||
        pathname?.includes('/edit') ||
        pathname?.includes('/promote/') || // Specific to promote action, not promotions list
        pathname?.includes('/withdraw') ||
        pathname?.includes('/buy') ||
        pathname?.includes('/review') ||
        pathname?.includes('/verify') ||
        pathname?.includes('/success') ||
        (pathname?.startsWith('/dashboard/seller/listings/') && pathname.split('/').length > 4)) &&
        !pathname?.includes('/profile/edit'); // Show navigation on profile edit page

    console.log('[LayoutWrapper] Rendered at:', pathname, 'isEditingPage:', isEditingPage);

    // Add/remove class to body to allow CSS-level hiding as a fallback
    useEffect(() => {
        if (isEditingPage) {
            document.body.classList.add('hide-global-navigation');
        } else {
            document.body.classList.remove('hide-global-navigation');
        }
        return () => document.body.classList.remove('hide-global-navigation');
    }, [isEditingPage]);

    return (
        <>
            {!isEditingPage && <Navbar user={user} />}
            <main className={isProductPage ? "" : (isEditingPage ? "" : "pt-16 pb-[60px]")}>
                {children}
            </main>
            {!isEditingPage && <MobileBottomNav user={user} />}
        </>
    );
}
