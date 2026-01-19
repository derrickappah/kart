import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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

  // Fetch orders for seller
  const { data: orders } = await supabase
    .from('orders')
    .select('*, product:products(id, title, image_url)')
    .eq('seller_id', user.id);

  // Calculate stats
  const totalSales = orders?.length || 0;
  const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.seller_payout_amount || 0), 0) || 0;
  
  // Mock data for analytics visuals as requested in design
  const totalViews = 1200; 
  const conversionRate = 5.2;

  // Product performance
  const productStats = (products || []).map(product => {
    const productOrders = orders?.filter(o => o.product_id === product.id) || [];
    const sales = productOrders.length;
    const revenue = productOrders.reduce((sum, o) => sum + parseFloat(o.seller_payout_amount || 0), 0);
    // Mock views for design consistency
    const views = Math.floor(Math.random() * 500) + 50;
    const favorites = Math.floor(Math.random() * 50) + 5;
    const rate = views > 0 ? ((sales / views) * 100).toFixed(1) : 0;

    return {
      ...product,
      sales,
      revenue,
      views,
      favorites,
      conversionRate: rate
    };
  }).sort((a, b) => b.sales - a.sales).slice(0, 3);

  return (
    <div className="bg-[#fafafa] dark:bg-[#18181b] text-slate-900 dark:text-slate-100 min-h-screen font-display antialiased">
      <div className="max-w-md mx-auto relative flex flex-col min-h-screen pb-24 shadow-2xl bg-[#fafafa] dark:bg-[#18181b]">
        {/* Top Navigation & Header */}
        <header className="sticky top-0 z-30 bg-[#fafafa]/90 dark:bg-[#18181b]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 bg-white dark:bg-[#27272a] border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 shadow-sm active:scale-95 transition-transform text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="material-symbols-outlined text-[#387d94] text-[16px]">calendar_today</span>
                Last 30 Days
                <span className="material-symbols-outlined text-slate-400 text-[16px]">expand_more</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pt-6 flex flex-col gap-6">
          {/* Metrics Grid */}
          <section className="grid grid-cols-2 gap-3">
            {/* Total Revenue */}
            <div className="col-span-2 bg-white dark:bg-[#27272a] p-5 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-[#387d94]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-500"></div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  <div className="p-1.5 bg-[#387d94]/10 rounded-lg">
                    <span className="material-symbols-outlined text-[#387d94] text-[20px]">attach_money</span>
                  </div>
                  Total Revenue
                </div>
                <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span> 5%
                </span>
              </div>
              <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">GHS {totalRevenue.toFixed(2)}</p>
            </div>

            {/* Items Sold */}
            <div className="bg-white dark:bg-[#27272a] p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Items Sold</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalSales}</p>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                2 vs last mo.
              </div>
            </div>

            {/* Profile Views */}
            <div className="bg-white dark:bg-[#27272a] p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Profile Views</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">1.2k</p>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs font-medium text-rose-500">
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                1% vs last mo.
              </div>
            </div>
          </section>

          {/* Earnings Chart */}
          <section className="bg-white dark:bg-[#27272a] rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Earnings Overview</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Weekly performance</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">This Week</p>
                <p className="text-[#387d94] font-bold text-lg">+12.4%</p>
              </div>
            </div>
            {/* Chart Container */}
            <div className="w-full h-48 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-50">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-t border-slate-100 dark:border-slate-700/50 w-full h-0"></div>
                ))}
              </div>
              <svg className="w-full h-full z-10 relative overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
                <defs>
                  <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#387d94', stopOpacity: 0.2 }} />
                    <stop offset="100%" style={{ stopColor: '#387d94', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <path d="M0,50 L0,35 Q10,35 15,25 T30,20 T45,30 T60,15 T75,20 T90,5 L100,10 L100,50 Z" fill="url(#gradient)" />
                <path d="M0,35 Q10,35 15,25 T30,20 T45,30 T60,15 T75,20 T90,5 L100,10" fill="none" stroke="#387d94" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <circle className="fill-white dark:fill-[#27272a] stroke-[#387d94] stroke-[2px]" cx="60" cy="15" r="2.5" />
                <circle className="fill-white dark:fill-[#27272a] stroke-[#387d94] stroke-[2px]" cx="90" cy="5" r="2.5" />
              </svg>
            </div>
            <div className="flex justify-between mt-3 text-xs font-medium text-slate-400">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
            </div>
          </section>

          {/* Top Listings Section */}
          <section>
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top Performing Listings</h3>
              <button className="text-sm font-semibold text-[#387d94] hover:text-[#2a6275] transition-colors">View All</button>
            </div>
            <div className="flex flex-col gap-3 pb-8">
              {productStats.map((item) => (
                <div key={item.id} className="bg-white dark:bg-[#27272a] p-3 pr-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <img className="h-full w-full object-cover" src={item.image_url} alt={item.title} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        {item.views}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">favorite</span>
                        {item.favorites}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-slate-400 mb-1">Conv. Rate</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${parseFloat(item.conversionRate) > 5 ? 'bg-[#387d94]/10 text-[#387d94]' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                      {item.conversionRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
