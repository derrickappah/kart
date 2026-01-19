'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ReviewsClient({ initialReviews, stats = {} }) {
    const [reviews, setReviews] = useState(initialReviews);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentFilter = searchParams?.get('rating') || 'all';

    const handleFilterChange = (newFilter) => {
        const params = new URLSearchParams();
        if (newFilter !== 'all') params.set('rating', newFilter);
        router.push(`/dashboard/admin/reviews?${params.toString()}`);
    };

    const handleDelete = async (reviewId) => {
        if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return;

        setLoading(true);
        try {
            const response = await fetch('/api/admin/reviews/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete review');
            }

            // Remove from local state
            setReviews(prev => prev.filter(r => r.id !== reviewId));
        } catch (err) {
            alert('Error deleting review: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <svg
                key={i}
                className={`${styles.star} ${i < rating ? '' : styles.starEmpty}`}
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
        ));
    };

    return (
        <div>
            {/* Stats Row */}
            {stats && Object.keys(stats).length > 0 && (
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total Reviews</div>
                        <div className={styles.statValue}>{stats.total || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Average Rating</div>
                        <div className={styles.statValue}>{stats.average || '0.0'}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>5 Stars</div>
                        <div className={styles.statValue}>{stats.rating5 || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>1 Star</div>
                        <div className={styles.statValue}>{stats.rating1 || 0}</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className={styles.filterSection}>
                <span className={styles.filterLabel}>Filter by Rating:</span>
                <div className={styles.filterTabs}>
                    {['all', '5', '4', '3', '2', '1'].map(rating => (
                        <button
                            key={rating}
                            onClick={() => handleFilterChange(rating)}
                            className={`${styles.filterTab} ${currentFilter === rating ? styles.filterTabActive : ''}`}
                        >
                            {rating === 'all' ? 'All Ratings' : (
                                <>
                                    {rating} Star{rating !== '1' ? 's' : ''}
                                    {rating === '5' && stats.rating5 > 0 && (
                                        <span className={styles.filterTabCount}>{stats.rating5}</span>
                                    )}
                                    {rating === '4' && stats.rating4 > 0 && (
                                        <span className={styles.filterTabCount}>{stats.rating4}</span>
                                    )}
                                    {rating === '3' && stats.rating3 > 0 && (
                                        <span className={styles.filterTabCount}>{stats.rating3}</span>
                                    )}
                                    {rating === '2' && stats.rating2 > 0 && (
                                        <span className={styles.filterTabCount}>{stats.rating2}</span>
                                    )}
                                    {rating === '1' && stats.rating1 > 0 && (
                                        <span className={styles.filterTabCount}>{stats.rating1}</span>
                                    )}
                                </>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Reviews List */}
            {reviews.length === 0 ? (
                <div className={styles.emptyState}>
                    <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className={styles.emptyStateTitle}>No reviews found</div>
                    <div className={styles.emptyStateText}>Try adjusting your filter</div>
                </div>
            ) : (
                <div className={styles.reviewsList}>
                    {reviews.map((review) => (
                        <div key={review.id} className={styles.reviewCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.reviewInfo}>
                                    <div className={styles.productHeader}>
                                        <h3 className={styles.productTitle}>
                                            {review.product?.title || 'Product'}
                                        </h3>
                                        <div className={styles.starRating}>
                                            {renderStars(review.rating)}
                                        </div>
                                    </div>
                                    <div className={styles.reviewDetails}>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Buyer</span>
                                            <span className={styles.detailValue}>{review.buyer?.display_name || 'No name'}</span>
                                            <span className={styles.detailValueSecondary}>{review.buyer?.email || 'Unknown'}</span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Seller</span>
                                            <span className={styles.detailValue}>{review.seller?.display_name || 'No name'}</span>
                                            <span className={styles.detailValueSecondary}>{review.seller?.email || 'Unknown'}</span>
                                        </div>
                                    </div>
                                    {review.comment && (
                                        <div className={styles.commentBox}>
                                            <p className={styles.commentText}>
                                                {review.comment}
                                            </p>
                                        </div>
                                    )}
                                    <div className={styles.reviewMeta}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Posted {new Date(review.created_at).toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </div>
                                </div>
                                <div className={styles.actionButtons}>
                                    <button
                                        onClick={() => handleDelete(review.id)}
                                        disabled={loading}
                                        className={`${styles.actionButton} ${styles.deleteButton}`}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
