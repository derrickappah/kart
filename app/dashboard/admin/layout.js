'use client';
import { useState } from 'react';
import AdminAccessGuard from './components/AdminAccessGuard';
import AdminSidebar from './components/AdminSidebar';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Image from 'next/image';
import Link from 'next/link';

export default function AdminLayout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <AdminAccessGuard>
            <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-[#111618] dark:text-white transition-colors duration-300 relative">
                {/* Mobile Backdrop overlay */}
                {isSidebarOpen && (
                    <div 
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
                    />
                )}

                {/* Sidebar */}
                <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    {/* Responsive Mobile Top Bar */}
                    <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-[#dce3e5] dark:border-[#2d3b41] bg-white/70 dark:bg-background-dark/70 backdrop-blur-md z-30">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-[#212b30] flex items-center justify-center text-[#4b636c] dark:text-gray-300 active:scale-95 transition-all"
                            aria-label="Open Navigation"
                        >
                            <DynamicLucideIcon name="menu" className="text-2xl" />
                        </button>
                        
                        <Link href="/dashboard/admin" className="block">
                            <Image
                                src="/logo.png"
                                alt="KART Admin"
                                width={100}
                                height={32}
                                className="object-contain"
                                priority
                            />
                        </Link>

                        <div className="size-10" /> {/* Spacer to center the logo */}
                    </header>

                    {/* Scrollable page content */}
                    <main className="flex-1 overflow-y-auto">
                        <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </AdminAccessGuard>
    );
}

