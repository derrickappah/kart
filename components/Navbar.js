'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from './SearchBar';
import NotificationBell from './NotificationBell';

export default function Navbar({ user }) {
    const pathname = usePathname();
    const isHomePage = pathname === '/';
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        if (!isHomePage) {
            setIsScrolled(false);
            return;
        }

        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isHomePage]);

    // Check if we are on a product details page
    const isProductPage = pathname?.startsWith('/marketplace/') && pathname !== '/marketplace/categories';
    const isMarketplacePage = pathname === '/marketplace';

    // Don't render navbar on product details pages to avoid overlap with floating action bar
    if (isProductPage) return null;

    const isTransparent = isHomePage && !isScrolled;

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center h-16 transition-colors duration-300 ease-in-out ${
                isTransparent
                    ? 'bg-transparent border-b border-transparent shadow-none'
                    : 'bg-white/95 dark:bg-[#242428]/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm'
            }`}
        >
            <div className="flex items-center justify-between w-full max-w-md px-3 h-full">
                {isMarketplacePage ? (
                    <div className="w-full">
                        <SearchBar placeholder="Search campus finds..." showFilter={true} />
                    </div>
                ) : (
                    <>
                        <Link href="/" className="flex items-center pl-1">
                            <Image
                                src="/logo.png"
                                alt="KART Logo"
                                width={95}
                                height={38}
                                style={{ width: '95px', height: 'auto' }}
                                className={`object-contain transition-all duration-300 ${
                                    isTransparent ? 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]' : ''
                                }`}
                                priority
                            />
                        </Link>
                        <div className="flex items-center gap-2 pr-1">
                            <NotificationBell isTransparent={isTransparent} />
                        </div>
                    </>
                )}
            </div>
        </header>
    );
}
