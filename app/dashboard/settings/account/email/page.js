'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function EmailUpdatePage() {
    const router = useRouter();
    const supabase = createClient();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                setEmail(user.email);
            }
        };
        getUser();
    }, [supabase]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.updateUser({ email });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Check your new email for a confirmation link!' });
        }
        setLoading(false);
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            <header className="px-4 pt-6 flex items-center gap-4">
                <button onClick={() => router.back()} className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-[#1E292B] shadow-sm">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold">Update Email</h1>
            </header>

            <main className="flex-1 px-4 pt-8">
                <div className="bg-white dark:bg-[#1E292B] rounded-2xl p-6 shadow-sm">
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Current Email</label>
                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-slate-400">
                                {user?.email}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="new-email" className="text-sm font-semibold text-slate-500 dark:text-slate-400">New Email Address</label>
                            <input
                                id="new-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your new email"
                                required
                                className="w-full p-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                            />
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || email === user?.email}
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Updating...' : 'Update Email'}
                        </button>
                    </form>
                </div>

                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex gap-4">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                    <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                        Changing your email will require confirmation on both your old and new email addresses to complete the process.
                    </p>
                </div>
            </main>
        </div>
    );
}
