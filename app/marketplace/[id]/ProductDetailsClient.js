'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import BuyButton from './BuyButton';
import { toSentenceCase, formatPrice, seededShuffle } from '@/utils/formatters';
import { timeAgo } from '@/utils/dateUtils';

export default function ProductDetailsClient({ product }) {
    const [loadingChat, setLoadingChat] = useState(false);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [loadingWishlist, setLoadingWishlist] = useState(false);
    const [similarProducts, setSimilarProducts] = useState([]);
    const [loadingSimilar, setLoadingSimilar] = useState(true);
    const [inlineError, setInlineError] = useState(null);
    const [shareFeedback, setShareFeedback] = useState(null);

    // Initialize with first image from array if available, otherwise fallback to image_url
    const rawImages = (product?.images && Array.isArray(product.images)) ? product.images.filter(Boolean) : [];
    const images = rawImages.length > 0 ? rawImages : (product?.image_url ? [product.image_url] : ['/placeholder.png']);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const router = useRouter();

    const minSwipeDistance = 50;

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push('/marketplace');
        }
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

        const fetchSimilar = async () => {
            if (!product?.category) {
                if (active) setLoadingSimilar(false);
                return;
            }
            const { data } = await supabase
                .from('products')
                .select('id, title, price, images, image_url, condition, seller:profiles(display_name, avatar_url)')
                .eq('category', product.category)
                .eq('status', 'Active')
                .neq('id', product.id)
                .limit(12);
            if (active) {
                if (data) {
                    const shuffled = seededShuffle(data, product.id.charCodeAt(0) || 42);
                    setSimilarProducts(shuffled.slice(0, 4));
                }
                setLoadingSimilar(false);
            }
        };

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (active && user) {
                setIsOwner(user.id === product.seller_id);
            }
            await Promise.all([
                user ? checkWishlist(user.id) : Promise.resolve(),
                fetchSimilar(),
            ]);
        };

        init();

        return () => {
            active = false;
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
        <div className="bg-[#fafafa] dark:bg-[#22262a] text-[#0e181b] dark:text-white antialiased min-h-screen font-display product-details-page">
            {/* Top Bar for Desktop Navigation */}
            <div className="max-w-6xl mx-auto px-4 pt-4 hidden md:flex items-center justify-between">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-2 py-1"
                >
                    <DynamicLucideIcon name="arrow_back" size={18} aria-hidden="true" />
                    <span>Back to listings</span>
                </button>
                <div className="flex items-center gap-2">
                    {shareFeedback && (
                        <span
                            role="status"
                            aria-live="polite"
                            className="flex items-center bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-md animate-fade-in"
                        >
                            {shareFeedback}
                        </span>
                    )}
                    <button
                        onClick={handleShare}
                        aria-label="Share listing"
                        className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-[#2c3136] border border-black/5 dark:border-white/10 shadow-sm hover:border-primary/40 text-gray-700 dark:text-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <DynamicLucideIcon name="share" size={18} aria-hidden="true" />
                    </button>
                    <button
                        onClick={handleWishlistToggle}
                        disabled={loadingWishlist}
                        aria-label={isInWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
                        aria-pressed={isInWishlist}
                        className={`size-10 flex items-center justify-center rounded-full border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${isInWishlist ? 'bg-primary text-white border-transparent' : 'bg-white dark:bg-[#2c3136] border-black/5 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:border-primary/40'}`}
                    >
                        <DynamicLucideIcon name="favorite" size={18} fill={isInWishlist ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Mobile Top Floating Navigation Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 flex md:hidden items-center justify-between p-4 pointer-events-none">
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="pointer-events-auto size-11 flex items-center justify-center rounded-full bg-black/45 hover:bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-lg active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                    <DynamicLucideIcon name="arrow_back" aria-hidden="true" />
                </button>
                <div className="flex gap-2">
                    {shareFeedback && (
                        <span
                            role="status"
                            aria-live="polite"
                            className="pointer-events-auto flex items-center bg-black/80 text-white text-xs font-bold px-3 py-2 rounded-full backdrop-blur-md shadow-md"
                        >
                            {shareFeedback}
                        </span>
                    )}
                    <button
                        onClick={handleShare}
                        aria-label="Share this listing"
                        className="pointer-events-auto size-11 flex items-center justify-center rounded-full bg-black/45 hover:bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-lg active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                        <DynamicLucideIcon name="share" aria-hidden="true" />
                    </button>
                    <button
                        onClick={handleWishlistToggle}
                        disabled={loadingWishlist}
                        aria-label={isInWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
                        aria-pressed={isInWishlist}
                        className={`pointer-events-auto size-11 flex items-center justify-center rounded-full backdrop-blur-md border border-white/10 shadow-lg active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 ${isInWishlist ? 'bg-primary text-white border-transparent' : 'bg-black/45 hover:bg-black/60 text-white'}`}
                    >
                        <DynamicLucideIcon name="favorite" fill={isInWishlist ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-0 md:px-4 py-0 md:py-6 pb-2 md:pb-8">
                {/* Main Content Layout: Stack on Mobile, 2 Columns on Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Hero Carousel + Gallery Thumbnails (7 Cols Desktop) */}
                    <div className="md:col-span-7 flex flex-col gap-4">
                        <div
                            role="region"
                            aria-label={`Product images${images.length > 1 ? ` — ${currentImageIndex + 1} of ${images.length}` : ''}`}
                            className="relative w-full aspect-[4/5] md:aspect-[4/3] rounded-none md:rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800 touch-pan-y shadow-sm"
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
                                        className="absolute left-3 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-black/60 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
                                    >
                                        <DynamicLucideIcon name="chevron_left" aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={goToNext}
                                        aria-label="Next image"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-black/60 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
                                    >
                                        <DynamicLucideIcon name="chevron_right" aria-hidden="true" />
                                    </button>
                                </>
                            )}

                            {/* Pagination Dots (Mobile) */}
                            {images.length > 1 && (
                                <div className="absolute bottom-4 left-0 right-0 flex md:hidden justify-center gap-2 z-10">
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
                    <div className="md:col-span-5 px-4 md:px-0 pt-4 md:pt-0 md:sticky md:top-24 self-start">
                        <div className="flex flex-col gap-5">
                            {/* Product Header & Title */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                                        {product.category}
                                    </span>
                                    <span className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                                        {product.condition}
                                    </span>
                                    <span className="text-[#5e7d87] dark:text-gray-400 text-xs font-bold uppercase tracking-wider ml-auto flex items-center gap-1">
                                        <DynamicLucideIcon name="schedule" size={14} aria-hidden="true" />
                                        <time dateTime={product.created_at}>{timeAgo(product.created_at)}</time>
                                    </span>
                                </div>
                                <h1 className="text-[#0e181b] dark:text-white text-2xl md:text-3xl font-extrabold leading-tight tracking-tight mt-1">
                                    {toSentenceCase(product.title)}
                                </h1>
                                <p className="text-[#0f7295] dark:text-primary-light text-3xl md:text-4xl font-black mt-1" aria-label={`Price: ₵ ${formatPrice(product.price)}`}>
                                    ₵ {formatPrice(product.price)}
                                </p>
                            </div>

                            {/* Immediate Action CTAs (Above the fold for instant access) */}
                            {!isOwner && (
                                <div className="flex flex-col gap-2 my-1">
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
                                            className="flex-1 h-14 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2c3136] text-[#0e7490] dark:text-primary-light font-bold text-base flex items-center justify-center gap-2.5 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        >
                                            {loadingChat
                                                ? <div className="size-5 border-2 border-primary border-t-transparent animate-spin rounded-full" aria-hidden="true" />
                                                : (
                                                    <>
                                                        <DynamicLucideIcon name="chat_bubble" size={22} className="text-[#0e7490] dark:text-primary-light" aria-hidden="true" />
                                                        <span>Chat</span>
                                                    </>
                                                )
                                            }
                                        </button>
                                        <BuyButton product={product} />
                                    </div>
                                </div>
                            )}

                            {/* Seller Info Card */}
                            <Link
                                href={`/profile/${product.seller_id}`}
                                className="p-4 bg-white dark:bg-[#2c3136] rounded-2xl border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-between hover:border-primary/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label={`View ${product.seller?.display_name || 'seller'}'s profile`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-[#0f7295] dark:text-primary ring-2 ring-primary/20 overflow-hidden shrink-0">
                                        {product.seller?.avatar_url ? (
                                            <Image
                                                src={product.seller.avatar_url}
                                                alt={product.seller?.display_name || 'Seller avatar'}
                                                width={48}
                                                height={48}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-lg font-bold" aria-hidden="true">
                                                {product.seller?.display_name ? product.seller.display_name[0].toUpperCase() : 'U'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="font-bold text-base flex items-center gap-1.5">
                                            <span>{product.seller?.display_name || 'Anonymous Seller'}</span>
                                            {product.seller?.is_verified && (
                                                <DynamicLucideIcon
                                                    name="verified"
                                                    size={16}
                                                    className="text-[#1daddd] shrink-0"
                                                    fill="currentColor"
                                                    aria-label="Verified Seller"
                                                />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {product.seller?.total_reviews > 0 ? (
                                                <>
                                                    <DynamicLucideIcon name="star" size={14} fill="currentColor" className="text-yellow-400" aria-hidden="true" />
                                                    <span className="text-sm font-semibold">
                                                        {parseFloat(product.seller.average_rating || 0).toFixed(1)}
                                                    </span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">• {product.seller.total_reviews} {product.seller.total_reviews === 1 ? 'review' : 'reviews'}</span>
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">New Seller • No reviews yet</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <DynamicLucideIcon name="chevron_right" className="text-slate-400 shrink-0" aria-hidden="true" />
                            </Link>

                            {/* Description Section */}
                            <div>
                                <h2 className="text-lg font-bold mb-2">Description</h2>
                                <div className="text-[#4f5b66] dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-base">
                                    {product.description || <span className="italic text-gray-400">No description provided.</span>}
                                </div>
                            </div>

                            {/* Location Section */}
                            {product.campus && (
                                <div>
                                    <h2 className="text-lg font-bold mb-2">Pickup Location</h2>
                                    <div className="flex items-center gap-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10">
                                        <div className="size-10 flex items-center justify-center bg-primary rounded-xl text-white shrink-0 shadow-sm">
                                            <DynamicLucideIcon name="location_on" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-[#0e181b] dark:text-white">{product.campus}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Coordinate via chat for a safe campus handover</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Similar Items Section */}
                {!loadingSimilar && similarProducts.length > 0 && (
                    <section className="mt-8 md:mt-16 mb-2 md:mb-8 px-4 md:px-0" aria-label="Similar items">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-extrabold tracking-tight">Similar Items</h2>
                            <Link
                                href={`/marketplace?category=${encodeURIComponent(product.category)}`}
                                className="text-primary text-sm font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-2 py-1"
                            >
                                See All
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {similarProducts.map((p) => (
                                <Link
                                    href={`/marketplace/${p.id}`}
                                    key={p.id}
                                    className="group flex flex-col gap-2 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                                    aria-label={`${toSentenceCase(p.title)} — ₵ ${formatPrice(p.price)}`}
                                    onClick={() => {
                                        if (typeof window !== 'undefined') {
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                    }}
                                >
                                    <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 dark:bg-[#2f2f35] shadow-sm">
                                        <Image
                                            src={p.images?.[0] || p.image_url || '/placeholder.png'}
                                            alt={toSentenceCase(p.title)}
                                            fill
                                            sizes="(max-width: 768px) 50vw, 260px"
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        {p.condition && (
                                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider">
                                                {p.condition}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-0.5 px-1">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 leading-snug">
                                            {toSentenceCase(p.title)}
                                        </h3>
                                        <p className="text-primary text-base font-extrabold">₵ {formatPrice(p.price)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

