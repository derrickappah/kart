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

  // Calculate stats
  const totalSales = orders?.length || 0;
  const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.seller_payout_amount || order.total_amount || 0), 0) || 0;

  // 7-Day Chart Data Calculation
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const chartData = Array(7).fill(0);
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Align day labels with actual days
  const actualDayLabels = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    actualDayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

    const dayTotal = orders?.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate.toDateString() === d.toDateString();
    }).reduce((sum, order) => sum + parseFloat(order.seller_payout_amount || order.total_amount || 0), 0) || 0;

    chartData[i] = dayTotal;
  }

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

  const rechartsChartData = dayLabels.map((label, i) => ({ label, val: chartData[i] }));

  return (
    <SellerAnalyticsClient
      totalSales={totalSales}
      totalRevenue={totalRevenue}
      totalViews={totalViews}
      totalShares={totalShares}
      totalLikes={totalLikes}
      chartData={rechartsChartData}
      productStats={productStats}
    />
  );
}
