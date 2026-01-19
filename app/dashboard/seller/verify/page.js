'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { signout } from '../../../auth/actions';

export default function VerificationPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [fetchingStatus, setFetchingStatus] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [formData, setFormData] = useState({
        studentId: '',
        studentIdImage: null,
    });
    const [userProfile, setUserProfile] = useState(null);

    // Fetch user profile and verification status
    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Fetch user profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                setUserProfile({
                    ...user,
                    profile: profile
                });

                // Get the most recent verification request
                const { data: requests, error: reqError } = await supabase
                    .from('verification_requests')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (reqError) {
                    console.error('Error fetching verification status:', reqError);
                    return;
                }

                if (requests && requests.length > 0) {
                    setVerificationStatus(requests[0]);
                }
            } catch (err) {
                console.error('Error in fetchData:', err);
            } finally {
                setFetchingStatus(false);
            }
        };

        fetchData();
    }, [supabase]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                setError('Please log in first');
                return;
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-student-id-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(fileName, file);

            if (uploadError) {
                setError('Failed to upload image');
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('products')
                .getPublicUrl(fileName);

            setFormData({ ...formData, studentIdImage: publicUrl });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            if (!formData.studentId || !formData.studentIdImage) {
                throw new Error('Please fill in all fields');
            }

            const response = await fetch('/api/verification/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: formData.studentId,
                    studentIdImage: formData.studentIdImage,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit verification request');
            }

            setSuccess(true);
            // Refresh verification status (user is already available from above)
            const { data: requests } = await supabase
                .from('verification_requests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (requests && requests.length > 0) {
                setVerificationStatus(requests[0]);
            }
            setTimeout(() => {
                router.refresh();
            }, 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const displayName = userProfile?.user_metadata?.full_name || userProfile?.profile?.display_name || userProfile?.email?.split('@')[0] || 'User';
    const role = 'Seller';
    const initials = displayName && displayName.length > 0
        ? displayName
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()
        : 'U';

    return (
        <main className={styles.container}>
            <aside className={styles.sidebar}>
                {userProfile && (
                    <div className={styles.userProfile}>
                        <div className={styles.avatar}>{initials}</div>
                        <div className={styles.userInfo}>
                            <h3 className={styles.userName}>{displayName}</h3>
                            <p className={styles.userRole}>{role}</p>
                        </div>
                    </div>
                )}

                <nav className={styles.nav}>
                    <Link href="/profile" className={styles.navItem}>
                        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        My Profile
                    </Link>
                    <Link href="/dashboard/seller/ads" className={styles.navItem}>
                        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Ad Management
                    </Link>
                    <Link href="/dashboard/seller/analytics" className={styles.navItem}>
                        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 3V21H21M7 16L12 11L16 15L21 10M21 10H16M21 10V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Analytics
                    </Link>
                    <Link href="/dashboard/seller/verify" className={`${styles.navItem} ${styles.navItemActive}`}>
                        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Verification
                    </Link>
                    <form action={signout}>
                        <button type="submit" className={styles.logoutBtn}>
                            <svg className={styles.logoutIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Log Out
                        </button>
                    </form>
                </nav>
            </aside>

            <div className={styles.content}>
                <header className={verifyStyles.header}>
                    <div className={verifyStyles.headerContent}>
                        <h1 className={verifyStyles.title}>Seller Verification</h1>
                        <p className={verifyStyles.subtitle}>Verify your identity to start selling</p>
                    </div>
                    <Link href="/dashboard/seller" className={verifyStyles.backButton}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Back to Dashboard
                    </Link>
                </header>

                {fetchingStatus ? (
                    <div className={verifyStyles.loadingCard}>
                        <p>Loading verification status...</p>
                    </div>
                ) : verificationStatus?.status === 'Approved' ? (
                    <div className={verifyStyles.statusCard}>
                        <svg className={verifyStyles.statusIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <h2 className={`${verifyStyles.statusTitle} ${verifyStyles.statusTitleApproved}`}>Verification Approved</h2>
                        <p className={verifyStyles.statusText}>
                            Your seller verification has been approved! You can now sell on KART.
                        </p>
                        <Link href="/dashboard/seller" className={verifyStyles.statusAction}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Go to Seller Dashboard
                        </Link>
                    </div>
                ) : verificationStatus?.status === 'Pending' ? (
                    <div className={verifyStyles.statusCard}>
                        <svg className={verifyStyles.statusIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 9V12M12 15H12.01M13 16H11C9.89543 16 9 15.1046 9 14V10C9 8.89543 9.89543 8 11 8H13C14.1046 8 15 8.89543 15 10V14C15 15.1046 14.1046 16 13 16Z" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <h2 className={`${verifyStyles.statusTitle} ${verifyStyles.statusTitlePending}`}>Verification Pending</h2>
                        <p className={verifyStyles.statusText}>
                            Your verification request is currently under review.
                        </p>
                        <p className={verifyStyles.statusDate}>
                            Submitted: {new Date(verificationStatus.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </p>
                        <p className={verifyStyles.statusText} style={{ marginTop: '1rem' }}>
                            Our admin team will review it within 24-48 hours. You'll be notified once a decision is made.
                        </p>
                    </div>
                ) : success ? (
                    <div className={verifyStyles.statusCard}>
                        <svg className={verifyStyles.statusIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <h2 className={verifyStyles.statusTitle}>Verification Request Submitted</h2>
                        <p className={verifyStyles.statusText}>
                            Your verification request has been submitted. Our admin team will review it within 24-48 hours.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={verifyStyles.formCard}>
                        {verificationStatus?.status === 'Rejected' && (
                            <div className={`${verifyStyles.alertMessage} ${verifyStyles.alertRejected}`}>
                                <div className={verifyStyles.alertTitle}>
                                    <svg className={verifyStyles.alertIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 3L3 9M3 3L9 9M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Previous Request Rejected
                                </div>
                                {verificationStatus.admin_notes && (
                                    <p className={verifyStyles.alertNotes}>
                                        <strong>Reason:</strong> {verificationStatus.admin_notes}
                                    </p>
                                )}
                                <p className={verifyStyles.alertSubtext}>
                                    You can submit a new verification request below. Please ensure all information is correct.
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className={verifyStyles.alertError}>
                                {error}
                            </div>
                        )}

                        <div className={verifyStyles.formGroup}>
                            <label className={verifyStyles.formLabel}>
                                Student ID Number
                            </label>
                            <input
                                type="text"
                                name="studentId"
                                required
                                className={verifyStyles.formInput}
                                placeholder="Enter your student ID"
                                value={formData.studentId}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={verifyStyles.formGroup}>
                            <label className={verifyStyles.formLabel}>
                                Student ID Photo
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className={verifyStyles.formInput}
                            />
                            {formData.studentIdImage && (
                                <img src={formData.studentIdImage} alt="Student ID" className={verifyStyles.imagePreview} />
                            )}
                            <p className={verifyStyles.formHelpText}>
                                Upload a clear photo of your student ID card
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={verifyStyles.submitButton}
                        >
                            {loading ? (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1s linear infinite' }}>
                                        <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 19.07L16.24 16.24M19.07 4.93L16.24 7.76M4.93 19.07L7.76 16.24M4.93 4.93L7.76 7.76" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    {verificationStatus?.status === 'Rejected' ? 'Resubmit Verification Request' : 'Submit Verification Request'}
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}
