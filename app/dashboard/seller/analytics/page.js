import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SellerAnalyticsClient from './SellerAnalyticsClient';

export default async function SellerAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch seller's products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', user.id);

  // Fetch orders for seller - include all successful statuses
  const { data: orders } = await supabase
    .from('orders')
    .select('*, product:products(id, title, image_url)')
    .eq('seller_id', user.id)
    .in('status', ['Paid', 'Completed', 'Delivered']);

  // Real data from products
  const totalViews = products?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
  const totalShares = products?.reduce((sum, p) => sum + (p.shares_count || 0), 0) || 0;
  const totalLikes = products?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;

  // Product performance
  const productStats = (products || []).map(product => {
    const productOrders = orders?.filter(o => o.product_id === product.id) || [];
    const sales = productOrders.length;
    const views = product.views_count || 0;
    const favorites = product.likes_count || 0;
    const shares = product.shares_count || 0;
    const rate = views > 0 ? ((sales / views) * 100).toFixed(1) : 0;

    return {
      ...product,
      sales,
      views,
      favorites,
      shares,
      conversionRate: rate
    };
  }).sort((a, b) => b.views - a.views).slice(0, 5); // Show top 5 by views

  return (
    <SellerAnalyticsClient
      orders={orders || []}
      totalViews={totalViews}
      totalShares={totalShares}
      totalLikes={totalLikes}
      productStats={productStats}
    />
  );
}
