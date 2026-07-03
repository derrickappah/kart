'use client';

import { useState } from 'react';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';
import Image from 'next/image';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Shared Tooltip Styles
// ---------------------------------------------------------------------------
const TOOLTIP_STYLE = {
    contentStyle: {
        backgroundColor: '#0f1c1f',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 700,
        color: '#e2e8f0',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
        padding: '10px 14px',
    },
    labelStyle: {
        color: '#1daddd',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
        fontSize: 9,
    },
    itemStyle: { color: '#e2e8f0', fontWeight: 700 },
};

function PromotionTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={TOOLTIP_STYLE.contentStyle}>
            <p style={TOOLTIP_STYLE.labelStyle}>{label}</p>
            {payload.map((p) => (
                <p key={p.name} style={{ color: '#e2e8f0', fontWeight: 700 }} className="flex items-center gap-2 mt-1">
                    <span style={{ color: p.color }}>●</span>
                    {p.name}: {Number(p.value).toLocaleString()}
                </p>
            ))}
        </div>
    );
}

export default function PromotionDetailsClient({ ad, chartData: initialChartData }) {
    // Fill in any gap days in the campaign timeline with 0 views and 0 clicks
    const chartData = (() => {
        if (!ad || !ad.start_date) return initialChartData;
        
        const start = new Date(ad.start_date);
        let end = new Date(ad.end_date);
        const now = new Date();
        if (ad.status === 'Active' && end > now) {
            end = now;
        }

        const dateMap = new Map();
        (initialChartData || []).forEach(row => {
            dateMap.set(row.day, {
                views: Number(row.views || 0),
                clicks: Number(row.clicks || 0)
            });
        });

        const filledData = [];
        const currentDate = new Date(start);
        currentDate.setUTCHours(0, 0, 0, 0);
        
        const normalizedEnd = new Date(end);
        normalizedEnd.setUTCHours(0, 0, 0, 0);

        let iterations = 0;
        while (currentDate <= normalizedEnd && iterations < 90) {
            const month = currentDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
            const dayNum = currentDate.getUTCDate();
            const formattedDay = `${month} ${dayNum}`;

            const existing = dateMap.get(formattedDay);
            filledData.push({
                day: formattedDay,
                views: existing ? existing.views : 0,
                clicks: existing ? existing.clicks : 0
            });

            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            iterations++;
        }
        return filledData.length > 0 ? filledData : initialChartData;
    })();

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display antialiased min-h-screen transition-colors duration-200">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-[#f6f7f8] dark:bg-[#131d1f] shadow-2xl overflow-hidden">

                {/* Header Section */}
                <header className="sticky top-0 z-[70] bg-white/95 dark:bg-[#131d1f]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center p-4 justify-between w-full">
                        <Link
                            href="/dashboard/seller/promotions"
                            aria-label="Back to Promotions List"
                            className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <DynamicLucideIcon name="arrow_back_ios_new" className="text-2xl text-slate-900 dark:text-white" />
                        </Link>
                        <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10 text-slate-900 dark:text-white">Promotion Details</h1>
                    </div>
                </header>

                <main className="flex-1 px-4 py-8 space-y-8 pb-32 overflow-y-auto no-scrollbar">

                    {/* Item Card */}
                    <Link href={`/marketplace/${ad.product_id}`} className="bg-white dark:bg-[#1e292b] rounded-3xl p-6 shadow-soft border border-transparent dark:border-white/5 flex flex-col items-center text-center gap-4 group active:scale-[0.98] transition-all">
                        <div className="size-32 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden relative border border-transparent dark:border-white/5 shadow-inner">
                            {ad.product?.image_url ? (
                                <Image src={ad.product.image_url} alt={ad.product.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                    <DynamicLucideIcon name="image" className="text-4xl" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-1 w-full">
                            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 ${ad.ad_type === 'Featured' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>
                                {ad.ad_type} Promotion
                            </span>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white line-clamp-2">{ad.product?.title || 'Unknown Item'}</h2>
                            <p className="text-lg font-bold text-primary">₵{parseFloat(ad.product?.price || 0).toFixed(2)}</p>
                        </div>
                    </Link>

                    {/* Stats Highlights */}
                    <section className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-[#1e292b] p-6 rounded-2xl shadow-soft border border-transparent dark:border-white/5 flex flex-col items-center">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 text-primary">
                                <DynamicLucideIcon name="visibility" className="fill-1" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-center">Total Views</span>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{ad.views || 0}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1e292b] p-6 rounded-2xl shadow-soft border border-transparent dark:border-white/5 flex flex-col items-center">
                            <div className="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3 text-orange-500">
                                <DynamicLucideIcon name="touch_app" className="fill-1" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-center">Total Clicks</span>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{ad.clicks || 0}</p>
                        </div>
                    </section>

                    {/* Campaign Info Card */}
                    <section className="bg-white dark:bg-[#1e292b] rounded-2xl p-6 shadow-soft border border-transparent dark:border-white/5 space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <DynamicLucideIcon name="info" className="text-primary text-lg" />
                            Campaign Information
                        </h3>
                        <div className="space-y-3 px-1">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-white/5">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Status</span>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest ${ad.status === 'Active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500'}`}>{ad.status}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-white/5">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Started</span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{new Date(ad.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-white/5">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ends</span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{new Date(ad.end_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cost</span>
                                <span className="text-xs font-black text-primary uppercase leading-none">₵{parseFloat(ad.cost || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </section>

                    {/* Performance History Chart */}
                    <section className="bg-white dark:bg-[#1e292b] rounded-2xl p-6 shadow-soft border border-transparent dark:border-white/5">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Performance over time</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Views &amp; Clicks breakdown</p>
                            </div>
                        </div>

                        {chartData.length > 0 ? (
                            <div className="h-56 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1daddd" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#1daddd" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ff9f0f" stopOpacity={0.20} />
                                                <stop offset="95%" stopColor="#ff9f0f" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" vertical={false} />
                                        <XAxis dataKey="day" tick={{ fill: '#4b636c', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#4b636c', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} width={40} />
                                        <RechartsTooltip content={<PromotionTooltip />} />
                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }} />
                                        <Area type="monotone" dataKey="views" name="Views" stroke="#1daddd" strokeWidth={2.5} fill="url(#viewsGrad)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                        <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#ff9f0f" strokeWidth={2} fill="url(#clicksGrad)" strokeDasharray="4 2" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-32 flex flex-col items-center justify-center text-slate-300 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                                <DynamicLucideIcon name="analytics" className="text-4xl mb-2 opacity-50" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting more data</p>
                            </div>
                        )}
                    </section>

                </main>
            </div>
        </div>
    );
}
