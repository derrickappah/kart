'use client';

import { useState } from 'react';

export default function TransactionTrends({ totalRevenue, totalVolume, monthlyData = [], weeklyData = [] }) {
    const [period, setPeriod] = useState('monthly');

    const currentData = period === 'monthly' ? monthlyData : weeklyData;
    const maxVal = Math.max(...currentData.map(d => d.val), 1);

    return (
        <div className="lg:col-span-2 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-8 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h4 className="text-xl font-bold">Transaction Trends</h4>
                    <p className="text-sm text-[#4b636c]">Live marketplace volume from across campuses</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPeriod('monthly')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${period === 'monthly'
                            ? 'bg-primary/20 text-primary shadow-sm'
                            : 'text-[#4b636c] hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setPeriod('weekly')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${period === 'weekly'
                            ? 'bg-primary/20 text-primary shadow-sm'
                            : 'text-[#4b636c] hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        Weekly
                    </button>
                </div>
            </div>

            <div className="relative w-full h-[280px] flex items-end justify-between gap-4">
                {totalVolume > 0 ? currentData.map((data) => (
                    <div
                        key={data.label}
                        className="w-full bg-[#1daddd]/10 rounded-t-lg relative group transition-all duration-700 ease-in-out"
                        style={{ height: `${(data.val / maxVal) * 100}%` }}
                    >
                        <div className="absolute bottom-0 w-full bg-[#1daddd]/40 rounded-t-lg transition-all group-hover:bg-[#1daddd]/60 h-full"></div>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#111618] text-white text-[10px] px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-10 shadow-xl border border-white/10 backdrop-blur-md">
                            {data.label}: ₵{data.val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                )) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[#4b636c]">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-20">bar_chart</span>
                        <p className="text-xs font-black uppercase tracking-widest opacity-40">No Recent Activity</p>
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-4 text-[#4b636c] text-xs font-bold uppercase tracking-widest border-t border-gray-100 dark:border-gray-800/50 pt-4">
                {currentData.map(d => (
                    <span key={d.label} className="flex-1 text-center truncate px-1">
                        {d.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
