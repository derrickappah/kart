'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const REJECT_REASONS = [
    { label: 'Blurry ID Image', text: 'The uploaded student ID image is too blurry, cropped, or of low quality to verify details. Please upload a clear, legible picture.' },
    { label: 'Expired Credentials', text: 'The student identification card provided has expired or is no longer valid for the current academic term.' },
    { label: 'Name Discrepancy', text: 'The name printed on the student ID does not match the display name or registered name on your profile.' },
    { label: 'Invalid Document', text: 'The document uploaded is not a recognized student ID card. Please upload a valid university or college identification card.' }
];

const colorMap = {
    'primary': { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', glow: 'shadow-primary/5' },
    'amber-500': { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', glow: 'shadow-amber-500/5' },
    'green-500': { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20', glow: 'shadow-green-500/5' },
    'red-500': { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', glow: 'shadow-red-500/5' }
};

// Hover magnifier document viewer
function IDMagnifier({ src }) {
    const [zoom, setZoom] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        setCoords({ x, y });
    };

    return (
        <div 
            className="relative w-full h-64 sm:h-72 md:h-80 rounded-2xl overflow-hidden border border-[#dce3e5] dark:border-[#2d3b41] bg-black/5 dark:bg-black/25 cursor-zoom-in group select-none shadow-inner"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
        >
            <img
                src={src}
                alt="Student ID Verification Document"
                className={`w-full h-full object-contain transition-transform duration-75 ${zoom ? 'scale-[2.5]' : 'scale-100'}`}
                style={zoom ? { transformOrigin: `${coords.x}% ${coords.y}%` } : {}}
            />
            {!zoom && (
                <div className="absolute inset-0 bg-black/10 dark:bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="bg-white/90 dark:bg-[#182125]/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-lg flex items-center gap-2 text-[#182125] dark:text-white">
                        <DynamicLucideIcon name="zoom_in" className="size-4" /> Move mouse to magnify
                    </span>
                </div>
            )}
        </div>
    );
}

export default function VerificationsClient({ initialVerifications, stats = {} }) {
    const [verifications, setVerifications] = useState(initialVerifications);
    const [selectedVerificationId, setSelectedVerificationId] = useState(null);
    const [mobileShowInspector, setMobileShowInspector] = useState(false);
    
    // Sync state when props change
    useEffect(() => {
        setVerifications(initialVerifications);
    }, [initialVerifications]);

    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
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

    // Auto-select first request in the current filtered list
    useEffect(() => {
        if (filteredVerifications.length > 0) {
            const stillExists = filteredVerifications.some(v => v.id === selectedVerificationId);
            if (!stillExists) {
                const firstPending = filteredVerifications.find(v => v.status === 'Pending');
                setSelectedVerificationId(firstPending ? firstPending.id : filteredVerifications[0].id);
            }
        } else {
            setSelectedVerificationId(null);
        }
    }, [filteredVerifications, selectedVerificationId]);

    const selectedVerification = useMemo(() => {
        return verifications.find(v => v.id === selectedVerificationId) || null;
    }, [verifications, selectedVerificationId]);

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
        const verification = confirmModal.data || selectedVerification;
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Queue', value: stats.total, color: 'primary', icon: 'list_alt' },
                    { label: 'Pending Review', value: stats.pending, color: 'amber-500', icon: 'pending' },
                    { label: 'Total Verified', value: stats.approved, color: 'green-500', icon: 'verified' },
                    { label: 'Total Rejected', value: stats.rejected, color: 'red-500', icon: 'rule' },
                ].map((stat, i) => {
                    const mappedColor = colorMap[stat.color] || colorMap.primary;
                    return (
                        <div key={i} className={`bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] hover:border-primary/20 transition-all hover:scale-[1.01] hover:shadow-lg ${mappedColor.glow}`}>
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className={`size-10 sm:size-12 rounded-xl ${mappedColor.bg} ${mappedColor.text} flex items-center justify-center flex-shrink-0 border border-white/50 dark:border-white/5`}>
                                    <DynamicLucideIcon name={stat.icon} className="size-5 sm:size-6" />
                                </div>
                                <div>
                                    <p className="text-[#4b636c] dark:text-gray-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{stat.label}</p>
                                    <h4 className="text-lg sm:text-2xl font-black tracking-tight mt-0.5">{stat.value || 0}</h4>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap group/tab ${currentFilter === tab.value
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-[#4b636c] hover:bg-primary/5 hover:text-primary'
                                }`}
                        >
                            <DynamicLucideIcon name={tab.icon} className={`size-4 transition-transform group-hover/tab:scale-110 ${currentFilter === tab.value ? 'text-white' : 'text-[#4b636c]/60 group-hover/tab:text-primary/70'}`} />
                            {tab.label}
                        </Link>
                    ))}
                </div>

                <div className="relative w-full md:w-80 group">
                    <DynamicLucideIcon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4b636c] group-focus-within:text-primary transition-colors size-4" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search student IDs, names..."
                        className="w-full pl-11 pr-4 py-3 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[#4b636c]/50"
                    />
                </div>
            </div>

            {/* Split Screen Queue Redesign */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px] lg:h-[calc(100vh-23rem)] items-stretch">
                
                {/* Left Panel: Verification Queue */}
                <div className={`lg:col-span-5 xl:col-span-4 flex flex-col bg-white/50 dark:bg-[#182125]/50 border border-[#dce3e5] dark:border-[#2d3b41] rounded-3xl overflow-hidden backdrop-blur-md transition-all ${mobileShowInspector ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="px-5 py-4 border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between bg-white/20 dark:bg-black/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Queue ({filteredVerifications.length})</span>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-[#dce3e5]/70 dark:divide-[#2d3b41]/70 no-scrollbar">
                        {filteredVerifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <DynamicLucideIcon name="search_off" className="size-10 text-[#4b636c]/30 mx-auto mb-3" />
                                <h5 className="font-black text-xs uppercase tracking-wider">No Applications</h5>
                                <p className="text-[10px] text-[#4b636c] font-black uppercase mt-1">Change filter or search term</p>
                            </div>
                        ) : (
                            filteredVerifications.map((verification) => {
                                const isActive = verification.id === selectedVerificationId;
                                return (
                                    <button
                                        key={verification.id}
                                        onClick={() => {
                                            setSelectedVerificationId(verification.id);
                                            setMobileShowInspector(true);
                                        }}
                                        className={`w-full text-left p-4 flex items-center gap-3.5 transition-all hover:bg-primary/5 relative ${isActive ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                                    >
                                        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black uppercase text-xs border border-primary/20 shrink-0">
                                            {(verification.user?.display_name?.[0] || verification.user?.email?.[0] || 'U').toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-black text-xs uppercase tracking-tight truncate pr-2">
                                                    {verification.user?.display_name || verification.user?.email?.split('@')[0] || 'Anonymous'}
                                                </h4>
                                                <span className="text-[8px] text-[#4b636c] font-black shrink-0">
                                                    {new Date(verification.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-[#4b636c] text-[9px] font-black uppercase tracking-wider truncate mt-0.5">
                                                ID: {verification.student_id || 'N/A'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${verification.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                    verification.status === 'Approved' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                        'bg-red-500/10 text-red-500 border border-red-500/20'
                                                    }`}>
                                                    {verification.status}
                                                </span>
                                                <span className="text-[9px] text-[#4b636c]/80 truncate font-semibold">
                                                    {verification.campus || 'Main Campus'}
                                                </span>
                                            </div>
                                        </div>
                                        <DynamicLucideIcon name="chevron_right" className="size-4 text-[#4b636c]/40 shrink-0 lg:hidden" />
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel: Verification Details Inspector */}
                <div className={`lg:col-span-7 xl:col-span-8 flex flex-col bg-white/50 dark:bg-[#182125]/50 border border-[#dce3e5] dark:border-[#2d3b41] rounded-3xl overflow-hidden backdrop-blur-md transition-all ${!mobileShowInspector ? 'hidden lg:flex' : 'flex'}`}>
                    {selectedVerification ? (
                        <div className="flex flex-col h-full overflow-hidden">
                            {/* Inspector Header */}
                            <div className="px-6 py-4 border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between bg-white/20 dark:bg-black/10">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setMobileShowInspector(false)}
                                        className="lg:hidden size-8 rounded-lg border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c]"
                                    >
                                        <DynamicLucideIcon name="arrow_back" className="size-4" />
                                    </button>
                                    <div>
                                        <h3 className="font-black text-sm uppercase tracking-tight">Applicant Inspector</h3>
                                        <p className="text-[8px] text-[#4b636c] font-black uppercase tracking-widest mt-0.5">Review Credentials & Document Proof</p>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border ${selectedVerification.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                    selectedVerification.status === 'Approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                        'bg-red-500/10 text-red-500 border-red-500/20'
                                    }`}>
                                    {selectedVerification.status}
                                </span>
                            </div>

                            {/* Inspector Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                                
                                {/* Info Cards Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white/40 dark:bg-black/10 p-4 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41]">
                                        <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-wider">Applicant Name</p>
                                        <p className="text-xs font-black uppercase tracking-tight mt-1 truncate">{selectedVerification.user?.display_name || 'Anonymous'}</p>
                                        <p className="text-[9px] text-[#4b636c] truncate mt-0.5">{selectedVerification.user?.email || 'No email registered'}</p>
                                    </div>
                                    <div className="bg-white/40 dark:bg-black/10 p-4 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41]">
                                        <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-wider">Student ID Card Number</p>
                                        <p className="text-xs font-black uppercase tracking-tight mt-1 truncate">{selectedVerification.student_id || 'N/A'}</p>
                                        <p className="text-[9px] text-[#4b636c] uppercase tracking-wide mt-0.5">Document ID: {selectedVerification.id.slice(0,8)}</p>
                                    </div>
                                    <div className="bg-white/40 dark:bg-black/10 p-4 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41]">
                                        <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-wider">Campus / Institution</p>
                                        <p className="text-xs font-black uppercase tracking-tight mt-1 truncate">{selectedVerification.campus || 'Main Campus'}</p>
                                        <p className="text-[9px] text-[#4b636c] uppercase tracking-wide mt-0.5">Submitted: {new Date(selectedVerification.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </div>

                                {/* ID Card Document Preview */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] flex items-center gap-1.5">
                                            <DynamicLucideIcon name="category" className="size-3.5" /> ID Verification Document
                                        </label>
                                        {selectedVerification.student_id_image && (
                                            <a 
                                                href={selectedVerification.student_id_image} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-[9px] font-black uppercase tracking-wider text-primary hover:underline flex items-center gap-1"
                                            >
                                                Open Full Lens <DynamicLucideIcon name="open_in_new" className="size-3" />
                                            </a>
                                        )}
                                    </div>

                                    {selectedVerification.student_id_image ? (
                                        <IDMagnifier src={selectedVerification.student_id_image} />
                                    ) : (
                                        <div className="w-full h-64 rounded-2xl border border-dashed border-[#dce3e5] dark:border-[#2d3b41] flex flex-col items-center justify-center bg-black/5 dark:bg-black/20 text-[#4b636c]/40 gap-2">
                                            <DynamicLucideIcon name="no_photography" className="size-10" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">No image uploaded</span>
                                        </div>
                                    )}
                                </div>

                                {/* Resolution Form or Verdict display */}
                                {selectedVerification.status === 'Pending' ? (
                                    <div className="bg-white/70 dark:bg-black/20 p-5 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Administrative Decision Notes</label>
                                                <span className="text-[9px] text-red-500 font-semibold uppercase">*Required for rejection</span>
                                            </div>
                                            
                                            {/* Quick insert rejection templates */}
                                            <div className="flex flex-wrap gap-1.5 py-1">
                                                {REJECT_REASONS.map((reason, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setRejectNotes(reason.text)}
                                                        className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider border border-[#dce3e5] dark:border-[#2d3b41] rounded-lg hover:bg-[#4b636c]/5 hover:text-primary transition-all text-[#4b636c]"
                                                    >
                                                        + {reason.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <textarea
                                                value={rejectNotes}
                                                onChange={(e) => setRejectNotes(e.target.value)}
                                                placeholder="State the verification status details or rejection notes here..."
                                                className="w-full min-h-[90px] bg-background-light dark:bg-[#1c262a] border border-[#dce3e5] dark:border-[#2d3b41] rounded-xl p-3.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all no-scrollbar"
                                            />
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button 
                                                onClick={() => setConfirmModal({ open: true, type: 'reject', data: selectedVerification })}
                                                disabled={loading || !rejectNotes.trim()}
                                                className="flex-1 py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-md shadow-red-500/5"
                                            >
                                                <DynamicLucideIcon name="block" className="size-4" /> Reject & Flag Account
                                            </button>
                                            <button 
                                                onClick={() => setConfirmModal({ open: true, type: 'approve', data: selectedVerification })}
                                                disabled={loading}
                                                className="flex-1 py-3.5 bg-primary text-white hover:brightness-110 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
                                            >
                                                <DynamicLucideIcon name="verified" className="size-4" /> Approve Seller Verification
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white/40 dark:bg-black/15 p-5 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`size-8 rounded-lg flex items-center justify-center ${selectedVerification.status === 'Approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                <DynamicLucideIcon name={selectedVerification.status === 'Approved' ? 'verified' : 'block'} className="size-5" />
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-black uppercase tracking-tight">Application Already Evaluated</h5>
                                                <p className="text-[9px] text-[#4b636c] uppercase font-semibold">Verdict: {selectedVerification.status}</p>
                                            </div>
                                        </div>
                                        {selectedVerification.admin_notes && (
                                            <div className="mt-3 p-3 bg-black/5 dark:bg-black/20 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41]">
                                                <p className="text-[8px] text-[#4b636c] font-black uppercase tracking-widest">Rejection Reason / Notes</p>
                                                <p className="text-xs text-red-500 dark:text-red-400 font-semibold mt-1 tracking-tight leading-relaxed">{selectedVerification.admin_notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[#4b636c]/60">
                            <div className="size-16 rounded-2xl bg-primary/5 text-primary/30 flex items-center justify-center mb-4 border border-dashed border-primary/20">
                                <DynamicLucideIcon name="verified_user" className="size-8" />
                            </div>
                            <h4 className="font-black text-sm uppercase tracking-wider text-[#111618] dark:text-white">Select an Application</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest mt-2 max-w-sm leading-relaxed">
                                Choose a pending, approved, or rejected candidate from the list to review detailed credentials and documentation.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Confirmation Modal */}
            {confirmModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0a0f11]/90 backdrop-blur-md" onClick={() => !loading && setConfirmModal({ open: false, type: '', data: null })}></div>
                    <div className="relative bg-white dark:bg-[#182125] w-full max-w-md rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        {confirmModal.type === 'approve' ? (
                            <div className="p-8">
                                <div className="text-center space-y-4 mb-8">
                                    <div className="mx-auto size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                        <DynamicLucideIcon name="verified" className="text-3xl" />
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
                                    <div className="size-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
                                        <DynamicLucideIcon name="policy" className="text-3xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black tracking-tighter uppercase">Reject & Flag</h3>
                                        <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">Confirm Account Flagging</p>
                                    </div>
                                </div>

                                <div className="bg-black/5 dark:bg-black/20 p-4 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] mb-6">
                                    <p className="text-[8px] text-[#4b636c] font-black uppercase tracking-widest">Reason for Rejection</p>
                                    <p className="text-xs font-semibold mt-1 tracking-tight">{rejectNotes}</p>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => setConfirmModal({ open: false, type: '', data: null })} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-background-light rounded-2xl transition-all">Cancel</button>
                                    <button onClick={handleReject} disabled={loading} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">Flag Account</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {toast.show && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className={`${toast.type === 'success' ? 'bg-primary shadow-primary/20' : 'bg-red-500 shadow-red-500/20'} text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl border border-white/10`}>
                        <DynamicLucideIcon name={toast.type === 'success' ? 'verified' : 'emergency_home'} className="text-sm font-black" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

