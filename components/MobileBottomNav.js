'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUnreadMessagesCount } from '@/app/hooks/useUnreadMessagesCount';

export default function MobileBottomNav({ user }) {
    const pathname = usePathname();
    const { unreadCount } = useUnreadMessagesCount(user);
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

    const profileLink = '/profile';

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[70] flex w-full justify-center border-t border-gray-100 bg-white/95 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg dark:border-gray-800 dark:bg-[#242428]/95 overflow-visible">
            <div className="grid grid-cols-5 items-center w-full max-w-md px-2">
                {/* Home */}
                <Link href="/" prefetch={true} className="group flex flex-col items-center justify-center py-1 transition-transform active:scale-95">
                    <div className={`flex items-center justify-center h-7 transition-colors ${isActive('/') ? 'text-[#1daddd]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                        <DynamicLucideIcon name="home" size={24} strokeWidth={isActive('/') ? 2.6 : 2} style={{ fontVariationSettings: isActive('/') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }} />
                    </div>
                    <span className={`text-[10px] tracking-tight leading-tight mt-0.5 transition-colors ${isActive('/') ? 'text-[#1daddd] font-semibold' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 font-medium'}`}>
                        Home
                    </span>
                </Link>

                {/* Marketplace / Shop */}
                <Link href="/marketplace" prefetch={true} className="group flex flex-col items-center justify-center py-1 transition-transform active:scale-95">
                    <div className={`flex items-center justify-center h-7 transition-colors ${isActive('/marketplace') ? 'text-[#1daddd]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                        <DynamicLucideIcon name="storefront" size={24} strokeWidth={isActive('/marketplace') ? 2.6 : 2} style={{ fontVariationSettings: isActive('/marketplace') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }} />
                    </div>
                    <span className={`text-[10px] tracking-tight leading-tight mt-0.5 transition-colors ${isActive('/marketplace') ? 'text-[#1daddd] font-semibold' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 font-medium'}`}>
                        Shop
                    </span>
                </Link>

                {/* Sell / Add */}
                <Link
                    href="/dashboard/seller/create"
                    prefetch={true}
                    className="group flex flex-col items-center justify-center py-1 transition-transform active:scale-95"
                    aria-label="Add listing"
                >
                    <div className={`flex items-center justify-center h-7 transition-colors ${isActive('/dashboard/seller/create') ? 'text-[#1daddd]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                        <DynamicLucideIcon name="add_circle" size={24} strokeWidth={isActive('/dashboard/seller/create') ? 2.6 : 2} style={{ fontVariationSettings: isActive('/dashboard/seller/create') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }} />
                    </div>
                    <span className={`text-[10px] tracking-tight leading-tight mt-0.5 transition-colors ${isActive('/dashboard/seller/create') ? 'text-[#1daddd] font-semibold' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 font-medium'}`}>
                        Add
                    </span>
                </Link>

                {/* Messages / Chat */}
                <Link 
                    href="/dashboard/messages" 
                    prefetch={true} 
                    className="group flex flex-col items-center justify-center py-1 transition-transform active:scale-95"
                    aria-label={unreadCount > 0 ? `Chat (${unreadCount > 99 ? '99+' : unreadCount} unread)` : 'Chat'}
                >
                    <div className={`relative flex items-center justify-center h-7 transition-colors ${isActive('/dashboard/messages') ? 'text-[#1daddd]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                        <DynamicLucideIcon name="chat_bubble" size={24} strokeWidth={isActive('/dashboard/messages') ? 2.6 : 2} style={{ fontVariationSettings: isActive('/dashboard/messages') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }} />
                        {unreadCount > 0 && (
                            <span
                                aria-hidden="true"
                                className="absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-[#242428] shadow-sm animate-in fade-in zoom-in duration-200"
                            >
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                    <span className={`text-[10px] tracking-tight leading-tight mt-0.5 transition-colors ${isActive('/dashboard/messages') ? 'text-[#1daddd] font-semibold' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 font-medium'}`}>
                        Chat
                    </span>
                </Link>

                {/* Profile */}
                <Link href={profileLink} prefetch={true} className="group flex flex-col items-center justify-center py-1 transition-transform active:scale-95">
                    <div className={`flex items-center justify-center h-7 transition-colors ${isActive('/profile') || isActive('/login') ? 'text-[#1daddd]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                        <DynamicLucideIcon name="account_circle" size={24} strokeWidth={isActive('/profile') || isActive('/login') ? 2.6 : 2} style={{ fontVariationSettings: isActive('/profile') || isActive('/login') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }} />
                    </div>
                    <span className={`text-[10px] tracking-tight leading-tight mt-0.5 transition-colors ${isActive('/profile') || isActive('/login') ? 'text-[#1daddd] font-semibold' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 font-medium'}`}>
                        Profile
                    </span>
                </Link>
            </div>
        </nav>
    );
}
