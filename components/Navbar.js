'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signout } from '../app/auth/actions';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import NotificationBell from './NotificationBell';

export default function Navbar({ user }) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const pathname = usePathname();
    const supabase = createClient();

    // Check if user is admin and fetch avatar
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!user?.id) {
                setIsAdmin(false);
                setAvatarUrl(null);
                return;
            }

            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('is_admin, avatar_url')
                    .eq('id', user.id)
                    .single();

                if (!error && profile) {
                    setIsAdmin(profile.is_admin === true);
                    setAvatarUrl(profile.avatar_url);
                } else {
                    setIsAdmin(false);
                    setAvatarUrl(null);
                }
            } catch (err) {
                console.error('Error fetching user profile:', err);
                setIsAdmin(false);
                setAvatarUrl(null);
            }
        };

        fetchUserProfile();
    }, [user, supabase]);

    // Logic to get display name and initials
    const email = user?.email || '';
    const fullName = user?.user_metadata?.full_name || email.split('@')[0];

    // Initials logic
    const initials = fullName
        ?.split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || '??';

    // Truncate email logic
    const displayEmail = email.length > 20 ? email.substring(0, 17) + '...' : email;

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
                    {user && (
                        <div className="relative group flex items-center">
                            <button className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-[#2d2d32]">
                                {avatarUrl ? (
                                    <div
                                        className="h-8 w-8 rounded-full bg-cover bg-center border border-gray-200 dark:border-gray-700"
                                        style={{ backgroundImage: `url('${avatarUrl}')` }}
                                    />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-[#1daddd] flex items-center justify-center text-white text-xs font-bold">
                                        {initials}
                                    </div>
                                )}
                            </button>
                            {/* Simple Profile Dropdown */}
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#2d2d32] rounded-xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all border border-gray-100 dark:border-gray-700">
                                <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Dashboard</Link>
                                <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Profile</Link>
                                {isAdmin && (
                                    <Link href="/dashboard/admin" className="block px-4 py-2 text-sm text-amber-500 hover:bg-gray-50 dark:hover:bg-gray-800">Admin Panel</Link>
                                )}
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                <button onClick={() => signout()} className="w-full text-left block px-4 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800">Sign Out</button>
                            </div>
                        </div>
                    )}
                    <NotificationBell />
                </div>
            </div>
        </header>
    );
}
