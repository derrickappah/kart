import MarketplaceSkeleton from './MarketplaceSkeleton';

/**
 * Loading skeleton for the /marketplace page.
 * Layout matches the actual page structure exactly to minimise CLS.
 */
export default function Loading() {
    return (
        <div className="bg-white dark:bg-[#242428] min-h-screen font-display antialiased">
            <div className="max-w-md mx-auto relative flex flex-col min-h-screen pb-4 md:pb-8 shadow-2xl bg-white dark:bg-[#242428]">
                <main className="px-4 pt-3 flex-1">
                    <MarketplaceSkeleton count={8} />
                </main>
            </div>
        </div>
    );
}
