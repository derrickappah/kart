'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileBottomNav({ user }) {
    const pathname = usePathname();
    const isAdminPage = pathname?.startsWith('/dashboard/admin');

    // Don't show on admin pages or if not desired (e.g. auth pages)
    if (isAdminPage) {
        return null;
    }

    // Check if we are on a product details page
    const isProductPage = pathname?.startsWith('/marketplace/') && pathname !== '/marketplace/categories';

    // Check if we are on a product details page or editing page
    const isEditingPage = (pathname?.includes('/create') ||
        pathname?.includes('/edit') ||
        pathname?.includes('/buy') ||
        pathname?.includes('/review') ||
        pathname?.includes('/withdraw') ||
        pathname?.includes('/promote/')) && // Specific to promote action, not promotions list
        !pathname?.includes('/profile/edit'); // Show bottom nav on profile edit page

    // Don't render bottom nav on these pages to avoid overlap
    if (isProductPage || isEditingPage) return null;

    const isActive = (path) => {
        if (path === '/') return pathname === '/';
        return pathname?.startsWith(path);
    };

    const getProfileLink = () => {
        return user ? '/profile' : '/login';
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex w-full justify-center border-t border-gray-100 bg-white/95 pb-[14px] pt-2 backdrop-blur-lg dark:border-gray-800 dark:bg-[#242428]/95">
            <div className="flex w-full max-w-md items-center justify-between px-8">
                {/* Home */}
                <Link href="/" className="group flex flex-col items-center">
                    <span
                        className={`material-symbols-outlined text-[44px] transition-transform group-active:scale-90 ${isActive('/') ? 'text-[#1daddd]' : 'text-gray-400'}`}
                        style={{ fontVariationSettings: isActive('/') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }}
                    >
                        home
                    </span>
                </Link>

                {/* Marketplace */}
                <Link href="/marketplace" className="group flex flex-col items-center -mr-8">
                    <span
                        className={`material-symbols-outlined text-[44px] transition-colors ${isActive('/marketplace') ? 'text-[#1daddd]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}
                        style={{ fontVariationSettings: isActive('/marketplace') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }}
                    >
                        storefront
                    </span>
                </Link>

                {/* Sell (FAB) */}
                <div className="relative -top-5">
                    <Link href="/dashboard/seller/create" className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1daddd] shadow-lg shadow-[#1daddd]/40 transition-transform active:scale-95 hover:bg-[#159ac6]">
                        <span className="material-symbols-outlined text-[44px] text-white" style={{ fontVariationSettings: "'wght' 400" }}>
                            add
                        </span>
                    </Link>
                </div>

                {/* Messages */}
                <Link href="/dashboard/messages" className="group flex flex-col items-center -ml-8">
                    <span
                        className={`material-symbols-outlined text-[44px] transition-colors ${isActive('/dashboard/messages') ? 'text-[#1daddd]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}
                        style={{ fontVariationSettings: isActive('/dashboard/messages') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }}
                    >
                        chat_bubble
                    </span>
                </Link>

                {/* Profile */}
                <Link href={getProfileLink()} className="group flex flex-col items-center">
                    <span
                        className={`material-symbols-outlined text-[44px] transition-colors ${isActive('/profile') || isActive('/login') ? 'text-[#1daddd]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}
                        style={{ fontVariationSettings: isActive('/profile') || isActive('/login') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }}
                    >
                        account_circle
                    </span>
                </Link>
            </div>
        </nav>
    );
}
