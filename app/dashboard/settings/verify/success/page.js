'use client';
import { useRouter } from 'next/navigation';
import Lottie from 'lottie-react';
import successAnimation from '@/public/Success.json';

export default function VerificationSuccessPage() {
    const router = useRouter();

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display antialiased min-h-screen flex flex-col items-center justify-center p-0 sm:p-4 transition-colors duration-200">
            <div className="flex flex-col h-screen sm:h-[850px] w-full max-w-md bg-[#f9fafa] dark:bg-[#1c1f22] shadow-2xl relative sm:rounded-[2.5rem] overflow-hidden">

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col items-center justify-center px-6 w-full text-center">
                    {/* Illustration Container */}
                    <div className="w-full mb-6 flex justify-center">
                        <div className="relative w-80 h-80 flex items-center justify-center">
                            {/* Decorative background elements - subtle pulse */}
                            <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse scale-90"></div>

                            {/* Main Lottie Animation */}
                            <div className="z-10 w-full h-full flex items-center justify-center">
                                <Lottie
                                    animationData={successAnimation}
                                    loop={false}
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="text-center space-y-4">
                        <h1 className="text-[#0e181b] dark:text-white text-[28px] font-bold leading-tight tracking-tight px-2">
                            Information Successfully Captured
                        </h1>
                        <p className="text-[#4e5b5f] dark:text-zinc-400 text-base font-normal leading-relaxed px-4">
                            Our system admins are currently reviewing your account. You will be notified once your verification is complete.
                        </p>
                    </div>

                    {/* Status Card */}
                    <div className="mt-10 w-full bg-white dark:bg-[#2d3139] rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 flex items-center gap-4 shadow-sm">
                        <div className="bg-primary/20 p-3 rounded-full">
                            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-[#0e181b] dark:text-white">Estimated Time</p>
                            <p className="text-xs text-[#4e5b5f] dark:text-zinc-400">Usually within 24 hours</p>
                        </div>
                    </div>
                </main>

                {/* Footer Action */}
                <footer className="p-6 pb-12 w-full">
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="w-full h-14 bg-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center"
                        >
                            <span>Back to Home</span>
                        </button>
                        <p className="text-center text-xs text-[#4e5b5f] dark:text-zinc-500 font-bold">
                            Need help? <a className="text-primary underline decoration-primary/30" href="#">Contact Support</a>
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}
