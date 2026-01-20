'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function PromotedBanner({ products }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev === products.length - 1 ? 0 : prev + 1));
    }, [products.length]);

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev === 0 ? products.length - 1 : prev - 1));
    }, [products.length]);

    useEffect(() => {
        if (!products || products.length <= 1 || isHovered) return;

        const interval = setInterval(() => {
            nextSlide();
        }, 4000); // 4 seconds

        return () => clearInterval(interval);
    }, [nextSlide, products, isHovered]);

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

    if (!products || products.length === 0) return null;

    return (
        <div className="px-5 pt-4 pb-2">
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden shadow-lg group"
            >
                {products.map((p, idx) => (
                    <div
                        key={p.id}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                    >
                        <Link href={`/marketplace/${p.id}`}>
                            <img
                                src={p.images?.[0] || p.image_url}
                                alt={p.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                            <div className="absolute top-3 left-3 flex items-center justify-center size-7 bg-[#FFD700] rounded-full text-black shadow-lg">
                                <span className="material-symbols-outlined text-[18px] fill-current">stars</span>
                            </div>
                            <div className="absolute bottom-4 left-4 right-4">
                                <h2 className="text-white text-lg font-extrabold leading-tight line-clamp-1 mb-1 drop-shadow-md">
                                    {p.title}
                                </h2>
                                <div className="flex items-center justify-between">
                                    <p className="text-[#FFD700] text-sm font-black drop-shadow-sm">GHS {p.price}</p>
                                    <span className="text-white text-[10px] font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/30 uppercase tracking-widest">
                                        View Deal
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </div>
                ))}

                {/* Indicators */}
                {products.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20">
                        {products.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-[#FFD700]' : 'w-1 bg-white/40'
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
