'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VerificationIntroPage() {
    const router = useRouter();

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display text-[#101819] dark:text-gray-100 flex flex-col min-h-screen overflow-hidden selection:bg-primary/30 antialiased transition-colors duration-200">
            {/* Top Navigation Bar */}
            <header className="flex items-center justify-between p-4 bg-white dark:bg-[#111d21] z-20 relative">
                <button
                    onClick={() => router.back()}
                    aria-label="Go back"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-900 dark:text-white"
                >
                    <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
                </button>
                <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] text-center">
                    Verification
                </h2>
                <div className="size-10 shrink-0"></div> {/* Spacer for optical centering */}
            </header>

            {/* Main Scrollable Content */}
            <main className="flex-1 overflow-y-auto w-full flex flex-col items-center px-6 pt-6 pb-32 no-scrollbar">
                {/* Hero Illustration */}
                <div className="relative mb-8 mt-2 group">
                    {/* Animated Background Blob */}
                    <div className="absolute inset-0 bg-primary/20 dark:bg-primary/10 rounded-full blur-2xl transform scale-110 group-hover:scale-125 transition-transform duration-700"></div>
                    {/* Icon Container */}
                    <div className="relative size-32 bg-white dark:bg-gray-800 rounded-[2rem] shadow-soft flex items-center justify-center transform rotate-3 group-hover:rotate-6 transition-transform duration-500 ease-out border border-white/50 dark:border-gray-700">
                        <span className="material-symbols-outlined text-primary text-[64px] drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                        {/* Floating Decorative Elements */}
                        <div className="absolute -top-3 -right-3 size-10 bg-green-500 rounded-xl shadow-lg flex items-center justify-center transform -rotate-12 border-2 border-white dark:border-gray-800">
                            <span className="material-symbols-outlined text-white text-xl font-bold">check</span>
                        </div>
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
                                <span className="material-symbols-outlined text-[24px]">school</span>
                            </div>
                            <div className="flex flex-col flex-1">
                                <p className="text-gray-900 dark:text-white text-base font-bold leading-tight">University Email</p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal mt-0.5">Confirm your .edu address</p>
                            </div>
                            {/* Connector Line */}
                            <div className="absolute left-[2.25rem] top-[3.75rem] w-0.5 h-6 bg-gray-100 dark:bg-[#2c3b3e] -z-10"></div>
                        </div>
                        {/* Step 2 */}
                        <div className="flex items-center gap-4 p-4 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                            <div className="flex items-center justify-center shrink-0 size-12 rounded-xl bg-gray-100 dark:bg-[#2c3b3e] text-primary">
                                <span className="material-symbols-outlined text-[24px]">badge</span>
                            </div>
                            <div className="flex flex-col flex-1">
                                <p className="text-gray-900 dark:text-white text-base font-bold leading-tight">Photo ID Check</p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal mt-0.5">Scan student ID or license</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Action Area */}
            <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#f6f7f8] via-[#f6f7f8] to-transparent dark:from-[#111d21] dark:via-[#111d21] pb-[env(safe-area-inset-bottom,24px)] z-30">
                <div className="max-w-md mx-auto w-full flex flex-col gap-4">
                    {/* Trust Badge */}
                    <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#57858e] dark:text-gray-500 opacity-80">
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        <span>Your data is encrypted and secure</span>
                    </div>
                    {/* Primary Button */}
                    <Link href="/dashboard/settings/verify/email" className="w-full h-14 bg-primary hover:bg-[#1e6a7a] active:scale-[0.98] transition-all duration-200 text-white font-bold text-lg rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group">
                        <span>Start Verification</span>
                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                </div>
            </footer>
        </div>
    );
}
