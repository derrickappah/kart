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

    // Minimum swipe distance in pixels
    const minSwipeDistance = 50;

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

    // Keyboard navigation for the image carousel (WCAG 2.1 — keyboard access)
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

    // Combined data fetch — runs on mount, all requests run in parallel
    useEffect(() => {
        let active = true;
        // Create a fresh client per component instance (not module-level)
        // to prevent cross-user data leakage and stale session issues.
        const supabase = createClient();

        // Fire-and-forget: don't block UI for view tracking
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
                setIsInWishlist(!optimisticState); // revert
            }
        } catch (error) {
            console.error('Wishlist error:', error);
            setIsInWishlist(!optimisticState); // revert
        } finally {
            setLoadingWishlist(false);
        }
    };

    const handleContactSeller = async () => {
        if (loadingChat) return; // prevent double-tap race condition
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
                setTimeout(() => setShareFeedback(null), 2000);
            }

            // Increment share count (fire-and-forget)
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
            <div className="min-h-screen bg-[#fafafa] dark:bg-[#22262a] flex items-center justify-center">
                <p className="text-[#0e181b] dark:text-white">Product not found</p>
            </div>
        );
    }

    return (
        <div className="bg-[#fafafa] dark:bg-[#22262a] text-[#0e181b] dark:text-white antialiased min-h-screen font-display product-details-page">
            {/* Top Navigation Overlay */}
            <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 pointer-events-none">
                <button
                    onClick={() => router.back()}
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
                            className="pointer-events-auto flex items-center bg-black/70 text-white text-xs font-bold px-3 py-2 rounded-full backdrop-blur-md"
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

            <main className="pb-32">
                {/* Hero Image Carousel */}
                <div
                    role="region"
                    aria-label={`Product images${images.length > 1 ? ` — ${currentImageIndex + 1} of ${images.length}` : ''}`}
                    className="relative w-full aspect-[4/5] overflow-hidden bg-gray-200 dark:bg-gray-800 touch-pan-y"
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
                        sizes="(max-width: 768px) 100vw, 448px"
                        className="object-cover transition-all duration-500 ease-in-out"
                        priority
                    />

                    {/* Carousel arrow buttons — visible only when multiple images exist */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={goToPrev}
                                aria-label="Previous image"
                                className="absolute left-3 top-1/2 -translate-y-1/2 size-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white border border-white/20 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
                            >
                                <DynamicLucideIcon name="chevron_left" aria-hidden="true" />
                            </button>
                            <button
                                onClick={goToNext}
                                aria-label="Next image"
                                className="absolute right-3 top-1/2 -translate-y-1/2 size-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white border border-white/20 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
                            >
                                <DynamicLucideIcon name="chevron_right" aria-hidden="true" />
                            </button>
                        </>
                    )}

                    {/* Pagination Dots */}
                    {images.length > 1 && (
                        <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2 z-10">
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

                {/* Product Content Card */}
                <div className="relative -mt-6 bg-[#fafafa] dark:bg-[#22262a] rounded-t-xl px-4 pt-8">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                                {product.category}
                            </span>
                            <span className="bg-green-500/10 text-green-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                                {product.condition}
                            </span>
                            <span className="text-[#5e7d87] dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-auto flex items-center gap-1">
                                <DynamicLucideIcon name="schedule" size={14} className="text-[14px]" aria-hidden="true" />
                                <time dateTime={product.created_at}>{timeAgo(product.created_at)}</time>
                            </span>
                        </div>
                        <h1 className="text-[#0e181b] dark:text-white text-3xl font-extrabold leading-tight mt-2">
                            {toSentenceCase(product.title)}
                        </h1>
                        <p className="text-[#0f7295] dark:text-primary-light text-3xl font-bold mt-2" aria-label={`Price: ₵ ${formatPrice(product.price)}`}>
                            ₵ {formatPrice(product.price)}
                        </p>
                    </div>

                    {/* Seller Info */}
                    <Link
                        href={`/profile/${product.seller_id}`}
                        className="mt-8 p-4 bg-white dark:bg-[#2c3136] rounded-xl border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-between hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                                    <span>{product.seller?.display_name || 'Anonymous'}</span>
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
                                <div className="flex items-center gap-1">
                                    <DynamicLucideIcon name="star" size={14} fill="currentColor" className="text-yellow-400 text-sm" aria-hidden="true" />
                                    <span className="text-sm font-medium">
                                        {product.seller?.average_rating ? parseFloat(product.seller.average_rating).toFixed(1) : '0.0'}
                                    </span>
                                    <span className="text-xs text-slate-600 dark:text-slate-400">• {product.seller?.total_reviews || 0} reviews</span>
                                </div>
                            </div>
                        </div>
                        <DynamicLucideIcon name="chevron_right" className="text-slate-400 shrink-0" aria-hidden="true" />
                    </Link>

                    {/* Description Section */}
                    <div className="mt-8">
                        <h2 className="text-lg font-bold mb-3">Description</h2>
                        <div className="text-[#4f5b66] dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                            {product.description || <span className="italic text-gray-400">No description provided.</span>}
                        </div>
                    </div>

                    {/* Location Section */}
                    {product.campus && (
                        <div className="mt-8 pb-4">
                            <h2 className="text-lg font-bold mb-3">Pickup Location</h2>
                            <div className="flex items-center gap-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10">
                                <div className="size-10 flex items-center justify-center bg-primary rounded-lg text-white shrink-0">
                                    <DynamicLucideIcon name="location_on" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{product.campus}</p>
                                    <p className="text-xs text-slate-500">Coordinate via chat for safety</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Similar Items Section */}
                    {!loadingSimilar && similarProducts.length > 0 && (
                        <section className="mt-12 mb-8" aria-label="Similar items">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-extrabold tracking-tight">Similar Items</h2>
                                <Link
                                    href={`/marketplace?category=${encodeURIComponent(product.category)}`}
                                    className="text-primary text-sm font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                                >
                                    See All
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {similarProducts.map((p) => (
                                    <Link
                                        href={`/marketplace/${p.id}`}
                                        key={p.id}
                                        className="group flex flex-col gap-2 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                                        aria-label={`${toSentenceCase(p.title)} — ₵ ${formatPrice(p.price)}`}
                                        onClick={() => {
                                            // SSR-safe scroll to top — only runs client-side
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
                                                sizes="(max-width: 768px) 50vw, 200px"
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
                </div>
            </main>

            {/* Persistent Bottom Action Bar — only shown to non-owners */}
            {!isOwner && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#22262a]/90 backdrop-blur-2xl border-t border-black/5 dark:border-white/5 p-4 pb-[max(2rem,env(safe-area-inset-bottom))] z-50">
                    {inlineError && (
                        <div
                            role="alert"
                            className="mb-3 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center"
                        >
                            {inlineError}
                        </div>
                    )}
                    <div className="max-w-screen-md mx-auto flex items-center gap-3">
                        <button
                            onClick={handleContactSeller}
                            disabled={loadingChat}
                            aria-label={loadingChat ? 'Opening chat…' : 'Chat with seller'}
                            className="flex-1 h-14 rounded-2xl border border-primary/20 text-[#0f7295] dark:text-primary-light font-bold text-base flex items-center justify-center gap-3 bg-primary/[0.04] dark:bg-primary/10 hover:bg-primary/10 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_20px_-10px_rgba(29,173,221,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            {loadingChat
                                ? <div className="size-5 border-2 border-primary border-t-transparent animate-spin rounded-full" aria-hidden="true" />
                                : (
                                    <>
                                        <DynamicLucideIcon name="chat_bubble" size={22} className="text-[22px]" aria-hidden="true" />
                                        <span>Chat</span>
                                    </>
                                )
                            }
                        </button>
                        <BuyButton product={product} />
                    </div>
                </div>
            )}
        </div>
    );
}
