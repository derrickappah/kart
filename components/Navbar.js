'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signout } from '../app/auth/actions';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import NotificationBell from './NotificationBell';

export default function Navbar({ user }) {
    const pathname = usePathname();
    const supabase = createClient();

    // Check if we are on a product details page
    const isProductPage = pathname?.startsWith('/marketplace/') && pathname !== '/marketplace/categories';

    // Don't render navbar on product details pages to avoid overlap with fixed bottom bar
    if (isProductPage) return null;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white/90 dark:bg-[#242428]/90 py-4 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between w-full max-w-md px-5">
                <Link href="/" className="flex items-center">
                    <Image
                        src="/ChatGPT Image Jan 18, 2026, 10_53_24 PM.png"
                        alt="KART Logo"
                        width={80}
                        height={32}
                        style={{ width: '80px', height: 'auto' }}
                        className="object-contain"
                        priority
                    />
                </Link>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                </div>
            </div>
        </header>
    );
}
