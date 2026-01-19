'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';

export default function AdvertisementsClient({ initialAdvertisements, stats = {} }) {
    const [advertisements, setAdvertisements] = useState(initialAdvertisements);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const searchParams = useSearchParams();
    const currentStatusFilter = searchParams?.get('status') || 'all';
    const currentTypeFilter = searchParams?.get('type') || 'all';

    const handleFilterChange = (filterType, value) => {
        const params = new URLSearchParams();
        
        // Handle status filter
        if (filterType === 'status') {
            if (value !== 'all') {
                params.set('status', value);
            }
            // Keep type filter if it exists
            if (currentTypeFilter !== 'all') {
                params.set('type', currentTypeFilter);
            }
        }
        
        // Handle type filter
        if (filterType === 'type') {
            if (value !== 'all') {
                params.set('type', value);
            }
            // Keep status filter if it exists
            if (currentStatusFilter !== 'all') {
                params.set('status', currentStatusFilter);
            }
        }
        
        router.push(`/dashboard/admin/advertisements?${params.toString()}`);
    };

    const handlePause = async (adId) => {
        if (!confirm('Are you sure you want to pause this advertisement?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('advertisements')
                .update({ status: 'Paused', updated_at: new Date().toISOString() })
                .eq('id', adId);

            if (error) throw error;

            setAdvertisements(prev => prev.map(ad => 
                ad.id === adId ? { ...ad, status: 'Paused' } : ad
            ));
        } catch (err) {
            alert('Error pausing advertisement: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResume = async (adId) => {
        if (!confirm('Are you sure you want to resume this advertisement?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('advertisements')
                .update({ status: 'Active', updated_at: new Date().toISOString() })
                .eq('id', adId);

            if (error) throw error;

            setAdvertisements(prev => prev.map(ad => 
                ad.id === adId ? { ...ad, status: 'Active' } : ad
            ));
        } catch (err) {
            alert('Error resuming advertisement: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const adTypeLabels = {
        Featured: 'Featured Product',
        Boost: 'Boost Listing',
        'Featured Seller': 'Featured Seller',
        'Campus Ad': 'Campus Ad',
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Active': return styles.statusActive;
            case 'Paused': return styles.statusPaused;
            case 'Expired': return styles.statusExpired;
            case 'Cancelled': return styles.statusCancelled;
            default: return styles.statusActive;
        }
    };

    // Calculate CTR (Click-Through Rate)
    const calculateCTR = (ad) => {
        if (!ad.views || ad.views === 0) return '0.00%';
        return ((ad.clicks / ad.views) * 100).toFixed(2) + '%';
    };

    return (
        <div>
            {/* Stats Row */}
            {stats && Object.keys(stats).length > 0 && (
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total Ads</div>
                        <div className={styles.statValue}>{stats.total || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Active</div>
                        <div className={styles.statValue}>{stats.active || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total Revenue</div>
                        <div className={styles.statValue}>₵{stats.revenue?.toFixed(2) || '0.00'}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total Views</div>
                        <div className={styles.statValue}>{stats.views || 0}</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className={styles.filterSection}>
                <div className={styles.filterGroup}>
                    <span className={styles.filterLabel}>Filter by Status:</span>
                    <div className={styles.filterTabs}>
                        {['all', 'Active', 'Paused', 'Expired', 'Cancelled'].map(status => (
                            <button
                                key={status}
                                onClick={() => handleFilterChange('status', status)}
                                className={`${styles.filterTab} ${currentStatusFilter === status ? styles.filterTabActive : ''}`}
                            >
                                {status === 'all' ? 'All' : status}
                                {status === 'Active' && stats.active > 0 && (
                                    <span className={styles.filterTabCount}>{stats.active}</span>
                                )}
                                {status === 'Paused' && stats.paused > 0 && (
                                    <span className={styles.filterTabCount}>{stats.paused}</span>
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
                </div>
                <div className={styles.filterGroup}>
                    <span className={styles.filterLabel}>Filter by Type:</span>
                    <div className={styles.filterTabs}>
                        {['all', 'Featured', 'Boost', 'Featured Seller', 'Campus Ad'].map(type => (
                            <button
                                key={type}
                                onClick={() => handleFilterChange('type', type)}
                                className={`${styles.filterTab} ${currentTypeFilter === type ? styles.filterTabActive : ''}`}
                            >
                                {type === 'all' ? 'All Types' : adTypeLabels[type] || type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Advertisements List */}
            {advertisements.length === 0 ? (
                <div className={styles.emptyState}>
                    <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 5H6C4.89543 5 4 5.89543 4 7V18C4 19.1046 4.89543 20 6 20H17C18.1046 20 19 19.1046 19 18V13M18 5L13 10M18 5H14M18 5V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className={styles.emptyStateTitle}>No advertisements found</div>
                    <div className={styles.emptyStateText}>Try adjusting your filters</div>
                </div>
            ) : (
                <div className={styles.advertisementsList}>
                    {advertisements.map((ad) => (
                        <div key={ad.id} className={styles.advertisementCard}>
                            {ad.product?.image_url ? (
                                <img
                                    src={ad.product.image_url}
                                    alt={ad.product.title}
                                    className={styles.productImage}
                                />
                            ) : (
                                <div className={styles.productImagePlaceholder}>
                                    📢
                                </div>
                            )}
                            <div className={styles.adInfo}>
                                <div className={styles.adHeader}>
                                    <h3 className={styles.productTitle}>
                                        {ad.product?.title || 'No Product'}
                                    </h3>
                                    <span className={`${styles.statusBadge} ${getStatusClass(ad.status)}`}>
                                        {ad.status === 'Active' && (
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        )}
                                        {ad.status === 'Paused' && (
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M4 2V10M8 2V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        )}
                                        {ad.status}
                                    </span>
                                    <span className={styles.typeBadge}>
                                        {adTypeLabels[ad.ad_type] || ad.ad_type}
                                    </span>
                                </div>
                                <div className={styles.adDetails}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Seller</span>
                                        <span className={styles.detailValue}>{ad.seller?.display_name || 'No name'}</span>
                                        <span className={styles.detailValueSecondary}>{ad.seller?.email || 'Unknown'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Cost</span>
                                        <span className={styles.detailValueHighlight}>₵{parseFloat(ad.cost || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className={styles.metricsRow}>
                                    <div className={styles.metric}>
                                        <svg className={styles.metricIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        <span>Views: <span className={styles.metricValue}>{ad.views || 0}</span></span>
                                    </div>
                                    <div className={styles.metric}>
                                        <svg className={styles.metricIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 12L5 4L12 2L19 4L23 12L19 20L12 22L5 20L1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        <span>Clicks: <span className={styles.metricValue}>{ad.clicks || 0}</span></span>
                                    </div>
                                    <div className={styles.metric}>
                                        <svg className={styles.metricIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 3V21H21M7 16L12 11L16 15L21 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        <span>CTR: <span className={styles.metricValue}>{calculateCTR(ad)}</span></span>
                                    </div>
                                </div>
                                <div className={styles.dateRange}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span>
                                        <strong>Start:</strong> {new Date(ad.start_date).toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'short', 
                                            day: 'numeric' 
                                        })}
                                    </span>
                                    <span>•</span>
                                    <span>
                                        <strong>End:</strong> {new Date(ad.end_date).toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'short', 
                                            day: 'numeric' 
                                        })}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.actionButtons}>
                                {ad.status === 'Active' && (
                                    <button
                                        onClick={() => handlePause(ad.id)}
                                        disabled={loading}
                                        className={`${styles.actionButton} ${styles.pauseButton}`}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H10M14 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Pause
                                    </button>
                                )}
                                {ad.status === 'Paused' && (
                                    <button
                                        onClick={() => handleResume(ad.id)}
                                        disabled={loading}
                                        className={`${styles.actionButton} ${styles.resumeButton}`}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8 5V19L19 12L8 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Resume
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
