'use client';
import { useState } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProductModerationClient({ initialProducts, stats = {} }) {
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSearch = (e) => {
        e.preventDefault();
        router.push(`/dashboard/admin/products?q=${search}`);
    };

    const updateStatus = async (productId, newStatus) => {
        if (!confirm(`Set status to ${newStatus}?`)) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('products')
                .update({ status: newStatus })
                .eq('id', productId);

            if (error) throw error;
            router.refresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteProduct = async (productId) => {
        if (!confirm('PERMANENTLY DELETE this product? This cannot be undone.')) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;
            router.refresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Active': return styles.statusActive;
            case 'Banned': return styles.statusBanned;
            case 'Pending': return styles.statusPending;
            default: return styles.statusActive;
        }
    };

    return (
        <div>
            {/* Stats Row */}
            {stats && Object.keys(stats).length > 0 && (
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total Products</div>
                        <div className={styles.statValue}>{stats.total || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Active</div>
                        <div className={styles.statValue}>{stats.active || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Banned</div>
                        <div className={styles.statValue}>{stats.banned || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Pending</div>
                        <div className={styles.statValue}>{stats.pending || 0}</div>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className={styles.searchSection}>
                <form onSubmit={handleSearch} className={styles.searchForm}>
                    <input
                        type="text"
                        placeholder="Search products by title..."
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

            {/* Products Table */}
            {initialProducts.length === 0 ? (
                <div className={styles.emptyState}>
                    <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className={styles.emptyStateTitle}>No products found</div>
                    <div className={styles.emptyStateText}>Try adjusting your search query</div>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead className={styles.tableHeader}>
                            <tr>
                                <th>Product</th>
                                <th>Seller</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tableBody}>
                            {initialProducts.map(product => (
                                <tr key={product.id}>
                                    <td>
                                        <div className={styles.productCell}>
                                            {product.image_url ? (
                                                <img 
                                                    src={product.image_url} 
                                                    alt={product.title}
                                                    className={styles.productImage}
                                                />
                                            ) : (
                                                <div className={styles.productImage} style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    background: 'rgba(99, 102, 241, 0.2)',
                                                    color: '#a5b4fc',
                                                    fontSize: '1.5rem'
                                                }}>
                                                    📦
                                                </div>
                                            )}
                                            <div className={styles.productInfo}>
                                                <div className={styles.productTitle}>{product.title}</div>
                                                <Link 
                                                    href={`/marketplace/${product.id}`} 
                                                    target="_blank" 
                                                    className={styles.viewLink}
                                                >
                                                    View Listing
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M18 13V19A2 2 0 0 1 16 21H5A2 2 0 0 1 3 19V8A2 2 0 0 1 5 6H11M15 3H21M21 3V9M21 3L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </Link>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.sellerEmail}>{product.seller?.email || 'Unknown'}</span>
                                    </td>
                                    <td>
                                        <span className={styles.priceValue}>₵{parseFloat(product.price || 0).toFixed(2)}</span>
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${getStatusClass(product.status)}`}>
                                            {product.status === 'Active' && (
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                            {product.status === 'Banned' && (
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                            {product.status === 'Pending' && (
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M6 1V6L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                            {product.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actionButtons}>
                                            {product.status !== 'Banned' && (
                                                <button
                                                    onClick={() => updateStatus(product.id, 'Banned')}
                                                    disabled={loading}
                                                    className={`${styles.actionButton} ${styles.flagButton}`}
                                                    title="Ban Product"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M4 15C4 15 5 14 8 14C11 14 13 16 16 16C19 16 20 15 20 15V3C20 3 19 4 16 4C13 4 11 2 8 2C5 2 4 3 4 3V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        <path d="M4 22L4 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                    Flag
                                                </button>
                                            )}
                                            {product.status === 'Banned' && (
                                                <button
                                                    onClick={() => updateStatus(product.id, 'Active')}
                                                    disabled={loading}
                                                    className={`${styles.actionButton} ${styles.restoreButton}`}
                                                    title="Restore Product"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M3 12C3 4.5885 4.5885 3 12 3C19.4115 3 21 4.5885 21 12C21 19.4115 19.4115 21 12 21C4.5885 21 3 19.4115 3 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                    Restore
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteProduct(product.id)}
                                                disabled={loading}
                                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                                title="Delete Product"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
