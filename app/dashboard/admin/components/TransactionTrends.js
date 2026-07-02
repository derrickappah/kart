'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState } from 'react';

export default function TransactionTrends({ totalRevenue, totalVolume, monthlyData = [], weeklyData = [] }) {
    const [period, setPeriod] = useState('monthly');

    const currentData = period === 'monthly' ? monthlyData : weeklyData;
    const maxVal = Math.max(...currentData.map(d => d.val), 1);

    return (
        <div className="lg:col-span-2 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 sm:p-8 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] min-h-[350px] sm:min-h-[400px] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h4 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Transaction Trends</h4>
                    <p className="text-xs text-[#4b636c] dark:text-gray-400 mt-1">Live marketplace volume across campuses</p>
                </div>
                <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
                    <button
                        onClick={() => setPeriod('monthly')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${period === 'monthly'
                            ? 'bg-white dark:bg-[#1e292d] text-primary shadow-sm'
                            : 'text-[#4b636c] dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setPeriod('weekly')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${period === 'weekly'
                            ? 'bg-white dark:bg-[#1e292d] text-primary shadow-sm'
                            : 'text-[#4b636c] dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        Weekly
                    </button>
                </div>
            </div>

            <div className="relative w-full h-[220px] sm:h-[260px] flex items-end justify-between gap-3 sm:gap-5 px-2">
                {totalVolume > 0 ? currentData.map((data) => (
                    <div
                        key={data.label}
                        tabIndex="0"
                        role="img"
                        aria-label={`${data.label}: ₵${data.val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        className="w-full bg-[#1daddd]/5 dark:bg-[#1daddd]/10 rounded-t-xl relative group transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#182125] cursor-pointer hover:scale-x-[1.03]"
                        style={{ height: `${Math.max((data.val / maxVal) * 100, 6)}%` }}
                    >
                        <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#1daddd]/30 to-[#1daddd]/80 dark:from-[#1daddd]/20 dark:to-[#1daddd]/60 rounded-t-xl transition-all duration-300 group-hover:from-[#1daddd]/50 group-hover:to-[#1daddd] group-focus:from-[#1daddd]/50 group-focus:to-[#1daddd] h-full shadow-inner"></div>
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] font-black px-3 py-1.5 rounded-lg hidden group-hover:flex group-focus-within:flex items-center gap-1.5 whitespace-nowrap z-25 shadow-2xl border border-white/10 backdrop-blur-md transition-all">
                            <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
                            {data.label}: ₵{data.val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                )) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[#4b636c]">
                        <DynamicLucideIcon name="bar_chart" className="text-4xl mb-2 opacity-20 text-primary" />
                        <p className="text-xs font-black uppercase tracking-widest opacity-40">No Recent Activity</p>
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-6 text-[#4b636c] dark:text-gray-400 text-[10px] font-black uppercase tracking-widest border-t border-gray-100 dark:border-gray-800/20 pt-4">
                {currentData.map(d => (
                    <span key={d.label} className="flex-1 text-center truncate px-1">
                        {d.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
