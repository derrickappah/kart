'use client';
'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';

export default function AdminSidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const isActive = (path) => {
        if (path === '/dashboard/admin') {
            return pathname === '/dashboard/admin';
        }
        return pathname?.startsWith(path);
    };

    const navItems = [
        { href: '/dashboard/admin', label: 'Dashboard', icon: 'dashboard' },
        { href: '/dashboard/admin/products', label: 'Marketplace', icon: 'storefront' },
        { href: '/dashboard/admin/orders', label: 'Orders', icon: 'receipt_long' },
        { href: '/dashboard/admin/verifications', label: 'Verifications', icon: 'verified_user' },
        { href: '/dashboard/admin/users', label: 'Users', icon: 'group' },
        { href: '/dashboard/admin/refund-requests', label: 'Refunds', icon: 'keyboard_return' },
        { href: '/dashboard/admin/reports', label: 'Reports', icon: 'analytics' },
        { href: '/dashboard/admin/withdrawals', label: 'Withdrawals', icon: 'payments' },
        { href: '/dashboard/admin/reviews', label: 'Reviews', icon: 'star' },
        { href: '/dashboard/admin/subscriptions', label: 'Subscriptions', icon: 'card_membership' },
        { href: '/dashboard/admin/advertisements', label: 'Advertisements', icon: 'campaign' },
        { href: '/dashboard/admin/settings', label: 'Settings', icon: 'settings' },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <aside className={`fixed md:sticky top-0 bottom-0 left-0 z-50 h-screen w-72 flex-shrink-0 border-r border-[#dce3e5] dark:border-[#2d3b41] bg-white dark:bg-[#131d20] md:bg-white/50 md:dark:bg-background-dark/50 backdrop-blur-xl flex flex-col overflow-hidden transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            {/* Fixed Logo Header */}
            <div className="p-6 pb-4 bg-white/50 dark:bg-[#131d20]/50 md:dark:bg-background-dark/50 backdrop-blur-xl z-20 relative border-b border-[#dce3e5]/20 dark:border-[#2d3b41]/20 flex items-center justify-between">
                <div className="px-2">
                    <Link href="/dashboard/admin" className="block" onClick={onClose}>
                        <Image
                            src="/logo.png"
                            alt="KART Admin"
                            width={120}
                            height={40}
                            className="object-contain"
                            priority
                        />
                    </Link>
                </div>
                {/* Mobile Close Button */}
                <button
                    onClick={onClose}
                    className="md:hidden size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-[#212b30] flex items-center justify-center text-[#4b636c] dark:text-gray-300 active:scale-95 transition-all"
                    aria-label="Close Navigation"
                >
                    <DynamicLucideIcon name="close" className="text-xl" />
                </button>
            </div>

            {/* Scrollable Navigation Area */}
            <div className="flex-1 overflow-y-auto p-6 pt-4 custom-scrollbar">
                <div className="flex flex-col gap-8">
                    <nav className="flex flex-col gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group cursor-pointer ${isActive(item.href)
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'hover:bg-primary/5 text-[#4b636c] transition-colors'
                                    }`}
                            >
                                <DynamicLucideIcon name={item.icon} className={`text-[24px] ${isActive(item.href) ? 'text-white' : 'text-[#4b636c] group-hover:text-primary transition-colors'}`} />
                                <p className={`text-sm ${isActive(item.href) ? 'font-bold' : 'font-bold text-[#374151] dark:text-gray-300 group-hover:text-primary transition-colors'}`}>
                                    {item.label}
                                </p>
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Fixed Bottom Section */}
            <div className="p-6 border-t border-[#dce3e5]/20 dark:border-[#2d3b41]/20 bg-white/5 dark:bg-black/5">
                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors cursor-pointer group w-full"
                    >
                        <DynamicLucideIcon name="logout" className="text-[24px]" />
                        <p className="text-sm font-black uppercase tracking-widest">Logout</p>
                    </button>
                </div>
            </div>
        </aside>
    );
}
