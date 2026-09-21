'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toSentenceCase, formatPrice } from '../utils/formatters';
import DynamicLucideIcon from './DynamicLucideIcon';

const AUTO_PLAY_INTERVAL = 4500; // 4.5 seconds per slide

export default function PromotedBanner({ products = [] }) {
    const validProducts = (products || []).filter(p => p && p.id && (p.image_url || p.images?.[0]));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [touchStartX, setTouchStartX] = useState(null);
    const [touchStartY, setTouchStartY] = useState(null);
    const [progressKey, setProgressKey] = useState(0);

    const minSwipeDistance = 45;

    const nextSlide = useCallback(() => {
        if (validProducts.length <= 1) return;
        setCurrentIndex((prev) => (prev === validProducts.length - 1 ? 0 : prev + 1));
        setProgressKey((k) => k + 1);
    }, [validProducts.length]);

    const prevSlide = useCallback(() => {
        if (validProducts.length <= 1) return;
        setCurrentIndex((prev) => (prev === 0 ? validProducts.length - 1 : prev - 1));
        setProgressKey((k) => k + 1);
    }, [validProducts.length]);

    const goToSlide = (index) => {
        setCurrentIndex(index);
        setProgressKey((k) => k + 1);
    };

    // Autoplay ticker
    useEffect(() => {
        if (validProducts.length <= 1 || isPaused) return;

        const timer = setTimeout(() => {
            nextSlide();
        }, AUTO_PLAY_INTERVAL);

        return () => clearTimeout(timer);
    }, [currentIndex, isPaused, nextSlide, validProducts.length]);

    // Track views when active slide changes
    useEffect(() => {
        const activeProduct = validProducts[currentIndex];
        if (activeProduct && activeProduct.advertisement_id) {
            const adId = activeProduct.advertisement_id;
            const viewKey = `ad_view_${adId}`;

            if (typeof window !== 'undefined' && !window.sessionStorage.getItem(viewKey)) {
                window.sessionStorage.setItem(viewKey, 'true');
                fetch('/api/ads/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ advertisementId: adId, eventType: 'view' })
                }).catch(err => console.error('Error tracking ad view:', err));
            }
        }
    }, [currentIndex, validProducts]);

    const handleAdClick = (adId) => {
        if (!adId) return;
        const clickKey = `ad_click_${adId}`;

        if (typeof window !== 'undefined' && !window.sessionStorage.getItem(clickKey)) {
            window.sessionStorage.setItem(clickKey, 'true');
            fetch('/api/ads/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ advertisementId: adId, eventType: 'click' })
            }).catch(err => console.error('Error tracking ad click:', err));
        }
    };

    const handleTouchStart = (e) => {
        setTouchStartX(e.targetTouches[0].clientX);
        setTouchStartY(e.targetTouches[0].clientY);
    };

    const handleTouchEnd = (e) => {
        if (touchStartX === null || touchStartY === null) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = touchStartX - endX;
        const deltaY = touchStartY - endY;

        // Ensure horizontal intent over vertical scroll
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }

        setTouchStartX(null);
        setTouchStartY(null);
    };

    // Editorial Fallback when no products exist
    if (validProducts.length === 0) {
        return (
            <div className="relative w-full h-[380px] sm:h-[420px] pt-20 overflow-hidden bg-gradient-to-br from-[#0c1821] via-[#102a43] to-[#1daddd]/40 flex flex-col justify-end p-6 select-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col gap-3 max-w-sm">
                    <h1 className="text-3xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                        Buy & sell effortlessly across campus
                    </h1>
                    <p className="text-sm text-gray-200 font-medium leading-relaxed">
                        Discover textbooks, dorm essentials, electronics, and student deals nearby.
                    </p>
                    <Link
                        href="/marketplace"
                        className="mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white text-gray-900 font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-gray-100 active:scale-95 transition-all w-fit"
                    >
                        Browse Marketplace
                        <DynamicLucideIcon name="arrow_forward" size={15} />
                    </Link>
                </div>
            </div>
        );
    }

    const currentProduct = validProducts[currentIndex];

    return (
        <section
            role="region"
            aria-roledescription="carousel"
            aria-label="Featured Campus Listings"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative w-full h-[420px] sm:h-[460px] overflow-hidden bg-gray-100 dark:bg-gray-900 select-none group"
            aria-live={isPaused ? 'off' : 'polite'}
        >
            {/* Background Slides */}
            {validProducts.map((product, idx) => {
                const isActive = idx === currentIndex;
                const isAdjacent = Math.abs(idx - currentIndex) === 1 || (currentIndex === 0 && idx === validProducts.length - 1) || (currentIndex === validProducts.length - 1 && idx === 0);

                if (!isActive && !isAdjacent) return null;

                const displayImage = product.images?.[0] || product.image_url || '/placeholder.png';

                return (
                    <div
                        key={product.id}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`${idx + 1} of ${validProducts.length}`}
                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                            isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                        }`}
                    >
                        <Image
                            src={displayImage}
                            alt=""
                            fill
                            priority={idx === 0}
                            sizes="(max-width: 768px) 100vw, 500px"
                            className={`object-cover transition-transform duration-[5000ms] ease-out ${
                                isActive ? 'scale-105' : 'scale-100'
                            }`}
                        />
                    </div>
                );
            })}

            {/* Soft edge scrims: subtle top gradient for navbar contrast, gentle bottom gradient for text legibility */}
            <div className="absolute top-0 inset-x-0 z-10 pointer-events-none bg-gradient-to-b from-black/40 to-transparent h-20" />
            <div className="absolute bottom-0 inset-x-0 z-10 pointer-events-none bg-gradient-to-t from-black/75 via-black/30 to-transparent h-36" />

            {/* Desktop Navigation Chevrons */}
            {validProducts.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            prevSlide();
                        }}
                        aria-label="Previous slide"
                        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 size-9 items-center justify-center rounded-full bg-black/45 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
                    >
                        <DynamicLucideIcon name="chevron_left" size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            nextSlide();
                        }}
                        aria-label="Next slide"
                        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 size-9 items-center justify-center rounded-full bg-black/45 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
                    >
                        <DynamicLucideIcon name="chevron_right" size={20} />
                    </button>
                </>
            )}

            {/* Main Interactive Product Link Container */}
            <Link
                href={`/marketplace/${currentProduct.id}`}
                onClick={() => handleAdClick(currentProduct.advertisement_id)}
                className="absolute inset-0 z-20 flex flex-col justify-end p-5 pb-8 pt-24 text-left group/card"
            >
                {/* Main Headline / Title */}
                <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug line-clamp-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover/card:text-white/95 transition-colors">
                    {toSentenceCase(currentProduct.title)}
                </h2>

                {/* Price & Call To Action */}
                <div className="mt-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black text-[#FFD700] drop-shadow-sm">₵</span>
                        <span className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                            {formatPrice(currentProduct.price)}
                        </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-gray-950 hover:bg-gray-100 group-hover/card:bg-primary group-hover/card:text-white active:scale-95 text-xs font-black tracking-wider uppercase shadow-xl transition-all">
                        <span>View Deal</span>
                        <DynamicLucideIcon
                            name="arrow_forward"
                            size={13}
                            className="animate-arrow-nudge"
                        />
                    </div>
                </div>
            </Link>

            {/* Minimalist Centered Pill Indicators */}
            {validProducts.length > 1 && (
                <div
                    className="absolute bottom-2.5 left-0 right-0 z-30 flex justify-center items-center gap-1.5"
                    role="group"
                    aria-label="Carousel slide indicators"
                >
                    {validProducts.map((_, idx) => {
                        const isCurrent = idx === currentIndex;
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    goToSlide(idx);
                                }}
                                aria-label={`Go to slide ${idx + 1}`}
                                aria-current={isCurrent ? 'true' : 'false'}
                                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                    isCurrent
                                        ? 'w-6 bg-white shadow-sm'
                                        : 'w-1.5 bg-white/40 hover:bg-white/70'
                                }`}
                            />
                        );
                    })}
                </div>
            )}
        </section>
    );
}
