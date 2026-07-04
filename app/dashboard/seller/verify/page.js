'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SellerVerifyRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/settings/verify');
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#242428]">
            <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">Redirecting to verification...</p>
        </div>
    );
}
