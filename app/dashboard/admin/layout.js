'use client';
import AdminAccessGuard from './components/AdminAccessGuard';
import AdminSidebar from './components/AdminSidebar';

export default function AdminLayout({ children }) {
    return (
        <AdminAccessGuard>
            <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-[#111618] dark:text-white transition-colors duration-300">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto">
                    <div className="p-6 max-w-[1400px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </AdminAccessGuard>
    );
}
