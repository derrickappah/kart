'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';

function SuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState(null);

    useEffect(() => {
        const adoptSession = async () => {
            const refreshToken = searchParams.get('refresh_token');

            if (!refreshToken) {
                setError('No authentication tokens received.');
                return;
            }

            try {
                const supabase = createClient();
                
                // Establish session using the refresh token
                // We pass an empty access_token; Supabase will automatically refresh it
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: '',
                    refresh_token: refreshToken,
                });

                if (!sessionError) {
                    console.log('Session adopted via refresh token! Redirecting...');
                    router.push('/profile');
                    router.refresh();
                } else {
                    setError(sessionError.message || 'Failed to establish session.');
                }
            } catch (err) {
                console.error('Session adoption error:', err);
                setError('A secure handoff could not be completed.');
            }
        };

        adoptSession();
    }, [searchParams, router]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#f6f7f8] dark:bg-[#111d21]">
                <div className="size-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-3xl">sync_problem</span>
                </div>
                <h1 className="text-xl font-bold mb-2 text-[#0e181b] dark:text-white">Verification Failed</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs">{error}</p>
                <button 
                    onClick={() => router.push('/login')}
                    className="px-8 py-3 bg-[#1daddd] text-white rounded-xl font-bold"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#f6f7f8] dark:bg-[#111d21]">
            <div className="size-16 border-4 border-[#1daddd]/20 border-t-[#1daddd] rounded-full animate-spin mb-6"></div>
            <h1 className="text-xl font-bold mb-2 text-[#0e181b] dark:text-white">Connecting Securely</h1>
            <p className="text-gray-500 dark:text-gray-400">Verifying your identity with a secure key...</p>
        </div>
    );
}

export default function AuthSuccessPage() {
    return (
        <Suspense fallback={null}>
            <SuccessContent />
        </Suspense>
    );
}
