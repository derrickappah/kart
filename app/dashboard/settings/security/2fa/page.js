'use client';
import { useRouter } from 'next/navigation';

export default function TwoFactorPage() {
    const router = useRouter();

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            <header className="px-4 pt-6 flex items-center gap-4">
                <button onClick={() => router.back()} className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-[#1E292B] shadow-sm">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold">Two-Factor Auth</h1>
            </header>

            <main className="flex-1 px-4 pt-8">
                <div className="bg-white dark:bg-[#1E292B] rounded-2xl p-8 flex flex-col items-center text-center shadow-sm">
                    <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-6">
                        <span className="material-symbols-outlined text-4xl">shield_lock</span>
                    </div>
                    <h2 className="text-xl font-bold mb-4">Protect your account</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                        Two-factor authentication adds an extra layer of security to your account by requiring more than just a password to log in.
                    </p>

                    <div className="w-full p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                        Coming Soon to Kart
                    </div>
                </div>
            </main>
        </div>
    );
}
