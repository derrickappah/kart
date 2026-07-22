'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from './SearchBar';
import NotificationBell from './NotificationBell';

export default function Navbar({ user }) {
    const pathname = usePathname();

    // Check if we are on a product details page
    const isProductPage = pathname?.startsWith('/marketplace/') && pathname !== '/marketplace/categories';
    const isMarketplacePage = pathname === '/marketplace';

    // Don't render navbar on product details pages to avoid overlap with floating action bar
    if (isProductPage) return null;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white/95 dark:bg-[#242428]/95 py-2 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between w-full max-w-md px-3 h-14">
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
                                className="object-contain"
                                priority
                            />
                        </Link>
                        <div className="flex items-center gap-2 pr-1">
                            <NotificationBell />
                        </div>
                    </>
                )}
            </div>
        </header>
    );
}
