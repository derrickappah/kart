'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function OrdersListClient({ initialOrders, stats, error }) {
    const [search, setSearch] = useState('');
    const [inspectOrder, setInspectOrder] = useState(null);
    const router = useRouter();

    const handleSearch = (e) => {
        e.preventDefault();
        const params = new URLSearchParams(window.location.search);
        if (search) params.set('q', search);
        else params.delete('q');
        router.push(`/dashboard/admin/orders?${params.toString()}`);
    };

    const applyEscrowFilter = (value) => {
        const params = new URLSearchParams(window.location.search);
        if (value && value !== 'all') params.set('escrow', value);
        else params.delete('escrow');
        router.push(`/dashboard/admin/orders?${params.toString()}`);
    };

    const escrowFilter = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('escrow') || 'all' : 'all';

    return (
        <div className="space-y-8">
            {/* Financial Pulse Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Platform Volume', value: `GH₵ ${stats.totalRevenue.toLocaleString()}`, color: 'primary', icon: 'account_balance_wallet' },
                    { label: 'Escrow Lock', value: stats.heldCount, color: 'amber-500', icon: 'lock' },
                    { label: 'Total Orders', value: stats.totalCount, color: 'green-500', icon: 'shopping_cart' },
                    { label: 'Refunded', value: stats.refundedCount, color: 'red-500', icon: 'keyboard_return' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41]">
                        <div className="flex items-center gap-4">
                            <div className={`size-10 rounded-lg bg-${stat.color === 'primary' ? 'primary' : stat.color === 'amber-500' ? 'amber-500' : stat.color === 'green-500' ? 'green-500' : 'red-500'}/10 text-${stat.color === 'primary' ? 'primary' : stat.color === 'amber-500' ? 'amber-500' : stat.color === 'green-500' ? 'green-500' : 'red-500'} flex items-center justify-center`}>
                                <span className="material-symbols-outlined">{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-[#4b636c] dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                                <h4 className="text-xl font-black tracking-tighter uppercase">{stat.value || 0}</h4>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Transaction Control Bar */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto">
                    {[
                        { label: 'All Transactions', value: 'all', icon: 'receipt_long' },
                        { label: 'Held', value: 'Held', icon: 'lock_person' },
                        { label: 'Released', value: 'Released', icon: 'money_forward' },
                        { label: 'Refunded', value: 'Refunded', icon: 'history_edu' },
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => applyEscrowFilter(tab.value)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${escrowFilter === tab.value
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-[#4b636c] hover:bg-primary/5'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSearch} className="relative w-full md:w-80 group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#4b636c] group-focus-within:text-primary transition-colors text-sm">search</span>
                    <input
                        className="w-full bg-background-light dark:bg-[#212b30] border-none rounded-xl pl-9 pr-4 py-2.5 text-[10px] font-black tracking-widest uppercase focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-[#4b636c]/50"
                        placeholder="Search Reference or ID..."
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-sm font-medium">
                    Error loading ledger: {error.message}
                </div>
            )}

            {/* Transaction Ledger */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
                            <th className="px-6 py-4">Registry Asset</th>
                            <th className="px-6 py-4">Counterparties</th>
                            <th className="px-6 py-4">Valuation</th>
                            <th className="px-6 py-4">Protocol State</th>
                            <th className="px-6 py-4 text-center">Protocol Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41]">
                        {initialOrders.map((order) => {
                            const productImage = order.product?.images?.[0] || order.product?.image_url;
                            return (
                                <tr key={order.id} className="hover:bg-primary/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-lg bg-gray-100 dark:bg-[#212b30] flex-shrink-0 relative overflow-hidden group/img">
                                                {productImage ? (
                                                    <Image src={productImage} alt="" fill className="object-cover group-hover/img:scale-110 transition-transform" sizes="48px" />
                                                ) : (
                                                    <div className="size-full flex items-center justify-center text-[#4b636c]/30">
                                                        <span className="material-symbols-outlined text-2xl">package_2</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-[#111618] dark:text-gray-200 group-hover:text-primary transition-colors max-w-[180px] truncate tracking-tight">{order.product?.title || 'Unknown Item'}</p>
                                                <p className="text-[10px] text-[#4b636c] font-black uppercase mt-0.5 tracking-widest">ID: {order.id.slice(0, 8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-[#4b636c] uppercase w-8">Byr:</span>
                                                <span className="text-[10px] font-black truncate max-w-[120px] uppercase tracking-tighter">{order.buyer?.display_name || 'Anonymous'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-[#4b636c] uppercase w-8">Slr:</span>
                                                <span className="text-[10px] font-black truncate max-w-[120px] uppercase tracking-tighter">{order.seller?.display_name || 'Anonymous'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-black text-primary tracking-tighter">GH₵ {parseFloat(order.total_amount || 0).toFixed(2)}</p>
                                        <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-widest">{order.quantity} x Asset</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase w-fit ${order.status === 'Paid' ? 'bg-green-500/10 text-green-500' :
                                                order.status === 'Cancelled' ? 'bg-red-500/10 text-red-500' :
                                                    'bg-amber-500/10 text-amber-500'
                                                }`}>
                                                {order.status}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase w-fit ${order.escrow_status === 'Held' ? 'bg-amber-500/10 text-amber-500' :
                                                order.escrow_status === 'Released' ? 'bg-primary/10 text-primary' :
                                                    'bg-gray-500/10 text-gray-500'
                                                }`}>
                                                {order.escrow_status || 'UNINITIALIZED'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link
                                                href={`/dashboard/admin/orders/${order.id}`}
                                                className="size-8 rounded-lg bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors border border-[#dce3e5] dark:border-[#2d3b41] hover:border-primary/20"
                                                title="Execute Protocol"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">payments</span>
                                            </Link>
                                            <button
                                                onClick={() => setInspectOrder(order)}
                                                className="size-8 rounded-lg bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors border border-[#dce3e5] dark:border-[#2d3b41] hover:border-primary/20"
                                                title="Quick Inspect"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {(!initialOrders || initialOrders.length === 0) && (
                    <div className="p-20 text-center">
                        <div className="size-20 bg-gray-100 dark:bg-[#182125] rounded-3xl flex items-center justify-center mx-auto mb-6 border border-[#dce3e5] dark:border-[#2d3b41]">
                            <span className="material-symbols-outlined text-4xl text-[#4b636c]/30">receipt_long</span>
                        </div>
                        <h3 className="text-lg font-black tracking-tighter">No transactions recorded</h3>
                        <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-[0.2em] mt-2 max-w-xs mx-auto">
                            The requested registry filter returned zero active transaction records.
                        </p>
                    </div>
                )}
            </div>

            {/* Protocol Inspection Modal */}
            {inspectOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0a0f11]/80 backdrop-blur-sm" onClick={() => setInspectOrder(null)}></div>
                    <div className="relative bg-white dark:bg-[#182125] w-full max-w-2xl rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black tracking-tighter">Transaction Protocol</h2>
                                <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-[0.2em] mt-1">Registry ID: {inspectOrder.id.slice(0, 8)}</p>
                            </div>
                            <button onClick={() => setInspectOrder(null)} className="size-10 rounded-full hover:bg-gray-100 dark:hover:bg-[#212b30] flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="flex gap-6">
                                <div className="size-32 rounded-2xl bg-gray-100 dark:bg-[#212b30] overflow-hidden relative border border-[#dce3e5] dark:border-[#2d3b41]">
                                    {inspectOrder.product?.image_url ? (
                                        <Image src={inspectOrder.product.image_url} alt="" fill className="object-cover" />
                                    ) : (
                                        <div className="size-full flex items-center justify-center text-[#4b636c]/20">
                                            <span className="material-symbols-outlined text-4xl">inventory_2</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <h3 className="text-lg font-black tracking-tight">{inspectOrder.product?.title}</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Asset Value</p>
                                            <p className="text-xl font-black text-primary">GH₵ {parseFloat(inspectOrder.total_amount || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Escrow Protocol</p>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${inspectOrder.escrow_status === 'Held' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                                                {inspectOrder.escrow_status || 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-[#dce3e5] dark:border-[#2d3b41]">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Buyer Identity</p>
                                        <p className="text-xs font-black uppercase tracking-tight">{inspectOrder.buyer?.display_name}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c]">{inspectOrder.buyer?.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Seller Identity</p>
                                        <p className="text-xs font-black uppercase tracking-tight">{inspectOrder.seller?.display_name}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c]">{inspectOrder.seller?.email}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Reference Pulse</p>
                                        <p className="text-[10px] font-black tracking-widest truncate">{inspectOrder.payment_reference || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Registry Created</p>
                                        <p className="text-xs font-black uppercase tracking-tight">{new Date(inspectOrder.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-background-light dark:bg-[#212b30]/50 flex items-center justify-between gap-4">
                            <button
                                onClick={() => setInspectOrder(null)}
                                className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:text-red-500 transition-colors"
                            >
                                Close Inspection
                            </button>
                            <Link
                                href={`/dashboard/admin/orders/${inspectOrder.id}`}
                                className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-3 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                                Manage Settlement
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination UI */}
            <div className="flex items-center justify-between px-2">
                <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">Showing <span className="text-[#111618] dark:text-white">1-{initialOrders.length}</span> of <span className="text-[#111618] dark:text-white">{stats.totalCount}</span></p>
                <div className="flex gap-2">
                    <button className="size-10 rounded-xl bg-white/70 dark:bg-[#182125]/70 border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors disabled:opacity-50" disabled>
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button className="size-10 rounded-xl bg-white/70 dark:bg-[#182125]/70 border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors disabled:opacity-50" disabled>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
