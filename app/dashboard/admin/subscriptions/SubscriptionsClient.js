'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';

export default function SubscriptionsClient({ initialSubscriptions, stats = {} }) {
    const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const router = useRouter();
    const supabase = createClient();
    const searchParams = useSearchParams();
    const currentFilter = searchParams?.get('status') || 'all';

    const handleSearch = (e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (currentFilter !== 'all') params.set('status', currentFilter);
        if (search) params.set('q', search);
        router.push(`/dashboard/admin/subscriptions?${params.toString()}`);
    };

    const handleFilterChange = (newFilter) => {
        const params = new URLSearchParams();
        if (newFilter !== 'all') params.set('status', newFilter);
        if (search) params.set('q', search);
        router.push(`/dashboard/admin/subscriptions?${params.toString()}`);
    };

    const handleActivate = async (subscriptionId) => {
        if (!confirm('Are you sure you want to manually activate this subscription?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('subscriptions')
                .update({ status: 'Active', updated_at: new Date().toISOString() })
                .eq('id', subscriptionId);

            if (error) throw error;

            // Update local state
            setSubscriptions(prev => prev.map(sub =>
                sub.id === subscriptionId ? { ...sub, status: 'Active' } : sub
            ));
        } catch (err) {
            alert('Error activating subscription: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (subscriptionId) => {
        if (!confirm('Are you sure you want to cancel this subscription?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('subscriptions')
                .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
                .eq('id', subscriptionId);

            if (error) throw error;

            // Update local state
            setSubscriptions(prev => prev.map(sub =>
                sub.id === subscriptionId ? { ...sub, status: 'Cancelled' } : sub
            ));
        } catch (err) {
            alert('Error cancelling subscription: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Active': return styles.statusActive;
            case 'Pending': return styles.statusPending;
            case 'Expired': return styles.statusExpired;
            case 'Cancelled': return styles.statusCancelled;
            default: return styles.statusPending;
        }
    };

    return (
        <div className="space-y-8">
            {/* Revenue Pulse Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Active Licenses', value: stats.active, color: 'green-500', icon: 'verified', sub: 'Projected monthly' },
                    { label: 'Pending Settlement', value: stats.pending, color: 'amber-500', icon: 'pending', sub: 'Awaiting activation' },
                    { label: 'Retained Volume', value: `GH₵ ${stats.revenue?.toFixed(2)}`, color: 'primary', icon: 'payments', sub: `${stats.total} total cycles` },
                    { label: 'Churn / Expired', value: stats.expired + stats.cancelled, color: 'red-500', icon: 'history_toggle_off', sub: 'Non-active accounts' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm transform hover:-translate-y-1 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`size-12 rounded-xl flex items-center justify-center ${stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                                stat.color === 'green-500' ? 'bg-green-500/10 text-green-500' :
                                    stat.color === 'amber-500' ? 'bg-amber-500/10 text-amber-500' :
                                        'bg-red-500/10 text-red-500'
                                }`}>
                                <span className="material-symbols-outlined text-[24px] font-bold">{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">{stat.label}</p>
                                <p className="text-xl font-black tracking-tighter">{stat.value}</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Subscription Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-3 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-2 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41]">
                    {['all', 'Active', 'Pending', 'Expired', 'Cancelled'].map(status => (
                        <button
                            key={status}
                            onClick={() => handleFilterChange(status)}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentFilter === status
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-[#637f88] hover:bg-gray-100 dark:hover:bg-[#212b30]'
                                }`}
                        >
                            {status === 'all' ? 'All Units' : status}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSearch} className="relative w-full md:w-96 group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#4b636c] group-focus-within:text-primary transition-colors">search</span>
                    <input
                        type="text"
                        placeholder="Search system ledger..."
                        className="w-full bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md border border-[#dce3e5] dark:border-[#2d3b41] rounded-2xl pl-12 pr-4 py-4 text-xs font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm placeholder:text-[#4b636c]"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>
            </div>

            {/* Subscription Intelligence Cards */}
            {subscriptions.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="size-20 bg-gray-100 dark:bg-[#182125] rounded-3xl flex items-center justify-center mb-6 border border-[#dce3e5] dark:border-[#2d3b41]">
                        <span className="material-symbols-outlined text-4xl text-[#4b636c]/30">folder_open</span>
                    </div>
                    <h3 className="text-xl font-black tracking-tighter uppercase">Vault Empty</h3>
                    <p className="text-[#4b636c] text-[10px] font-black uppercase tracking-widest mt-2 max-w-xs">No subscriptions matching your criteria were found in our database.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subscriptions.map((sub) => (
                        <div key={sub.id} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden flex flex-col group hover:border-primary/30 transition-all shadow-sm">
                            <div className="p-6 pb-2 border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between bg-background-light dark:bg-[#212b30]/30">
                                <div className="flex items-center gap-2">
                                    {sub.status === 'Active' ? (
                                        <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                                    ) : (
                                        <span className="size-2 bg-[#4b636c] rounded-full"></span>
                                    )}
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${sub.status === 'Active' ? 'text-green-500' : 'text-[#4b636c]'}`}>
                                        {sub.status}
                                    </span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">
                                    Ref: {sub.id.slice(0, 8)}
                                </span>
                            </div>

                            <div className="p-6 flex-1 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4b636c] mb-1">Membership Plan</h4>
                                        <p className="text-lg font-black tracking-tighter uppercase">{sub.plan?.name || 'Professional'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Monthly Cost</p>
                                        <p className="text-lg font-black tracking-tighter text-primary">₵{parseFloat(sub.plan?.price || 0).toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="bg-white/50 dark:bg-[#111618]/50 p-4 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41]">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-2">Account Holder</p>
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black">
                                            {sub.user?.display_name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black uppercase tracking-tighter truncate">{sub.user?.display_name || 'Enterprise Client'}</p>
                                            <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-tighter truncate">{sub.user?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-[#4b636c] tracking-widest">Effective Date</p>
                                        <p className="text-xs font-black">{new Date(sub.start_date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black uppercase text-[#4b636c] tracking-widest">Renewal Date</p>
                                        <p className="text-xs font-black text-red-600/80">{new Date(sub.end_date).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                {sub.payment_reference && (
                                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 flex items-center justify-between gap-2">
                                        <span className="text-[9px] font-black uppercase text-primary/70 tracking-widest">Gateway Ref</span>
                                        <span className="text-[10px] font-mono font-black text-primary truncate">{sub.payment_reference}</span>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-background-light dark:bg-[#212b30]/30 mt-auto flex items-center justify-between border-t border-[#dce3e5] dark:border-[#2d3b41]">
                                {sub.status === 'Pending' && (
                                    <button
                                        onClick={() => handleActivate(sub.id)}
                                        disabled={loading}
                                        className="w-full bg-primary hover:bg-primary-dark text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">verified</span>
                                        Authorize License
                                    </button>
                                )}
                                {sub.status === 'Active' && (
                                    <button
                                        onClick={() => handleCancel(sub.id)}
                                        disabled={loading}
                                        className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                        Revoke Access
                                    </button>
                                )}
                                {(sub.status === 'Expired' || sub.status === 'Cancelled') && (
                                    <div className="w-full py-3 text-center text-[10px] font-black uppercase tracking-widest text-[#4b636c]">
                                        Archived Record
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const styles = {}; // Dummy styles to satisfy existing references if any
