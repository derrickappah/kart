'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import WishlistButton from './WishlistButton';
import AdTracker from './AdTracker';
import DynamicLucideIcon from './DynamicLucideIcon';
import { toSentenceCase, formatPrice } from '../utils/formatters';

export default function FeaturedSlider({ products, wishlistIds }) {
    const containerRef = useRef(null);

    // Triple the products array to support seamless infinite scroll
    const tripledProducts = [...products, ...products, ...products];

    useEffect(() => {
        const container = containerRef.current;
        if (container && products.length > 0) {
            // Scroll to the start of the middle copy on mount
            const cardWidth = 176; // 160px card width + 16px gap
            const middleIndex = products.length;
            container.scrollLeft = middleIndex * cardWidth;
        }
    }, [products]);

    const handleScroll = () => {
        const container = containerRef.current;
        if (!container || products.length === 0) return;
        const { scrollLeft, scrollWidth } = container;
        const oneThird = scrollWidth / 3;
        
        // Snap back to middle if scrolled too far left or right
        if (scrollLeft >= oneThird * 2) {
            container.scrollLeft = scrollLeft - oneThird;
        } else if (scrollLeft <= 0) {
            container.scrollLeft = scrollLeft + oneThird;
        }
    };

    if (products.length === 0) return null;

    return (
        <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="flex w-full overflow-x-auto px-5 pb-6 no-scrollbar gap-4 scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {tripledProducts.map((product, idx) => {
                const cardContent = (
                    <Link
                        href={`/marketplace/${product.id}`}
                        className="min-w-[160px] w-[160px] group flex flex-col gap-2 relative h-full cursor-pointer shrink-0"
                    >
                        {/* 4:5 Aspect Ratio Image container with grey border */}
                        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-[#2d2d32] border dark:border-gray-700/50">
                            <Image
                                src={product.image_url || product.images?.[0] || '/placeholder.png'}
                                alt={product.title}
                                fill
                                sizes="160px"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            

                            {product.condition && (
                                <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[9px] font-black text-white uppercase tracking-wider">
                                    {product.condition}
                                </div>
                            )}
                            <WishlistButton productId={product.id} initialIsSaved={wishlistIds.includes(product.id)} />
                        </div>

                        {/* Identical metadata structure */}
                        <div className="flex flex-col gap-0.5 px-1">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">{toSentenceCase(product.title)}</h3>
                            <p className="text-primary text-base font-extrabold">₵ {formatPrice(product.price)}</p>
                            <div className="flex items-center gap-1 text-gray-400">
                                <DynamicLucideIcon name="location_on" size={14} className="text-[14px]" aria-hidden="true" />
                                <p className="text-[10px] font-bold truncate uppercase">{product.campus || 'On Campus'}</p>
                            </div>
                        </div>
                    </Link>
                );

                const key = `${product.id}-${idx}`;

                return product.advertisement_id ? (
                    <AdTracker key={key} advertisementId={product.advertisement_id}>
                        {cardContent}
                    </AdTracker>
                ) : (
                    <div key={key} className="contents">
                        {cardContent}
                    </div>
                );
            })}
        </div>
    );
}
