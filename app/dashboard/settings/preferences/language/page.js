'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useRouter } from 'next/navigation';

export default function LanguageSettingsPage() {
    const router = useRouter();

    return (
        <div className="bg-white dark:bg-[#242428] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            <header className="px-4 pt-6 flex items-center gap-4">
                <button onClick={() => router.back()} className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-[#1E292B] shadow-sm">
                    <DynamicLucideIcon name="arrow_back" />
                </button>
                <h1 className="text-xl font-bold">Language</h1>
            </header>

            <main className="flex-1 px-4 pt-8">
                <div className="bg-white dark:bg-[#1E292B] rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">🇬🇭</span>
                            <span className="font-bold">English (Ghana)</span>
                        </div>
                        <DynamicLucideIcon name="check_circle" className="text-primary" />
                    </div>

                    <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        More languages coming soon!
                    </p>
                </div>
            </main>
        </div>
    );
}
