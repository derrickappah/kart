'use client';

import { useState } from 'react';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';

export default function AnalyticsClient({
    kpis = {},
    trends = {},
    categoryDistribution = [],
    campusLeaderboard = [],
    engagement = {},
    ads = {},
    moderation = {}
}) {
    const [trendPeriod, setTrendPeriod] = useState('monthly');
    const [hoveredTrendPoint, setHoveredTrendPoint] = useState(null);
    const [hoveredUserPoint, setHoveredUserPoint] = useState(null);

    // Trend calculations
    const currentTrendData = trendPeriod === 'monthly' ? trends.monthly : trends.weekly;
    const maxGtv = Math.max(...currentTrendData.map(d => d.gtv), 1);
    
    // User growth trend calculations
    const monthlyUsers = trends.monthly || [];
    const maxUsers = Math.max(...monthlyUsers.map(d => d.registrations), 1);

    // SVG Line/Area Points for GTV Trend
    const gtvPoints = currentTrendData.map((d, i) => {
        const x = (i / (currentTrendData.length - 1)) * 100;
        const y = 90 - (d.gtv / maxGtv) * 75; // Map to 15-90 Y coordinate range
        return { x, y, label: d.label, val: d.gtv };
    });

    const gtvPathD = gtvPoints.length > 0 
        ? gtvPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
        : '';
    const gtvAreaD = gtvPoints.length > 0 
        ? `${gtvPathD} L 100 100 L 0 100 Z` 
        : '';

    // SVG Line/Area Points for User registrations
    const userPoints = monthlyUsers.map((d, i) => {
        const x = (i / (monthlyUsers.length - 1)) * 100;
        const y = 90 - (d.registrations / maxUsers) * 75;
        return { x, y, label: d.label, val: d.registrations };
    });

    const userPathD = userPoints.length > 0 
        ? userPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
        : '';
    const userAreaD = userPoints.length > 0 
        ? `${userPathD} L 100 100 L 0 100 Z` 
        : '';

    // Circular gauge properties
    const approvalRate = parseFloat(moderation.verifications?.approvalRate || 0);
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (approvalRate / 100) * circumference;

    return (
        <div className="space-y-8 pb-12">
            {/* Header Title Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 dark:border-primary/5 backdrop-blur-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                            <DynamicLucideIcon name="bar_chart" size={28} />
                        </div>
                        Platform Analytics
                    </h1>
                    <p className="text-sm text-[#4b636c] dark:text-gray-400 mt-1">Full administrative audit of KART marketplace volume, user metrics, and advertising revenue.</p>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] bg-white dark:bg-[#1e292b] text-xs font-black uppercase tracking-widest text-[#4b636c] hover:text-primary dark:hover:text-primary active:scale-95 transition-all shadow-soft"
                >
                    <DynamicLucideIcon name="refresh" className="text-sm" />
                    Refresh Logs
                </button>
            </div>

            {/* Financial Overview KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[
                    { 
                        label: 'Gross Volume (GTV)', 
                        value: `₵${(kpis.gtv || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 
                        subtext: 'Marketplace sales total',
                        color: 'text-primary', 
                        bg: 'bg-primary/10',
                        icon: 'payments' 
                    },
                    { 
                        label: 'Active Escrow', 
                        value: `₵${(kpis.escrowAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 
                        subtext: 'Dispute / pending release',
                        color: 'text-amber-500', 
                        bg: 'bg-amber-500/10',
                        icon: 'account_balance_wallet' 
                    },
                    { 
                        label: 'Direct Platform Rev', 
                        value: `₵${(kpis.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 
                        subtext: 'Subs + advertising revenue',
                        color: 'text-emerald-500', 
                        bg: 'bg-emerald-500/10',
                        icon: 'monetization_on' 
                    },
                    { 
                        label: 'Active Subscribers', 
                        value: (kpis.activeSubscriptionsCount || 0).toLocaleString(), 
                        subtext: `₵${(kpis.subRevenue || 0).toLocaleString()}/mo MRR run-rate`,
                        color: 'text-purple-500', 
                        bg: 'bg-purple-500/10',
                        icon: 'card_membership' 
                    },
                ].map((stat, i) => (
                    <div key={i} className="group relative bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] hover:scale-[1.02] hover:shadow-xl hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300 overflow-hidden">
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg.replace('/10', '/5')} rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500`}></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`size-10 sm:size-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                <DynamicLucideIcon name={stat.icon} size={24} />
                            </div>
                        </div>
                        <p className="text-[#4b636c] dark:text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                        <h3 className="text-xl sm:text-2xl font-black mt-1 text-gray-900 dark:text-white truncate">{stat.value}</h3>
                        <p className="text-[10px] text-[#4b636c] dark:text-gray-400 mt-1">{stat.subtext}</p>
                    </div>
                ))}
            </div>

            {/* Main Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Transaction Trends (GTV) */}
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm flex flex-col justify-between min-h-[380px]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Transaction Trends</h4>
                            <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">Gross Marketplace volume (GTV)</p>
                        </div>
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
                            {['monthly', 'weekly'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => { setTrendPeriod(p); setHoveredTrendPoint(null); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-widest ${trendPeriod === p
                                        ? 'bg-white dark:bg-[#1e292d] text-primary shadow-sm'
                                        : 'text-[#4b636c] dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chart Canvas */}
                    <div className="relative w-full h-[200px] mt-2">
                        {/* Y-Axis lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[8px] font-black text-gray-300 dark:text-gray-700/50 uppercase tracking-wider">
                            <div className="border-t border-dashed border-gray-100 dark:border-gray-800/40 w-full h-0 pt-0.5">₵{maxGtv.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                            <div className="border-t border-dashed border-gray-100 dark:border-gray-800/40 w-full h-0 pt-0.5">₵{(maxGtv/2).toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                            <div className="border-t border-dashed border-gray-100 dark:border-gray-800/40 w-full h-0">0</div>
                        </div>

                        {currentTrendData.length > 0 ? (
                            <svg className="w-full h-full z-10 relative overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="gtvGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#1daddd', stopOpacity: 0.25 }} />
                                        <stop offset="100%" style={{ stopColor: '#1daddd', stopOpacity: 0 }} />
                                    </linearGradient>
                                </defs>

                                <path d={gtvAreaD} fill="url(#gtvGradient)" />
                                <path d={gtvPathD} fill="none" stroke="#1daddd" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                                
                                {gtvPoints.map((p, i) => (
                                    <circle
                                        key={i}
                                        className="fill-white dark:fill-[#182125] stroke-primary stroke-[3px] cursor-pointer hover:r-5 focus:outline-none"
                                        cx={p.x}
                                        cy={p.y}
                                        r="3.5"
                                        onMouseEnter={() => setHoveredTrendPoint(p)}
                                        onMouseLeave={() => setHoveredTrendPoint(null)}
                                    />
                                ))}
                            </svg>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-[#4b636c]">
                                <DynamicLucideIcon name="bar_chart" className="text-4xl mb-2 opacity-20 text-primary" />
                                <p className="text-xs font-black uppercase tracking-widest opacity-40">No activity recorded</p>
                            </div>
                        )}

                        {/* Tooltip */}
                        {hoveredTrendPoint && (
                            <div 
                                className="absolute bg-slate-900/95 dark:bg-black/95 text-white text-[10px] font-black px-3 py-2 rounded-xl flex flex-col gap-0.5 shadow-2xl border border-white/10 backdrop-blur-md transition-all z-20"
                                style={{ 
                                    left: `${Math.min(Math.max(hoveredTrendPoint.x, 10), 90)}%`, 
                                    top: `${Math.max(hoveredTrendPoint.y - 45, 0)}px`,
                                    transform: 'translateX(-50%)'
                                }}
                            >
                                <span className="text-primary text-[8px] font-black uppercase tracking-widest">{hoveredTrendPoint.label}</span>
                                <span>Volume: ₵{hoveredTrendPoint.val.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    {/* X-Axis labels */}
                    <div className="flex justify-between mt-6 text-[#4b636c] dark:text-gray-400 text-[10px] font-black uppercase tracking-widest border-t border-gray-100 dark:border-gray-800/20 pt-4">
                        {currentTrendData.map((d, i) => (
                            <span key={i} className="flex-1 text-center truncate px-1">
                                {d.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 2. User Growth Trend (Registrations) */}
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm flex flex-col justify-between min-h-[380px]">
                    <div>
                        <h4 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">User Growth Trend</h4>
                        <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">Registrations over the last 6 months</p>
                    </div>

                    {/* Chart Canvas */}
                    <div className="relative w-full h-[200px] mt-6">
                        {/* Y-Axis lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[8px] font-black text-gray-300 dark:text-gray-700/50 uppercase tracking-wider">
                            <div className="border-t border-dashed border-gray-100 dark:border-gray-800/40 w-full h-0 pt-0.5">{maxUsers.toLocaleString()} signups</div>
                            <div className="border-t border-dashed border-gray-100 dark:border-gray-800/40 w-full h-0 pt-0.5">{(maxUsers/2).toLocaleString()}</div>
                            <div className="border-t border-dashed border-gray-100 dark:border-gray-800/40 w-full h-0">0</div>
                        </div>

                        {monthlyUsers.length > 0 ? (
                            <svg className="w-full h-full z-10 relative overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="userGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.25 }} />
                                        <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 0 }} />
                                    </linearGradient>
                                </defs>

                                <path d={userAreaD} fill="url(#userGradient)" />
                                <path d={userPathD} fill="none" stroke="#8b5cf6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                                
                                {userPoints.map((p, i) => (
                                    <circle
                                        key={i}
                                        className="fill-white dark:fill-[#182125] stroke-purple-500 stroke-[3px] cursor-pointer hover:r-5 focus:outline-none"
                                        cx={p.x}
                                        cy={p.y}
                                        r="3.5"
                                        onMouseEnter={() => setHoveredUserPoint(p)}
                                        onMouseLeave={() => setHoveredUserPoint(null)}
                                    />
                                ))}
                            </svg>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-[#4b636c]">
                                <DynamicLucideIcon name="groups" className="text-4xl mb-2 opacity-20 text-purple-500" />
                                <p className="text-xs font-black uppercase tracking-widest opacity-40">No activity recorded</p>
                            </div>
                        )}

                        {/* Tooltip */}
                        {hoveredUserPoint && (
                            <div 
                                className="absolute bg-slate-900/95 dark:bg-black/95 text-white text-[10px] font-black px-3 py-2 rounded-xl flex flex-col gap-0.5 shadow-2xl border border-white/10 backdrop-blur-md transition-all z-20"
                                style={{ 
                                    left: `${Math.min(Math.max(hoveredUserPoint.x, 10), 90)}%`, 
                                    top: `${Math.max(hoveredUserPoint.y - 45, 0)}px`,
                                    transform: 'translateX(-50%)'
                                }}
                            >
                                <span className="text-purple-400 text-[8px] font-black uppercase tracking-widest">{hoveredUserPoint.label}</span>
                                <span>Signups: {hoveredUserPoint.val.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    {/* X-Axis labels */}
                    <div className="flex justify-between mt-6 text-[#4b636c] dark:text-gray-400 text-[10px] font-black uppercase tracking-widest border-t border-gray-100 dark:border-gray-800/20 pt-4">
                        {monthlyUsers.map((d, i) => (
                            <span key={i} className="flex-1 text-center truncate px-1">
                                {d.label}
                            </span>
                        ))}
                    </div>
                </div>

            </div>

            {/* Campus Leaderboard & Category Share Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Campus Leaderboard (Table) */}
                <div className="lg:col-span-2 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Campus Activity Leaderboard</h4>
                            <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">Top performing university marketplace hubs</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto grow">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
                                    <th className="px-4 py-3">Campus</th>
                                    <th className="px-4 py-3 text-center">Active Agents</th>
                                    <th className="px-4 py-3 text-center">Listed Items</th>
                                    <th className="px-4 py-3 text-right">Market Revenue</th>
                                    <th className="px-4 py-3 text-right">Volume Share</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41]">
                                {campusLeaderboard.slice(0, 6).map((item, idx) => {
                                    const totalCampusesRevenue = campusLeaderboard.reduce((sum, c) => sum + (c.revenue || 0), 0) || 1;
                                    const revenueShare = ((item.revenue / totalCampusesRevenue) * 100).toFixed(1);
                                    
                                    return (
                                        <tr key={idx} className="hover:bg-primary/[0.02] transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                                                    <span className="text-xs font-black text-gray-900 dark:text-gray-200 group-hover:text-primary transition-colors">{item.campus}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                                                {item.userCount}
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                                                {item.productCount}
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs font-bold text-[#1daddd]">
                                                ₵{item.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-[10px] font-black text-[#4b636c]">{revenueShare}%</span>
                                                    <div className="w-16 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                                        <div 
                                                            className="bg-primary h-full rounded-full" 
                                                            style={{ width: `${revenueShare}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {campusLeaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="text-center py-8 text-xs text-[#4b636c] dark:text-gray-500">
                                            No campus activity data recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Category Share (Horizontal Bars) */}
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm flex flex-col justify-between">
                    <div>
                        <h4 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Category Distribution</h4>
                        <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">Top listed product categories</p>
                    </div>

                    <div className="space-y-4 my-6 overflow-y-auto max-h-[260px] pr-1 custom-scrollbar">
                        {categoryDistribution.slice(0, 5).map((item, idx) => {
                            const colors = ['bg-[#1daddd]', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500'];
                            const color = colors[idx % colors.length];

                            return (
                                <div key={idx} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-gray-700 dark:text-gray-200">{item.category}</span>
                                        <span className="text-[#4b636c]">{item.count} items ({item.percentage}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                                        <div 
                                            className={`${color} h-full rounded-full transition-all duration-1000`} 
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {categoryDistribution.length === 0 && (
                            <div className="text-center py-12 text-xs text-[#4b636c] dark:text-gray-500">
                                No categories populated.
                            </div>
                        )}
                    </div>

                    <Link href="/dashboard/admin/products" className="w-full py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:text-primary dark:hover:text-primary transition-colors border-t border-[#dce3e5] dark:border-[#2d3b41] pt-4">
                        Manage Marketplace
                    </Link>
                </div>

            </div>

            {/* Engagement & Ad Campaigns Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Advertisement Performance */}
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h4 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Ad Campaigns Overview</h4>
                            <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">Sponsor listing performance & click stats</p>
                        </div>
                        <div className="size-9 rounded-lg bg-[#1daddd]/10 text-primary flex items-center justify-center">
                            <DynamicLucideIcon name="campaign" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 my-6 bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800/30">
                        <div className="text-center border-r border-gray-200 dark:border-gray-800/40">
                            <span className="text-[10px] font-black text-[#4b636c] uppercase tracking-widest">Active Ads</span>
                            <h4 className="text-xl font-black mt-1">{ads.active || 0}</h4>
                            <p className="text-[9px] font-bold text-gray-400 mt-0.5">of {ads.total || 0} total</p>
                        </div>
                        <div className="text-center border-r border-gray-200 dark:border-gray-800/40">
                            <span className="text-[10px] font-black text-[#4b636c] uppercase tracking-widest">Gross Spend</span>
                            <h4 className="text-xl font-black mt-1 text-emerald-500">₵{(ads.revenue || 0).toLocaleString()}</h4>
                            <p className="text-[9px] font-bold text-gray-400 mt-0.5">ad revenue collected</p>
                        </div>
                        <div className="text-center">
                            <span className="text-[10px] font-black text-[#4b636c] uppercase tracking-widest">Avg. CTR</span>
                            <h4 className="text-xl font-black mt-1 text-purple-500">{ads.ctr || 0}%</h4>
                            <p className="text-[9px] font-bold text-gray-400 mt-0.5">{ads.clicks || 0} / {ads.views || 0} clicks</p>
                        </div>
                    </div>

                    <Link href="/dashboard/admin/advertisements" className="w-full py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:text-primary dark:hover:text-primary transition-colors border-t border-[#dce3e5] dark:border-[#2d3b41] pt-2">
                        Manage Ad Portal
                    </Link>
                </div>

                {/* 2. Platform Engagement & Moderation */}
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h4 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Trust & Moderation Status</h4>
                            <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">ID verifications and dispute volume</p>
                        </div>
                        <div className="size-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <DynamicLucideIcon name="verified_user" />
                        </div>
                    </div>

                    <div className="flex items-center gap-6 my-6">
                        {/* Circular Progress Gauge */}
                        <div className="relative shrink-0 flex items-center justify-center">
                            <svg className="w-20 h-20 transform -rotate-90">
                                <circle cx="40" cy="40" r={radius} className="stroke-gray-100 dark:stroke-gray-800" strokeWidth="6" fill="transparent" />
                                <circle cx="40" cy="40" r={radius} className="stroke-purple-500" strokeWidth="6" fill="transparent"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round" />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-sm font-black text-slate-800 dark:text-white">{approvalRate}%</span>
                                <span className="text-[7px] font-black text-[#4b636c] uppercase tracking-widest">Approved</span>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-4 flex-1">
                            <div className="bg-gray-50 dark:bg-black/10 p-3 rounded-xl border border-gray-100 dark:border-gray-800/20">
                                <span className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest block">Verifications</span>
                                <span className="text-base font-black mt-0.5 block">{moderation.verifications?.total || 0} requests</span>
                                <span className="text-[9px] font-bold text-amber-500 mt-0.5 block">({moderation.verifications?.pending || 0} pending)</span>
                            </div>
                            <div className="bg-gray-50 dark:bg-black/10 p-3 rounded-xl border border-gray-100 dark:border-gray-800/20">
                                <span className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest block">Report Queue</span>
                                <span className="text-base font-black mt-0.5 block">{moderation.reports?.total || 0} reports</span>
                                <span className="text-[9px] font-bold text-red-500 mt-0.5 block">({moderation.reports?.pending || 0} pending)</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 border-t border-[#dce3e5] dark:border-[#2d3b41] pt-4">
                        <Link href="/dashboard/admin/verifications" className="flex-1 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:text-primary dark:hover:text-primary transition-colors">
                            Approve IDs
                        </Link>
                        <div className="w-px bg-gray-200 dark:bg-gray-800 h-6 align-middle"></div>
                        <Link href="/dashboard/admin/reports" className="flex-1 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:text-primary dark:hover:text-primary transition-colors">
                            Review Reports
                        </Link>
                    </div>
                </div>

            </div>

            {/* Engagement Metrics footer */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm">
                <h4 className="text-sm font-black uppercase tracking-widest text-[#4b636c] dark:text-gray-400 mb-6 px-1">Organic Listing Engagement</h4>
                <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                            <DynamicLucideIcon name="visibility" />
                        </div>
                        <p className="text-[#4b636c] text-[10px] font-black uppercase tracking-widest">Total Product Views</p>
                        <h4 className="text-xl font-black mt-1">{(engagement.views || 0).toLocaleString()}</h4>
                    </div>
                    <div>
                        <div className="size-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-2">
                            <DynamicLucideIcon name="favorite" fill="currentColor" className="text-rose-500" />
                        </div>
                        <p className="text-[#4b636c] text-[10px] font-black uppercase tracking-widest">Total Likes / Saves</p>
                        <h4 className="text-xl font-black mt-1">{(engagement.likes || 0).toLocaleString()}</h4>
                    </div>
                    <div>
                        <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-2">
                            <DynamicLucideIcon name="share" />
                        </div>
                        <p className="text-[#4b636c] text-[10px] font-black uppercase tracking-widest">Social Product Shares</p>
                        <h4 className="text-xl font-black mt-1">{(engagement.shares || 0).toLocaleString()}</h4>
                    </div>
                </div>
            </div>
        </div>
    );
}
