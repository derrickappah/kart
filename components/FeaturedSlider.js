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
            const cardWidth = 226; // 210px card width + 16px gap
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
            className="flex w-full overflow-x-auto px-5 pb-6 no-scrollbar space-x-4 scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {tripledProducts.map((product, idx) => {
                const cardContent = (
                    <Link
                        href={`/marketplace/${product.id}`}
                        className="min-w-[210px] w-[210px] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-[#2d2d32] border border-gray-100 dark:border-gray-800 shadow-soft hover:-translate-y-1 transition-all duration-300 cursor-pointer group shrink-0"
                    >
                        {/* Landscape Image aspect-16/10 */}
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-250 dark:bg-gray-800">
                            <Image
                                src={product.image_url || product.images?.[0] || '/placeholder.png'}
                                alt={product.title}
                                fill
                                sizes="210px"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            
                            {/* Premium Live Featured Badge */}
                            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-white/95 dark:bg-[#1a1c22]/90 backdrop-blur-md text-[#0ea5e9] dark:text-sky-400 border border-sky-100 dark:border-sky-900/40 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 z-20">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse shrink-0" />
                                Featured
                            </div>

                            {product.condition && (
                                <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[9px] font-black text-white uppercase tracking-wider">
                                    {product.condition}
                                </div>
                            )}
                            <WishlistButton productId={product.id} initialIsSaved={wishlistIds.includes(product.id)} />
                        </div>

                        {/* Compact bottom metadata */}
                        <div className="flex flex-col p-3">
                            <h3 className="text-xs font-bold leading-tight text-gray-900 dark:text-white line-clamp-1">{toSentenceCase(product.title)}</h3>
                            <div className="mt-2 flex items-center justify-between">
                                <p className="text-sm font-extrabold text-primary">₵ {formatPrice(product.price)}</p>
                                <div className="flex items-center gap-1 overflow-hidden max-w-[90px]">
                                    {product.seller?.avatar_url ? (
                                        <img 
                                            src={product.seller.avatar_url} 
                                            className="h-4.5 w-4.5 rounded-full object-cover shrink-0 border border-gray-100 dark:border-gray-800" 
                                            alt={product.seller.display_name} 
                                        />
                                    ) : (
                                        <div className="h-4.5 w-4.5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] text-primary font-bold shrink-0">
                                            {product.seller?.display_name?.[0] || 'U'}
                                        </div>
                                    )}
                                    <span className="text-[10px] font-bold text-gray-500 truncate">{product.seller?.display_name || 'Seller'}</span>
                                    {product.seller?.is_verified && (
                                        <DynamicLucideIcon name="verified" className="text-primary text-[10px] font-bold shrink-0" />
                                    )}
                                </div>
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
