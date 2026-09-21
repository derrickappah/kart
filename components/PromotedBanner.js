'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toSentenceCase, formatPrice } from '../utils/formatters';
import DynamicLucideIcon from './DynamicLucideIcon';

export default function PromotedBanner({ products = [] }) {
    const validProducts = (products || []).filter(p => p && p.id && (p.image_url || p.images?.[0]));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev === validProducts.length - 1 ? 0 : prev + 1));
    }, [validProducts.length]);

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev === 0 ? validProducts.length - 1 : prev - 1));
    }, [validProducts.length]);

    useEffect(() => {
        if (!validProducts || validProducts.length <= 1 || isHovered) return;

        const interval = setInterval(() => {
            nextSlide();
        }, 4000); // 4 seconds

        return () => clearInterval(interval);
    }, [nextSlide, validProducts, isHovered]);

    // Track views when active slide changes (with session cache to prevent rapid API inflation)
    useEffect(() => {
        if (validProducts && validProducts[currentIndex] && validProducts[currentIndex].advertisement_id) {
            const adId = validProducts[currentIndex].advertisement_id;
            const viewKey = `ad_view_${adId}`;
            
            // Check session cache first
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
        
        // Check session cache first
        if (typeof window !== 'undefined' && !window.sessionStorage.getItem(clickKey)) {
            window.sessionStorage.setItem(clickKey, 'true');
            fetch('/api/ads/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ advertisementId: adId, eventType: 'click' })
            }).catch(err => console.error('Error tracking ad click:', err));
        }
    };

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            nextSlide();
        } else if (isRightSwipe) {
            prevSlide();
        }
    };

    if (!validProducts || validProducts.length === 0) return null;

    return (
        <div
            role="region"
            aria-roledescription="carousel"
            aria-label="Promoted Listings"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="relative w-full aspect-[16/9] overflow-hidden group"
            aria-live={isHovered ? 'off' : 'polite'}
        >
            {validProducts.map((p, idx) => {
                // Only render the visible slide and immediate neighbors to avoid loading all images
                if (Math.abs(idx - currentIndex) > 1) return null;
                return (
                    <div
                        key={p.id}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`${idx + 1} of ${validProducts.length}`}
                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                    >
                        <Link href={`/marketplace/${p.id}`} onClick={() => handleAdClick(p.advertisement_id)}>
                            <Image
                                src={p.images?.[0] || p.image_url || '/placeholder.png'}
                                alt=""
                                fill
                                sizes="(max-width: 768px) 100vw, 448px"
                                className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                                priority={idx === 0}
                            />

                            {/* Multi-layer gradient for depth */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent"></div>

                            {/* Content overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-5 pb-10 flex flex-col gap-2.5">
                                {/* Price tag */}
                                <span className="self-start text-sm font-black text-white bg-primary/90 backdrop-blur-sm px-3 py-1 rounded-full">
                                    ₵{formatPrice(p.price)}
                                </span>

                                {/* Title */}
                                <h2 className="text-white text-xl font-extrabold leading-tight line-clamp-2 drop-shadow-lg">
                                    {toSentenceCase(p.title)}
                                </h2>

                                {/* CTA */}
                                <span className="self-start flex items-center gap-1.5 text-white/90 text-xs font-bold uppercase tracking-wider">
                                    Shop Now
                                    <DynamicLucideIcon name="arrow_forward" size={14} className="text-[14px]" aria-hidden="true" />
                                </span>
                            </div>
                        </Link>
                    </div>
                );
            })}

            {/* Progress-bar style indicators */}
            {validProducts.length > 1 && (
                <div className="absolute bottom-3 left-5 right-5 flex gap-1.5 z-20" role="group" aria-label="Slide indicators">
                    {validProducts.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                            aria-current={idx === currentIndex ? 'true' : 'false'}
                            className={`h-[3px] flex-1 rounded-full transition-all duration-500 ${idx === currentIndex ? 'bg-white' : 'bg-white/30'
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
