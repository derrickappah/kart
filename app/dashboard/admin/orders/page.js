import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import OrdersListClient from './OrdersListClient';

export default async function AdminOrdersPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const resolvedSearchParams = await searchParams;
  const escrowFilter = resolvedSearchParams?.escrow || 'all';
  const q = resolvedSearchParams?.q;

  // 1. Fetch filtered orders for the ledger
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

  if (q) {
    // Multi-field search logic
    query = query.or(`id.ilike.%${q}%,payment_reference.ilike.%${q}%`);
  }

  const { data: orders, error } = await query;

  // 2. Fetch Global Stats (Independent of filters)
  const { data: allStats } = await supabase
    .from('orders')
    .select('total_amount, escrow_status');

  const stats = {
    totalRevenue: allStats?.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) || 0,
    totalCount: allStats?.length || 0,
    heldCount: allStats?.filter(o => o.escrow_status === 'Held').length || 0,
    releasedCount: allStats?.filter(o => o.escrow_status === 'Released').length || 0,
    refundedCount: allStats?.filter(o => o.escrow_status === 'Refunded').length || 0,
  };

  return (
    <OrdersListClient
      initialOrders={orders || []}
      stats={stats}
      error={error}
    />
  );
}


