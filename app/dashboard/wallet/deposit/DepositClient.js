'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DepositClient({ initialWallet, user }) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const router = useRouter();

    const handleDeposit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const depositAmount = parseFloat(amount);
            if (!amount || isNaN(depositAmount) || depositAmount <= 0) {
                throw new Error('Please enter a valid amount');
            }

            const response = await fetch('/api/wallet/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: depositAmount,
                    email: user.email
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to initiate deposit');

            if (data.authorization_url) {
                window.location.href = data.authorization_url;
            } else {
                throw new Error('Payment URL not received');
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131a1f] font-display text-[#101619] dark:text-gray-100 min-h-screen flex flex-col antialiased">
            <header className="sticky top-0 z-[100] bg-[#f6f7f8]/80 dark:bg-[#131a1f]/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => router.back()}
                    className="btn-ghost size-10 !p-0 rounded-full"
                >
                    <span className="material-symbols-outlined text-2xl text-slate-600 dark:text-slate-300">arrow_back_ios_new</span>
                </button>
                <h1 className="text-lg font-bold tracking-tight">Add Funds</h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 overflow-y-auto pb-40 max-w-md mx-auto w-full no-scrollbar">
                <div className="px-6 pt-8 pb-6 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-primary text-4xl">add_card</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Top Up Wallet</h2>
                    <p className="text-[#57798e] dark:text-gray-400 text-sm font-medium mt-1">Funds will be added instantly after payment</p>
                </div>

                {error && (
                    <div className="mx-6 mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                        <span className="material-symbols-outlined">error</span>
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}

                <form onSubmit={handleDeposit} className="px-6 space-y-6">
                    <div>
                        <label className="text-base font-bold text-primary dark:text-primary-light pl-1 block mb-3">Amount to Add (GHS)</label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">GHS</div>
                            <input
                                className="w-full bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl py-6 pl-20 pr-6 text-3xl font-black focus:border-primary focus:ring-0 transition-all outline-none shadow-soft"
                                placeholder="0.00"
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-2 mt-4">
                            {[10, 20, 50, 100].map((val) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setAmount(val.toString())}
                                    className="py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold hover:border-primary hover:text-primary transition-all active:scale-95"
                                >
                                    +{val}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-primary/5 dark:bg-primary/10 p-5 rounded-2xl border border-primary/10 flex gap-4">
                        <span className="material-symbols-outlined text-primary">verified_user</span>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-primary">Secure Payment</p>
                            <p className="text-[12px] leading-tight text-primary/70 font-medium">Your transaction is processed via Paystack. KART does not store your card or MoMo details.</p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !amount || parseFloat(amount) <= 0}
                        className="btn-primary w-full h-16 text-lg shadow-xl shadow-primary/20 mt-4"
                    >
                        {loading ? 'Initializing...' : 'Proceed to Pay'}
                    </button>
                </form>
            </main>
        </div>
    );
}
