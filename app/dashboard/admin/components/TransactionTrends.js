'use client';

import { useState } from 'react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';

// ─── Shared styles ────────────────────────────────────────────────────────────
const AXIS_STYLE = {
    tick: { fill: '#4b636c', fontSize: 10, fontWeight: 700 },
    axisLine: { stroke: 'transparent' },
    tickLine: { stroke: 'transparent' },
};

const GRID_STYLE = {
    stroke: 'rgba(255,255,255,0.04)',
    strokeDasharray: '4 4',
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                backgroundColor: '#0f1c1f',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 11,
                fontWeight: 700,
                color: '#e2e8f0',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)',
            }}
        >
            <p
                style={{
                    color: '#1daddd',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 6,
                    fontSize: 9,
                }}
            >
                {label}
            </p>
            {payload.map((p) => (
                <p key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ color: p.color }}>●</span>
                    {p.name}:{' '}
                    ₵{Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
            ))}
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TransactionTrends({
    totalRevenue,
    totalVolume,
    monthlyData = [],
    weeklyData = [],
}) {
    const [period, setPeriod] = useState('monthly');
    const [chartType, setChartType] = useState('bar');

    const currentData = period === 'monthly' ? monthlyData : weeklyData;
    const hasData = totalVolume > 0;

    return (
        <div className="lg:col-span-2 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 sm:p-8 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm flex flex-col min-h-[350px] sm:min-h-[420px]">

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h4 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
                        Transaction Trends
                    </h4>
                    <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-0.5">
                        Live marketplace volume across campuses
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Chart type toggle */}
                    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
                        <button
                            onClick={() => setChartType('bar')}
                            title="Bar chart"
                            className={`size-7 rounded-lg flex items-center justify-center transition-all duration-200 ${chartType === 'bar'
                                ? 'bg-white dark:bg-[#1e292d] text-primary shadow-sm'
                                : 'text-[#4b636c] hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <DynamicLucideIcon name="bar_chart" size={14} />
                        </button>
                        <button
                            onClick={() => setChartType('area')}
                            title="Area chart"
                            className={`size-7 rounded-lg flex items-center justify-center transition-all duration-200 ${chartType === 'area'
                                ? 'bg-white dark:bg-[#1e292d] text-primary shadow-sm'
                                : 'text-[#4b636c] hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <DynamicLucideIcon name="monitoring" size={14} />
                        </button>
                    </div>

                    {/* Period toggle */}
                    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
                        {['monthly', 'weekly'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${period === p
                                    ? 'bg-white dark:bg-[#1e292d] text-primary shadow-sm'
                                    : 'text-[#4b636c] dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Summary Pills ─────────────────────────────────────────────── */}
            <div className="flex gap-4 mb-6">
                <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2">
                    <span className="size-2 rounded-full bg-primary shrink-0" />
                    <div>
                        <p className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest">Total GTV</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white">
                            ₵{totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2">
                    <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                        <p className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest">Completed Rev</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white">
                            ₵{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Chart ─────────────────────────────────────────────────────── */}
            <div className="flex-1 min-h-[220px]">
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'bar' ? (
                            <BarChart data={currentData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                                <defs>
                                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#1daddd" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#1daddd" stopOpacity={0.3} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid {...GRID_STYLE} vertical={false} />
                                <XAxis dataKey="label" {...AXIS_STYLE} />
                                <YAxis
                                    {...AXIS_STYLE}
                                    width={52}
                                    tickFormatter={(v) =>
                                        v >= 1000 ? `₵${(v / 1000).toFixed(0)}k` : `₵${v}`
                                    }
                                />
                                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(29,173,221,0.05)', radius: 6 }} />
                                <Bar
                                    dataKey="val"
                                    name="Volume"
                                    fill="url(#barGrad)"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={48}
                                    activeBar={{ fill: '#1daddd', radius: [6, 6, 0, 0] }}
                                />
                            </BarChart>
                        ) : (
                            <AreaChart data={currentData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1daddd" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#1daddd" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid {...GRID_STYLE} vertical={false} />
                                <XAxis dataKey="label" {...AXIS_STYLE} />
                                <YAxis
                                    {...AXIS_STYLE}
                                    width={52}
                                    tickFormatter={(v) =>
                                        v >= 1000 ? `₵${(v / 1000).toFixed(0)}k` : `₵${v}`
                                    }
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="val"
                                    name="Volume"
                                    stroke="#1daddd"
                                    strokeWidth={2.5}
                                    fill="url(#areaGrad)"
                                    dot={false}
                                    activeDot={{ r: 5, fill: '#1daddd', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        )}
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-[#4b636c] gap-3">
                        <DynamicLucideIcon name="bar_chart" size={40} className="opacity-20 text-primary" />
                        <p className="text-xs font-black uppercase tracking-widest opacity-40">
                            No Recent Activity
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
