'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Lottie from 'lottie-react';
import { createClient } from '@/utils/supabase/client';
import faceVerificationAnimation from '@/public/Face verification.json';
import successAnimation from '@/public/Success.json';
import LoadingScreen from '@/components/LoadingScreen';

export default function VerificationIntroPage() {
    const router = useRouter();
    const supabase = createClient();
    const [profile, setProfile] = useState(null);
    const [verificationRequest, setVerificationRequest] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const [profileRes, requestRes] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('is_verified, verification_status')
                        .eq('id', user.id)
                        .maybeSingle(),
                    supabase
                        .from('verification_requests')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                ]);

                if (profileRes.data) setProfile(profileRes.data);
                if (requestRes.data && requestRes.data.length > 0) {
                    setVerificationRequest(requestRes.data[0]);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [supabase]);

    const isVerified = profile?.is_verified || profile?.verification_status === 'Approved';

    if (loading) {
        return <LoadingScreen message="Checking status..." fullScreen={false} />;
    }

    if (isVerified) {
        return (
            <div className="bg-white dark:bg-[#242428] font-display text-[#101819] dark:text-gray-100 flex flex-col min-h-screen antialiased transition-colors duration-200">
                <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
                    <div className="w-full max-w-[320px] aspect-square flex items-center justify-center mb-8">
                        <Lottie
                            animationData={successAnimation}
                            loop={false}
                            className="w-full h-full"
                        />
                    </div>

                    <div className="text-center max-w-sm">
                        <h1 className="text-gray-900 dark:text-white text-[32px] font-bold tracking-tight mb-4">
                            Account Verified
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                            Admins have reviewed your account, and your account has been successfully verified.
                        </p>
                    </div>
                </main>

                <footer className="p-6 pb-12 sm:pb-16">
                    <div className="max-w-md mx-auto w-full">
                        <button
                            onClick={() => router.push('/dashboard/settings')}
                            className="w-full h-14 bg-primary hover:bg-[#1e6a7a] active:scale-[0.98] transition-all duration-200 text-white font-bold text-lg rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                        >
                            <span>Back to Settings</span>
                            <DynamicLucideIcon name="arrow_forward" />
                        </button>
                    </div>
                </footer>
            </div>
        );
    }

    if (verificationRequest?.status === 'Pending') {
        return (
            <div className="bg-white dark:bg-[#242428] font-display text-[#101819] dark:text-gray-100 flex flex-col min-h-screen antialiased transition-colors duration-200">
                <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
                    <div className="size-20 bg-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 mb-8">
                        <DynamicLucideIcon name="pending_actions" className="text-4xl" />
                    </div>
                    <div className="text-center max-w-sm">
                        <h1 className="text-gray-900 dark:text-white text-[32px] font-bold tracking-tight mb-4">
                            Review in Progress
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                            Your verification request is currently being reviewed by our team. This process usually takes 24-48 hours.
                        </p>
                        <div className="mt-6 text-xs font-bold text-amber-600 dark:text-amber-500/60 uppercase tracking-widest bg-amber-500/5 py-2.5 px-4 rounded-xl border border-amber-500/10 inline-block">
                            Submitted {new Date(verificationRequest.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                </main>
                <footer className="p-6 pb-12 sm:pb-16">
                    <div className="max-w-md mx-auto w-full">
                        <button
                            onClick={() => router.push('/dashboard/settings')}
                            className="w-full h-14 bg-primary hover:bg-[#1e6a7a] active:scale-[0.98] transition-all duration-200 text-white font-bold text-lg rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                        >
                            <span>Back to Settings</span>
                            <DynamicLucideIcon name="arrow_forward" />
                        </button>
                    </div>
                </footer>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#242428] font-display text-[#101819] dark:text-gray-100 flex flex-col min-h-screen overflow-hidden selection:bg-primary/30 antialiased transition-colors duration-200">
            {/* Main Scrollable Content */}
            <main className="flex-1 overflow-y-auto w-full flex flex-col items-center px-6 pt-12 pb-32 no-scrollbar">
                {verificationRequest?.status === 'Rejected' && (
                    <div className="w-full max-w-md bg-red-500/10 dark:bg-red-500/5 ring-1 ring-red-500/20 p-5 rounded-2xl mb-8 space-y-3">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
                            <DynamicLucideIcon name="error" className="text-lg font-bold" />
                            <h3 className="text-xs font-black uppercase tracking-wider">Previous Request Rejected</h3>
                        </div>
                        {verificationRequest.admin_notes && (
                            <p className="text-xs font-semibold text-red-500/80 leading-relaxed">
                                <span className="font-bold">Reason:</span> {verificationRequest.admin_notes}
                            </p>
                        )}
                    </div>
                )}
                {/* Hero Illustration - Lottie Animation */}
                <div className="relative mb-12 mt-4 group w-full max-w-[280px] aspect-square flex items-center justify-center">
                    {/* Animated Background Blob */}
                    <div className="absolute inset-4 bg-primary/10 dark:bg-primary/5 rounded-full blur-3xl transform scale-110 group-hover:scale-125 transition-transform duration-1000"></div>

                    {/* Lottie Container */}
                    <div className="relative w-full h-full z-10 flex items-center justify-center">
                        <Lottie
                            animationData={faceVerificationAnimation}
                            loop={true}
                            className="w-full h-full scale-110"
                        />
                    </div>
                </div>

                {/* Headline & Body */}
                <div className="w-full max-w-sm text-center mb-10">
                    <h1 className="text-gray-900 dark:text-white tracking-tight text-[28px] font-bold leading-tight mb-3">
                        Build Trust with Buyers
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-relaxed">
                        To keep our campus marketplace safe for everyone, we ask all sellers to verify their student status. It only takes 2 minutes.
                    </p>
                </div>

                {/* Steps Card */}
                <div className="w-full max-w-md bg-white dark:bg-[#1e292b] rounded-2xl shadow-soft p-1 border border-transparent dark:border-gray-800">
                    <div className="flex flex-col">
                        {/* Step 1 */}
                        <div className="relative flex items-center gap-4 p-4 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                            <div className="flex items-center justify-center shrink-0 size-12 rounded-xl bg-gray-100 dark:bg-[#2c3b3e] text-primary">
                                <DynamicLucideIcon name="school" className="text-[24px]" />
                            </div>
                            <div className="flex flex-col flex-1">
                                <p className="text-gray-900 dark:text-white text-base font-bold leading-tight">Confirm your email</p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal mt-0.5">Enter code sent to your email</p>
                            </div>
                            {/* Connector Line */}
                            <div className="absolute left-[2.25rem] top-[3.75rem] w-0.5 h-6 bg-gray-100 dark:bg-[#2c3b3e] -z-10"></div>
                        </div>
                        {/* Step 2 */}
                        <div className="flex items-center gap-4 p-4 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                            <div className="flex items-center justify-center shrink-0 size-12 rounded-xl bg-gray-100 dark:bg-[#2c3b3e] text-primary">
                                <DynamicLucideIcon name="badge" className="text-[24px]" />
                            </div>
                            <div className="flex flex-col flex-1">
                                <p className="text-gray-900 dark:text-white text-base font-bold leading-tight">Photo ID Check</p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal mt-0.5">Scan ID</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Action Area */}
            <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#f6f7f8] via-[#f6f7f8] to-transparent dark:from-[#111d21] dark:via-[#111d21] pb-12 sm:pb-16 z-30">
                <div className="max-w-md mx-auto w-full flex flex-col gap-4">
                    {/* Primary Button */}
                    <Link href="/dashboard/settings/verify/email" className="w-full h-14 bg-primary hover:bg-[#1e6a7a] active:scale-[0.98] transition-all duration-200 text-white font-bold text-lg rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group">
                        <span>Start Verification</span>
                        <DynamicLucideIcon name="arrow_forward" className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </footer>
        </div>
    );
}
