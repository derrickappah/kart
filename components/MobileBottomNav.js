'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileBottomNav({ user }) {
    const pathname = usePathname();
    const isAdminPage = pathname?.startsWith('/dashboard/admin');

    if (isAdminPage) return null;

    const isProductPage = pathname?.startsWith('/marketplace/') && pathname !== '/marketplace/categories';
    const isEditingPage = (pathname?.includes('/create') ||
        pathname?.includes('/edit') ||
        pathname?.includes('/buy') ||
        pathname?.includes('/review') ||
        pathname?.includes('/withdraw') ||
        pathname?.includes('/promote/')) &&
        !pathname?.includes('/profile/edit');

    if (isProductPage || isEditingPage) return null;

    const isActive = (path) => {
        if (path === '/') return pathname === '/';
        return pathname?.startsWith(path);
    };

    const profileLink = user ? '/profile' : '/login';

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[70] flex w-full justify-center border-t border-gray-100 bg-white/95 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-lg dark:border-gray-800 dark:bg-[#242428]/95 overflow-visible">
            <div className="flex w-full max-w-md items-center justify-between px-8">
                {/* Home */}
                <Link href="/" prefetch={true} className="group flex flex-col items-center">
                    <div className={`w-[44px] h-[44px] flex justify-center items-center transition-transform group-active:scale-90 ${isActive('/') ? 'text-[#1daddd]' : 'text-gray-400'}`}>
                        <DynamicLucideIcon name="home" size={26} style={{ fontVariationSettings: isActive('/') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }} />
                    </div>
                </Link>

                {/* Marketplace */}
                <Link href="/marketplace" prefetch={true} className="group flex flex-col items-center -mr-8">
                    <div className={`w-[44px] h-[44px] flex justify-center items-center transition-colors ${isActive('/marketplace') ? 'text-[#1daddd]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                        <DynamicLucideIcon name="storefront" size={26} style={{ fontVariationSettings: isActive('/marketplace') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }} />
                    </div>
                </Link>

                {/* Sell (FAB) */}
                <div className="relative -top-3.5">
                    <Link href="/dashboard/seller/create" prefetch={true} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1daddd] shadow-lg shadow-[#1daddd]/40 transition-transform active:scale-95 hover:bg-[#159ac6]">
                        <DynamicLucideIcon name="add" size={30} style={{ fontVariationSettings: "'wght' 400" }} className="text-white" />
                    </Link>
                </div>

                {/* Messages */}
                <Link href="/dashboard/messages" prefetch={true} className="group flex flex-col items-center -ml-8">
                    <div className={`w-[44px] h-[44px] flex justify-center items-center transition-colors ${isActive('/dashboard/messages') ? 'text-[#1daddd]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                        <DynamicLucideIcon name="chat_bubble" size={26} style={{ fontVariationSettings: isActive('/dashboard/messages') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }} />
                    </div>
                </Link>

                {/* Profile */}
                <Link href={profileLink} prefetch={true} className="group flex flex-col items-center">
                    <div className={`w-[44px] h-[44px] flex justify-center items-center transition-colors ${isActive('/profile') || isActive('/login') ? 'text-[#1daddd]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                        <DynamicLucideIcon name="account_circle" size={26} style={{ fontVariationSettings: isActive('/profile') || isActive('/login') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }} />
                    </div>
                </Link>
            </div>
        </nav>
    );
}
