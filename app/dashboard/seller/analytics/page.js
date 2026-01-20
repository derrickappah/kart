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
    <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display antialiased min-h-screen transition-colors duration-200">
      <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-[#f6f7f8] dark:bg-[#131d1f] shadow-2xl overflow-hidden">

        {/* Main Content */}
        <main className="flex-1 px-4 py-8 space-y-6 pb-32 overflow-y-auto no-scrollbar">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-2">Analytics</h3>
            <button className="flex items-center gap-1.5 bg-white dark:bg-[#1e292b] border border-transparent dark:border-white/5 rounded-xl px-3 py-1.5 shadow-soft active:scale-95 transition-all text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span className="material-symbols-outlined text-primary text-[16px]">calendar_today</span>
              Last 30 Days
            </button>
          </div>

          {/* Metrics Grid */}
          <section className="grid grid-cols-2 gap-4">
            {/* Total Revenue */}
            <div className="col-span-2 bg-white dark:bg-[#1e292b] p-6 rounded-2xl shadow-soft border border-transparent dark:border-white/5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500"></div>
              <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <span className="material-symbols-outlined text-primary text-[20px] fill-1">payments</span>
                  </div>
                  Total Revenue
                </div>
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2.5 py-1 rounded-lg ring-1 ring-emerald-500/20">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span> +5%
                </span>
              </div>
              <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white relative z-10">₵{totalRevenue.toFixed(2)}</p>
            </div>

            {/* Items Sold */}
            <div className="bg-white dark:bg-[#1e292b] p-5 rounded-2xl shadow-soft border border-transparent dark:border-white/5 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Items Sold</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{totalSales}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-[10px] font-bold text-emerald-500">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                2 vs last mo.
              </div>
            </div>

            {/* Profile Views */}
            <div className="bg-white dark:bg-[#1e292b] p-5 rounded-2xl shadow-soft border border-transparent dark:border-white/5 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Profile Views</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">1.2k</p>
              </div>
              <div className="flex items-center gap-1 mt-4 text-[10px] font-bold text-rose-500">
                <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                1% vs last mo.
              </div>
            </div>
          </section>

          {/* Earnings Chart */}
          <section className="bg-white dark:bg-[#1e292b] rounded-2xl p-6 shadow-soft border border-transparent dark:border-white/5">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Earnings Overview</h3>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Past 7 days performance</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">Growth</p>
                <p className="text-primary font-black text-base">+12.4%</p>
              </div>
            </div>

            {/* Chart Container */}
            <div className="w-full h-44 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="border-t border-slate-100 dark:border-white/5 w-full h-0"></div>
                ))}
              </div>
              <svg className="w-full h-full z-10 relative overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
                <defs>
                  <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#1daddd', stopOpacity: 0.2 }} />
                    <stop offset="100%" style={{ stopColor: '#1daddd', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <path d="M0,50 L0,35 Q10,35 15,25 T30,20 T45,30 T60,15 T75,20 T90,5 L100,10 L100,50 Z" fill="url(#gradient)" />
                <path d="M0,35 Q10,35 15,25 T30,20 T45,30 T60,15 T75,20 T90,5 L100,10" fill="none" stroke="#1daddd" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                <circle className="fill-white dark:fill-[#1e292b] stroke-primary stroke-[2.5px]" cx="60" cy="15" r="3" />
                <circle className="fill-white dark:fill-[#1e292b] stroke-primary stroke-[2.5px]" cx="90" cy="5" r="3" />
              </svg>
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
            </div>
          </section>

          {/* Top Listings Section */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Top Listings</h3>
              <button className="text-[11px] font-bold text-primary hover:text-primary-dark transition-colors uppercase tracking-widest">View All</button>
            </div>
            <div className="space-y-3">
              {productStats.map((item) => (
                <div key={item.id} className="bg-white dark:bg-[#1e292b] p-3 pr-4 rounded-xl shadow-soft border border-transparent dark:border-white/5 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer">
                  <div className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                    <img className="h-full w-full object-cover" src={item.image_url} alt={item.title} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-white truncate mb-1.5">{item.title}</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-slate-600">visibility</span>
                        {item.views}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        <span className="material-symbols-outlined text-[16px] text-primary/70">favorite</span>
                        {item.favorites}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Conv. Rate</span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${parseFloat(item.conversionRate) > 5 ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
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
