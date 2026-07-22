'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import NotificationBell from './NotificationBell';

export default function Navbar({ user }) {
    const pathname = usePathname();

    const isProductPage = pathname?.startsWith('/marketplace/') && pathname !== '/marketplace/categories';
    if (isProductPage) return null;

    const navItems = [
        { label: 'Home', href: '/', icon: 'home' },
        { label: 'Marketplace', href: '/marketplace', icon: 'storefront' },
        { label: 'Messages', href: '/dashboard/messages', icon: 'chat_bubble' },
        { label: 'Wishlist', href: '/dashboard/wishlist', icon: 'favorite' },
    ];

    const isActive = (path) => {
        if (path === '/') return pathname === '/';
        return pathname?.startsWith(path);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white/95 dark:bg-[#242428]/95 py-3 md:py-4 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-all">
            <div className="flex items-center justify-between w-full max-w-6xl px-4 md:px-6">
                {/* Logo */}
                <Link href="/" className="flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
                    <Image
                        src="/logo.png"
                        alt="KART Logo"
                        width={90}
                        height={36}
                        style={{ width: '90px', height: 'auto' }}
                        className="object-contain transition-transform group-hover:scale-105"
                        priority
                    />
                </Link>

                {/* Desktop Navigation Links */}
                <nav className="hidden md:flex items-center gap-1 bg-gray-100/80 dark:bg-gray-800/60 p-1.5 rounded-full border border-black/5 dark:border-white/5">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    active
                                        ? 'bg-white dark:bg-[#2d2d32] text-primary shadow-sm'
                                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <DynamicLucideIcon name={item.icon} size={18} aria-hidden="true" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Right Action Icons & Profile */}
                <div className="flex items-center gap-3">
                    <NotificationBell />

                    {/* Desktop Sell CTA Button */}
                    <Link
                        href="/dashboard/seller/create"
                        className="hidden md:flex btn-primary !h-10 !px-4 text-xs font-extrabold uppercase tracking-wider rounded-full shadow-md shadow-primary/30"
                    >
                        <DynamicLucideIcon name="add" size={18} aria-hidden="true" />
                        <span>Sell Item</span>
                    </Link>

                    {/* Desktop Profile Link */}
                    <Link
                        href={user ? '/profile' : '/login'}
                        aria-label={user ? 'User Profile' : 'Sign In'}
                        className="hidden md:flex size-10 rounded-full bg-primary/10 items-center justify-center text-primary font-bold hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <DynamicLucideIcon name="account_circle" size={24} aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </header>
    );
}
