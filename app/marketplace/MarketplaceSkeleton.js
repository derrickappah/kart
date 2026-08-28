export function MarketplaceSkeleton({ count = 8 }) {
    return (
        <div className="grid grid-cols-2 gap-4 pb-2" aria-busy="true" aria-label="Loading marketplace listings">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                    <div className="w-full aspect-[4/5] bg-gray-200 dark:bg-[#2f2f35] rounded-xl shimmer" />
                    <div className="h-3.5 w-3/4 bg-gray-200 dark:bg-[#2f2f35] rounded shimmer" />
                    <div className="h-4 w-1/2 bg-gray-200 dark:bg-[#2f2f35] rounded shimmer" />
                    <div className="h-3 w-1/3 bg-gray-200 dark:bg-[#2f2f35] rounded shimmer" />
                </div>
            ))}
        </div>
    );
}

export default MarketplaceSkeleton;
