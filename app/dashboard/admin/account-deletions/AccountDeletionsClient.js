'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AccountDeletionsClient({ initialRequests = [], stats = {} }) {
    const [requests, setRequests] = useState(initialRequests);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // Modal states
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [modalAction, setModalAction] = useState(null); // 'approve' | 'reject'
    const [rejectionReason, setRejectionReason] = useState('');

    const router = useRouter();

    const filteredRequests = useMemo(() => {
        return requests.filter((req) => {
            const matchesStatus =
                statusFilter === 'all' || req.status?.toLowerCase() === statusFilter.toLowerCase();

            const query = search.toLowerCase().trim();
            const matchesSearch =
                !query ||
                req.email?.toLowerCase().includes(query) ||
                req.user?.display_name?.toLowerCase().includes(query) ||
                req.reason?.toLowerCase().includes(query);

            return matchesStatus && matchesSearch;
        });
    }, [requests, statusFilter, search]);

    const handleOpenApproveModal = (req) => {
        setSelectedRequest(req);
        setModalAction('approve');
    };

    const handleOpenRejectModal = (req) => {
        setSelectedRequest(req);
        setRejectionReason('');
        setModalAction('reject');
    };

    const handleCloseModal = () => {
        if (loading) return;
        setSelectedRequest(null);
        setModalAction(null);
        setRejectionReason('');
    };

    const handleApprove = async () => {
        if (!selectedRequest) return;
        setLoading(true);
        setFeedback(null);

        try {
            const res = await fetch('/api/admin/account-deletions/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: selectedRequest.id,
                    userId: selectedRequest.user_id,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to approve account deletion');

            setFeedback({ type: 'success', message: data.message || 'Account successfully marked as inactive/deleted' });
            
            // Update local state
            setRequests((prev) =>
                prev.map((r) =>
                    r.id === selectedRequest.id ? { ...r, status: 'approved', updated_at: new Date().toISOString() } : r
                )
            );

            handleCloseModal();
            router.refresh();
        } catch (err) {
            setFeedback({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (e) => {
        e?.preventDefault();
        if (!selectedRequest) return;
        setLoading(true);
        setFeedback(null);

        try {
            const res = await fetch('/api/admin/account-deletions/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: selectedRequest.id,
                    rejectionReason: rejectionReason.trim(),
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reject account deletion');

            setFeedback({ type: 'success', message: data.message || 'Account deletion request rejected' });

            // Update local state
            setRequests((prev) =>
                prev.map((r) =>
                    r.id === selectedRequest.id ? { ...r, status: 'rejected', updated_at: new Date().toISOString() } : r
                )
            );

            handleCloseModal();
            router.refresh();
        } catch (err) {
            setFeedback({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <DynamicLucideIcon name="pending" className="text-xs" />
                        Pending Review
                    </span>
                );
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20">
                        <DynamicLucideIcon name="check" className="text-xs" />
                        Approved / Deactivated
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gray-500/10 text-gray-500 border border-gray-500/20">
                        <DynamicLucideIcon name="close" className="text-xs" />
                        Rejected
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-gray-500/10 text-gray-500">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Feedback Alert */}
            {feedback && (
                <div
                    className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border ${
                        feedback.type === 'error'
                            ? 'bg-red-500/10 border-red-500/20 text-red-600'
                            : 'bg-green-500/10 border-green-500/20 text-green-600'
                    }`}
                >
                    <span>{feedback.message}</span>
                    <button
                        onClick={() => setFeedback(null)}
                        className="hover:opacity-75 transition-opacity"
                    >
                        <DynamicLucideIcon name="close" className="text-sm" />
                    </button>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Requests', value: stats.total, color: 'text-primary bg-primary/10', icon: 'history' },
                    { label: 'Pending Review', value: stats.pending, color: 'text-amber-500 bg-amber-500/10', icon: 'pending' },
                    { label: 'Deactivated / Approved', value: stats.approved, color: 'text-red-500 bg-red-500/10', icon: 'person_off' },
                    { label: 'Rejected', value: stats.rejected, color: 'text-gray-500 bg-gray-500/10', icon: 'close' },
                ].map((stat, i) => (
                    <div
                        key={i}
                        className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 sm:p-5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41]"
                    >
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`size-8 sm:size-10 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}>
                                <DynamicLucideIcon name={stat.icon} />
                            </div>
                            <div>
                                <p className="text-[#4b636c] dark:text-gray-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                                    {stat.label}
                                </p>
                                <h4 className="text-lg sm:text-xl font-black">{stat.value || 0}</h4>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search and Tabs */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search */}
                <div className="relative w-full md:w-96 group">
                    <DynamicLucideIcon
                        name="search"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b636c] group-focus-within:text-primary transition-colors"
                    />
                    <input
                        className="w-full bg-background-light dark:bg-[#212b30] border-none rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-[#4b636c]"
                        placeholder="Search by email, name or reason..."
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-background-light dark:bg-[#212b30] p-1 rounded-xl">
                    {['all', 'pending', 'approved', 'rejected'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setStatusFilter(tab)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                statusFilter === tab
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-[#4b636c] dark:text-gray-400 hover:text-primary'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Deletion Requests Table */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse min-w-[850px] md:min-w-0">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
                                <th className="px-6 py-4">User Account</th>
                                <th className="px-6 py-4">Reason / Feedback</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Requested At</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41]">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-sm font-bold text-[#4b636c]">
                                        No account deletion requests found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-primary/[0.02] transition-colors group">
                                        {/* User Identity */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary overflow-hidden flex-shrink-0">
                                                    {req.user?.avatar_url ? (
                                                        <img src={req.user.avatar_url} alt="" className="size-full object-cover" />
                                                    ) : (
                                                        req.user?.display_name?.[0]?.toUpperCase() || req.email?.[0]?.toUpperCase() || 'U'
                                                    )}
                                                </div>
                                                <div>
                                                    {req.user?.id ? (
                                                        <Link
                                                            href={`/dashboard/admin/users/${req.user.id}`}
                                                            className="text-sm font-black text-[#111618] dark:text-gray-200 hover:text-primary transition-colors hover:underline block"
                                                        >
                                                            {req.user?.display_name || 'Anonymous User'}
                                                        </Link>
                                                    ) : (
                                                        <p className="text-sm font-black text-[#111618] dark:text-gray-200">
                                                            {req.user?.display_name || 'User Profile'}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-[#4b636c] font-black tracking-tight">{req.email}</p>
                                                    {req.user?.campus && (
                                                        <p className="text-[9px] text-primary font-bold uppercase">{req.user.campus}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Reason */}
                                        <td className="px-6 py-4 max-w-xs">
                                            <p className="text-xs text-[#111618] dark:text-gray-300 line-clamp-2 italic">
                                                {req.reason ? `"${req.reason}"` : <span className="text-[#4b636c] not-italic">No reason specified</span>}
                                            </p>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            {getStatusBadge(req.status)}
                                        </td>

                                        {/* Requested At */}
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-[#111618] dark:text-gray-200">
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </p>
                                            <p className="text-[10px] text-[#4b636c] font-mono">
                                                {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {req.status === 'pending' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenApproveModal(req)}
                                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all text-xs font-bold border border-red-500/20"
                                                            title="Approve & Deactivate Account"
                                                        >
                                                            <DynamicLucideIcon name="person_off" className="text-sm" />
                                                            Approve & Deactivate
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenRejectModal(req)}
                                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-500/10 text-[#4b636c] hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-xs font-bold border border-gray-500/20"
                                                            title="Reject Deletion Request"
                                                        >
                                                            <DynamicLucideIcon name="close" className="text-sm" />
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : req.status === 'approved' ? (
                                                    <span className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                                                        <DynamicLucideIcon name="check" className="text-xs" />
                                                        Deactivated
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleOpenApproveModal(req)}
                                                        className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-[#4b636c] hover:text-red-600 transition-colors text-xs font-bold"
                                                        title="Re-open & Deactivate"
                                                    >
                                                        Re-evaluate
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Approve / Deactivate Confirmation Modal */}
            {modalAction === 'approve' && selectedRequest && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1E292B] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-red-200 dark:border-red-900/40 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3">
                            <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 shrink-0">
                                <DynamicLucideIcon name="person_off" className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">Approve & Deactivate Account</h3>
                                <p className="text-xs text-[#4b636c] dark:text-gray-400">Account will be marked as inactive</p>
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-4 text-xs text-red-900 dark:text-red-200 space-y-2">
                            <p className="font-bold">You are marking this account as deleted/inactive:</p>
                            <div className="font-mono bg-white/80 dark:bg-black/30 p-2.5 rounded-lg text-[11px] space-y-1">
                                <p><span className="text-gray-500 font-sans">Email:</span> {selectedRequest.email}</p>
                                <p><span className="text-gray-500 font-sans">User ID:</span> {selectedRequest.user_id}</p>
                                {selectedRequest.reason && (
                                    <p><span className="text-gray-500 font-sans">Reason:</span> {selectedRequest.reason}</p>
                                )}
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 text-red-700 dark:text-red-300">
                                <li>The user will be blocked from logging into the platform</li>
                                <li>All active marketplace listings will be archived</li>
                                <li>Order history, wallet logs, and database records remain safely preserved as inactive</li>
                            </ul>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                disabled={loading}
                                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleApprove}
                                disabled={loading}
                                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin rounded-full size-3.5 border-2 border-white border-t-transparent" />
                                        Deactivating...
                                    </>
                                ) : (
                                    'Approve & Deactivate'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {modalAction === 'reject' && selectedRequest && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <form
                        onSubmit={handleReject}
                        className="bg-white dark:bg-[#1E292B] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150"
                    >
                        <div className="flex items-center gap-3">
                            <div className="size-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shrink-0">
                                <DynamicLucideIcon name="close" className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">Reject Deletion Request</h3>
                                <p className="text-xs text-[#4b636c] dark:text-gray-400">{selectedRequest.email}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Rejection Reason (sent to user)
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="e.g. Account has pending escrow orders or unresolved dispute..."
                                rows="3"
                                className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                disabled={loading}
                                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-2.5 px-4 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin rounded-full size-3.5 border-2 border-current border-t-transparent" />
                                        Rejecting...
                                    </>
                                ) : (
                                    'Reject Request'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
