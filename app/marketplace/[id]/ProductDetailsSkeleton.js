export function ProductDetailsSkeleton() {
    return (
        <div className="bg-[#fafafa] dark:bg-[#22262a] text-[#0e181b] dark:text-white antialiased min-h-screen font-display product-details-page" aria-busy="true" aria-label="Loading product details">
            {/* Desktop Top Bar */}
            <div className="max-w-6xl mx-auto px-4 pt-4 hidden md:flex items-center justify-between">
                <div className="h-6 w-32 bg-gray-100 dark:bg-[#2f2f35] rounded-lg shimmer" />
                <div className="flex items-center gap-2">
                    <div className="size-10 rounded-full bg-gray-100 dark:bg-[#2f2f35] shimmer" />
                    <div className="size-10 rounded-full bg-gray-100 dark:bg-[#2f2f35] shimmer" />
                </div>
            </div>

            {/* Mobile Top Floating Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 flex md:hidden items-center justify-between p-4 pointer-events-none">
                <div className="size-11 rounded-full bg-black/20 backdrop-blur-md shimmer" />
                <div className="flex gap-2">
                    <div className="size-11 rounded-full bg-black/20 backdrop-blur-md shimmer" />
                    <div className="size-11 rounded-full bg-black/20 backdrop-blur-md shimmer" />
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-0 md:px-4 py-0 md:py-6 pb-28 md:pb-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-8 items-start">
                    {/* Left Column: Hero Image & Thumbnails */}
                    <div className="md:col-span-7 flex flex-col gap-4 sticky top-0 md:static z-0">
                        <div className="relative w-full aspect-[4/5] md:aspect-[4/3] rounded-none md:rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#2f2f35] shadow-sm shimmer" />
                        <div className="hidden md:flex gap-3">
                            {Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="size-20 rounded-xl bg-gray-100 dark:bg-[#2f2f35] shimmer" />
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Title, Price, CTAs, Seller & Details */}
                    <div className="md:col-span-5 px-4 md:px-0 pt-6 md:pt-0 -mt-6 md:mt-0 relative z-10 bg-[#fafafa] dark:bg-[#22262a] rounded-t-3xl md:rounded-none">
                        <div className="flex flex-col gap-5">
                            {/* Badges & Time */}
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-20 bg-gray-100 dark:bg-[#2f2f35] rounded-md shimmer" />
                                <div className="h-4 w-16 bg-gray-100 dark:bg-[#2f2f35] rounded ml-auto shimmer" />
                            </div>

                            {/* Title & Price */}
                            <div className="flex items-start justify-between gap-4 mt-1">
                                <div className="flex-1 flex flex-col gap-2">
                                    <div className="h-7 w-3/4 bg-gray-100 dark:bg-[#2f2f35] rounded-lg shimmer" />
                                    <div className="h-7 w-1/2 bg-gray-100 dark:bg-[#2f2f35] rounded-lg shimmer" />
                                </div>
                                <div className="h-8 w-24 bg-gray-100 dark:bg-[#2f2f35] rounded-lg shrink-0 shimmer" />
                            </div>

                            {/* Desktop Action CTA Buttons */}
                            <div className="hidden md:flex gap-3 my-1">
                                <div className="flex-1 h-14 rounded-2xl bg-gray-100 dark:bg-[#2f2f35] shimmer" />
                                <div className="flex-1 h-14 rounded-2xl bg-gray-100 dark:bg-[#2f2f35] shimmer" />
                            </div>

                            {/* Seller Info Card */}
                            <div className="p-4 bg-white dark:bg-[#2c3136] rounded-2xl border border-black/5 dark:border-white/5 shadow-sm flex items-center gap-4">
                                <div className="size-12 rounded-full bg-gray-100 dark:bg-[#2f2f35] shrink-0 shimmer" />
                                <div className="flex-1 flex flex-col gap-2">
                                    <div className="h-4 w-32 bg-gray-100 dark:bg-[#2f2f35] rounded shimmer" />
                                    <div className="h-3.5 w-24 bg-gray-100 dark:bg-[#2f2f35] rounded shimmer" />
                                </div>
                            </div>

                            {/* Description Skeleton */}
                            <div className="flex flex-col gap-2.5">
                                <div className="h-5 w-28 bg-gray-100 dark:bg-[#2f2f35] rounded shimmer" />
                                <div className="h-4 w-32 bg-gray-100 dark:bg-[#2f2f35] rounded shimmer" />
                                <div className="h-4 w-full bg-gray-100 dark:bg-[#2f2f35] rounded shimmer" />
                                <div className="h-4 w-5/6 bg-gray-100 dark:bg-[#2f2f35] rounded shimmer" />
                                <div className="h-4 w-2/3 bg-gray-100 dark:bg-[#2f2f35] rounded shimmer" />
                            </div>

                            {/* Pickup Location Skeleton */}
                            <div className="flex flex-col gap-2">
                                <div className="h-5 w-32 bg-gray-100 dark:bg-[#2f2f35] rounded shimmer" />
                                <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10 flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-gray-100 dark:bg-[#2f2f35] shrink-0 shimmer" />
                                    <div className="flex-1 flex flex-col gap-1.5">
                                        <div className="h-4 w-28 bg-gray-100 dark:bg-[#2f2f35] rounded shimmer" />
                                        <div className="h-3 w-48 bg-gray-100 dark:bg-[#2f2f35] rounded shimmer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Similar Items Section */}
                <div className="mt-12 px-4 md:px-0">
                    <div className="h-6 w-36 bg-gray-100 dark:bg-[#2f2f35] rounded shimmer mb-4" />
                    <div className="grid grid-rows-2 grid-flow-col auto-cols-[145px] sm:auto-cols-[165px] md:auto-cols-[185px] gap-3 sm:gap-3.5 overflow-hidden pb-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-1.5">
                                <div className="w-full aspect-[4/5] bg-gray-100 dark:bg-[#2f2f35] rounded-xl shimmer" />
                                <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-[#2f2f35] rounded mt-0.5 shimmer" />
                                <div className="h-4 w-1/2 bg-gray-100 dark:bg-[#2f2f35] rounded shimmer" />
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Mobile Sticky Bottom Action Bar Skeleton */}
            <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-[#22262a]/95 backdrop-blur-md border-t border-black/5 dark:border-white/10 rounded-t-3xl p-4 shadow-lg pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                <div className="flex gap-3">
                    <div className="flex-1 h-12 rounded-2xl bg-gray-100 dark:bg-[#2f2f35] shimmer" />
                    <div className="flex-1 h-12 rounded-2xl bg-gray-100 dark:bg-[#2f2f35] shimmer" />
                </div>
            </div>
        </div>
    );
}

export default ProductDetailsSkeleton;
