'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '../../../../../../utils/supabase/client';
import Link from 'next/link';

function PromotionSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const adId = searchParams.get('adId');
    const reference = searchParams.get('reference') || searchParams.get('trp_ref'); // Handle both if possible
    const productId = searchParams.get('productId');

    useEffect(() => {
        const verifyPayment = async () => {
            if (!adId || (!reference && !searchParams.get('reference'))) {
                setStatus('error');
                return;
            }

            try {
                const response = await fetch('/api/promotions/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        adId,
                        reference: reference || searchParams.get('reference')
                    }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    setStatus('success');
                } else {
                    setStatus('error');
                }
            } catch (err) {
                console.error('Verification error:', err);
                setStatus('error');
            }
        };

        verifyPayment();
    }, [adId, reference, searchParams]);

    if (status === 'verifying') {
        return (
            <div className="min-h-screen bg-[#f7f7f8] dark:bg-[#111d21] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
                <h1 className="text-2xl font-bold mb-2">Verifying Payment</h1>
                <p className="text-slate-500">Please wait while we activate your promotion...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-[#f7f7f8] dark:bg-[#111d21] flex flex-col items-center justify-center p-6 text-center">
                <span className="material-symbols-outlined text-red-500 text-7xl mb-6">error</span>
                <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
                <p className="text-slate-500 mb-8 text-sm max-w-xs">We couldn't verify your payment. If you've been charged, please contact support.</p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full h-14 bg-primary text-white font-bold rounded-xl"
                    >
                        Try Again
                    </button>
                    <Link href="/dashboard/seller" className="text-slate-500 font-bold py-3">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f7f8] dark:bg-[#111d21] flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
            {/* Confetti Animation Placeholder */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-primary rounded-full animate-bounce"></div>
                <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            </div>

            <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
                <div className="size-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-green-500/20">
                    <span className="material-symbols-outlined text-green-500 text-5xl font-bold">check</span>
                </div>

                <h1 className="text-3xl font-extrabold mb-4 tracking-tight">Boost Activated!</h1>
                <p className="text-slate-500 dark:text-gray-400 mb-10 font-medium leading-relaxed">
                    Your listing is now being promoted. Get ready for more inquiries and faster sales!
                </p>

                <div className="w-full space-y-3">
                    <button
                        onClick={() => router.push(`/dashboard/seller/listings/${productId}`)}
                        className="w-full h-14 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        View Listing Stats
                        <span className="material-symbols-outlined text-xl">bar_chart</span>
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/seller')}
                        className="w-full h-12 text-slate-500 dark:text-gray-400 font-bold hover:bg-gray-200/50 dark:hover:bg-white/5 rounded-xl transition-all"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PromotionSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f7f7f8] dark:bg-[#111d21] flex items-center justify-center">
                <div className="animate-pulse text-primary font-bold">Loading...</div>
            </div>
        }>
            <PromotionSuccessContent />
        </Suspense>
    );
}
