'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Image from 'next/image';
import Link from 'next/link';
import SimilarItemsSlider from './SimilarItemsSlider';
import ProductReviews from './ProductReviews';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toSentenceCase, formatPrice, seededShuffle } from '@/utils/formatters';
import { timeAgo } from '@/utils/dateUtils';

export default function ProductDetailsClient({ product, initialUser = null }) {
    const [currentUser, setCurrentUser] = useState(initialUser);
    const [loadingChat, setLoadingChat] = useState(false);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [isOwner, setIsOwner] = useState(initialUser ? initialUser.id === product.seller_id : false);
    const [loadingWishlist, setLoadingWishlist] = useState(false);
    const [inlineError, setInlineError] = useState(null);
    const [shareFeedback, setShareFeedback] = useState(null);
    const [isScrolledPastImage, setIsScrolledPastImage] = useState(false);
    const [productRating, setProductRating] = useState(product?.product_average_rating || null);
    const [totalProductReviews, setTotalProductReviews] = useState(product?.product_total_reviews ?? 0);
    const [loadingRating, setLoadingRating] = useState(product?.product_total_reviews === undefined);
    const detailsRef = useRef(null);

    // Initialize with first image from array if available, otherwise fallback to image_url
    const rawImages = (product?.images && Array.isArray(product.images)) ? product.images.filter(Boolean) : [];
    const images = rawImages.length > 0 ? rawImages : (product?.image_url ? [product.image_url] : ['/placeholder.png']);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const router = useRouter();

    const minSwipeDistance = 50;

    const handleBack = () => {
        router.push('/marketplace');
    };

    const goToPrev = useCallback(() => {
        setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    const goToNext = useCallback(() => {
        setCurrentImageIndex(prev => (prev + 1) % images.length);
    }, [images.length]);

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
        if (distance > minSwipeDistance) goToNext();
        else if (distance < -minSwipeDistance) goToPrev();
    };

    const handleCarouselKeyDown = (e) => {
        if (images.length <= 1) return;
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            goToPrev();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            goToNext();
        }
    };

    useEffect(() => {
        let active = true;
        const supabase = createClient();

        const sessionKey = `viewed_${product.id}`;
        if (!sessionStorage.getItem(sessionKey)) {
            fetch(`/api/products/${product.id}/increment-views`, { method: 'POST' })
                .then(() => sessionStorage.setItem(sessionKey, 'true'))
                .catch(() => {});
        }

        const checkWishlist = async (userId) => {
            const { data: wishlistItem } = await supabase
                .from('wishlist')
                .select('id')
                .eq('user_id', userId)
                .eq('product_id', product.id)
                .maybeSingle();
            if (active) setIsInWishlist(!!wishlistItem);
        };

        const fetchProductRating = async () => {
            try {
                const { data: revData } = await supabase
                    .from('reviews')
                    .select('rating')
                    .eq('product_id', product.id);

                if (active && revData) {
                    const count = revData.length;
                    const avg = count > 0
                        ? (revData.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / count).toFixed(1)
                        : null;
                    setProductRating(avg);
                    setTotalProductReviews(count);
                }
            } catch (err) {
                console.error('Error fetching product rating:', err);
            } finally {
                if (active) setLoadingRating(false);
            }
        };

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (active && user) {
                setCurrentUser(user);
                setIsOwner(user.id === product.seller_id);
            }
            if (user) {
                await checkWishlist(user.id);
            }
            await fetchProductRating();
        };

        init();

        const handleScroll = () => {
            if (!detailsRef.current) return;
            const rect = detailsRef.current.getBoundingClientRect();
            setIsScrolledPastImage(rect.top <= 64);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => {
            active = false;
            window.removeEventListener('scroll', handleScroll);
        };
    }, [product.id, product.seller_id, product.category]);

    const handleWishlistToggle = async () => {
        setLoadingWishlist(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            setLoadingWishlist(false);
            return;
        }
        const optimisticState = !isInWishlist;
        setIsInWishlist(optimisticState);
        try {
            const endpoint = isInWishlist ? '/api/wishlist/remove' : '/api/wishlist/add';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: product.id }),
            });
            if (!response.ok) {
                setIsInWishlist(!optimisticState);
                setShareFeedback('Could not update wishlist.');
                setTimeout(() => setShareFeedback(null), 2500);
            } else {
                setShareFeedback(optimisticState ? 'Saved to wishlist!' : 'Removed from wishlist.');
                setTimeout(() => setShareFeedback(null), 2500);
            }
        } catch (error) {
            console.error('Wishlist error:', error);
            setIsInWishlist(!optimisticState);
            setShareFeedback('Network error. Try again.');
            setTimeout(() => setShareFeedback(null), 2500);
        } finally {
            setLoadingWishlist(false);
        }
    };

    const handleContactSeller = async () => {
        if (loadingChat) return;
        setLoadingChat(true);
        setInlineError(null);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            setLoadingChat(false);
            return;
        }
        if (user.id === product.seller_id) {
            setInlineError('You cannot message yourself!');
            setLoadingChat(false);
            return;
        }
        try {
            const { data: existingConv, error: fetchError } = await supabase
                .from('conversations')
                .select('id')
                .contains('participants', [user.id, product.seller_id])
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (existingConv) {
                router.push(`/dashboard/messages/${existingConv.id}`);
            } else {
                const { data: newConv, error: insertError } = await supabase
                    .from('conversations')
                    .insert([{ participants: [user.id, product.seller_id] }])
                    .select()
                    .single();
                if (insertError) throw insertError;
                router.push(`/dashboard/messages/${newConv.id}`);
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            setInlineError('Could not start chat. Please try again.');
            setLoadingChat(false);
        }
    };

    const handleShare = async () => {
        try {
            const shareData = {
                title: product.title,
                text: `Check out this ${product.title} on KART!`,
                url: window.location.href,
            };

            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                setShareFeedback('Link copied!');
                setTimeout(() => setShareFeedback(null), 2500);
            }

            fetch(`/api/products/${product.id}/increment-shares`, { method: 'POST' })
                .catch(() => {});
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error sharing:', error);
            }
        }
    };

    if (!product) {
        return (
            <div className="min-h-screen bg-[#fafafa] dark:bg-[#22262a] flex items-center justify-center p-6 text-center">
                <p className="text-[#0e181b] dark:text-white font-medium">Product not found</p>
            </div>
        );
    }

    const isAvailable = (product.status === 'Active' || product.status === 'active') && (product.stock_quantity === null || product.stock_quantity > 0);
    const statusLabel = isAvailable ? null : (product.stock_quantity === 0 ? 'Out of Stock' : (product.status || 'Sold'));

    return (
        <div className="bg-[#fafafa] dark:bg-[#22262a] text-[#0e181b] dark:text-white antialiased min-h-screen font-display product-details-page relative">
            {/* Top Bar for Desktop Navigation */}
            <div className="max-w-6xl mx-auto px-4 pt-4 hidden md:flex items-center justify-between">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl px-3.5 py-2 bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/60 dark:border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.7)] hover:bg-white/60 dark:hover:bg-black/30 active:scale-95"
                >
                    <DynamicLucideIcon name="arrow_back" size={18} aria-hidden="true" />
                    <span>Back to listings</span>
                </button>
                <div className="flex items-center gap-2">
                    {shareFeedback && (
                        <span
                            role="status"
                            aria-live="polite"
                            className="flex items-center bg-gray-900/90 dark:bg-gray-100/90 text-white dark:text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md animate-fade-in"
                        >
                            {shareFeedback}
                        </span>
                    )}
                    <button
                        onClick={handleShare}
                        aria-label="Share listing"
                        className="size-10 flex items-center justify-center rounded-full bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/60 dark:border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.7)] hover:bg-white/60 dark:hover:bg-black/30 text-gray-800 dark:text-gray-100 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <DynamicLucideIcon name="share" size={18} aria-hidden="true" />
                    </button>
                    <button
                        onClick={handleWishlistToggle}
                        disabled={loadingWishlist}
                        aria-label={isInWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
                        aria-pressed={isInWishlist}
                        className="size-10 flex items-center justify-center rounded-full bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/60 dark:border-white/15 text-gray-800 dark:text-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.7)] hover:bg-white/60 dark:hover:bg-black/30 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                    >
                        <DynamicLucideIcon
                            name="favorite"
                            size={18}
                            fill={isInWishlist ? 'currentColor' : 'none'}
                            className={isInWishlist ? 'text-black dark:text-white scale-110 transition-transform' : 'text-gray-700 dark:text-gray-200'}
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </div>

            {/* Mobile Top Navigation Bar */}
            <div
                className={`fixed top-0 left-0 right-0 z-30 flex md:hidden items-center justify-between px-4 py-3 transition-all duration-300 ${
                    isScrolledPastImage
                        ? 'bg-white/95 dark:bg-[#22262a]/95 backdrop-blur-md border-b border-black/5 dark:border-white/10 shadow-sm pointer-events-auto'
                        : 'bg-transparent border-transparent pointer-events-none'
                }`}
            >
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className={`pointer-events-auto size-10 flex items-center justify-center rounded-full backdrop-blur-xl transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isScrolledPastImage
                            ? 'bg-white/60 dark:bg-black/40 border border-white/60 dark:border-white/20 text-gray-900 dark:text-white shadow-[0_4px_20px_rgba(0,0,0,0.08),inset_0_1px_1.5px_rgba(255,255,255,0.8)] hover:bg-white/80'
                            : 'bg-white/35 dark:bg-black/45 border border-white/50 dark:border-white/25 text-gray-900 dark:text-white shadow-[0_8px_32px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.85)] hover:bg-white/50'
                    }`}
                >
                    <DynamicLucideIcon name="arrow_back" size={20} aria-hidden="true" />
                </button>

                {/* Sticky Product Title in Navigation */}
                <div
                    className={`flex-1 min-w-0 mx-2 sm:mx-3 text-center transition-all duration-300 transform ${
                        isScrolledPastImage
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 -translate-y-2 pointer-events-none'
                    }`}
                >
                    <p className="font-extrabold text-base sm:text-lg text-[#0e181b] dark:text-white truncate tracking-tight">
                        {toSentenceCase(product.title)}
                    </p>
                </div>

                <div className="flex gap-2 items-center">
                    {shareFeedback && (
                        <span
                            role="status"
                            aria-live="polite"
                            className="pointer-events-auto flex items-center bg-gray-900/90 dark:bg-gray-100/90 text-white dark:text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md animate-fade-in"
                        >
                            {shareFeedback}
                        </span>
                    )}
                    <button
                        onClick={handleShare}
                        aria-label="Share this listing"
                        className={`pointer-events-auto size-10 flex items-center justify-center rounded-full backdrop-blur-xl transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            isScrolledPastImage
                                ? 'bg-white/60 dark:bg-black/40 border border-white/60 dark:border-white/20 text-gray-900 dark:text-white shadow-[0_4px_20px_rgba(0,0,0,0.08),inset_0_1px_1.5px_rgba(255,255,255,0.8)] hover:bg-white/80'
                                : 'bg-white/35 dark:bg-black/45 border border-white/50 dark:border-white/25 text-gray-900 dark:text-white shadow-[0_8px_32px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.85)] hover:bg-white/50'
                        }`}
                    >
                        <DynamicLucideIcon name="share" size={18} aria-hidden="true" />
                    </button>
                    <button
                        onClick={handleWishlistToggle}
                        disabled={loadingWishlist}
                        aria-label={isInWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
                        aria-pressed={isInWishlist}
                        className={`pointer-events-auto size-10 flex items-center justify-center rounded-full backdrop-blur-xl transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${
                            isScrolledPastImage
                                ? 'bg-white/60 dark:bg-black/40 border border-white/60 dark:border-white/20 text-gray-900 dark:text-white shadow-[0_4px_20px_rgba(0,0,0,0.08),inset_0_1px_1.5px_rgba(255,255,255,0.8)] hover:bg-white/80'
                                : 'bg-white/35 dark:bg-black/45 border border-white/50 dark:border-white/25 text-gray-900 dark:text-white shadow-[0_8px_32px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.85)] hover:bg-white/50'
                        }`}
                    >
                        <DynamicLucideIcon
                            name="favorite"
                            size={18}
                            fill={isInWishlist ? 'currentColor' : 'none'}
                            className={isInWishlist ? 'text-black dark:text-white scale-110 transition-transform' : 'text-gray-800 dark:text-gray-100'}
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-0 md:px-4 py-0 md:py-6 pb-28 md:pb-8">
                {/* Main Content Layout: Stack on Mobile, 2 Columns on Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-8 items-start">
                    {/* Left Column: Hero Carousel + Gallery Thumbnails (7 Cols Desktop) */}
                    <div className="md:col-span-7 flex flex-col gap-4 sticky top-0 md:static z-0">
                        <div
                            role="region"
                            aria-label={`Product images${images.length > 1 ? ` — ${currentImageIndex + 1} of ${images.length}` : ''}`}
                            className="relative w-full aspect-[4/5] md:aspect-[4/3] rounded-none md:rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800 touch-pan-y shadow-none md:shadow-sm"
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                            onKeyDown={handleCarouselKeyDown}
                            tabIndex={images.length > 1 ? 0 : -1}
                            aria-roledescription="carousel"
                        >
                            <Image
                                src={images[currentImageIndex] || '/placeholder.png'}
                                alt={`${toSentenceCase(product.title)} — image ${currentImageIndex + 1} of ${images.length}`}
                                fill
                                sizes="(max-width: 768px) 100vw, 680px"
                                className="object-cover transition-all duration-500 ease-in-out"
                                priority
                            />

                            {/* Status Badge overlay if not active/available */}
                            {statusLabel && (
                                <div className="absolute top-4 left-4 z-20 bg-red-600 text-white text-xs font-extrabold uppercase px-3 py-1.5 rounded-md shadow-md tracking-wider">
                                    {statusLabel}
                                </div>
                            )}

                            {/* Carousel Arrow Buttons */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={goToPrev}
                                        aria-label="Previous image"
                                        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 size-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-black/60 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
                                    >
                                        <DynamicLucideIcon name="chevron_left" aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={goToNext}
                                        aria-label="Next image"
                                        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 size-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-black/60 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
                                    >
                                        <DynamicLucideIcon name="chevron_right" aria-hidden="true" />
                                    </button>
                                </>
                            )}

                            {/* Pagination Dots (Mobile) */}
                            {images.length > 1 && (
                                <div className="absolute bottom-8 left-0 right-0 flex md:hidden justify-center gap-2 z-10">
                                    {images.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentImageIndex(idx)}
                                            aria-label={`Go to image ${idx + 1}`}
                                            className={`h-1.5 transition-all duration-300 rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white ${currentImageIndex === idx ? 'w-6 bg-primary' : 'w-1.5 bg-white/50'}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Selector Grid (Desktop) */}
                        {images.length > 1 && (
                            <div className="hidden md:flex gap-3 overflow-x-auto pb-2" role="tablist" aria-label="Product image thumbnails">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageIndex(idx)}
                                        role="tab"
                                        aria-selected={currentImageIndex === idx}
                                        aria-label={`View image ${idx + 1}`}
                                        className={`relative size-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${currentImageIndex === idx ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                    >
                                        <Image
                                            src={img}
                                            alt={`Thumbnail ${idx + 1}`}
                                            fill
                                            sizes="80px"
                                            className="object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Details, Seller & Action Sidebar (5 Cols Desktop, Sticky on Desktop) */}
                    <div ref={detailsRef} className="md:col-span-5 px-4 md:px-0 pt-6 md:pt-0 -mt-6 md:mt-0 relative z-10 bg-[#fafafa] dark:bg-[#22262a] rounded-t-3xl md:rounded-none md:sticky md:top-24 self-start">
                        <div className="flex flex-col gap-5">
                            {/* Product Header & Title */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-primary text-xs font-bold uppercase tracking-wider">
                                        {product.category}
                                    </span>
                                    <span className="text-[#5e7d87] dark:text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                        <DynamicLucideIcon name="schedule" size={14} aria-hidden="true" />
                                        <time dateTime={product.created_at}>{timeAgo(product.created_at)}</time>
                                    </span>
                                </div>
                                <div className="flex items-start justify-between gap-4 mt-0.5">
                                    <h1 className="text-[#0e181b] dark:text-white text-2xl md:text-3xl font-extrabold leading-tight tracking-tight">
                                        {toSentenceCase(product.title)}
                                    </h1>
                                    <p className="text-[#0f7295] dark:text-primary-light text-2xl md:text-3xl font-black shrink-0 whitespace-nowrap" aria-label={`Price: ₵ ${formatPrice(product.price)}`}>
                                        ₵ {formatPrice(product.price)}
                                    </p>
                                </div>

                                {/* Item Rating Below Product Name */}
                                {loadingRating ? (
                                    <div className="flex items-center gap-2 mt-0.5 animate-pulse" aria-hidden="true">
                                        <div className="h-3.5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                                        <div className="h-3.5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const el = document.getElementById('reviews-section');
                                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="flex items-center gap-1.5 mt-0.5 text-left w-fit hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                                        aria-label={`Rating: ${totalProductReviews > 0 ? `${productRating} out of 5 stars from ${totalProductReviews} reviews` : 'No reviews yet'}`}
                                    >
                                        <div className="flex items-center text-yellow-400 gap-0.5">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <DynamicLucideIcon
                                                    key={s}
                                                    name="star"
                                                    size={14}
                                                    fill={totalProductReviews > 0 && Number(productRating) >= s ? 'currentColor' : 'none'}
                                                    className={totalProductReviews > 0 && Number(productRating) >= s ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                                                    aria-hidden="true"
                                                />
                                            ))}
                                        </div>
                                        {totalProductReviews > 0 ? (
                                            <span className="font-bold text-xs text-[#0e181b] dark:text-white">
                                                {productRating} <span className="font-normal text-slate-500 dark:text-slate-400">({totalProductReviews} {totalProductReviews === 1 ? 'review' : 'reviews'})</span>
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hover:underline">No reviews yet</span>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Desktop Immediate Action CTAs */}
                            {!isOwner && (
                                <div className="hidden md:flex flex-col gap-2 my-1">
                                    {inlineError && (
                                        <div
                                            role="alert"
                                            className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center"
                                        >
                                            {inlineError}
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleContactSeller}
                                            disabled={loadingChat}
                                            aria-label={loadingChat ? 'Opening chat…' : 'Chat with seller'}
                                            className="flex-1 h-14 rounded-[18px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2c3136] text-primary font-bold text-base flex items-center justify-center gap-2.5 shadow-sm hover:bg-primary/5 hover:border-primary/40 active:scale-[0.98] transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        >
                                            {loadingChat
                                                ? <div className="size-5 border-2 border-primary border-t-transparent animate-spin rounded-full" aria-hidden="true" />
                                                : (
                                                    <>
                                                        <DynamicLucideIcon name="chat_bubble" size={22} className="text-primary" aria-hidden="true" />
                                                        <span>Chat</span>
                                                    </>
                                                )
                                            }
                                        </button>
                                        <Link
                                            href={product.seller_id ? `/profile/${product.seller_id}` : '#'}
                                            className="flex-1 h-14 rounded-[18px] bg-primary hover:bg-primary-dark text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all whitespace-nowrap px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            aria-label="View seller profile"
                                        >
                                            <DynamicLucideIcon name="person" size={20} aria-hidden="true" />
                                            <span>Seller Profile</span>
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Description Section */}
                            <div>
                                <div className="text-[#4f5b66] dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-base">
                                    {product.description || <span className="italic text-gray-400">No description provided.</span>}
                                </div>
                                {(product.condition || product.price != null) && (
                                    <div className="mt-3 flex flex-col gap-1 text-sm font-semibold text-[#4f5b66] dark:text-slate-300">
                                        {product.condition && (
                                            <p>Condition : {product.condition}</p>
                                        )}
                                        {product.price != null && (
                                            <p>Price : ₵ {formatPrice(product.price)}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Location Section */}
                            {product.campus && (
                                <div>
                                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#0e181b] dark:text-white mb-3">Location</h2>
                                    <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#2c3136] rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                                        <div className="size-10 flex items-center justify-center bg-primary/10 text-primary rounded-xl shrink-0">
                                            <DynamicLucideIcon name="location_on" size={20} aria-hidden="true" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-[#0e181b] dark:text-white">{product.campus}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Coordinate with seller via chat for a safe handover</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Lower Content Wrapper: Continuous z-10 background covering underlying sticky layer */}
                <div className="relative z-10 bg-[#fafafa] dark:bg-[#22262a] pt-8 md:pt-12">
                    {/* Product Ratings & Reviews Section */}
                    <div className="px-4 md:px-0">
                        <ProductReviews
                            productId={product.id}
                            sellerId={product.seller_id}
                            productTitle={toSentenceCase(product.title)}
                            isOwner={isOwner}
                            currentUser={currentUser}
                        />
                    </div>

                    {/* Similar Items Section with Horizontal Infinite Scroll */}
                    <SimilarItemsSlider category={product.category} currentProductId={product.id} />
                </div>
            </main>

            {/* Sticky Bottom Action Area for Mobile */}
            {!isOwner && (
                <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-[#22262a]/95 backdrop-blur-md border-t border-black/5 dark:border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-t-3xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                    {inlineError && (
                        <div
                            role="alert"
                            className="mb-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium text-center"
                        >
                            {inlineError}
                        </div>
                    )}
                    <div className="flex gap-3 items-center">
                        <button
                            onClick={handleContactSeller}
                            disabled={loadingChat}
                            aria-label={loadingChat ? 'Opening chat…' : 'Chat with seller'}
                            className="flex-1 h-12 rounded-[16px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2c3136] text-primary font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm hover:bg-primary/5 hover:border-primary/40 active:scale-[0.98] transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            {loadingChat ? (
                                <div className="size-5 border-2 border-primary border-t-transparent animate-spin rounded-full" aria-hidden="true" />
                            ) : (
                                <>
                                    <DynamicLucideIcon name="chat_bubble" size={20} className="text-primary" aria-hidden="true" />
                                    <span>Chat</span>
                                </>
                            )}
                        </button>
                        <Link
                            href={product.seller_id ? `/profile/${product.seller_id}` : '#'}
                            className="flex-1 h-12 rounded-[16px] bg-primary hover:bg-primary-dark text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-primary/25 active:scale-[0.98] transition-all whitespace-nowrap px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label="View seller profile"
                        >
                            <DynamicLucideIcon name="person" size={18} aria-hidden="true" />
                            <span>Seller Profile</span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

