'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';
import BuyButton from './BuyButton';

export default function ProductDetailsClient({ product }) {
    const [loadingChat, setLoadingChat] = useState(false);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [loadingWishlist, setLoadingWishlist] = useState(false);
    const [loadingBoost, setLoadingBoost] = useState(false);
    const [similarProducts, setSimilarProducts] = useState([]);
    const [loadingSimilar, setLoadingSimilar] = useState(true);

    // Initialize with first image from array if available, otherwise fallback to image_url
    const images = (product?.images && product.images.length > 0) ? product.images : [product?.image_url];
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const router = useRouter();
    const supabase = createClient();

    // Min swipe distance in pixels
    const minSwipeDistance = 50;

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
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        } else if (isRightSwipe) {
            setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
        }
    };

    // Check if user is owner and wishlist status
    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setIsOwner(user.id === product.seller_id);

                const { data: wishlistItem } = await supabase
                    .from('wishlist')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('product_id', product.id)
                    .maybeSingle();

                setIsInWishlist(!!wishlistItem);
            }
        };
        checkStatus();
    }, [product.id, product.seller_id, supabase]);

    const handleWishlistToggle = async () => {
        setLoadingWishlist(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        try {
            if (isInWishlist) {
                const response = await fetch('/api/wishlist/remove', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId: product.id }),
                });
                if (response.ok) {
                    setIsInWishlist(false);
                    router.refresh();
                }
            } else {
                const response = await fetch('/api/wishlist/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId: product.id }),
                });
                if (response.ok) {
                    setIsInWishlist(true);
                    router.refresh();
                }
            }
        } catch (error) {
            console.error('Wishlist error:', error);
        } finally {
            setLoadingWishlist(false);
        }
    };

    const handleContactSeller = async () => {
        setLoadingChat(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        if (user.id === product.seller_id) {
            alert("You cannot message yourself!");
            setLoadingChat(false);
            return;
        }

        try {
            const { data: myConvs } = await supabase
                .from('conversations')
                .select('*')
                .contains('participants', [user.id]);

            const existingConv = myConvs?.find(c => c.participants.includes(product.seller_id));

            if (existingConv) {
                router.push(`/dashboard/messages/${existingConv.id}`);
            } else {
                const { data: newConv, error } = await supabase
                    .from('conversations')
                    .insert([{
                        participants: [user.id, product.seller_id]
                    }])
                    .select()
                    .single();

                if (error) throw error;
                router.push(`/dashboard/messages/${newConv.id}`);
            }
        } catch (error) {
            console.error("Error starting chat:", error);
            alert("Could not start chat. Please try again.");
            setLoadingChat(false);
        }
    };

    // Track views
    useEffect(() => {
        const incrementViews = async () => {
            try {
                // Check if we've already viewed this product in this session to avoid double counting
                const sessionKey = `viewed_${product.id}`;
                if (!sessionStorage.getItem(sessionKey)) {
                    await fetch(`/api/products/${product.id}/increment-views`, { method: 'POST' });
                    sessionStorage.setItem(sessionKey, 'true');
                }
            } catch (error) {
                console.error('Error incrementing views:', error);
            }
        };
        incrementViews();
    }, [product.id]);

    // Fetch similar products
    useEffect(() => {
        const fetchSimilar = async () => {
            if (!product?.category) return;
            try {
                const { data } = await supabase
                    .from('products')
                    .select('*, seller:profiles(display_name, avatar_url)')
                    .eq('category', product.category)
                    .eq('status', 'Active')
                    .neq('id', product.id)
                    .limit(12);

                if (data) {
                    // Shuffle the results and take top 4
                    const shuffled = [...data].sort(() => Math.random() - 0.5);
                    setSimilarProducts(shuffled.slice(0, 4));
                }
            } catch (err) {
                console.error("Error fetching similar products:", err);
            } finally {
                setLoadingSimilar(false);
            }
        };
        fetchSimilar();
    }, [product.id, product.category, supabase]);

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
                alert('Link copied to clipboard!');
            }

            // Increment share count
            await fetch(`/api/products/${product.id}/increment-shares`, { method: 'POST' });
        } catch (error) {
            console.error('Error sharing:', error);
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
                    className="pointer-events-auto size-11 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-lg active:scale-90 transition-transform"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={handleShare}
                        className="pointer-events-auto size-11 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-lg active:scale-90 transition-transform"
                    >
                        <span className="material-symbols-outlined">share</span>
                    </button>
                    <button
                        onClick={handleWishlistToggle}
                        disabled={loadingWishlist}
                        className={`pointer-events-auto size-11 flex items-center justify-center rounded-full backdrop-blur-md border border-white/30 shadow-lg active:scale-90 transition-transform ${isInWishlist ? 'bg-primary text-white' : 'bg-white/20 text-white'}`}
                    >
                        <span className={`material-symbols-outlined ${isInWishlist ? 'fill-current' : ''}`}>favorite</span>
                    </button>
                </div>
            </div>

            <main className="pb-32">
                {/* Hero Image Carousel Section */}
                <div
                    className="relative w-full aspect-[4/5] overflow-hidden bg-gray-200 dark:bg-gray-800 touch-pan-y"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <img
                        src={images[currentImageIndex]}
                        alt={product.title}
                        className="absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-in-out"
                    />

                    {/* Pagination Dots */}
                    {images.length > 1 && (
                        <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2 z-10">
                            {images.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentImageIndex(idx)}
                                    className={`h-1.5 transition-all duration-300 rounded-full ${currentImageIndex === idx ? 'w-6 bg-primary' : 'w-1.5 bg-white/50'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Content Card */}
                <div className="relative -mt-6 bg-[#fafafa] dark:bg-[#22262a] rounded-t-xl px-4 pt-8">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                                {product.category}
                            </span>
                            <span className="bg-green-500/10 text-green-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                                {product.condition}
                            </span>
                        </div>
                        <h1 className="text-[#0e181b] dark:text-white text-3xl font-extrabold leading-tight mt-2">
                            {product.title}
                        </h1>
                        <p className="text-primary text-3xl font-bold mt-2">GHS {product.price}</p>
                    </div>

                    {/* Seller Info */}
                    <Link href={`/profile/${product.seller_id}`} className="mt-8 p-4 bg-white dark:bg-[#2c3136] rounded-xl border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-between hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary ring-2 ring-primary/20 overflow-hidden">
                                {product.seller?.avatar_url ? (
                                    <img src={product.seller.avatar_url} alt={product.seller?.display_name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-lg font-bold">
                                        {product.seller?.display_name ? product.seller.display_name[0].toUpperCase() : 'U'}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <p className="font-bold text-base">{product.seller?.display_name || 'Anonymous'}</p>
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-yellow-400 text-sm fill-current">star</span>
                                    <span className="text-sm font-medium">
                                        {product.seller?.average_rating ? parseFloat(product.seller.average_rating).toFixed(1) : '0.0'}
                                    </span>
                                    <span className="text-xs text-slate-500">• {product.seller?.total_reviews || 0} reviews</span>
                                </div>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </Link>

                    {/* Description Section */}
                    <div className="mt-8">
                        <h3 className="text-lg font-bold mb-3">Description</h3>
                        <div className="text-[#4f5b66] dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                            {product.description}
                        </div>
                    </div>

                    {/* Location Section */}
                    {product.campus && (
                        <div className="mt-8 pb-4">
                            <h3 className="text-lg font-bold mb-3">Pickup Location</h3>
                            <div className="flex items-center gap-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10">
                                <div className="size-10 flex items-center justify-center bg-primary rounded-lg text-white">
                                    <span className="material-symbols-outlined">location_on</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{product.campus}</p>
                                    <p className="text-xs text-slate-500">Coordinate via chat for safety</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Similar Items Section */}
                    {similarProducts.length > 0 && (
                        <div className="mt-12 mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-extrabold tracking-tight">Similar Items</h3>
                                <Link
                                    href={`/marketplace?category=${product.category}`}
                                    className="text-primary text-sm font-bold hover:underline"
                                >
                                    See All
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {similarProducts.map((p) => (
                                    <Link
                                        href={`/marketplace/${p.id}`}
                                        key={p.id}
                                        className="group flex flex-col gap-2 relative"
                                        onClick={() => window.scrollTo(0, 0)}
                                    >
                                        <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 dark:bg-[#2f2f35] shadow-sm">
                                            <img
                                                src={p.images?.[0] || p.image_url}
                                                alt={p.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            {p.condition && (
                                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider">
                                                    {p.condition}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-0.5 px-1">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 leading-snug">{p.title}</h3>
                                            <p className="text-primary text-base font-extrabold">GHS {p.price}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Persistent Bottom Action Bar */}
            {!isOwner && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#22262a]/80 backdrop-blur-xl border-t border-black/5 dark:border-white/5 p-4 pb-8 z-50">
                    <div className="max-w-screen-md mx-auto flex items-center gap-4">
                        <button
                            onClick={handleContactSeller}
                            disabled={loadingChat}
                            className="flex-1 h-14 rounded-xl border-2 border-primary text-primary font-bold text-base flex items-center justify-center gap-2 hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined">chat_bubble</span>
                            {loadingChat ? '...' : 'Chat'}
                        </button>
                        <BuyButton product={product} />
                    </div>
                </div>
            )}
        </div>
    );
}

