'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';

export default function WithdrawFundsClient({ initialWallet }) {
    const [wallet, setWallet] = useState(initialWallet);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [payoutMethod, setPayoutMethod] = useState('bank');
    const router = useRouter();
    const supabase = createClient();

    const availableBalance = parseFloat(wallet?.balance || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setLoading(true);

        try {
            const withdrawAmount = parseFloat(amount);
            if (!amount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
                throw new Error('Please enter a valid amount');
            }
            if (withdrawAmount > availableBalance) {
                throw new Error(`Insufficient balance. Available: GHS ${availableBalance.toFixed(2)}`);
            }

            const response = await fetch('/api/wallet/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: withdrawAmount, method: payoutMethod }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create withdrawal request');

            setSuccess(true);
            setAmount('');
            setTimeout(() => router.push('/dashboard/wallet'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131a1f] font-display text-[#101619] dark:text-gray-100 min-h-screen flex flex-col antialiased">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-[100] bg-[#f6f7f8]/80 dark:bg-[#131a1f]/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                <button 
                    onClick={() => router.back()}
                    className="btn-ghost size-10 !p-0 rounded-full"
                >
                    <span className="material-symbols-outlined text-2xl text-slate-600 dark:text-slate-300">arrow_back_ios_new</span>
                </button>
                <h1 className="text-lg font-bold tracking-tight">Withdraw Funds</h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 overflow-y-auto pb-40 max-w-md mx-auto w-full no-scrollbar">
                {/* Balance Header Section */}
                <div className="px-6 pt-4 pb-6 flex flex-col items-center">
                    <p className="text-secondary-light dark:text-secondary-dark text-sm font-bold uppercase tracking-wider mb-2">Available Balance</p>
                    <h2 className="text-5xl font-black tracking-tight text-primary dark:text-white">GHS {availableBalance.toFixed(2)}</h2>
                </div>

                {success && (
                    <div className="mx-6 mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl border border-green-100 dark:border-green-900/30 flex items-center gap-3">
                        <span className="material-symbols-outlined">check_circle</span>
                        <p className="text-sm font-bold">Withdrawal request submitted! Redirecting...</p>
                    </div>
                )}

                {error && (
                    <div className="mx-6 mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                        <span className="material-symbols-outlined">error</span>
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}

                {/* Withdrawal Amount Input */}
                <section className="px-6 mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-base font-bold text-primary dark:text-primary-light pl-1">Amount to Withdraw</label>
                        <button 
                            onClick={() => setAmount(availableBalance.toFixed(2))}
                            className="text-primary dark:text-primary-light font-black text-sm px-4 py-1.5 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors active:scale-95"
                        >
                            Use Max
                        </button>
                    </div>
                    <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">GHS</div>
                        <input 
                            className="w-full bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl py-6 pl-20 pr-6 text-3xl font-black focus:border-primary focus:ring-0 transition-all outline-none shadow-soft" 
                            placeholder="0.00" 
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <p className="mt-3 text-xs font-medium text-[#57798e] dark:text-gray-400 px-1">Withdrawals are typically processed within 24 hours.</p>
                </section>

                {/* Payout Method Section */}
                <section className="px-6 space-y-4">
                    <h3 className="text-lg font-black text-[#101619] dark:text-white mb-4 pl-1">Select Payout Method</h3>
                    
                    {/* Bank Transfer Option */}
                    <div 
                        onClick={() => setPayoutMethod('bank')}
                        className={`relative flex items-center p-5 bg-white dark:bg-gray-900 border-2 rounded-2xl cursor-pointer group shadow-soft transition-all ${payoutMethod === 'bank' ? 'border-primary ring-1 ring-primary' : 'border-gray-100 dark:border-gray-800'}`}
                    >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mr-4">
                            <span className="material-symbols-outlined text-primary text-3xl">account_balance</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-base">Bank Transfer</p>
                            <p className="text-sm font-medium text-secondary-light dark:text-secondary-dark">1-3 business days</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${payoutMethod === 'bank' ? 'border-primary' : 'border-slate-200 dark:border-slate-700'}`}>
                            {payoutMethod === 'bank' && <div className="w-3.5 h-3.5 bg-primary rounded-full"></div>}
                        </div>
                    </div>

                    {/* MoMo Option */}
                    <div 
                        onClick={() => setPayoutMethod('momo')}
                        className={`relative flex items-center p-5 bg-white dark:bg-gray-900 border-2 rounded-2xl cursor-pointer group shadow-soft transition-all ${payoutMethod === 'momo' ? 'border-primary ring-1 ring-primary' : 'border-gray-100 dark:border-gray-800'}`}
                    >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mr-4">
                            <span className="material-symbols-outlined text-primary text-3xl">smartphone</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-base">Mobile Money</p>
                            <p className="text-sm font-medium text-secondary-light dark:text-secondary-dark">Instant</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${payoutMethod === 'momo' ? 'border-primary' : 'border-slate-200 dark:border-slate-700'}`}>
                            {payoutMethod === 'momo' && <div className="w-3.5 h-3.5 bg-primary rounded-full"></div>}
                        </div>
                    </div>
                </section>
            </main>

            {/* Sticky Bottom Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 px-6 pt-5 pb-10 z-50">
                <div className="flex flex-col gap-4 max-w-md mx-auto">
                    <button 
                        onClick={handleSubmit}
                        disabled={loading || availableBalance <= 0}
                        className="btn-primary w-full h-16 text-lg shadow-xl shadow-primary/20"
                    >
                        {loading ? 'Processing...' : 'Confirm Withdrawal'}
                    </button>
                    <div className="flex items-center justify-center gap-2 opacity-60">
                        <span className="material-symbols-outlined text-sm">lock</span>
                        <p className="text-xs font-black uppercase tracking-widest">Secure encrypted transaction</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
