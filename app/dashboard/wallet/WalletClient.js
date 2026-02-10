'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../../utils/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WalletClient({ initialWallet, initialTransactions }) {
    const router = useRouter();
    const supabase = createClient();
    const [wallet, setWallet] = useState(initialWallet);
    const [transactions, setTransactions] = useState(initialTransactions || []);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const handleInviteNow = () => {
        // In a real app, this would get the user's specific referral link
        // For now, we'll use a generic link with their ID if available
        const baseUrl = window.location.origin;
        const referralLink = `${baseUrl}/signup?ref=${wallet?.user_id?.substring(0, 8) || 'friend'}`;

        navigator.clipboard.writeText(referralLink).then(() => {
            setToastMessage('Referral link copied to clipboard!');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback for browsers that don't support clipboard API
            alert('Share KART with your friends to earn credit!');
        });
    };

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'Credit':
            case 'Refund':
                return 'menu_book';
            case 'Debit':
            case 'Withdrawal':
                return 'account_balance';
            default:
                return 'payments';
        }
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] text-[#0e181b] dark:text-white font-display min-h-screen antialiased">


            <main className="max-w-md mx-auto pb-32">
                {/* Main Balance Card Section */}
                <div className="p-4">
                    <div className="relative flex flex-col overflow-hidden rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white dark:bg-[#1a2b31] border border-slate-100 dark:border-slate-800 transition-all duration-300">
                        {/* Decorative background elements */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#1daddd]/10 rounded-full blur-3xl"></div>

                        <div className="relative flex flex-col items-center justify-center gap-2 py-10 px-6">
                            <p className="text-[#4f8596] dark:text-slate-400 text-sm font-bold tracking-wide uppercase">Total Balance</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-[#1daddd]">GHS</span>
                                <p className="text-5xl font-black tracking-tight">{parseFloat(wallet?.balance || 0).toFixed(2)}</p>
                            </div>
                            <div className="mt-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-black">
                                + 12% this month
                            </div>
                        </div>

                        {/* Action Button Group */}
                        <div className="flex gap-3 p-4 pt-0">
                            <Link href="/dashboard/wallet/deposit" className="flex-1 btn-primary h-14">
                                <span className="material-symbols-outlined text-xl">add_circle</span>
                                <span>Add Funds</span>
                            </Link>
                            <Link href="/dashboard/wallet/withdraw" className="flex-1 btn-primary h-14">
                                <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                                <span>Withdraw</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions Section Header */}
                <div className="flex items-center justify-between px-5 pb-3 pt-6">
                    <h2 className="text-[20px] font-black tracking-tight">Recent Transactions</h2>
                    <button className="text-primary text-sm font-bold">See all</button>
                </div>

                {/* Transaction List */}
                <div className="px-4 space-y-2">
                    {transactions.length > 0 ? (
                        transactions.map((t) => {
                            const isCredit = t.transaction_type === 'Credit' || t.transaction_type === 'Refund';
                            return (
                                <div key={t.id} className="flex items-center gap-4 bg-white dark:bg-[#1a2b31] p-4 min-h-[80px] rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className={`flex items-center justify-center rounded-xl shrink-0 size-12 ${isCredit ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                        <span className="material-symbols-outlined">{getTransactionIcon(t.transaction_type)}</span>
                                    </div>
                                    <div className="flex flex-col flex-1 justify-center min-w-0">
                                        <p className="text-[#0e181b] dark:text-white text-base font-bold leading-tight truncate">
                                            {t.order?.product?.title || t.description || t.transaction_type}
                                        </p>
                                        <p className="text-[#4f8596] dark:text-slate-400 text-xs font-bold mt-1 uppercase tracking-tighter">
                                            {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-base font-black ${isCredit ? 'text-green-600' : 'text-[#0e181b] dark:text-white'}`}>
                                            {isCredit ? '+' : '-'}GHS {parseFloat(t.amount).toFixed(2)}
                                        </p>
                                        <p className={`text-[10px] font-black uppercase tracking-wider ${t.status === 'Completed' ? 'text-green-500' : 'text-amber-500'}`}>
                                            {t.status}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 px-6 bg-white dark:bg-[#1a2b31] rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">history</span>
                            <p className="text-slate-400 font-bold text-sm">No transactions yet</p>
                        </div>
                    )}
                </div>

                {/* Referral Banner */}
                <div className="p-4 mt-4">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-lg shadow-primary/20">
                        <div className="relative z-10 flex flex-col gap-2">
                            <h3 className="text-lg font-black tracking-tight">Refer a friend</h3>
                            <p className="text-sm font-medium text-white/90 leading-snug">Get GHS 5.00 credit for every student who joins and makes their first sale!</p>
                            <button
                                onClick={handleInviteNow}
                                className="mt-3 w-fit px-6 py-2.5 bg-white text-primary text-xs font-black rounded-full shadow-sm active:scale-95 transition-transform uppercase tracking-wider"
                            >
                                Invite Now
                            </button>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-20 rotate-12">
                            <span className="material-symbols-outlined text-[120px]">share</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in">
                    <div className="bg-[#1daddd] text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-xl shadow-[#1daddd]/20">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span className="text-sm font-bold">{toastMessage}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
