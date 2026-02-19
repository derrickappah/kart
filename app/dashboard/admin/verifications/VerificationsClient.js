'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function VerificationsClient({ initialVerifications, stats = {} }) {
    const [verifications, setVerifications] = useState(initialVerifications);

    // Sync state when props change (e.g. after router.refresh())
    useEffect(() => {
        setVerifications(initialVerifications);
    }, [initialVerifications]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ open: false, type: '', data: null });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [rejectNotes, setRejectNotes] = useState('');

    const router = useRouter();
    const searchParams = useSearchParams();
    const currentFilter = searchParams?.get('status') || 'all';

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // Multi-field search logic
    const filteredVerifications = useMemo(() => {
        if (!search.trim()) return verifications;
        const s = search.toLowerCase();
        return verifications.filter(v =>
            v.student_id?.toLowerCase().includes(s) ||
            v.user?.display_name?.toLowerCase().includes(s) ||
            v.user?.email?.toLowerCase().includes(s) ||
            v.campus?.toLowerCase().includes(s)
        );
    }, [search, verifications]);

    const handleApprove = async (verificationId) => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/verifications/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ verificationId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to approve verification');
            }

            setVerifications(prev => prev.map(v =>
                v.id === verificationId ? { ...v, status: 'Approved' } : v
            ));

            showToast('Verification approved successfully!');
            router.refresh();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
            setConfirmModal({ open: false, type: '', data: null });
        }
    };

    const handleReject = async () => {
        const verification = confirmModal.data;
        if (!verification) return;
        if (!rejectNotes.trim()) {
            showToast('Please provide a reason for rejection.', 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/admin/verifications/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    verificationId: verification.id,
                    adminNotes: rejectNotes
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reject verification');
            }

            setVerifications(prev => prev.map(v =>
                v.id === verification.id ? { ...v, status: 'Rejected', admin_notes: rejectNotes } : v
            ));

            showToast('Verification rejected and user flagged.');
            setRejectNotes('');
            router.refresh();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
            setConfirmModal({ open: false, type: '', data: null });
        }
    };

    return (
        <div className="space-y-6">
            {/* Verification Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Queue', value: stats.total, color: 'primary', icon: 'list_alt' },
                    { label: 'Pending Review', value: stats.pending, color: 'amber-500', icon: 'pending' },
                    { label: 'Total Verified', value: stats.approved, color: 'green-500', icon: 'verified' },
                    { label: 'Total Rejected', value: stats.rejected, color: 'red-500', icon: 'rule' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41]">
                        <div className="flex items-center gap-4">
                            <div className={`size-10 rounded-lg bg-${stat.color}/10 text-${stat.color} flex items-center justify-center`}>
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

            {/* Controls Bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="bg-white/80 dark:bg-[#182125]/80 backdrop-blur-xl p-1.5 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-sm">
                    {[
                        { label: 'All Requests', value: 'all', icon: 'apps' },
                        { label: 'Pending', value: 'Pending', icon: 'pending_actions' },
                        { label: 'Approved', value: 'Approved', icon: 'verified' },
                        { label: 'Rejected', value: 'Rejected', icon: 'block' },
                    ].map((tab) => (
                        <Link
                            key={tab.value}
                            href={tab.value === 'all' ? '/dashboard/admin/verifications' : `/dashboard/admin/verifications?status=${tab.value}`}
                            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap group/tab ${currentFilter === tab.value
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-[#4b636c] hover:bg-primary/5 hover:text-primary'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[20px] transition-transform group-hover/tab:scale-110 ${currentFilter === tab.value ? 'text-white' : 'text-[#4b636c]/60 group-hover/tab:text-primary/70'}`}>
                                {tab.icon}
                            </span>
                            {tab.label}
                        </Link>
                    ))}
                </div>

                <div className="relative w-full md:w-80 group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#4b636c] group-focus-within:text-primary transition-colors">search</span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search IDs or Students..."
                        className="w-full pl-12 pr-4 py-3.5 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[#4b636c]/50"
                    />
                </div>
            </div>

            {/* Applicant List View */}
            <div className="space-y-4">
                {/* List Headers */}
                <div className="hidden md:flex items-center px-4 py-2 border-b border-[#dce3e5] dark:border-[#2d3b41]/50 text-[9px] font-black uppercase tracking-[0.2em] text-[#4b636c]">
                    <div className="flex-1">Applicant Details</div>
                    <div className="flex-[1.5] grid grid-cols-2 gap-8 px-6 mx-6">
                        <div>Credential ID</div>
                        <div>Campus / Instit.</div>
                    </div>
                    <div className="shrink-0 mr-6 w-12 text-center">Capture</div>
                    <div className="shrink-0 w-[120px] text-right">Protocol Status</div>
                </div>

                {filteredVerifications.length === 0 ? (
                    <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-12 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-center">
                        <span className="material-symbols-outlined text-6xl text-[#4b636c]/20 mb-4">search_off</span>
                        <h3 className="text-xl font-black tracking-tighter uppercase">No Applications Found</h3>
                        <p className="text-[#4b636c] text-[11px] font-black uppercase tracking-widest mt-2">Try changing your filters or check back later</p>
                    </div>
                ) : (
                    filteredVerifications.map((verification) => (
                        <div key={verification.id} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden flex items-center p-4 group transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                            {/* Avatar/Thumbnail Section */}
                            <div className="flex items-center gap-4 flex-1">
                                <div className="relative size-14 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary border-2 border-white dark:border-background-dark shadow-sm shrink-0 overflow-hidden">
                                    {(verification.user?.display_name?.[0] || verification.user?.email?.[0] || 'U').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-sm uppercase tracking-tighter truncate">{verification.user?.display_name || verification.user?.email?.split('@')[0] || 'Anonymous'}</h4>
                                    <p className="text-[#4b636c] text-[10px] font-black uppercase tracking-widest truncate">{verification.user?.email || 'No Email Registered'}</p>
                                </div>
                            </div>

                            {/* ID Details Section */}
                            <div className="flex-[1.5] hidden md:grid grid-cols-2 gap-8 px-6 border-x border-[#dce3e5] dark:border-[#2d3b41]/50 mx-6">
                                <div>
                                    <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-widest mb-0.5">Student ID</p>
                                    <p className="text-xs font-black uppercase tracking-tighter truncate">{verification.student_id || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-widest mb-0.5">Campus / Inst.</p>
                                    <p className="text-xs font-black uppercase tracking-tighter truncate">{verification.campus || 'Main Campus'}</p>
                                </div>
                            </div>

                            {/* ID Preview Thumbnail */}
                            <div className="shrink-0 mr-6">
                                <div className="relative size-12 rounded-xl bg-gray-100 dark:bg-[#212b30] overflow-hidden border border-[#dce3e5] dark:border-[#2d3b41] group/thumb">
                                    {verification.student_id_image ? (
                                        <>
                                            <Image
                                                src={verification.student_id_image}
                                                alt="ID Thumbnail"
                                                fill
                                                className="object-cover grayscale group-hover/thumb:grayscale-0 transition-all duration-500"
                                            />
                                            <button
                                                onClick={() => setSelectedImage(verification.student_id_image)}
                                                className="absolute inset-0 bg-primary/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity backdrop-blur-[2px]"
                                            >
                                                <span className="material-symbols-outlined text-white text-lg">zoom_in</span>
                                            </button>
                                        </>
                                    ) : (
                                        <div className="size-full flex items-center justify-center text-[#4b636c]/30">
                                            <span className="material-symbols-outlined text-xl">no_photography</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status & Actions Section */}
                            <div className="flex items-center gap-6 shrink-0">
                                <div className="text-right hidden sm:block">
                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase inline-block mb-1 ${verification.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                                        verification.status === 'Approved' ? 'bg-green-500/10 text-green-500' :
                                            'bg-red-500/10 text-red-500'
                                        }`}>
                                        {verification.status}
                                    </span>
                                    <p className="text-[8px] text-[#4b636c] font-black uppercase tracking-widest">{new Date(verification.created_at).toLocaleDateString()}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {verification.status === 'Pending' ? (
                                        <>
                                            <button
                                                onClick={() => setConfirmModal({ open: true, type: 'approve', data: verification })}
                                                disabled={loading}
                                                className="size-10 bg-primary text-white rounded-xl flex items-center justify-center hover:brightness-110 active:scale-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                                title="Approve"
                                            >
                                                <span className="material-symbols-outlined text-lg">verified</span>
                                            </button>
                                            <button
                                                onClick={() => setConfirmModal({ open: true, type: 'reject', data: verification })}
                                                disabled={loading}
                                                className="size-10 bg-white dark:bg-[#212b30] text-[#4b636c] rounded-xl flex items-center justify-center border border-[#dce3e5] dark:border-[#2d3b41] hover:text-red-500 active:scale-90 transition-all disabled:opacity-50"
                                                title="Reject"
                                            >
                                                <span className="material-symbols-outlined text-lg">rule</span>
                                            </button>
                                        </>
                                    ) : (
                                        <div className="size-10 rounded-xl bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c]/50 border border-[#dce3e5] dark:border-[#2d3b41]" title="Processed">
                                            <span className="material-symbols-outlined text-lg">archive</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Premium Confirmation Modal */}
            {confirmModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0a0f11]/90 backdrop-blur-md" onClick={() => !loading && setConfirmModal({ open: false, type: '', data: null })}></div>
                    <div className="relative bg-white dark:bg-[#182125] w-full max-w-md rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        {confirmModal.type === 'approve' ? (
                            <div className="p-8">
                                <div className="text-center space-y-4 mb-8">
                                    <div className="mx-auto size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl">verified</span>
                                    </div>
                                    <h3 className="text-xl font-black tracking-tighter">Authorize Verification?</h3>
                                    <p className="text-xs text-[#4b636c] font-black uppercase tracking-widest leading-relaxed">
                                        This will grant <span className="text-primary">{confirmModal.data?.user?.display_name}</span> the verified badge and full platform access.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setConfirmModal({ open: false, type: '', data: null })} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-background-light rounded-2xl transition-all">Abort</button>
                                    <button onClick={() => handleApprove(confirmModal.data.id)} disabled={loading} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">Confirm Verification</button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="size-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl">policy</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black tracking-tighter uppercase">Reject & Flag</h3>
                                        <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">Protocol Infraction Required</p>
                                    </div>
                                </div>

                                <textarea
                                    value={rejectNotes}
                                    onChange={(e) => setRejectNotes(e.target.value)}
                                    placeholder="Explain the security discrepancy... (e.g. Expired credentials, Blurry capture)"
                                    className="w-full min-h-[120px] bg-background-light dark:bg-[#212b30] border-none rounded-2xl p-4 text-xs font-black tracking-tight focus:ring-2 focus:ring-red-500/20 transition-all mb-6 uppercase placeholder:normal-case"
                                />

                                <div className="flex gap-3">
                                    <button onClick={() => setConfirmModal({ open: false, type: '', data: null })} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-background-light rounded-2xl transition-all">Cancel</button>
                                    <button onClick={handleReject} disabled={loading || !rejectNotes.trim()} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">Flag Account</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 bg-[#111618]/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-10" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-8" onClick={e => e.stopPropagation()}>
                        <div className="relative w-full h-[80%] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/40">
                            <Image
                                src={selectedImage}
                                alt="ID Original Capture"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedImage(null)} className="h-14 px-10 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:bg-primary hover:text-white transition-all">Close Lens</button>
                            <a href={selectedImage} target="_blank" rel="noopener noreferrer" className="size-14 bg-primary/20 text-primary border border-primary/20 rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-xl">
                                <span className="material-symbols-outlined">open_in_new</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {toast.show && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className={`${toast.type === 'success' ? 'bg-primary shadow-primary/20' : 'bg-red-500 shadow-red-500/20'} text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl border border-white/10`}>
                        <span className="material-symbols-outlined text-sm font-black">
                            {toast.type === 'success' ? 'verified' : 'emergency_home'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
