'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ReportsClient({ initialReports, stats = {} }) {
    const [reports, setReports] = useState(initialReports);

    // Sync state when props change
    useEffect(() => {
        setReports(initialReports);
    }, [initialReports]);

    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const router = useRouter();
    const searchParams = useSearchParams();
    const currentFilter = searchParams?.get('status') || 'all';

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // Filter reports based on search query
    const filteredReports = useMemo(() => {
        if (!search.trim()) return reports;
        const s = search.toLowerCase();
        return reports.filter(r =>
            r.reason?.toLowerCase().includes(s) ||
            r.description?.toLowerCase().includes(s) ||
            r.reporter?.display_name?.toLowerCase().includes(s) ||
            r.reporter?.email?.toLowerCase().includes(s) ||
            r.product?.title?.toLowerCase().includes(s) ||
            r.reportedUser?.display_name?.toLowerCase().includes(s)
        );
    }, [search, reports]);

    const handleUpdateStatus = async (reportId, newStatus) => {
        const actionText = newStatus === 'Resolved' ? 'resolve' : 'dismiss';
        if (!confirm(`Are you sure you want to ${actionText} this report?`)) return;

        setLoading(true);
        try {
            const response = await fetch('/api/admin/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportId, status: newStatus }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update report status');
            }

            setReports(prev => prev.map(r =>
                r.id === reportId ? { ...r, status: newStatus } : r
            ));

            showToast(`Report successfully marked as ${newStatus}`);
            router.refresh();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Compliance Stats Pulse */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Inquiries', value: stats.total, color: 'primary', icon: 'visibility', sub: 'Cumulative reports' },
                    { label: 'Unresolved', value: stats.pending, color: 'amber-500', icon: 'pending', sub: 'Requires attention' },
                    { label: 'Resolved', value: stats.resolved, color: 'green-500', icon: 'check_circle', sub: 'Successfully settled' },
                    { label: 'Dismissed', value: stats.dismissed, color: 'gray-500', icon: 'block', sub: 'Non-violating items' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm transform hover:-translate-y-1 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`size-12 rounded-xl flex items-center justify-center ${stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                                stat.color === 'amber-500' ? 'bg-amber-500/10 text-amber-500' :
                                    stat.color === 'green-500' ? 'bg-green-500/10 text-green-500' :
                                        'bg-gray-500/10 text-gray-500'
                                }`}>
                                <DynamicLucideIcon name={stat.icon} className="text-[24px] font-bold" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">{stat.label}</p>
                                <p className="text-xl font-black tracking-tighter">{stat.value || 0}</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                {/* Enforcement Filters */}
                <div className="flex flex-wrap items-center gap-3 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-2 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41]">
                    {[
                        { id: 'all', label: 'All Activity' },
                        { id: 'Pending', label: 'Unresolved' },
                        { id: 'Resolved', label: 'Resolved' },
                        { id: 'Dismissed', label: 'Dismissed' }
                    ].map(filter => (
                        <Link
                            key={filter.id}
                            href={filter.id === 'all' ? '/dashboard/admin/reports' : `/dashboard/admin/reports?status=${filter.id}`}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentFilter === filter.id
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-[#4b636c] hover:bg-gray-100 dark:hover:bg-[#212b30]'
                                }`}
                        >
                            {filter.label}
                        </Link>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-80 group">
                    <DynamicLucideIcon name="search" className="absolute left-4 top-1/2 -translate-y-1/2  text-[#4b636c] group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Reports..."
                        className="w-full pl-12 pr-4 py-3.5 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[#4b636c]/50"
                    />
                </div>
            </div>

            {/* Reports List */}
            {filteredReports && filteredReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredReports.map((report) => (
                        <div key={report.id} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden flex flex-col group hover:border-primary/30 transition-all shadow-sm">
                            <div className="p-6 pb-2 border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between bg-background-light dark:bg-[#212b30]/30">
                                <div className="flex items-center gap-2">
                                    {report.status === 'Pending' ? (
                                        <span className="size-2 bg-amber-500 rounded-full animate-pulse"></span>
                                    ) : report.status === 'Resolved' ? (
                                        <DynamicLucideIcon name="verified" className="text-green-500 text-[14px]" />
                                    ) : (
                                        <DynamicLucideIcon name="block" className="text-gray-400 text-[14px]" />
                                    )}
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${report.status === 'Pending' ? 'text-amber-500' :
                                        report.status === 'Resolved' ? 'text-green-500' : 'text-[#4b636c]'
                                        }`}>
                                        {report.status}
                                    </span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">
                                    {new Date(report.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="p-6 flex-1 space-y-4">
                                <div>
                                    <h4 className="text-[9px] font-black uppercase mr-2 tracking-[0.2em] text-[#4b636c] mb-1">
                                        {report.reported_user_id ? 'Reported User' : 'Reported Item'}
                                    </h4>
                                    {report.reported_user_id ? (
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[8px] font-black">
                                                {report.reportedUser?.display_name?.charAt(0) || 'U'}
                                            </div>
                                            <p className="text-sm font-black tracking-tighter uppercase line-clamp-1">{report.reportedUser?.display_name || 'Unknown User'}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-black tracking-tighter uppercase line-clamp-1">{report.product?.title || 'Unknown Product'}</p>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-[#212b30] p-4 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-[10px] font-black uppercase tracking-[0.05em] text-red-500 flex items-center gap-2">
                                    <DynamicLucideIcon name="report" className="text-[16px]" />
                                    Reason: {report.reason}
                                </div>

                                {report.description && (
                                    <div className="bg-white/50 dark:bg-[#111618]/50 p-4 rounded-xl italic text-xs font-black text-[#4b636c] leading-relaxed">
                                        {report.description}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 pt-2">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-[#4b636c] tracking-widest">Submitted By</p>
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-black">
                                                {report.reporter?.display_name?.charAt(0) || 'R'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-tighter truncate">{report.reporter?.display_name || 'Anonymous User'}</p>
                                                <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-tighter truncate">{report.reporter?.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-background-light dark:bg-[#212b30]/30 mt-auto flex items-center justify-between border-t border-[#dce3e5] dark:border-[#2d3b41]">
                                <Link
                                    href={report.reported_user_id ? `/profile/${report.reportedUser?.id}` : `/marketplace/${report.product?.id}`}
                                    target="_blank"
                                    className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors"
                                >
                                    <DynamicLucideIcon name="open_in_new" className="text-[16px]" />
                                    Investigate
                                </Link>
                                {report.status === 'Pending' ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleUpdateStatus(report.id, 'Resolved')}
                                            disabled={loading}
                                            className="size-8 rounded-lg hover:bg-green-500/10 text-green-600 transition-colors flex items-center justify-center active:scale-95 disabled:opacity-50"
                                            title="Resolve"
                                        >
                                            <DynamicLucideIcon name="check" className="text-[20px]" />
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(report.id, 'Dismissed')}
                                            disabled={loading}
                                            className="size-8 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors flex items-center justify-center active:scale-95 disabled:opacity-50"
                                            title="Dismiss"
                                        >
                                            <DynamicLucideIcon name="close" className="text-[20px]" />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-[9px] font-black text-gray-400 uppercase mr-2">Processed</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="size-20 bg-gray-100 dark:bg-[#182125] rounded-3xl flex items-center justify-center mb-6 border border-[#dce3e5] dark:border-[#2d3b41]">
                        <DynamicLucideIcon name="shield_check" className="text-4xl text-[#4b636c]/30" />
                    </div>
                    <h3 className="text-xl font-black tracking-tighter uppercase">Sector Clear</h3>
                    <p className="text-[#4b636c] text-[10px] font-black uppercase tracking-widest mt-2 max-w-xs">No pending compliance reports are currently awaiting your review.</p>
                </div>
            )}

            {/* Notification Toast */}
            {toast.show && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className={`${toast.type === 'success' ? 'bg-primary shadow-primary/20' : 'bg-red-500 shadow-red-500/20'} text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl`}>
                        <DynamicLucideIcon name={toast.type === 'success' ? 'check_circle' : 'error'} className="text-sm" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
