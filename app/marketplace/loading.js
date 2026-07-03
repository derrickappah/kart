/**
 * Loading skeleton for the /marketplace page.
 * Layout must match the actual page structure exactly to minimise
 * Cumulative Layout Shift (CLS) when content arrives:
 *   - Outer: bg-white, max-w-md, pb-24, shadow-2xl (same as page.js)
 *   - Header area: px-4 py-4 (same padding as the actual <header>)
 *   - Main: px-4 pt-4 (same as actual <main>)
 */
export default function Loading() {
    return (
        <div className="bg-white dark:bg-[#242428] min-h-screen font-display">
            <div className="max-w-md mx-auto relative flex flex-col min-h-screen pb-24 shadow-2xl bg-white dark:bg-[#242428] animate-pulse">
                {/* Search bar skeleton — matches px-4 py-4 header */}
                <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="h-[52px] bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                </div>

                <div className="px-4 pt-4">
                    {/* Controls skeleton (Filter & Sort button) */}
                    <div className="mb-6">
                        <div className="h-11 w-36 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                    </div>

                    {/* 2-col product grid skeleton — 8 cards */}
                    <div className="grid grid-cols-2 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <div className="w-full aspect-[4/5] bg-gray-100 dark:bg-gray-800 rounded-xl" />
                                <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-gray-800 rounded" />
                                <div className="h-3.5 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
                                <div className="h-3 w-1/3 bg-gray-100 dark:bg-gray-800 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
