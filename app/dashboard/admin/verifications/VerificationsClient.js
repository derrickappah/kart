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
        <div>
            {/* Stats Row */}
            {stats && Object.keys(stats).length > 0 && (
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total Requests</div>
                        <div className={styles.statValue}>{stats.total || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Pending</div>
                        <div className={styles.statValue}>{stats.pending || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Approved</div>
                        <div className={styles.statValue}>{stats.approved || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Rejected</div>
                        <div className={styles.statValue}>{stats.rejected || 0}</div>
                    </div>
                </div>
            )}

            {/* Alert Banner */}
            {pendingCount > 0 && (
                <div className={styles.alertBanner}>
                    <svg className={styles.alertIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 9V12M12 15H12.01M5 19H19C19.5523 19 20 18.5523 20 18V6C20 5.44772 19.5523 5 19 5H5C4.44772 5 4 5.44772 4 6V18C4 18.5523 4.44772 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className={styles.alertText}>
                        {pendingCount} pending verification request{pendingCount !== 1 ? 's' : ''} awaiting review
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className={styles.filterTabs}>
                <Link 
                    href="/dashboard/admin/verifications" 
                    className={`${styles.filterTab} ${currentFilter === 'all' ? styles.filterTabActive : ''}`}
                >
                    All
                    {stats.total > 0 && <span className={styles.filterTabCount}>{stats.total}</span>}
                </Link>
                <Link 
                    href="/dashboard/admin/verifications?status=Pending" 
                    className={`${styles.filterTab} ${currentFilter === 'Pending' ? styles.filterTabActive : ''}`}
                >
                    Pending
                    {stats.pending > 0 && <span className={styles.filterTabCount}>{stats.pending}</span>}
                </Link>
                <Link 
                    href="/dashboard/admin/verifications?status=Approved" 
                    className={`${styles.filterTab} ${currentFilter === 'Approved' ? styles.filterTabActive : ''}`}
                >
                    Approved
                    {stats.approved > 0 && <span className={styles.filterTabCount}>{stats.approved}</span>}
                </Link>
                <Link 
                    href="/dashboard/admin/verifications?status=Rejected" 
                    className={`${styles.filterTab} ${currentFilter === 'Rejected' ? styles.filterTabActive : ''}`}
                >
                    Rejected
                    {stats.rejected > 0 && <span className={styles.filterTabCount}>{stats.rejected}</span>}
                </Link>
            </div>

            {verifications.length === 0 ? (
                <div className={styles.emptyState}>
                    <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className={styles.emptyStateTitle}>No verification requests found</div>
                    <div className={styles.emptyStateText}>All verification requests have been processed</div>
                </div>
            ) : (
                <div className={styles.verificationsList}>
                    {verifications.map((verification) => (
                        <div key={verification.id} className={styles.verificationCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.userInfo}>
                                    <div className={styles.userHeader}>
                                        <h3 className={styles.userName}>
                                            {verification.user?.display_name || verification.user?.email || 'Unknown User'}
                                        </h3>
                                        <span className={`${styles.statusBadge} ${
                                            verification.status === 'Pending' ? styles.statusPending :
                                            verification.status === 'Approved' ? styles.statusApproved :
                                            styles.statusRejected
                                        }`}>
                                            {verification.status === 'Pending' && (
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M6 1V6L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                            {verification.status === 'Approved' && (
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                            {verification.status === 'Rejected' && (
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                            {verification.status}
                                        </span>
                                    </div>
                                    <div className={styles.userDetails}>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Email:</span>
                                            <span>{verification.user?.email || 'Unknown'}</span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Student ID:</span>
                                            <span>{verification.student_id || 'N/A'}</span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Submitted:</span>
                                            <span>{new Date(verification.created_at).toLocaleDateString('en-US', { 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}</span>
                                        </div>
                                    </div>
                                    {verification.admin_notes && (
                                        <div className={styles.adminNotes}>
                                            <strong>Admin Notes:</strong> {verification.admin_notes}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.actionButtons}>
                                    {verification.student_id_image && (
                                        <button
                                            onClick={() => setSelectedImage(verification.student_id_image)}
                                            className={`${styles.actionButton} ${styles.viewImageButton}`}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            View Image
                                        </button>
                                    )}
                                    {verification.status === 'Pending' && (
                                        <>
                                            <button
                                                onClick={() => handleApprove(verification.id)}
                                                disabled={loading}
                                                className={`${styles.actionButton} ${styles.approveButton}`}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => openRejectModal(verification)}
                                                disabled={loading}
                                                className={`${styles.actionButton} ${styles.rejectButton}`}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Image Preview Modal */}
            {selectedImage && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => setSelectedImage(null)}
                >
                    <div className={styles.imageModal}>
                        <img
                            src={selectedImage}
                            alt="Student ID"
                        />
                        <button
                            onClick={() => setSelectedImage(null)}
                            className={styles.closeButton}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Reject Notes Modal */}
            {showNotesModal && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => {
                        setShowNotesModal(false);
                        setSelectedVerification(null);
                        setRejectNotes('');
                    }}
                >
                    <div
                        className={styles.rejectModal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className={styles.rejectModalTitle}>Reject Verification Request</h3>
                        <p className={styles.rejectModalText}>
                            Please provide a reason for rejecting this verification request. This will be visible to the user.
                        </p>
                        <textarea
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            placeholder="Enter rejection reason..."
                            className={styles.rejectTextarea}
                        />
                        <div className={styles.modalActions}>
                            <button
                                onClick={() => {
                                    setShowNotesModal(false);
                                    setSelectedVerification(null);
                                    setRejectNotes('');
                                }}
                                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={loading || !rejectNotes.trim()}
                                className={`${styles.modalButton} ${styles.modalButtonReject}`}
                            >
                                {loading ? 'Rejecting...' : 'Reject Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
