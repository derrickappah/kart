'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function PhoneUpdatePage() {
    const router = useRouter();
    const supabase = createClient();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('phone')
                    .eq('id', user.id)
                    .maybeSingle();
                setProfile(data);
                if (data?.phone) {
                    setPhone(data.phone);
                }
            }
        };
        getProfile();
    }, [supabase]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('profiles')
            .update({ phone })
            .eq('id', user.id);

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Phone number updated successfully!' });
            setTimeout(() => router.back(), 1500);
        }
        setLoading(false);
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            <header className="px-4 pt-6 flex items-center gap-4">
                <button onClick={() => router.back()} className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-[#1E292B] shadow-sm">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold">Update Phone</h1>
            </header>

            <main className="flex-1 px-4 pt-8">
                <div className="bg-white dark:bg-[#1E292B] rounded-2xl p-6 shadow-sm">
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="phone" className="text-sm font-semibold text-slate-500 dark:text-slate-400">Phone Number</label>
                            <input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Enter your phone number"
                                required
                                className="w-full p-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-mono"
                            />
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || phone === profile?.phone}
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-50 transition-all font-display"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
