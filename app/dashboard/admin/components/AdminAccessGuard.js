'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useAdminAccess } from '../../../hooks/useAdminAccess';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';
import { useEffect, useMemo } from 'react';

export default function AdminAccessGuard({ children }) {
    const { isAdmin, loading, error, user } = useAdminAccess();
    const router = useRouter();
    // BUG-21: Wrap in useMemo to prevent a new client being created on every render
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        if (!loading && !isAdmin && !error) {
            router.push('/');
        }
    }, [isAdmin, loading, error, router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background-light dark:bg-background-dark">
                <div className="text-4xl animate-spin">⏳</div>
                <p className="text-[#4b636c] dark:text-gray-400 font-medium font-display">Verifying admin privileges...</p>
            </div>
        );
    }

    // BUG-16: Only show the 'Access Required' error screen when there is an actual error
    // (e.g. network failure, DB error). When simply not admin (!isAdmin && !error), silently
    // return null — the useEffect redirect above handles navigation. This prevents the
    // 'Admin Access Required' screen flashing briefly before the redirect fires.
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center max-w-2xl mx-auto bg-background-light dark:bg-background-dark font-display">
                <div className="bg-red-100 dark:bg-red-900/20 text-red-500 p-4 rounded-full mb-2">
                    <DynamicLucideIcon name="lock" className="text-5xl" />
                </div>

                <h1 className="text-3xl font-extrabold text-[#111618] dark:text-white mb-6">Admin Access Required</h1>

                <p className="text-[#4b636c] dark:text-gray-400 text-lg leading-relaxed mb-8">
                    You do not have the necessary permissions to view this page. This area is restricted to platform administrators.
                </p>

                <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 w-full text-left mb-8">
                    <p className="text-red-800 dark:text-red-400 text-sm font-mono">
                        <strong className="font-bold">Error Detail:</strong> {error}
                    </p>
                </div>

                <div className="flex flex-wrap gap-4 justify-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        <span>🔄</span> Retry Check
                    </button>
                    <button
                        onClick={() => {
                            supabase.auth.signOut().then(() => {
                                router.push('/login?next=/dashboard/admin');
                            });
                        }}
                        className="px-6 py-3 bg-[#111618] dark:bg-white dark:text-[#111618] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        Log Out
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-6 py-3 bg-transparent text-[#4b636c] dark:text-gray-400 border border-[#dce3e5] dark:border-[#2d3b41] rounded-xl font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Silently return null while redirect is in progress (no flash of error screen)
    if (!isAdmin) return null;

    return children;
}
