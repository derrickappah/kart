import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SellerOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch seller's orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      product:products(id, title, images, image_url),
      buyer:profiles!orders_buyer_id_profiles_fkey(display_name, email)
    `)
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>My Sales</h1>
        </header>

        {error && (
          <div style={{ color: '#ef4444', padding: '1rem' }}>
            Error loading orders: {error.message}
          </div>
        )}

        {!orders || orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <p>You haven't received any orders yet.</p>
            <Link href="/dashboard/seller/create" style={{ color: 'var(--primary)', marginTop: '1rem', display: 'inline-block' }}>
              Create a Listing →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map((order) => {
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
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className={styles.card} style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                      {productImage && (
                        <img
                          src={productImage}
                          alt={order.product?.title}
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <h3 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
                          {order.product?.title || 'Product'}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          Buyer: {order.buyer?.display_name || order.buyer?.email || 'Unknown'}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          Quantity: {order.quantity} × GHS {parseFloat(order.unit_price).toFixed(2)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent)', marginBottom: '0.5rem' }}>
                          GHS {parseFloat(order.seller_payout_amount).toFixed(2)}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
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
                                padding: '0.25rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                background: `${escrowColors[order.escrow_status] || '#6b7280'}20`,
                                color: escrowColors[order.escrow_status] || '#6b7280',
                              }}
                            >
                              Escrow: {order.escrow_status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
