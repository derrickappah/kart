import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminOrdersPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Admin check is handled by layout
  // Await searchParams for Next.js 15+
  const resolvedSearchParams = await searchParams;
  const escrowFilter = resolvedSearchParams?.escrow || 'all';
  
  let query = supabase
    .from('orders')
    .select(`
      *,
      product:products(id, title, images, image_url),
      buyer:profiles!orders_buyer_id_profiles_fkey(display_name, email),
      seller:profiles!orders_seller_id_profiles_fkey(display_name, email)
    `)
    .order('created_at', { ascending: false });

  if (escrowFilter !== 'all') {
    query = query.eq('escrow_status', escrowFilter);
  }

  const { data: orders, error } = await query;

  // Calculate stats
  const totalCount = orders?.length || 0;
  const heldCount = orders?.filter(o => o.escrow_status === 'Held').length || 0;
  const releasedCount = orders?.filter(o => o.escrow_status === 'Released').length || 0;
  const refundedCount = orders?.filter(o => o.escrow_status === 'Refunded').length || 0;
  const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending': return styles.statusPending;
      case 'Paid': return styles.statusPaid;
      case 'Shipped': return styles.statusShipped;
      case 'Delivered': return styles.statusDelivered;
      case 'Completed': return styles.statusCompleted;
      case 'Cancelled': return styles.statusCancelled;
      default: return styles.statusPending;
    }
  };

  const getEscrowClass = (escrowStatus) => {
    switch (escrowStatus) {
      case 'Held': return styles.escrowHeld;
      case 'Released': return styles.escrowReleased;
      case 'Refunded': return styles.escrowRefunded;
      default: return styles.escrowHeld;
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Order Management</h1>
        <p className={styles.subtitle}>Manage and monitor all platform orders</p>
      </header>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Orders</div>
          <div className={styles.statValue}>{totalCount || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Held in Escrow</div>
          <div className={styles.statValue}>{heldCount || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Released</div>
          <div className={styles.statValue}>{releasedCount || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Revenue</div>
          <div className={styles.statValue}>₵{totalRevenue.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterSection}>
        <div className={styles.filterTabs}>
          <Link
            href="/dashboard/admin/orders"
            className={`${styles.filterTab} ${escrowFilter === 'all' ? styles.filterTabActive : ''}`}
          >
            All Orders
            {totalCount > 0 && <span className={styles.filterTabCount}>{totalCount}</span>}
          </Link>
          <Link
            href="/dashboard/admin/orders?escrow=Held"
            className={`${styles.filterTab} ${escrowFilter === 'Held' ? styles.filterTabActive : ''}`}
          >
            Held in Escrow
            {heldCount > 0 && <span className={styles.filterTabCount}>{heldCount}</span>}
          </Link>
          <Link
            href="/dashboard/admin/orders?escrow=Released"
            className={`${styles.filterTab} ${escrowFilter === 'Released' ? styles.filterTabActive : ''}`}
          >
            Released
            {releasedCount > 0 && <span className={styles.filterTabCount}>{releasedCount}</span>}
          </Link>
          <Link
            href="/dashboard/admin/orders?escrow=Refunded"
            className={`${styles.filterTab} ${escrowFilter === 'Refunded' ? styles.filterTabActive : ''}`}
          >
            Refunded
            {refundedCount > 0 && <span className={styles.filterTabCount}>{refundedCount}</span>}
          </Link>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          Error loading orders: {error.message}
        </div>
      )}

      {!orders || orders.length === 0 ? (
        <div className={styles.emptyState}>
          <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className={styles.emptyStateTitle}>No orders found</div>
          <div className={styles.emptyStateText}>Try adjusting your filter</div>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {orders.map((order) => {
            const productImage = order.product?.images?.[0] || order.product?.image_url;

            return (
              <Link
                key={order.id}
                href={`/dashboard/admin/orders/${order.id}`}
                className={styles.orderCard}
              >
                <div className={styles.orderContent}>
                  {productImage ? (
                    <img
                      src={productImage}
                      alt={order.product?.title}
                      className={styles.productImage}
                    />
                  ) : (
                    <div className={styles.productImagePlaceholder}>
                      📦
                    </div>
                  )}
                  <div className={styles.orderInfo}>
                    <h3 className={styles.productTitle}>
                      {order.product?.title || 'Product'}
                    </h3>
                    <div className={styles.orderDetails}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Buyer</span>
                        <span className={styles.detailValue}>{order.buyer?.display_name || 'No name'}</span>
                        <span className={styles.detailValueSecondary}>{order.buyer?.email || 'Unknown'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Seller</span>
                        <span className={styles.detailValue}>{order.seller?.display_name || 'No name'}</span>
                        <span className={styles.detailValueSecondary}>{order.seller?.email || 'Unknown'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Quantity</span>
                        <span className={styles.detailValue}>{order.quantity} × ₵{parseFloat(order.unit_price || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.orderMeta}>
                    <span className={`${styles.statusBadge} ${getStatusClass(order.status)}`}>
                      {order.status === 'Pending' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 1V6L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {order.status === 'Paid' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {order.status === 'Shipped' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 6L6 1L11 6M6 1V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {order.status === 'Delivered' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {order.status === 'Completed' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {order.status === 'Cancelled' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {order.status}
                    </span>
                    {order.escrow_status && (
                      <span className={`${styles.escrowBadge} ${getEscrowClass(order.escrow_status)}`}>
                        {order.escrow_status === 'Held' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 1L8 4L11 4.5L9 7L9.5 10L6 8.5L2.5 10L3 7L1 4.5L4 4L6 1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {order.escrow_status === 'Released' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {order.escrow_status === 'Refunded' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        Escrow: {order.escrow_status}
                      </span>
                    )}
                    <div className={styles.totalAmount}>
                      ₵{parseFloat(order.total_amount || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
