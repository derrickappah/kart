import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import OrderPaymentVerification from './OrderPaymentVerification';
import styles from '../../dashboard.module.css';

export default async function OrderDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch order with related data
  // Using explicit foreign key constraint names for relationships
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      product:products(id, title, description, images, image_url, category, condition),
      buyer:profiles!orders_buyer_id_profiles_fkey(id, display_name, email, is_verified, avatar_url),
      seller:profiles!orders_seller_id_profiles_fkey(id, display_name, email, is_verified, avatar_url)
    `)
    .eq('id', id)
    .single();

  if (orderError || !order) {
    return (
      <main className={styles.container}>
        <div className={styles.content}>
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h1 style={{ color: '#ef4444' }}>Order Not Found</h1>
            <p style={{ color: 'var(--text-muted)' }}>The order you're looking for doesn't exist.</p>
            <Link href="/dashboard/orders" style={{ color: 'var(--primary)', marginTop: '1rem', display: 'inline-block' }}>
              ← Back to Orders
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Check if user has access to this order
  const isBuyer = order.buyer_id === user.id;
  const isSeller = order.seller_id === user.id;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  const isAdmin = profile?.is_admin;

  if (!isBuyer && !isSeller && !isAdmin) {
    redirect('/dashboard/orders');
  }

  // Fetch status history
  const { data: statusHistory } = await supabase
    .from('order_status_history')
    .select('*, changed_by_user:profiles!order_status_history_changed_by_fkey(display_name)')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

  const productImage = order.product?.images?.[0] || order.product?.image_url;
  const statusColors = {
    Pending: '#f59e0b',
    Paid: '#3b82f6',
    Shipped: '#8b5cf6',
    Delivered: '#10b981',
    Completed: '#059669',
    Cancelled: '#ef4444',
  };

  const escrowColors = {
    Held: '#f59e0b',
    Released: '#10b981',
    Refunded: '#ef4444',
  };

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <Link href={isBuyer ? '/dashboard/orders' : '/dashboard/seller/orders'} style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'inline-block' }}>
          ← Back to Orders
        </Link>

        {isBuyer && (
          <Suspense fallback={null}>
            <OrderPaymentVerification orderId={order.id} currentStatus={order.status} />
          </Suspense>
        )}

        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Order Details</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Order ID: {order.id.slice(0, 8)}...
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: '600',
                background: `${statusColors[order.status] || '#6b7280'}20`,
                color: statusColors[order.status] || '#6b7280',
              }}
            >
              {order.status}
            </span>
            {order.escrow_status && (
              <span
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  background: `${escrowColors[order.escrow_status] || '#6b7280'}20`,
                  color: escrowColors[order.escrow_status] || '#6b7280',
                }}
              >
                Escrow: {order.escrow_status}
              </span>
            )}
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          {/* Product Info */}
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Product Information</h2>
            {productImage && (
              <img
                src={productImage}
                alt={order.product?.title}
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  height: 'auto',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                }}
              />
            )}
            <h3 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>{order.product?.title}</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{order.product?.description}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Category: </span>
                <span>{order.product?.category}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Condition: </span>
                <span>{order.product?.condition}</span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Order Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Quantity:</span>
                <span>{order.quantity}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Unit Price:</span>
                <span>GHS {parseFloat(order.unit_price).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                <span>GHS {(parseFloat(order.unit_price) * order.quantity).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <span>Platform Fee ({order.platform_fee_percentage}%):</span>
                <span>GHS {parseFloat(order.platform_fee_total).toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '700' }}>
                  <span>Total:</span>
                  <span style={{ color: 'var(--accent)' }}>GHS {parseFloat(order.total_amount).toFixed(2)}</span>
                </div>
              </div>
              {isSeller && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: '600' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Your Payout:</span>
                    <span style={{ color: 'var(--accent)' }}>GHS {parseFloat(order.seller_payout_amount).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buyer/Seller Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          {isBuyer && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Seller Information</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <p style={{ fontWeight: '600', margin: 0 }}>
                  {order.seller?.display_name || order.seller?.email || 'Unknown'}
                </p>
                {order.seller?.is_verified && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.25rem 0.5rem',
                    background: '#10b98120',
                    color: '#10b981',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}>
                    ✓ Verified
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{order.seller?.email}</p>
            </div>
          )}
          {isSeller && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Buyer Information</h2>
              <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                {order.buyer?.display_name || order.buyer?.email || 'Unknown'}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{order.buyer?.email}</p>
            </div>
          )}
        </div>

        {/* Status History */}
        {statusHistory && statusHistory.length > 0 && (
          <div className={styles.card} style={{ marginTop: '2rem' }}>
            <h2 className={styles.sectionTitle}>Status History</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {statusHistory.map((history, index) => (
                <div key={history.id} style={{ paddingBottom: '1rem', borderBottom: index < statusHistory.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '600' }}>{history.new_status}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {new Date(history.created_at).toLocaleString()}
                    </span>
                  </div>
                  {history.old_status && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Changed from {history.old_status}
                    </p>
                  )}
                  {history.changed_by_user && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      By {history.changed_by_user.display_name}
                    </p>
                  )}
                  {history.notes && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {history.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Info */}
        {order.payment_reference && (
          <div className={styles.card} style={{ marginTop: '2rem' }}>
            <h2 className={styles.sectionTitle}>Payment Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Payment Reference: </span>
                <span style={{ fontFamily: 'monospace' }}>{order.payment_reference}</span>
              </div>
              {order.paystack_transaction_id && (
                <div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Transaction ID: </span>
                  <span style={{ fontFamily: 'monospace' }}>{order.paystack_transaction_id}</span>
                </div>
              )}
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Order Date: </span>
                <span>{new Date(order.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
