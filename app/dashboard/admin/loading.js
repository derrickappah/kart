'use client';

export default function Loading() {
    return (
        <div className="space-y-8 pb-12 animate-pulse">
            {/* KPI Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white/50 dark:bg-[#182125]/50 p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] h-32">
                        <div className="size-10 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Placeholder Skeleton */}
                <div className="lg:col-span-2 bg-white/50 dark:bg-[#182125]/50 p-8 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] min-h-[400px]">
                    <div className="flex justify-between mb-8">
                        <div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                        </div>
                    </div>
                    <div className="flex items-end justify-between gap-4 h-[250px] mt-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="w-full bg-gray-100 dark:bg-gray-800 rounded-t-lg" style={{ height: `${20 + i * 10}%` }}></div>
                        ))}
                    </div>
                </div>

                {/* Sidebar Activity Skeleton */}
                <div className="bg-white/50 dark:bg-[#182125]/50 p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-col gap-6">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex gap-4">
                            <div className="size-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
