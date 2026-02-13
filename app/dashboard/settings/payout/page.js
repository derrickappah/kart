'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function PayoutDetailsPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [profile, setProfile] = useState(null);

    const [bankDetails, setBankDetails] = useState({
        bank_name: '',
        account_name: '',
        account_number: '',
    });

    const [momoDetails, setMomoDetails] = useState({
        provider: 'MTN',
        name: '',
        number: '',
    });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('bank_account_details, momo_details')
                .eq('id', user.id)
                .single();

            if (data) {
                setProfile(data);
                if (data.bank_account_details) setBankDetails(data.bank_account_details);
                if (data.momo_details) setMomoDetails(data.momo_details);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [supabase, router]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('profiles')
            .update({
                bank_account_details: bankDetails,
                momo_details: momoDetails,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Payout details updated successfully!' });
            setTimeout(() => router.back(), 1500);
        }
        setSaving(false);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-[#f6f7f8] dark:bg-[#131d1f]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>;
    }

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            <header className="px-4 pt-6 pb-2 flex items-center gap-4 sticky top-0 bg-[#f6f7f8]/80 dark:bg-[#131d1f]/80 backdrop-blur-md z-10">
                <button onClick={() => router.back()} className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-[#1E292B] shadow-sm">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold">Payout Details</h1>
            </header>

            <main className="flex-1 px-4 pt-4 pb-20 max-w-md mx-auto w-full">
                <form onSubmit={handleSave} className="space-y-8">
                    {/* Bank Transfer Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="material-symbols-outlined text-primary">account_balance</span>
                            <h2 className="text-lg font-bold">Bank Account</h2>
                        </div>
                        <div className="bg-white dark:bg-[#1E292B] rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">Bank Name</label>
                                <input
                                    type="text"
                                    value={bankDetails.bank_name}
                                    onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                                    placeholder="e.g. GCB, Ecobank, Stanbic"
                                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">Account Name</label>
                                <input
                                    type="text"
                                    value={bankDetails.account_name}
                                    onChange={(e) => setBankDetails({ ...bankDetails, account_name: e.target.value })}
                                    placeholder="Full name on account"
                                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">Account Number</label>
                                <input
                                    type="text"
                                    value={bankDetails.account_number}
                                    onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                                    placeholder="Account digits"
                                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Mobile Money Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="material-symbols-outlined text-primary">smartphone</span>
                            <h2 className="text-lg font-bold">Mobile Money</h2>
                        </div>
                        <div className="bg-white dark:bg-[#1E292B] rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">Provider</label>
                                <select
                                    value={momoDetails.provider}
                                    onChange={(e) => setMomoDetails({ ...momoDetails, provider: e.target.value })}
                                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
                                >
                                    <option value="MTN">MTN MoMo</option>
                                    <option value="Telecel">Telecel Cash</option>
                                    <option value="AirtelTigo">AirtelTigo Money</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">Account Name</label>
                                <input
                                    type="text"
                                    value={momoDetails.name}
                                    onChange={(e) => setMomoDetails({ ...momoDetails, name: e.target.value })}
                                    placeholder="Full registered name"
                                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">Phone Number</label>
                                <input
                                    type="tel"
                                    value={momoDetails.number}
                                    onChange={(e) => setMomoDetails({ ...momoDetails, number: e.target.value })}
                                    placeholder="024XXXXXXX"
                                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                        </div>
                    </section>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? 'Saving...' : 'Save Payout Details'}
                    </button>
                </form>
            </main>
        </div>
    );
}
