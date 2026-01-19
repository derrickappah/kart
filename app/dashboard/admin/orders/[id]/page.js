import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import EscrowManagementClient from '../EscrowManagementClient';
import styles from './order-details.module.css';

export default async function AdminOrderDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Admin check is handled by layout
  // Fetch order with related data
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      product:products(id, title, description, images, image_url, category, condition),
      buyer:profiles!orders_buyer_id_profiles_fkey(id, display_name, email, is_verified),
      seller:profiles!orders_seller_id_profiles_fkey(id, display_name, email, is_verified)
    `)
    .eq('id', id)
    .single();

  if (orderError || !order) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h1 style={{ color: '#ef4444', fontSize: '2rem', marginBottom: '1rem' }}>Order Not Found</h1>
          <Link href="/dashboard/admin/orders" className={styles.backLink}>
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  // Fetch status history
  const { data: statusHistory } = await supabase
    .from('order_status_history')
    .select('*, changed_by_user:profiles!order_status_history_changed_by_fkey(display_name)')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

  const productImage = order.product?.images?.[0] || order.product?.image_url;
  
  const getStatusClass = (status) => {
    const statusMap = {
      Pending: styles.statusPending,
      Paid: styles.statusPaid,
      Shipped: styles.statusShipped,
      Delivered: styles.statusDelivered,
      Completed: styles.statusCompleted,
      Cancelled: styles.statusCancelled,
    };
    return statusMap[status] || styles.statusPending;
  };

  const getEscrowClass = (status) => {
    const escrowMap = {
      Held: styles.escrowHeld,
      Released: styles.escrowReleased,
      Refunded: styles.escrowRefunded,
    };
    return escrowMap[status] || styles.escrowHeld;
  };

  return (
    <div className={styles.pageContainer}>
      <Link href="/dashboard/admin/orders" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Orders
      </Link>

      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <h1 className={styles.pageTitle}>Order Management</h1>
          <p className={styles.orderId}>Order ID: {order.id}</p>
        </div>
        <div className={styles.statusBadges}>
          <span className={`${styles.statusBadge} ${getStatusClass(order.status)}`}>
            {order.status}
          </span>
          {order.escrow_status && (
            <span className={`${styles.escrowBadge} ${getEscrowClass(order.escrow_status)}`}>
              Escrow: {order.escrow_status}
            </span>
          )}
        </div>
      </header>

      {/* Escrow Management */}
      <div className={styles.contentFullWidth}>
        <EscrowManagementClient order={order} />
      </div>

      <div className={styles.contentGrid}>
        {/* Product Info */}
        <div className={`${styles.card} ${styles.productCard}`}>
          <h2 className={styles.sectionTitle}>
            <svg className={styles.sectionTitleIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Product Information
          </h2>
          {productImage && (
            <img
              src={productImage}
              alt={order.product?.title}
              className={styles.productImage}
            />
          )}
          <h3 className={styles.productTitle}>{order.product?.title || 'Product'}</h3>
          {order.product?.description && (
            <p className={styles.productDescription}>{order.product.description}</p>
          )}
          <div className={styles.productMeta}>
            {order.product?.category && (
              <div className={styles.productMetaItem}>
                <span className={styles.productMetaLabel}>Category</span>
                <span className={styles.productMetaValue}>{order.product.category}</span>
              </div>
            )}
            {order.product?.condition && (
              <div className={styles.productMetaItem}>
                <span className={styles.productMetaLabel}>Condition</span>
                <span className={styles.productMetaValue}>{order.product.condition}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <svg className={styles.sectionTitleIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Order Summary
          </h2>
          <div className={styles.summaryList}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Quantity</span>
              <span className={styles.summaryValue}>{order.quantity}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Unit Price</span>
              <span className={styles.summaryValue}>GHS {parseFloat(order.unit_price).toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Subtotal</span>
              <span className={styles.summaryValue}>GHS {(parseFloat(order.unit_price) * order.quantity).toFixed(2)}</span>
            </div>
            <div className={styles.summaryDivider}></div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Platform Fee ({order.platform_fee_percentage}% + GHS {order.platform_fee_fixed})</span>
              <span className={styles.summaryValue}>GHS {parseFloat(order.platform_fee_total).toFixed(2)}</span>
            </div>
            <div className={styles.summaryTotal}>
              <span className={styles.summaryTotalLabel}>Total</span>
              <span className={styles.summaryTotalValue}>GHS {parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
            <div className={styles.summaryPayout}>
              <span className={styles.summaryPayoutLabel}>Seller Payout</span>
              <span className={styles.summaryPayoutValue}>GHS {parseFloat(order.seller_payout_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buyer/Seller Info */}
      <div className={styles.contentGrid}>
        <div className={`${styles.card} ${styles.userInfoCard}`}>
          <h2 className={styles.sectionTitle}>
            <svg className={styles.sectionTitleIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Buyer Information
          </h2>
          <h3 className={styles.userName}>
            {order.buyer?.display_name || order.buyer?.email || 'Unknown'}
          </h3>
          <p className={styles.userEmail}>{order.buyer?.email || 'No email provided'}</p>
        </div>
        <div className={`${styles.card} ${styles.userInfoCard}`}>
          <h2 className={styles.sectionTitle}>
            <svg className={styles.sectionTitleIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Seller Information
          </h2>
          <h3 className={styles.userName}>
            {order.seller?.display_name || order.seller?.email || 'Unknown'}
            {order.seller?.is_verified && (
              <span className={styles.verifiedBadge}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Verified
              </span>
            )}
          </h3>
          <p className={styles.userEmail}>{order.seller?.email || 'No email provided'}</p>
        </div>
      </div>

      {/* Status History */}
      {statusHistory && statusHistory.length > 0 && (
        <div className={`${styles.card} ${styles.contentFullWidth}`}>
          <h2 className={styles.sectionTitle}>
            <svg className={styles.sectionTitleIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Status History
          </h2>
          <div className={styles.historyList}>
            {statusHistory.map((history) => (
              <div key={history.id} className={styles.historyItem}>
                <div className={styles.historyHeader}>
                  <span className={styles.historyStatus}>{history.new_status}</span>
                  <span className={styles.historyDate}>
                    {new Date(history.created_at).toLocaleString()}
                  </span>
                </div>
                <div className={styles.historyDetails}>
                  {history.old_status && (
                    <p className={styles.historyDetail}>
                      Changed from {history.old_status}
                    </p>
                  )}
                  {history.changed_by_user && (
                    <p className={styles.historyDetail}>
                      By {history.changed_by_user.display_name}
                    </p>
                  )}
                  {history.notes && (
                    <p className={styles.historyNotes}>
                      {history.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Info */}
      {order.payment_reference && (
        <div className={`${styles.card} ${styles.contentFullWidth}`}>
          <h2 className={styles.sectionTitle}>
            <svg className={styles.sectionTitleIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 4H3C1.89543 4 1 4.89543 1 6V18C1 19.1046 1.89543 20 3 20H21C22.1046 20 23 19.1046 23 18V6C23 4.89543 22.1046 4 21 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 10H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Payment Information
          </h2>
          <div className={styles.paymentInfo}>
            <div className={styles.paymentRow}>
              <span className={styles.paymentLabel}>Payment Reference</span>
              <span className={styles.paymentValue}>{order.payment_reference}</span>
            </div>
            {order.paystack_transaction_id && (
              <div className={styles.paymentRow}>
                <span className={styles.paymentLabel}>Transaction ID</span>
                <span className={styles.paymentValue}>{order.paystack_transaction_id}</span>
              </div>
            )}
            <div className={styles.paymentRow}>
              <span className={styles.paymentLabel}>Order Date</span>
              <span className={styles.paymentValue}>{new Date(order.created_at).toLocaleString()}</span>
            </div>
            {order.escrow_released_at && (
              <div className={styles.paymentRow}>
                <span className={styles.paymentLabel}>Escrow Released</span>
                <span className={styles.paymentValue}>{new Date(order.escrow_released_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
