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
        <div>
            {/* Stats Row */}
            {stats && Object.keys(stats).length > 0 && (
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total Subscriptions</div>
                        <div className={styles.statValue}>{stats.total || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Active</div>
                        <div className={styles.statValue}>{stats.active || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Pending</div>
                        <div className={styles.statValue}>{stats.pending || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Monthly Revenue</div>
                        <div className={styles.statValue}>₵{stats.revenue?.toFixed(2) || '0.00'}</div>
                    </div>
                </div>
            )}

            {/* Filters and Search */}
            <div className={styles.searchFilterSection}>
                <div className={styles.filterTabs}>
                    {['all', 'Active', 'Pending', 'Expired', 'Cancelled'].map(status => (
                        <button
                            key={status}
                            onClick={() => handleFilterChange(status)}
                            className={`${styles.filterTab} ${currentFilter === status ? styles.filterTabActive : ''}`}
                        >
                            {status === 'all' ? 'All' : status}
                            {status === 'all' && stats.total > 0 && (
                                <span className={styles.filterTabCount}>{stats.total}</span>
                            )}
                            {status === 'Active' && stats.active > 0 && (
                                <span className={styles.filterTabCount}>{stats.active}</span>
                            )}
                            {status === 'Pending' && stats.pending > 0 && (
                                <span className={styles.filterTabCount}>{stats.pending}</span>
                            )}
                            {status === 'Expired' && stats.expired > 0 && (
                                <span className={styles.filterTabCount}>{stats.expired}</span>
                            )}
                            {status === 'Cancelled' && stats.cancelled > 0 && (
                                <span className={styles.filterTabCount}>{stats.cancelled}</span>
                            )}
                        </button>
                    ))}
                </div>
                <form onSubmit={handleSearch} className={styles.searchForm}>
                    <input
                        type="text"
                        placeholder="Search by email or subscription ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                    <button type="submit" className={styles.searchButton}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Search
                    </button>
                </form>
            </div>

            {/* Subscriptions List */}
            {subscriptions.length === 0 ? (
                <div className={styles.emptyState}>
                    <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 10H21M7 15H7.01M11 15H11.01M3 19H21C21.5523 19 22 18.5523 22 18V6C22 5.44772 21.5523 5 21 5H3C2.44772 5 2 5.44772 2 6V18C2 18.5523 2.44772 19 3 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className={styles.emptyStateTitle}>No subscriptions found</div>
                    <div className={styles.emptyStateText}>Try adjusting your filters or search query</div>
                </div>
            ) : (
                <div className={styles.subscriptionsList}>
                    {subscriptions.map((sub) => (
                        <div key={sub.id} className={styles.subscriptionCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.subscriptionInfo}>
                                    <div className={styles.planHeader}>
                                        <h3 className={styles.planName}>{sub.plan?.name || 'Unknown Plan'}</h3>
                                        <span className={`${styles.statusBadge} ${getStatusClass(sub.status)}`}>
                                            {sub.status === 'Active' && (
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                            {sub.status === 'Pending' && (
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M6 1V6L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                            {sub.status === 'Expired' && (
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M6 1V6L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                            {sub.status === 'Cancelled' && (
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                            {sub.status}
                                        </span>
                                    </div>
                                    <div className={styles.subscriptionDetails}>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>User</span>
                                            <span className={styles.detailValue}>
                                                {sub.user?.display_name || 'No name'}
                                            </span>
                                            <span className={styles.detailValue} style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                                                {sub.user?.email || 'Unknown'}
                                            </span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Price</span>
                                            <span className={styles.detailValueHighlight}>₵{parseFloat(sub.plan?.price || 0).toFixed(2)}</span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Start Date</span>
                                            <span className={styles.detailValue}>
                                                {new Date(sub.start_date).toLocaleDateString('en-US', { 
                                                    year: 'numeric', 
                                                    month: 'short', 
                                                    day: 'numeric' 
                                                })}
                                            </span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>End Date</span>
                                            <span className={styles.detailValue}>
                                                {new Date(sub.end_date).toLocaleDateString('en-US', { 
                                                    year: 'numeric', 
                                                    month: 'short', 
                                                    day: 'numeric' 
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    {sub.payment_reference && (
                                        <div className={styles.paymentReference}>
                                            <strong>Payment Reference:</strong> {sub.payment_reference}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.actionButtons}>
                                    {sub.status === 'Pending' && (
                                        <button
                                            onClick={() => handleActivate(sub.id)}
                                            disabled={loading}
                                            className={`${styles.actionButton} ${styles.activateButton}`}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            Activate
                                        </button>
                                    )}
                                    {sub.status === 'Active' && (
                                        <button
                                            onClick={() => handleCancel(sub.id)}
                                            disabled={loading}
                                            className={`${styles.actionButton} ${styles.cancelButton}`}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            Cancel
                                        </button>
                                    )}
                                    <div className={styles.subscriptionId}>
                                        ID: {sub.id.slice(0, 8)}...
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
