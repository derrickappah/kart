'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function PhoneUpdatePage() {
    const router = useRouter();
    const supabase = createClient();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [profile, setProfile] = useState(null);



    useEffect(() => {
        let mounted = true;

        const getProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('phone')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (error) throw error;

                    if (mounted && data?.phone) {
                        setPhone(data.phone);
                    }
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                if (mounted) {
                    setMessage({ type: 'error', text: 'Failed to load profile data.' });
                }
            } finally {
                if (mounted) {
                    setInitialLoading(false);
                }
            }
        };
        getProfile();

        return () => {
            mounted = false;
        };
    }, [supabase]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        // Basic validation checking if phone is defined
        if (!phone) {
            setMessage({ type: 'error', text: 'Please enter a valid phone number.' });
            setLoading(false);
            return;
        }

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
                    {initialLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-semibold text-slate-500 dark:text-slate-400">Phone Number</label>
                                <div className="phone-input-container">
                                    <PhoneInput
                                        international
                                        defaultCountry="GH"
                                        value={phone}
                                        onChange={setPhone}
                                        className="w-full p-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl focus-within:ring-2 focus-within:ring-primary outline-none transition-all font-mono text-slate-900 dark:text-white"
                                        numberInputProps={{
                                            className: "w-full bg-transparent border-none outline-none focus:ring-0 p-0 ml-2 placeholder:text-slate-400 dark:placeholder:text-slate-500",
                                        }}
                                    />
                                </div>
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
                    )}
                </div>
            </main>
            <style jsx global>{`
                .PhoneInputInput {
                    background: transparent;
                    border: none;
                    outline: none;
                }
                .PhoneInputCountry {
                    margin-right: 0.5rem;
                }
                 /* Add style to change the arrow color in dark mode if needed, 
                    though usually it's fine. 
                    Can target .PhoneInputCountrySelectArrow
                 */
            `}</style>
        </div>
    );
}

