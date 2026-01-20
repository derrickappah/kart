'use client';
import { useRouter } from 'next/navigation';

export default function VerificationSuccessPage() {
    const router = useRouter();

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display antialiased min-h-screen flex flex-col items-center justify-center p-0 sm:p-4 transition-colors duration-200">
            <div className="flex flex-col h-screen sm:h-[850px] w-full max-w-md bg-[#f9fafa] dark:bg-[#1c1f22] shadow-2xl relative sm:rounded-[2.5rem] overflow-hidden">

                {/* Top Navigation */}
                <header className="flex items-center p-4 pt-12 pb-2 justify-between">
                    <button
                        onClick={() => router.push('/')}
                        className="text-[#0e181b] dark:text-white flex size-12 shrink-0 items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back_ios_new</span>
                    </button>
                    <h2 className="text-[#0e181b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">Verification Status</h2>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col items-center justify-center px-6 w-full">
                    {/* Illustration Container */}
                    <div className="w-full mb-8">
                        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
                            {/* Decorative background elements */}
                            <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse"></div>

                            {/* Main Illustration */}
                            <div
                                className="z-10 w-full h-full bg-center bg-no-repeat bg-contain"
                                style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDfB4lJGMPncLzABu2LKAG-X4Ihchw89RMJdyj3h_qGuQ85PW3LmV8U_-l-aMPze2Ma2aEeTGN0fHwO4ES85HP0d5sAZjgTMps12_3ITOiXdfz34kFUB6zJUwXcAOMbO-UC2p_lks1rlcFf8yu0F4sOoJU2-GRmtImwrkVrtMe7NfwkjZ29LSTuUXi4cPa4XYE9CbZtwDiEzV8j9EoZ2zUCSeOs4q58QYU9THZtk_yiW-fLRYk7AsKj5tUfvhXIjizwvSv1Frw2Qc__")' }}
                            ></div>

                            {/* Floating Accents */}
                            <div className="absolute -top-2 -right-2 bg-white dark:bg-[#2d3139] p-3 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700">
                                <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
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
