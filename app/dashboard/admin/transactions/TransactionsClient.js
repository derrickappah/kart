'use client';

import { useState, useMemo } from 'react';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';

export default function TransactionsClient({ initialTransactions = [], stats = {}, error = null }) {
    const [transactions, setTransactions] = useState(initialTransactions);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    // Filtered transactions
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Type filter
            if (typeFilter !== 'All' && t.transaction_type !== typeFilter) {
                return false;
            }

            // Status filter
            if (statusFilter !== 'All' && t.status !== statusFilter) {
                return false;
            }

            // Search query
            if (search.trim() !== '') {
                const query = search.toLowerCase();
                const user = t.wallet?.profile;
                const matchesUser = user && (
                    (user.display_name && user.display_name.toLowerCase().includes(query)) ||
                    (user.email && user.email.toLowerCase().includes(query))
                );
                const matchesRef = t.reference && t.reference.toLowerCase().includes(query);
                const matchesDesc = t.description && t.description.toLowerCase().includes(query);
                const matchesNotes = t.admin_notes && t.admin_notes.toLowerCase().includes(query);
                const matchesId = t.id && t.id.toLowerCase().includes(query);

                return matchesUser || matchesRef || matchesDesc || matchesNotes || matchesId;
            }

            return true;
        });
    }, [transactions, search, typeFilter, statusFilter]);

    // Format currency helper
    const formatCurrency = (value) => {
        const num = parseFloat(value || 0);
        return `₵${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Helper to format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        }) + ' ' + date.toLocaleTimeString(undefined, { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[#111618] dark:text-white">
                        Wallet Audit Ledger
                    </h1>
                    <p className="text-sm text-[#4b636c] dark:text-gray-400 mt-1">
                        Real-time audit trail of all platform wallet credits, debits, and withdrawals.
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold flex items-center gap-2">
                    <DynamicLucideIcon name="error" className="text-lg" />
                    <span>Failed to retrieve latest ledger records: {error}</span>
                </div>
            )}

            {/* Metrics cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { 
                        label: 'Total Volume', 
                        value: formatCurrency(stats.totalVolume), 
                        color: 'text-primary bg-primary/10 border-primary/20', 
                        icon: 'payments' 
                    },
                    { 
                        label: 'Total Credits', 
                        value: formatCurrency(stats.creditVolume), 
                        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', 
                        icon: 'trending_up' 
                    },
                    { 
                        label: 'Total Debits', 
                        value: formatCurrency(stats.debitVolume + stats.withdrawalVolume), 
                        color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', 
                        icon: 'trending_down' 
                    },
                    { 
                        label: 'Ledger Records', 
                        value: stats.total || 0, 
                        color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', 
                        icon: 'history' 
                    },
                ].map((stat, i) => (
                    <div 
                        key={i} 
                        className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-col justify-between shadow-sm transition-all hover:border-primary/20"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[#4b636c] dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                {stat.label}
                            </p>
                            <div className={`size-8 rounded-xl flex items-center justify-center ${stat.color} border`}>
                                <DynamicLucideIcon name={stat.icon} size={18} />
                            </div>
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-[#111618] dark:text-white mt-1">
                            {stat.value}
                        </h4>
                    </div>
                ))}
            </div>

            {/* Filter & Search Controls */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm">
                
                {/* Search Bar */}
                <div className="relative w-full xl:w-96 group">
                    <DynamicLucideIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b636c] group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        className="w-full bg-background-light dark:bg-[#212b30] border-none rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-[#4b636c] text-[#111618] dark:text-white"
                        placeholder="Search by Reference, User Email, Description..."
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Transaction Type Filters */}
                    <div className="flex bg-background-light dark:bg-[#212b30] p-1 rounded-xl border border-transparent dark:border-[#2d3b41]/40">
                        {['All', 'Credit', 'Debit', 'Withdrawal'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 ${
                                    typeFilter === type
                                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                                        : 'text-[#4b636c] dark:text-gray-400 hover:text-[#111618] dark:hover:text-white'
                                }`}
                            >
                                {type === 'All' ? 'All Types' : type}
                            </button>
                        ))}
                    </div>

                    {/* Status Filters */}
                    <div className="flex bg-background-light dark:bg-[#212b30] p-1 rounded-xl border border-transparent dark:border-[#2d3b41]/40">
                        {['All', 'Completed', 'Pending'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 ${
                                    statusFilter === status
                                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                                        : 'text-[#4b636c] dark:text-gray-400 hover:text-[#111618] dark:hover:text-white'
                                }`}
                            >
                                {status === 'All' ? 'All Status' : status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden shadow-sm">
                <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
                                <th className="px-6 py-4">Account Holder</th>
                                <th className="px-6 py-4">Transaction Details</th>
                                <th className="px-6 py-4 text-center">Type</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-center">Audit Balance (Before → After)</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41]">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((t) => {
                                    const user = t.wallet?.profile;
                                    const isCredit = t.transaction_type === 'Credit';
                                    const isDebit = t.transaction_type === 'Debit';
                                    const isWithdrawal = t.transaction_type === 'Withdrawal';

                                    return (
                                        <tr key={t.id} className="hover:bg-primary/[0.01] transition-colors group">
                                            {/* Account Holder */}
                                            <td className="px-6 py-4">
                                                {user ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary overflow-hidden border border-primary/20">
                                                            {user.avatar_url ? (
                                                                <img src={user.avatar_url} alt="" className="size-full object-cover" />
                                                            ) : (
                                                                user.display_name?.[0]?.toUpperCase() || 'U'
                                                            )}
                                                        </div>
                                                        <div>
                                                            <Link 
                                                                href={`/dashboard/admin/users?q=${encodeURIComponent(user.email)}`}
                                                                className="text-xs font-black text-[#111618] dark:text-gray-200 hover:text-primary transition-colors cursor-pointer block"
                                                            >
                                                                {user.display_name || 'Anonymous'}
                                                            </Link>
                                                            <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-tight">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs font-bold text-[#4b636c]">
                                                        System Account
                                                    </div>
                                                )}
                                            </td>

                                            {/* Transaction Details */}
                                            <td className="px-6 py-4 max-w-[280px]">
                                                <p className="text-xs font-bold text-[#111618] dark:text-gray-200 truncate">
                                                    {t.description || 'No Description'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] text-[#4b636c] font-black uppercase tracking-wider bg-background-light dark:bg-[#212b30] px-1.5 py-0.5 rounded border border-transparent dark:border-[#2d3b41]/40 font-mono">
                                                        Ref: {t.reference || 'N/A'}
                                                    </span>
                                                    <span className="text-[9px] text-[#4b636c] font-bold">
                                                        {formatDate(t.created_at)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Transaction Type */}
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                    isCredit 
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                                        : isDebit 
                                                        ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' 
                                                        : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                                                }`}>
                                                    {t.transaction_type}
                                                </span>
                                            </td>

                                            {/* Amount */}
                                            <td className={`px-6 py-4 text-right font-black text-xs ${
                                                isCredit 
                                                    ? 'text-emerald-600 dark:text-emerald-400' 
                                                    : 'text-rose-600 dark:text-rose-400'
                                            }`}>
                                                {isCredit ? '+' : '-'} {formatCurrency(t.amount)}
                                            </td>

                                            {/* Audit Balance (Before -> After) */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-flex items-center gap-2 bg-background-light dark:bg-[#212b30]/30 px-3 py-1 rounded-xl border border-transparent dark:border-[#2d3b41]/20">
                                                    <span className="text-[10px] font-bold text-[#4b636c]">{formatCurrency(t.balance_before)}</span>
                                                    <DynamicLucideIcon name="arrow_forward" size={10} className="text-[#4b636c]" />
                                                    <span className="text-[10px] font-black text-[#111618] dark:text-white">{formatCurrency(t.balance_after)}</span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                    t.status === 'Completed'
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                                        : t.status === 'Pending'
                                                        ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                                                        : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                                                }`}>
                                                    {t.status}
                                                </span>
                                            </td>

                                            {/* Action / View details */}
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => setSelectedTransaction(t)}
                                                    className="size-8 rounded-lg bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-primary transition-all border border-transparent hover:border-primary/20 active:scale-95 mx-auto"
                                                    title="View Transaction Audit Details"
                                                >
                                                    <DynamicLucideIcon name="visibility" size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-[#4b636c]">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <DynamicLucideIcon name="search_off" size={40} className="opacity-20 text-primary" />
                                            <p className="text-xs font-black uppercase tracking-widest opacity-40">
                                                No ledger records match search criteria
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer / Total count */}
                <div className="p-4 border-t border-[#dce3e5] dark:border-[#2d3b41] bg-gray-50/30 dark:bg-[#1c272a]/30 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#4b636c]">
                    <div>
                        Showing <span className="text-[#111618] dark:text-white">{filteredTransactions.length}</span> of <span className="text-[#111618] dark:text-white">{transactions.length}</span> records
                    </div>
                </div>
            </div>

            {/* Transaction Details Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#131d20] border border-[#dce3e5] dark:border-[#2d3b41] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-gray-50 dark:bg-[#182125] border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-[#111618] dark:text-white uppercase tracking-wider">
                                    Ledger Audit Details
                                </h3>
                                <p className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest mt-0.5 font-mono">
                                    ID: {selectedTransaction.id}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedTransaction(null)}
                                className="size-8 rounded-lg hover:bg-gray-200 dark:hover:bg-[#212b30] flex items-center justify-center text-[#4b636c] dark:text-gray-300 transition-colors"
                            >
                                <DynamicLucideIcon name="close" size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* User Profile Info */}
                            {selectedTransaction.wallet?.profile && (
                                <div className="p-4 rounded-xl bg-background-light dark:bg-[#182125]/50 border border-[#dce3e5] dark:border-[#2d3b41]/60">
                                    <h4 className="text-[10px] font-black text-[#4b636c] uppercase tracking-widest mb-3">Wallet Owner</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary overflow-hidden border border-primary/20">
                                            {selectedTransaction.wallet.profile.avatar_url ? (
                                                <img src={selectedTransaction.wallet.profile.avatar_url} alt="" className="size-full object-cover" />
                                            ) : (
                                                selectedTransaction.wallet.profile.display_name?.[0]?.toUpperCase() || 'U'
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-[#111618] dark:text-white">
                                                {selectedTransaction.wallet.profile.display_name || 'Anonymous'}
                                            </p>
                                            <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-tight">
                                                {selectedTransaction.wallet.profile.email}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-[#4b636c] font-mono mt-3">
                                        Wallet ID: {selectedTransaction.wallet_id}
                                    </p>
                                </div>
                            )}

                            {/* Audit Ledger Detail Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest block">Transaction Type</span>
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                        selectedTransaction.transaction_type === 'Credit' 
                                            ? 'bg-emerald-500/10 text-emerald-600' 
                                            : selectedTransaction.transaction_type === 'Debit'
                                            ? 'bg-rose-500/10 text-rose-600'
                                            : 'bg-amber-500/10 text-amber-600'
                                    }`}>
                                        {selectedTransaction.transaction_type}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest block">Status</span>
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                        selectedTransaction.status === 'Completed' 
                                            ? 'bg-emerald-500/10 text-emerald-600' 
                                            : 'bg-amber-500/10 text-amber-600'
                                    }`}>
                                        {selectedTransaction.status}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest block">Amount</span>
                                    <span className={`text-xs font-black ${
                                        selectedTransaction.transaction_type === 'Credit' 
                                            ? 'text-emerald-600' 
                                            : 'text-rose-600'
                                    }`}>
                                        {selectedTransaction.transaction_type === 'Credit' ? '+' : '-'} {formatCurrency(selectedTransaction.amount)}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest block">Timestamp</span>
                                    <span className="text-xs font-bold text-[#111618] dark:text-gray-300">
                                        {formatDate(selectedTransaction.created_at)}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest block">Balance Before</span>
                                    <span className="text-xs font-bold text-[#4b636c]">
                                        {formatCurrency(selectedTransaction.balance_before)}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest block">Balance After</span>
                                    <span className="text-xs font-black text-primary">
                                        {formatCurrency(selectedTransaction.balance_after)}
                                    </span>
                                </div>
                            </div>

                            <hr className="border-[#dce3e5] dark:border-[#2d3b41]" />

                            <div className="space-y-3">
                                <div>
                                    <span className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest block">Description</span>
                                    <p className="text-xs font-bold text-[#111618] dark:text-gray-200 mt-0.5">
                                        {selectedTransaction.description || 'No description provided.'}
                                    </p>
                                </div>

                                <div>
                                    <span className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest block">Reference Code</span>
                                    <p className="text-xs font-bold font-mono text-[#111618] dark:text-gray-200 mt-0.5 bg-background-light dark:bg-[#212b30]/60 px-2 py-1 rounded w-fit border border-transparent dark:border-[#2d3b41]/40">
                                        {selectedTransaction.reference || 'N/A'}
                                    </p>
                                </div>

                                {/* Order & Product Linkage */}
                                {selectedTransaction.order && (
                                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Linked Marketplace Order</span>
                                            <Link 
                                                href={`/dashboard/admin/orders`}
                                                className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                                            >
                                                View Orders Hub
                                            </Link>
                                        </div>
                                        <p className="text-xs font-black text-[#111618] dark:text-white">
                                            {selectedTransaction.order.product?.title || 'Unknown Product'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] text-[#4b636c] dark:text-gray-400 font-bold">
                                                Order ID: {selectedTransaction.order_id}
                                            </span>
                                            <span className="text-[9px] text-[#4b636c] dark:text-gray-400 font-black uppercase">
                                                ({selectedTransaction.order.status})
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {selectedTransaction.admin_notes && (
                                    <div>
                                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Admin Notes</span>
                                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                                            {selectedTransaction.admin_notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-gray-50 dark:bg-[#182125] border-t border-[#dce3e5] dark:border-[#2d3b41] flex justify-end">
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="px-4 py-2 bg-[#212b30] hover:bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors active:scale-95"
                            >
                                Close Audit View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
