'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerificationsClient({ initialVerifications, stats = {} }) {
    const [verifications, setVerifications] = useState(initialVerifications);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [selectedVerification, setSelectedVerification] = useState(null);
    const [rejectNotes, setRejectNotes] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentFilter = searchParams?.get('status') || 'all';

    const handleApprove = async (verificationId) => {
        if (!confirm('Are you sure you want to approve this verification request?')) return;

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

            // Update local state
            setVerifications(prev => prev.map(v =>
                v.id === verificationId ? { ...v, status: 'Approved' } : v
            ));

            router.refresh();
        } catch (err) {
            alert('Error approving verification: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedVerification) return;
        if (!rejectNotes.trim()) {
            alert('Please provide a reason for rejection.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/admin/verifications/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    verificationId: selectedVerification.id,
                    adminNotes: rejectNotes
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reject verification');
            }

            // Update local state
            setVerifications(prev => prev.map(v =>
                v.id === selectedVerification.id ? { ...v, status: 'Rejected', admin_notes: rejectNotes } : v
            ));

            setShowNotesModal(false);
            setSelectedVerification(null);
            setRejectNotes('');
            router.refresh();
        } catch (err) {
            alert('Error rejecting verification: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const openRejectModal = (verification) => {
        setSelectedVerification(verification);
        setShowNotesModal(true);
    };

    const pendingCount = verifications.filter(v => v.status === 'Pending').length;

    return (
        <div className="space-y-6">
            {/* Verification Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Queue', value: stats.total, color: 'primary', icon: 'list_alt' },
                    { label: 'Pending Review', value: stats.pending, color: 'amber-500', icon: 'pending' },
                    { label: 'Approved Today', value: stats.approved, color: 'green-500', icon: 'verified' },
                    { label: 'Recently Flagged', value: stats.rejected, color: 'red-500', icon: 'rule' },
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

            {/* Verification Filters */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-2 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex items-center gap-2 overflow-x-auto">
                {[
                    { label: 'All Requests', value: 'all', icon: 'apps' },
                    { label: 'Pending Queue', value: 'Pending', icon: 'update' },
                    { label: 'Approved', value: 'Approved', icon: 'check_circle' },
                    { label: 'Rejected', value: 'Rejected', icon: 'cancel' },
                ].map((tab) => (
                    <Link
                        key={tab.value}
                        href={tab.value === 'all' ? '/dashboard/admin/verifications' : `/dashboard/admin/verifications?status=${tab.value}`}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${currentFilter === tab.value
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-[#4b636c] hover:bg-primary/5'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                        {tab.label}
                    </Link>
                ))}
            </div>

            {/* Applicant Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {verifications.length === 0 ? (
                    <div className="col-span-full bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-12 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-center">
                        <span className="material-symbols-outlined text-6xl text-[#4b636c]/20 mb-4">search_off</span>
                        <h3 className="text-xl font-black tracking-tighter uppercase">No Applications Found</h3>
                        <p className="text-[#4b636c] text-[11px] font-black uppercase tracking-widest mt-2">Try changing your filters or check back later</p>
                    </div>
                ) : (
                    verifications.map((verification) => (
                        <div key={verification.id} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden flex flex-col md:flex-row min-h-[280px] group transition-all hover:border-primary/30">
                            {/* ID Card Image Column */}
                            <div className="w-full md:w-56 bg-gray-100 dark:bg-[#212b30] relative overflow-hidden flex-shrink-0">
                                {verification.student_id_image ? (
                                    <>
                                        <img src={verification.student_id_image} alt="Student ID" className="size-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                        <button
                                            onClick={() => setSelectedImage(verification.student_id_image)}
                                            className="absolute inset-0 bg-primary/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                                        >
                                            <span className="bg-white text-primary px-4 py-2 rounded-lg font-bold text-xs">VIEW FULL ID</span>
                                        </button>
                                    </>
                                ) : (
                                    <div className="size-full flex items-center justify-center text-[#4b636c]/30">
                                        <span className="material-symbols-outlined text-5xl">no_photography</span>
                                    </div>
                                )}
                            </div>

                            {/* Details Column */}
                            <div className="p-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border-2 border-white dark:border-background-dark shadow-sm">
                                                {verification.user?.display_name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-base leading-tight tracking-tighter uppercase">{verification.user?.display_name || 'Verification Applicant'}</h4>
                                                <p className="text-[#4b636c] text-[9px] font-black uppercase tracking-widest">Joined {new Date(verification.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${verification.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                                            verification.status === 'Approved' ? 'bg-green-500/10 text-green-500' :
                                                'bg-red-500/10 text-red-500'
                                            }`}>
                                            {verification.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-3 bg-background-light dark:bg-[#212b30]/50 rounded-lg">
                                            <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-widest mb-1">Student ID</p>
                                            <p className="text-xs font-black uppercase tracking-tighter truncate">{verification.student_id || 'N/A'}</p>
                                        </div>
                                        <div className="p-3 bg-background-light dark:bg-[#212b30]/50 rounded-lg">
                                            <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-widest mb-1">Campus</p>
                                            <p className="text-xs font-black uppercase tracking-tighter truncate">{verification.campus || 'Main Campus'}</p>
                                        </div>
                                    </div>

                                    {verification.admin_notes && (
                                        <div className="mb-6 p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                                            <p className="text-xs text-red-800 dark:text-red-400 font-medium">Rejection Reason: {verification.admin_notes}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {verification.status === 'Pending' ? (
                                        <>
                                            <button
                                                onClick={() => handleApprove(verification.id)}
                                                disabled={loading}
                                                className="flex-1 bg-green-500 text-white py-2.5 rounded-xl font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">verified</span>
                                                APPROVE
                                            </button>
                                            <button
                                                onClick={() => openRejectModal(verification)}
                                                disabled={loading}
                                                className="flex-1 bg-white dark:bg-[#212b30] text-[#4b636c] py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border border-[#dce3e5] dark:border-[#2d3b41] hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">rule</span>
                                                FLAG / REJECT
                                            </button>
                                        </>
                                    ) : (
                                        <button className="w-full py-2.5 bg-gray-100 dark:bg-[#212b30] text-[#4b636c] rounded-xl font-black text-[10px] uppercase tracking-widest cursor-default">
                                            PROCESSED ON {new Date(verification.updated_at || verification.created_at).toLocaleDateString()}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Image Preview Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-[#111618]/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-6" onClick={e => e.stopPropagation()}>
                        <div className="w-full h-[85%] rounded-3xl overflow-hidden border-2 border-primary/20 bg-[#111618]">
                            <img src={selectedImage} alt="Full ID Preview" className="size-full object-contain" />
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="bg-white text-[#111618] px-8 py-3 rounded-2xl font-bold shadow-2xl hover:bg-primary hover:text-white transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">close</span>
                                CLOSE PREVIEW
                            </button>
                            <a
                                href={selectedImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-2xl hover:brightness-110 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">open_in_new</span>
                                OPEN ORIGINAL
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {showNotesModal && (
                <div className="fixed inset-0 z-50 bg-[#111618]/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#182125] w-full max-w-md rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-3xl">report</span>
                                </div>
                                <div>
                                    <h4 className="text-xl font-black tracking-tighter uppercase text-[#111618] dark:text-white">Flag Account</h4>
                                    <p className="text-xs text-[#4b636c] font-black uppercase tracking-widest">Provide a reason for rejection</p>
                                </div>
                            </div>

                            <textarea
                                value={rejectNotes}
                                onChange={(e) => setRejectNotes(e.target.value)}
                                className="w-full min-h-[140px] bg-background-light dark:bg-[#212b30] border-none rounded-2xl p-4 text-sm font-black focus:ring-2 focus:ring-red-500/50 transition-all placeholder:text-[#4b636c] mb-6"
                                placeholder="Explain why this ID was rejected (e.g. Blurry photo, Not a valid student ID, Expired card...)"
                            />

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleReject}
                                    disabled={loading || !rejectNotes.trim()}
                                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 hover:brightness-110 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'CONFIRM REJECTION'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowNotesModal(false);
                                        setSelectedVerification(null);
                                        setRejectNotes('');
                                    }}
                                    className="w-full py-4 bg-transparent text-[#4b636c] font-black uppercase tracking-widest hover:text-[#111618] dark:hover:text-white transition-colors"
                                >
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
