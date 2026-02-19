'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';

export default function AdminSidebar() {
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
        <aside className="w-72 flex-shrink-0 border-r border-[#dce3e5] dark:border-[#2d3b41] bg-white/50 dark:bg-background-dark/50 backdrop-blur-xl sticky top-0 h-screen flex flex-col overflow-hidden">
            {/* Fixed Logo Header */}
            <div className="p-6 pb-4 bg-white/50 dark:bg-background-dark/50 backdrop-blur-xl z-20 relative border-b border-[#dce3e5]/20 dark:border-[#2d3b41]/20">
                <div className="px-2">
                    <Link href="/dashboard/admin" className="block">
                        <Image
                            src="/ChatGPT Image Jan 18, 2026, 10_53_24 PM.png"
                            alt="KART Admin"
                            width={120}
                            height={40}
                            className="object-contain"
                            priority
                        />
                    </Link>
                </div>
            </div>

            {/* Scrollable Navigation Area */}
            <div className="flex-1 overflow-y-auto p-6 pt-4 custom-scrollbar">
                <div className="flex flex-col gap-8">
                    <nav className="flex flex-col gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group cursor-pointer ${isActive(item.href)
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'hover:bg-primary/5 text-[#4b636c] transition-colors'
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-[24px] ${isActive(item.href) ? 'text-white' : 'text-[#4b636c] group-hover:text-primary transition-colors'}`}>
                                    {item.icon}
                                </span>
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
                        <span className="material-symbols-outlined text-[24px]">logout</span>
                        <p className="text-sm font-black uppercase tracking-widest">Logout</p>
                    </button>


                </div>
            </div>
        </aside>
    );
}
