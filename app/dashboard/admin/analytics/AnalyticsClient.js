'use client';

import { useState } from 'react';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    BarChart,
    Bar,
    RadialBarChart,
    RadialBar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
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
    cursor: { stroke: 'rgba(29,173,221,0.15)', strokeWidth: 2 },
};

const AXIS_STYLE = {
    tick: { fill: '#4b636c', fontSize: 10, fontWeight: 700 },
    axisLine: { stroke: 'transparent' },
    tickLine: { stroke: 'transparent' },
};

const GRID_STYLE = {
    stroke: 'rgba(255,255,255,0.04)',
    strokeDasharray: '4 4',
};

// ---------------------------------------------------------------------------
// Category bar colours
// ---------------------------------------------------------------------------
const CAT_COLORS = ['#1daddd', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4'];

// ---------------------------------------------------------------------------
// Custom Tooltip Formatters
// ---------------------------------------------------------------------------
function GtvTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={TOOLTIP_STYLE.contentStyle}>
            <p style={TOOLTIP_STYLE.labelStyle}>{label}</p>
            {payload.map((p) => (
                <p key={p.name} className="flex items-center gap-2">
                    <span style={{ color: p.color }}>●</span>
                    {p.name}: ₵{Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
            ))}
        </div>
    );
}

function UserTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={TOOLTIP_STYLE.contentStyle}>
            <p style={TOOLTIP_STYLE.labelStyle}>{label}</p>
            {payload.map((p) => (
                <p key={p.name} className="flex items-center gap-2">
                    <span style={{ color: p.color }}>●</span>
                    {p.name}: {Number(p.value).toLocaleString()}
                </p>
            ))}
        </div>
    );
}

function CatTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <div style={TOOLTIP_STYLE.contentStyle}>
            <p style={TOOLTIP_STYLE.labelStyle}>{d.payload.category}</p>
            <p style={{ color: d.fill }}>{d.value} listings</p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AnalyticsClient({
    kpis = {},
    trends = {},
    categoryDistribution = [],
    campusLeaderboard = [],
    engagement = {},
    ads = {},
    moderation = {},
}) {
    const [trendPeriod, setTrendPeriod] = useState('monthly');

    const currentTrendData = trendPeriod === 'monthly' ? trends.monthly : trends.weekly;
    const monthlyUsers = trends.monthly || [];

    // Radial gauge for verification approval rate
    const approvalRate = parseFloat(moderation.verifications?.approvalRate || 0);
    const radialData = [{ name: 'Approved', value: approvalRate, fill: '#8b5cf6' }];

    // Shorten category names for bar chart
    const catData = categoryDistribution.slice(0, 7).map((c) => ({
        ...c,
        short: c.category.length > 14 ? c.category.slice(0, 13) + '…' : c.category,
    }));

    return (
        <div className="space-y-8 pb-12">
            {/* ---------------------------------------------------------------- */}
            {/* Header                                                           */}
            {/* ---------------------------------------------------------------- */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 dark:border-primary/5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                            <DynamicLucideIcon name="bar_chart" size={28} />
                        </div>
                        Platform Analytics
                    </h1>
                    <p className="text-sm text-[#4b636c] dark:text-gray-400 mt-1">
                        Full administrative audit of KART marketplace volume, user metrics, and advertising revenue.
                    </p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] bg-white dark:bg-[#1e292b] text-xs font-black uppercase tracking-widest text-[#4b636c] hover:text-primary active:scale-95 transition-all"
                >
                    <DynamicLucideIcon name="refresh" className="text-sm" />
                    Refresh
                </button>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* KPI Cards                                                        */}
            {/* ---------------------------------------------------------------- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[
                    {
                        label: 'Gross Volume (GTV)',
                        value: `₵${(kpis.gtv || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                        sub: 'Completed marketplace sales',
                        color: 'text-primary', bg: 'bg-primary/10', icon: 'payments',
                    },
                    {
                        label: 'Active Escrow',
                        value: `₵${(kpis.escrowAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                        sub: 'Pending release / dispute',
                        color: 'text-amber-500', bg: 'bg-amber-500/10', icon: 'account_balance_wallet',
                    },
                    {
                        label: 'Platform Revenue',
                        value: `₵${(kpis.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                        sub: 'Subscriptions + ad spend',
                        color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: 'monetization_on',
                    },
                    {
                        label: 'Active Subscribers',
                        value: (kpis.activeSubscriptionsCount || 0).toLocaleString(),
                        sub: `MRR ₵${(kpis.subRevenue || 0).toLocaleString()}`,
                        color: 'text-purple-500', bg: 'bg-purple-500/10', icon: 'card_membership',
                    },
                ].map((stat, i) => (
                    <div key={i} className="group relative bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] hover:scale-[1.02] hover:shadow-xl hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300 overflow-hidden">
                        <div className={`absolute top-0 right-0 w-24 h-24 opacity-30 rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500 ${stat.bg}`} />
                        <div className={`size-10 sm:size-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            <DynamicLucideIcon name={stat.icon} size={24} />
                        </div>
                        <p className="text-[#4b636c] dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">{stat.label}</p>
                        <h3 className="text-xl sm:text-2xl font-black mt-0.5 text-gray-900 dark:text-white truncate">{stat.value}</h3>
                        <p className="text-[10px] text-[#4b636c] dark:text-gray-500 mt-0.5">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Transaction Volume + User Growth (Recharts AreaChart / LineChart) */}
            {/* ---------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Transaction Volume — AreaChart */}
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-base font-black tracking-tight text-gray-900 dark:text-white">Transaction Volume</h4>
                            <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">Gross marketplace volume (GTV)</p>
                        </div>
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
                            {['monthly', 'weekly'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setTrendPeriod(p)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${trendPeriod === p
                                        ? 'bg-white dark:bg-[#1e292d] text-primary shadow-sm'
                                        : 'text-[#4b636c] dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={currentTrendData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gtvGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1daddd" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#1daddd" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.20} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid {...GRID_STYLE} vertical={false} />
                            <XAxis dataKey="label" {...AXIS_STYLE} />
                            <YAxis
                                {...AXIS_STYLE}
                                tickFormatter={(v) => v >= 1000 ? `₵${(v / 1000).toFixed(0)}k` : `₵${v}`}
                                width={52}
                            />
                            <Tooltip content={<GtvTooltip />} />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4b636c' }}
                            />
                            <Area type="monotone" dataKey="gtv" name="GTV" stroke="#1daddd" strokeWidth={2.5} fill="url(#gtvGrad)" dot={false} activeDot={{ r: 5, fill: '#1daddd', stroke: '#fff', strokeWidth: 2 }} />
                            <Area type="monotone" dataKey="adRevenue" name="Ad Revenue" stroke="#10b981" strokeWidth={2} fill="url(#subGrad)" dot={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* User Growth — LineChart */}
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm">
                    <div className="mb-6">
                        <h4 className="text-base font-black tracking-tight text-gray-900 dark:text-white">User Growth</h4>
                        <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">New registrations over the last 6 months</p>
                    </div>

                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={monthlyUsers} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid {...GRID_STYLE} vertical={false} />
                            <XAxis dataKey="label" {...AXIS_STYLE} />
                            <YAxis {...AXIS_STYLE} width={36} />
                            <Tooltip content={<UserTooltip />} />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4b636c' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="registrations"
                                name="Signups"
                                stroke="#8b5cf6"
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="subRevenue"
                                name="Sub Revenue (₵)"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                strokeDasharray="5 3"
                                dot={false}
                                activeDot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Category Distribution (BarChart) + Campus Leaderboard           */}
            {/* ---------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Category BarChart */}
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm flex flex-col">
                    <div className="mb-6">
                        <h4 className="text-base font-black tracking-tight text-gray-900 dark:text-white">Category Distribution</h4>
                        <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">Top listed product categories</p>
                    </div>

                    {catData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={catData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid {...GRID_STYLE} horizontal={false} />
                                <XAxis type="number" {...AXIS_STYLE} />
                                <YAxis type="category" dataKey="short" {...AXIS_STYLE} width={90} />
                                <Tooltip content={<CatTooltip />} cursor={{ fill: 'rgba(29,173,221,0.05)' }} />
                                <Bar dataKey="count" name="Listings" radius={[0, 6, 6, 0]} maxBarSize={20}>
                                    {catData.map((_, idx) => (
                                        <Cell key={idx} fill={CAT_COLORS[idx % CAT_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-[#4b636c] opacity-40 gap-2">
                            <DynamicLucideIcon name="bar_chart" size={36} />
                            <p className="text-xs font-black uppercase tracking-widest">No data yet</p>
                        </div>
                    )}

                    <Link href="/dashboard/admin/products" className="mt-4 w-full py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:text-primary transition-colors border-t border-[#dce3e5] dark:border-[#2d3b41] pt-4">
                        Manage Marketplace →
                    </Link>
                </div>

                {/* Campus Leaderboard Table */}
                <div className="lg:col-span-2 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm flex flex-col">
                    <div className="mb-6">
                        <h4 className="text-base font-black tracking-tight text-gray-900 dark:text-white">Campus Activity Leaderboard</h4>
                        <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">Top university marketplace hubs by combined volume</p>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse min-w-[480px]">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">Campus</th>
                                    <th className="px-4 py-3 text-center">Users</th>
                                    <th className="px-4 py-3 text-center">Listings</th>
                                    <th className="px-4 py-3 text-right">Revenue</th>
                                    <th className="px-4 py-3 text-right">Share</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41]">
                                {campusLeaderboard.slice(0, 6).map((item, idx) => {
                                    const totalRev = campusLeaderboard.reduce((s, c) => s + (c.revenue || 0), 0) || 1;
                                    const share = ((item.revenue / totalRev) * 100).toFixed(1);
                                    return (
                                        <tr key={idx} className="hover:bg-primary/[0.02] transition-colors group">
                                            <td className="px-4 py-3 text-xs font-bold text-gray-400">#{idx + 1}</td>
                                            <td className="px-4 py-3 text-xs font-black text-gray-900 dark:text-gray-200 group-hover:text-primary transition-colors">{item.campus}</td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300">{item.userCount}</td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300">{item.productCount}</td>
                                            <td className="px-4 py-3 text-right text-xs font-bold text-primary">
                                                ₵{item.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-[10px] font-black text-[#4b636c]">{share}%</span>
                                                    <div className="w-14 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-primary h-full rounded-full" style={{ width: `${share}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {campusLeaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center py-10 text-xs text-[#4b636c] dark:text-gray-500">
                                            No campus data recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Ad Performance + Trust & Moderation (RadialBarChart gauge)       */}
            {/* ---------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Ad Performance */}
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-base font-black tracking-tight text-gray-900 dark:text-white">Ad Campaigns Overview</h4>
                            <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">Sponsored listing performance & CTR</p>
                        </div>
                        <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <DynamicLucideIcon name="campaign" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-gray-50/80 dark:bg-black/20 border border-gray-100 dark:border-gray-800/20 mb-6">
                        {[
                            { label: 'Active Ads', value: ads.active || 0, sub: `of ${ads.total || 0} total`, color: 'text-primary' },
                            { label: 'Ad Revenue', value: `₵${(ads.revenue || 0).toLocaleString()}`, sub: 'gross collected', color: 'text-emerald-500' },
                            { label: 'Avg CTR', value: `${ads.ctr || 0}%`, sub: `${ads.clicks || 0} / ${ads.views || 0} clicks`, color: 'text-purple-500' },
                        ].map((s, i) => (
                            <div key={i} className={`text-center ${i < 2 ? 'border-r border-gray-200 dark:border-gray-800/40' : ''}`}>
                                <p className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest">{s.label}</p>
                                <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
                                <p className="text-[9px] text-gray-400 mt-0.5">{s.sub}</p>
                            </div>
                        ))}
                    </div>

                    <Link href="/dashboard/admin/advertisements" className="mt-auto w-full py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:text-primary transition-colors border-t border-[#dce3e5] dark:border-[#2d3b41] pt-4">
                        Manage Ad Portal →
                    </Link>
                </div>

                {/* Trust & Moderation — RadialBarChart */}
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h4 className="text-base font-black tracking-tight text-gray-900 dark:text-white">Trust & Moderation</h4>
                            <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">ID verification approval rate &amp; report queue</p>
                        </div>
                        <div className="size-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <DynamicLucideIcon name="verified_user" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-1">
                        {/* Radial gauge */}
                        <div className="relative shrink-0">
                            <ResponsiveContainer width={160} height={160}>
                                <RadialBarChart
                                    cx="50%" cy="50%"
                                    innerRadius="65%" outerRadius="90%"
                                    startAngle={225} endAngle={-45}
                                    data={[{ name: 'bg', value: 100, fill: 'rgba(139,92,246,0.1)' }, ...radialData]}
                                >
                                    <RadialBar dataKey="value" cornerRadius={8} background={false} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{approvalRate}%</span>
                                <span className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest mt-0.5">Approved</span>
                            </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-1 gap-3 flex-1">
                            {[
                                { label: 'Total Verifications', value: moderation.verifications?.total || 0, sub: `${moderation.verifications?.pending || 0} pending`, subColor: 'text-amber-500', link: '/dashboard/admin/verifications' },
                                { label: 'Report Queue', value: moderation.reports?.total || 0, sub: `${moderation.reports?.pending || 0} unresolved`, subColor: 'text-red-500', link: '/dashboard/admin/reports' },
                            ].map((s, i) => (
                                <Link key={i} href={s.link} className="group bg-gray-50/80 dark:bg-black/10 p-3 rounded-xl border border-gray-100 dark:border-gray-800/20 hover:border-primary/30 transition-all">
                                    <span className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest block">{s.label}</span>
                                    <span className="text-base font-black mt-0.5 block group-hover:text-primary transition-colors">{s.value} requests</span>
                                    <span className={`text-[9px] font-bold ${s.subColor} mt-0.5 block`}>{s.sub}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Organic Engagement Footer                                        */}
            {/* ---------------------------------------------------------------- */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm">
                <h4 className="text-sm font-black uppercase tracking-widest text-[#4b636c] dark:text-gray-400 mb-6">Organic Listing Engagement</h4>
                <div className="grid grid-cols-3 gap-6 text-center">
                    {[
                        { label: 'Total Product Views', value: engagement.views || 0, icon: 'visibility', color: 'bg-primary/10 text-primary' },
                        { label: 'Total Likes / Saves', value: engagement.likes || 0, icon: 'favorite', color: 'bg-rose-500/10 text-rose-500' },
                        { label: 'Social Shares', value: engagement.shares || 0, icon: 'share', color: 'bg-blue-500/10 text-blue-500' },
                    ].map((s, i) => (
                        <div key={i}>
                            <div className={`size-10 rounded-xl ${s.color} flex items-center justify-center mx-auto mb-2`}>
                                <DynamicLucideIcon name={s.icon} />
                            </div>
                            <p className="text-[#4b636c] text-[10px] font-black uppercase tracking-widest">{s.label}</p>
                            <h4 className="text-xl font-black mt-1">{Number(s.value).toLocaleString()}</h4>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
