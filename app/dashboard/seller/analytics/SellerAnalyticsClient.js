'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
} from 'recharts';

export default function SellerAnalyticsClient({
    totalSales,
    totalRevenue,
    totalViews,
    totalShares,
    totalLikes,
    chartData = [],
    productStats = []
}) {
    return (
        <div className="bg-white dark:bg-[#242428] font-display antialiased min-h-screen transition-colors duration-200">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-white dark:bg-[#242428] shadow-2xl overflow-hidden">
                
                {/* Main Content */}
                <main className="flex-1 px-4 py-8 space-y-6 pb-32 overflow-y-auto no-scrollbar">
                    {/* Header Section */}
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-2">Analytics</h3>
                        <button className="flex items-center gap-1.5 bg-white dark:bg-[#1e292b] border border-transparent dark:border-white/5 rounded-xl px-3 py-1.5 shadow-soft active:scale-95 transition-all text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            <DynamicLucideIcon name="calendar_today" className="text-primary text-[16px]" />
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
                                        <DynamicLucideIcon name="payments" className="text-primary text-[20px] fill-1" />
                                    </div>
                                    Total Revenue
                                </div>
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
                        </div>

                        {/* Total Views */}
                        <div className="bg-white dark:bg-[#1e292b] p-5 rounded-2xl shadow-soft border border-transparent dark:border-white/5 flex flex-col justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Total Views</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">
                                    {totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 mt-4 text-[10px] font-bold text-primary">
                                <DynamicLucideIcon name="visibility" className="text-[14px]" />
                                Live tracking
                            </div>
                        </div>
                    </section>

                    {/* Earnings Chart */}
                    <section className="bg-white dark:bg-[#1e292b] rounded-2xl p-6 shadow-soft border border-transparent dark:border-white/5">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Earnings Overview</h3>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Past 7 days performance</p>
                            </div>
                        </div>

                        {/* Chart Container */}
                        <div className="w-full h-44 relative">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="sellerGtvGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1daddd" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#1daddd" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fill: '#4b636c', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#4b636c', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} width={40} />
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: '#0f1c1f',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '10px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                color: '#e2e8f0',
                                                padding: '6px 10px',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                                backdropFilter: 'blur(12px)'
                                            }}
                                            labelStyle={{ display: 'none' }}
                                            itemStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                                            formatter={(v) => [`₵${Number(v).toFixed(2)}`, 'Earnings']}
                                        />
                                        <Area type="monotone" dataKey="val" stroke="#1daddd" strokeWidth={2.5} fill="url(#sellerGtvGrad)" dot={false} activeDot={{ r: 4 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                                    <span className="text-xs font-bold uppercase tracking-widest">No data available</span>
                                </div>
                            )}
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
                                                <DynamicLucideIcon name="visibility" className="text-[16px] text-slate-300 dark:text-slate-600" />
                                                {item.views}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                <DynamicLucideIcon name="favorite" className="text-[16px] text-primary/70" />
                                                {item.favorites}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                <DynamicLucideIcon name="share" className="text-[16px] text-blue-400" />
                                                {item.shares || 0}
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
