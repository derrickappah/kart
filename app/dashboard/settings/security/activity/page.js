'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LoginActivityPage() {
    const router = useRouter();
    const supabase = createClient();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };
        getSession();
    }, [supabase]);

    const getDeviceIcon = (userAgent) => {
        if (!userAgent) return 'devices';
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) return 'smartphone';
        if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
        return 'desktop_windows';
    };

    const parseUserAgent = (userAgent) => {
        if (!userAgent) return 'Unknown Device';
        if (userAgent.includes('Windows')) return 'Windows PC';
        if (userAgent.includes('Macintosh')) return 'MacBook / iMac';
        if (userAgent.includes('iPhone')) return 'iPhone';
        if (userAgent.includes('Android')) return 'Android Device';
        if (userAgent.includes('Linux')) return 'Linux PC';
        return 'Unknown Device';
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            <header className="px-4 pt-6 flex items-center gap-4">
                <button onClick={() => router.back()} className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-[#1E292B] shadow-sm">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold">Login Activity</h1>
            </header>

            <main className="flex-1 px-4 pt-8">
                <div className="bg-white dark:bg-[#1E292B] rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Current Session</h2>
                    </div>

                    {loading ? (
                        <div className="p-12 flex justify-center">
                            <div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : session ? (
                        <div className="p-4 flex items-center gap-4">
                            <div className="size-12 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                                <span className="material-symbols-outlined">{getDeviceIcon(navigator.userAgent)}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{parseUserAgent(navigator.userAgent)}</span>
                                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full uppercase">Active Now</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Last sign in: {new Date(session.user.last_sign_in_at).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-500">No active session found</div>
                    )}
                </div>

                <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">shield</span>
                    <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                        If you don't recognize a device or location, we recommend changing your password immediately.
                    </p>
                </div>
            </main>
        </div>
    );
}
