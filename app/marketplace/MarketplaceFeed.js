'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import WishlistButton from '@/components/WishlistButton';
import AdTracker from '@/components/AdTracker';
import { toSentenceCase, formatPrice } from '@/utils/formatters';
import { fetchMarketplaceProducts } from './actions';

export default function MarketplaceFeed({
    initialProducts = [],
    initialHasMore = false,
    initialWishlistIds = [],
    hasDbError = false,
    filterParams = {},
    searchQuery = '',
    hasActiveFilters = false,
    clearFiltersHref = '/marketplace'
}) {
    const [products, setProducts] = useState(initialProducts);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [page, setPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [wishlistIds, setWishlistIds] = useState(initialWishlistIds);

    const observerRef = useRef(null);
    const isFetchingRef = useRef(false);

    // Reset feed whenever the initial props change (e.g. navigation, filter/search updates)
    useEffect(() => {
        setProducts(initialProducts);
        setHasMore(initialHasMore);
        setPage(1);
        setIsLoadingMore(false);
        setLoadError(null);
        setWishlistIds(initialWishlistIds);
        isFetchingRef.current = false;
    }, [initialProducts, initialHasMore, initialWishlistIds, filterParams]);

    const loadMoreProducts = useCallback(async () => {
        if (!hasMore || isLoadingMore || isFetchingRef.current) return;

        isFetchingRef.current = true;
        setIsLoadingMore(true);
        setLoadError(null);

        const nextPage = page + 1;

        try {
            const res = await fetchMarketplaceProducts({
                page: nextPage,
                limit: 12,
                ...filterParams
            });

            if (res.error) {
                setLoadError(res.error);
                return;
            }

            setProducts((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));
                const newItems = res.products.filter((p) => !existingIds.has(p.id));
                return [...prev, ...newItems];
            });

            if (res.wishlistIds && res.wishlistIds.length > 0) {
                setWishlistIds((prev) => Array.from(new Set([...prev, ...res.wishlistIds])));
            }

            setPage(nextPage);
            setHasMore(res.hasMore);
        } catch (err) {
            console.error('Failed to load more products:', err);
            setLoadError('Failed to load more listings. Please try again.');
        } finally {
            setIsLoadingMore(false);
            isFetchingRef.current = false;
        }
    }, [hasMore, isLoadingMore, page, filterParams]);

    // IntersectionObserver to trigger infinite scroll
    useEffect(() => {
        if (!hasMore || isLoadingMore || loadError) return;

        const sentinel = observerRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    loadMoreProducts();
                }
            },
            {
                root: null,
                rootMargin: '300px', // Pre-fetch before user reaches the very bottom
                threshold: 0.05
            }
        );

        observer.observe(sentinel);

        return () => {
            observer.disconnect();
        };
    }, [hasMore, isLoadingMore, loadError, loadMoreProducts]);

    if (hasDbError) {
        return (
            <div className="col-span-2 py-16 px-6 text-center flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-3xl text-red-500">
                <DynamicLucideIcon name="report" className="text-4xl mb-3 opacity-80" aria-hidden="true" />
                <p className="font-bold text-red-900 dark:text-red-300">
                    Failed to retrieve listings
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-xs mx-auto">
                    There was an issue communicating with the database. Please try again.
                </p>
                <Link
                    href="/marketplace"
                    className="mt-4 px-5 py-2.5 bg-red-600 hover:bg-red-750 text-white rounded-2xl text-xs font-bold shadow-md shadow-red-500/20 transition-all active:scale-[0.98]"
                >
                    Retry Connection
                </Link>
            </div>
        );
    }

    if (!products || products.length === 0) {
        return (
            <div className="col-span-2 py-20 text-center flex flex-col items-center justify-center text-gray-500">
                <DynamicLucideIcon name="search_off" className="text-6xl mb-4 opacity-20" aria-hidden="true" />
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                    {searchQuery
                        ? `No results for "${searchQuery}"`
                        : hasActiveFilters
                            ? 'No items match your filters'
                            : 'No items available right now'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                    {searchQuery || hasActiveFilters
                        ? 'Try adjusting your search or filters'
                        : 'Check back soon — listings are added daily'}
                </p>
                {(searchQuery || hasActiveFilters) && (
                    <Link
                        href={clearFiltersHref}
                        className="mt-4 text-primary font-bold text-sm hover:underline"
                    >
                        Clear all filters
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="grid grid-cols-2 gap-4 pb-2">
                {products.map((p) => {
                    const cardContent = (
                        <Link
                            href={`/marketplace/${p.id}`}
                            className="group flex flex-col gap-2 relative h-full w-full"
                            aria-label={`${toSentenceCase(p.title)} — ₵ ${formatPrice(p.price)}`}
                        >
                            <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 dark:bg-[#2f2f35]">
                                <Image
                                    src={p.images?.[0] || p.image_url || '/placeholder.png'}
                                    alt={toSentenceCase(p.title)}
                                    fill
                                    sizes="(max-width: 768px) 50vw, 200px"
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <WishlistButton
                                    productId={p.id}
                                    initialIsSaved={wishlistIds.includes(p.id)}
                                />
                                {p.condition && (
                                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider">
                                        {p.condition}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-0.5 px-1">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                                    {toSentenceCase(p.title)}
                                </h3>
                                <p className="text-primary text-base font-extrabold">
                                    ₵ {formatPrice(p.price)}
                                </p>
                                <div className="flex items-center gap-1 text-gray-400">
                                    <DynamicLucideIcon name="location_on" size={14} className="text-[14px]" aria-hidden="true" />
                                    <p className="text-[10px] font-bold truncate uppercase">
                                        {p.campus || 'On Campus'}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    );

                    return p.advertisement_id ? (
                        <AdTracker key={p.id} advertisementId={p.advertisement_id}>
                            {cardContent}
                        </AdTracker>
                    ) : (
                        <div key={p.id} className="contents">
                            {cardContent}
                        </div>
                    );
                })}

                {/* Skeletons while loading more items */}
                {isLoadingMore && (
                    <>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={`skeleton-${i}`} className="flex flex-col gap-2 animate-pulse">
                                <div className="w-full aspect-[4/5] bg-gray-100 dark:bg-[#2f2f35] rounded-xl" />
                                <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-[#2f2f35] rounded mt-1" />
                                <div className="h-4 w-1/2 bg-gray-100 dark:bg-[#2f2f35] rounded" />
                                <div className="h-3 w-1/3 bg-gray-100 dark:bg-[#2f2f35] rounded" />
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Error state with retry option */}
            {loadError && (
                <div className="py-4 text-center flex flex-col items-center justify-center gap-2">
                    <p className="text-xs text-red-500 font-semibold">{loadError}</p>
                    <button
                        type="button"
                        onClick={loadMoreProducts}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* End of results indicator */}
            {!hasMore && products.length > 0 && !isLoadingMore && (
                <div className="py-8 text-center flex flex-col items-center justify-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-100/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 text-xs font-medium">
                        <DynamicLucideIcon name="check_circle" size={14} className="text-gray-400" />
                        <span>You&apos;ve viewed all matching items</span>
                    </div>
                </div>
            )}

            {/* Sentinel element for intersection observer */}
            {hasMore && !loadError && (
                <div ref={observerRef} className="h-10 w-full pointer-events-none" aria-hidden="true" />
            )}
        </div>
    );
}
