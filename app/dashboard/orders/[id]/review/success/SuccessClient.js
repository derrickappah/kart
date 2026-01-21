'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
import successAnim from '@/public/Success.json';

export default function SuccessClient({ seller, product }) {
    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display antialiased min-h-screen selection:bg-[#1daddd]/30">
            <div className="relative flex h-full min-h-screen w-full flex-col justify-between overflow-hidden">

                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-b from-[#1daddd]/10 to-transparent pointer-events-none"></div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FFEB99]/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute top-1/3 -left-12 w-48 h-48 bg-[#1daddd]/20 rounded-full blur-3xl pointer-events-none"></div>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8 w-full max-w-md mx-auto z-10">

                    {/* Illustration Container */}
                    <div className="relative mb-6 group w-full flex justify-center">
                        <div className="w-64 h-64 flex items-center justify-center">
                            <Lottie
                                animationData={successAnim}
                                loop={false}
                                className="w-full h-full"
                            />
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="text-center space-y-4 max-w-[280px]">
                        <h1 className="text-[#0e181b] dark:text-white text-[32px] font-bold leading-tight tracking-tight">
                            Thanks for sharing!
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 text-base font-normal leading-relaxed">
                            Your feedback helps keep our campus marketplace safe and trustworthy for everyone.
                        </p>
                    </div>

                    {/* Review Summary Card */}
                    <div className="mt-8 w-full bg-white/60 dark:bg-[#2c3336]/60 backdrop-blur-sm border border-white/50 dark:border-white/5 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 relative">
                            {seller?.avatar_url ? (
                                <img
                                    src={seller.avatar_url}
                                    alt={seller.display_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-center bg-no-repeat bg-cover" style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuC6HxWquOpKMmX5A4op6K5xE77ctvKPpihSCk6H2EtPWIrqe1TQXbzHBLtJni2ybqRVPU-z9G-P3tYbzOqJeqz1HiM88U-vBAzwUTXfn_XJuW9Im3Lx49WUSFWSSLlGRxvyNnps_ZpuRU0RDdsDp4NsyYlh_amlQaStHy9iMz__21jKqgVPXx-HNrXyPoFYelRxW7sUgWYqFPHNreZutZ02WIMdLMpCTgrPsznOLq6MF_oplYbwCl7u5vN6zwuEg2cS7r4RG-dc1Oii")` }}></div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-0.5">Reviewed</p>
                            <p className="text-sm font-bold text-[#0e181b] dark:text-white truncate">{product?.title || 'Item purchased'}</p>
                        </div>
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1daddd]/20 text-[#6cd49d]">
                            <span className="material-symbols-outlined text-green-700 dark:text-green-300">check</span>
                        </div>
                    </div>
                </main>

                {/* Action Area (Bottom aligned) */}
                <footer className="w-full max-w-md mx-auto px-6 pb-8 z-10">
                    <div className="flex flex-col gap-3">
                        {/* Primary Action */}
                        <Link href="/" className="group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-8 bg-[#1daddd] text-white text-lg font-bold shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">
                            <div className="absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 group-hover:translate-y-0"></div>
                            <span className="relative z-10">Return to Home</span>
                        </Link>

                        {/* Secondary Action */}
                        <Link href={seller?.id ? `/profile/${seller.id}` : '#'} className="flex w-full group cursor-pointer items-center justify-center rounded-xl h-12 px-4 bg-transparent text-gray-600 dark:text-gray-300 hover:text-[#0e181b] dark:hover:text-white text-sm font-semibold transition-colors">
                            <span>View Seller&apos;s Profile</span>
                            <span className="material-symbols-outlined text-[18px] ml-1 transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </Link>
                    </div>
                </footer>
            </div>

            {/* Global CSS for Material Symbols */}
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" />
        </div>
    );
}
