'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { createClient } from '@/utils/supabase/client';
import { toSentenceCase, formatPrice } from '@/utils/formatters';

const PAGE_SIZE = 8;

export default function SimilarItemsSlider({ category, currentProductId }) {
    const [products, setProducts] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const containerRef = useRef(null);
    const isFetchingRef = useRef(false);

    const updateScrollButtons = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollLeft(scrollLeft > 10);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }, []);

    // Initial fetch for page 1
    useEffect(() => {
        let active = true;
        const supabase = createClient();

        async function fetchInitial() {
            if (!category) {
                if (active) setIsLoadingInitial(false);
                return;
            }

            setIsLoadingInitial(true);
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('id, title, price, images, image_url, condition, campus')
                    .eq('category', category)
                    .eq('status', 'Active')
                    .neq('id', currentProductId)
                    .order('created_at', { ascending: false })
                    .range(0, PAGE_SIZE); // Fetch PAGE_SIZE + 1 to detect hasMore

                if (error) {
                    console.error('Error fetching similar products:', error);
                    if (active) {
                        setProducts([]);
                        setHasMore(false);
                    }
                    return;
                }

                if (active) {
                    const raw = data || [];
                    const more = raw.length > PAGE_SIZE;
                    const items = more ? raw.slice(0, PAGE_SIZE) : raw;
                    setProducts(items);
                    setHasMore(more);
                    setPage(1);
                }
            } catch (err) {
                console.error('Unexpected error fetching similar products:', err);
            } finally {
                if (active) setIsLoadingInitial(false);
            }
        }

        fetchInitial();

        return () => {
            active = false;
        };
    }, [category, currentProductId]);

    // Load next page of similar items
    const loadMore = useCallback(async () => {
        if (!hasMore || isLoadingMore || isFetchingRef.current) return;

        isFetchingRef.current = true;
        setIsLoadingMore(true);

        const nextPage = page + 1;
        const from = (nextPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE; // fetch limit + 1 to check hasMore

        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('products')
                .select('id, title, price, images, image_url, condition, campus')
                .eq('category', category)
                .eq('status', 'Active')
                .neq('id', currentProductId)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                console.error('Error loading more similar products:', error);
                return;
            }

            const raw = data || [];
            const more = raw.length > PAGE_SIZE;
            const items = more ? raw.slice(0, PAGE_SIZE) : raw;

            setProducts((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));
                const uniqueNew = items.filter((p) => !existingIds.has(p.id));
                return [...prev, ...uniqueNew];
            });

            setPage(nextPage);
            setHasMore(more);
        } catch (err) {
            console.error('Failed to load more similar items:', err);
        } finally {
            setIsLoadingMore(false);
            isFetchingRef.current = false;
        }
    }, [category, currentProductId, hasMore, isLoadingMore, page]);

    // Track horizontal scroll position to trigger infinite load & update arrow states
    const handleScroll = () => {
        const el = containerRef.current;
        if (!el) return;

        updateScrollButtons();

        const { scrollLeft, scrollWidth, clientWidth } = el;
        // Pre-fetch when user reaches within 250px of the right edge
        if (scrollLeft + clientWidth >= scrollWidth - 250) {
            loadMore();
        }
    };

    useEffect(() => {
        updateScrollButtons();
    }, [products, updateScrollButtons]);

    const scrollByAmount = (delta) => {
        if (!containerRef.current) return;
        containerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    };

    if (!isLoadingInitial && products.length === 0) {
        return null;
    }

    return (
        <section className="mt-8 md:mt-16 mb-2 md:mb-8 px-4 md:px-0" aria-label="Similar items">
            {/* Header with Title, Controls, and See All */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-extrabold tracking-tight">Similar Items</h2>
                    {category && (
                        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {category}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Desktop Navigation Arrows */}
                    <div className="hidden md:flex items-center gap-1.5 mr-2">
                        <button
                            type="button"
                            onClick={() => scrollByAmount(-320)}
                            disabled={!canScrollLeft}
                            aria-label="Scroll similar items left"
                            className={`p-1.5 rounded-full border transition-all ${
                                canScrollLeft
                                    ? 'bg-white dark:bg-[#2f2f35] hover:bg-gray-100 dark:hover:bg-[#383840] text-gray-800 dark:text-white border-gray-200 dark:border-gray-700 shadow-sm active:scale-95'
                                    : 'bg-gray-50 dark:bg-gray-800/40 text-gray-300 dark:text-gray-600 border-gray-100 dark:border-gray-800 cursor-not-allowed opacity-50'
                            }`}
                        >
                            <DynamicLucideIcon name="chevron_left" size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollByAmount(320)}
                            disabled={!canScrollRight && !hasMore}
                            aria-label="Scroll similar items right"
                            className={`p-1.5 rounded-full border transition-all ${
                                canScrollRight || hasMore
                                    ? 'bg-white dark:bg-[#2f2f35] hover:bg-gray-100 dark:hover:bg-[#383840] text-gray-800 dark:text-white border-gray-200 dark:border-gray-700 shadow-sm active:scale-95'
                                    : 'bg-gray-50 dark:bg-gray-800/40 text-gray-300 dark:text-gray-600 border-gray-100 dark:border-gray-800 cursor-not-allowed opacity-50'
                            }`}
                        >
                            <DynamicLucideIcon name="chevron_right" size={18} />
                        </button>
                    </div>

                    <Link
                        href={`/marketplace?category=${encodeURIComponent(category || '')}`}
                        className="text-primary text-sm font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-2 py-1"
                    >
                        See All
                    </Link>
                </div>
            </div>

            {/* Horizontal Scroll Feed */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex w-full overflow-x-auto pb-4 gap-3.5 sm:gap-4 no-scrollbar snap-x snap-mandatory scroll-smooth"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {isLoadingInitial ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={`initial-skeleton-${i}`}
                            className="min-w-[155px] w-[155px] sm:min-w-[180px] sm:w-[180px] md:min-w-[200px] md:w-[200px] shrink-0 flex flex-col gap-2 animate-pulse"
                        >
                            <div className="w-full aspect-[4/5] bg-gray-100 dark:bg-[#2f2f35] rounded-xl" />
                            <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-[#2f2f35] rounded mt-1" />
                            <div className="h-4 w-1/2 bg-gray-100 dark:bg-[#2f2f35] rounded" />
                        </div>
                    ))
                ) : (
                    <>
                        {products.map((p) => (
                            <Link
                                href={`/marketplace/${p.id}`}
                                key={p.id}
                                className="min-w-[155px] w-[155px] sm:min-w-[180px] sm:w-[180px] md:min-w-[200px] md:w-[200px] group flex flex-col gap-2 relative shrink-0 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                                aria-label={`${toSentenceCase(p.title)} — ₵ ${formatPrice(p.price)}`}
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}
                            >
                                <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 dark:bg-[#2f2f35] shadow-sm border border-gray-100 dark:border-gray-800">
                                    <Image
                                        src={p.images?.[0] || p.image_url || '/placeholder.png'}
                                        alt={toSentenceCase(p.title)}
                                        fill
                                        sizes="(max-width: 640px) 155px, (max-width: 768px) 180px, 200px"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    {p.condition && (
                                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[9px] font-bold text-white uppercase tracking-wider">
                                            {p.condition}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-0.5 px-1">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 leading-snug">
                                        {toSentenceCase(p.title)}
                                    </h3>
                                    <p className="text-primary text-base font-extrabold">
                                        ₵ {formatPrice(p.price)}
                                    </p>
                                    {p.campus && (
                                        <div className="flex items-center gap-1 text-gray-400">
                                            <DynamicLucideIcon name="location_on" size={13} className="text-[13px] shrink-0" aria-hidden="true" />
                                            <p className="text-[10px] font-bold truncate uppercase">{p.campus}</p>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}

                        {/* Skeleton items while fetching next horizontal batch */}
                        {isLoadingMore && (
                            <>
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <div
                                        key={`more-skeleton-${i}`}
                                        className="min-w-[155px] w-[155px] sm:min-w-[180px] sm:w-[180px] md:min-w-[200px] md:w-[200px] shrink-0 flex flex-col gap-2 animate-pulse"
                                    >
                                        <div className="w-full aspect-[4/5] bg-gray-100 dark:bg-[#2f2f35] rounded-xl" />
                                        <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-[#2f2f35] rounded mt-1" />
                                        <div className="h-4 w-1/2 bg-gray-100 dark:bg-[#2f2f35] rounded" />
                                    </div>
                                ))}
                            </>
                        )}

                        {/* View all in category end card */}
                        {!hasMore && products.length >= 4 && (
                            <Link
                                href={`/marketplace?category=${encodeURIComponent(category || '')}`}
                                className="min-w-[130px] w-[130px] sm:min-w-[150px] sm:w-[150px] shrink-0 snap-start flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 dark:bg-[#2a2a30] hover:bg-gray-100 dark:hover:bg-[#33333a] border border-dashed border-gray-300 dark:border-gray-700 text-center p-4 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <DynamicLucideIcon name="arrow_forward" size={20} />
                                </div>
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                    View All
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                    in {category}
                                </span>
                            </Link>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
