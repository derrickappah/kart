'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import SearchBar from '@/components/SearchBar';
import { formatPrice } from '@/utils/formatters';

export default function WishlistClient({ initialItems }) {
    const router = useRouter();
    const supabase = createClient();
    const [items, setItems] = useState(initialItems || []);
    const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
    const [searchQuery, setSearchQuery] = useState('');

    if (initialItems !== prevInitialItems) {
        setPrevInitialItems(initialItems);
        setItems(initialItems || []);
    }

    // Safely extract the primary image
    const getPrimaryImage = (product) => {
        if (!product) return null;
        try {
            if (typeof product.images === 'string') {
                const parsed = JSON.parse(product.images);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
            }
            if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
        } catch (e) {}
        return product.image_url;
    };

    const removeFromWishlist = async (wishlistItemId) => {
        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('id', wishlistItemId);

        if (!error) {
            setItems(items.filter(item => item.id !== wishlistItemId));
        }
    };

    const filteredItems = items.filter((item) => {
        const product = item.product;
        if (!product) return false;
        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase().trim();
        const titleMatch = product.title?.toLowerCase().includes(query);
        const descMatch = product.description?.toLowerCase().includes(query);
        const categoryMatch = product.category?.toLowerCase().includes(query);
        const campusMatch = product.campus?.toLowerCase().includes(query);
        const priceMatch = product.price?.toString().includes(query);
        const sellerMatch = product.seller?.display_name?.toLowerCase().includes(query);

        return titleMatch || descMatch || categoryMatch || campusMatch || priceMatch || sellerMatch;
    });

    return (
        <div className="bg-white dark:bg-[#242428] font-display antialiased min-h-screen transition-colors duration-200">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-white dark:bg-[#242428] shadow-2xl">

                {/* Sticky Header with Home SearchBar */}
                <header className="sticky top-16 z-40 bg-white/95 dark:bg-[#242428]/95 backdrop-blur-md px-4 py-3 border-b border-gray-100/50 dark:border-gray-800/30">
                    <SearchBar
                        placeholder="Search saved items..."
                        showFilter={true}
                        hideFilter={true}
                        value={searchQuery}
                        onChange={setSearchQuery}
                        leftContent={
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
                                Saved Items
                            </h3>
                        }
                    />
                </header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col p-4 pb-32 space-y-4">
                    {/* Active search filter feedback */}
                    {searchQuery.trim() && (
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                            <span>
                                Found <strong className="text-slate-800 dark:text-slate-200">{filteredItems.length}</strong> {filteredItems.length === 1 ? 'item' : 'items'}
                            </span>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-primary font-bold hover:underline"
                            >
                                Clear
                            </button>
                        </div>
                    )}

                    {filteredItems.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {filteredItems.map((item) => {
                                const product = item.product;
                                if (!product) return null;

                                const seller = product.seller;
                                const originalPrice = product.original_price || parseFloat(product.price) * 1.1;
                                const hasPriceDrop = originalPrice > product.price;

                                return (
                                    <div key={item.id} className="group relative flex flex-col bg-white dark:bg-[#1e292b] rounded-2xl overflow-hidden shadow-soft border border-transparent dark:border-white/5 transition-all duration-300">
                                        <div className="relative aspect-[4/5]">
                                            <Link href={`/marketplace/${product.id}`}>
                                                <div className={`w-full h-full relative ${product.status === 'Sold' ? 'grayscale opacity-60' : ''}`}>
                                                    {getPrimaryImage(product) ? (
                                                        <Image
                                                            src={getPrimaryImage(product)}
                                                            alt={product.title}
                                                            fill
                                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
                                                        <DynamicLucideIcon name="image" className="text-3xl" />
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>

                                            {/* Heart Button */}
                                            <button
                                                onClick={() => removeFromWishlist(item.id)}
                                                className="absolute top-2 right-2 size-9 bg-white/90 dark:bg-black/50 backdrop-blur-md rounded-full shadow-sm flex items-center justify-center hover:scale-110 transition-all active:scale-95 text-primary"
                                            >
                                                <DynamicLucideIcon name="favorite" className="text-[20px]" fill="currentColor" />
                                            </button>

                                            {product.status === 'Sold' && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                                    <span className="bg-slate-900/80 text-white dark:bg-white/90 dark:text-slate-900 px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-widest backdrop-blur-sm border border-white/20">Sold Out</span>
                                                </div>
                                            )}

                                            {hasPriceDrop && product.status !== 'Sold' && (
                                                <div className="absolute bottom-2 left-2 bg-[#ff7b5c] text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg shadow-[#ff7b5c]/30 flex items-center gap-1 ring-1 ring-white/20">
                                                    <DynamicLucideIcon name="trending_down" className="text-[12px]" />
                                                    <span>Price Drop</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-3 flex flex-col flex-1 justify-between gap-3">
                                            <div>
                                                <Link href={`/marketplace/${product.id}`}>
                                                    <h3 className="text-sm font-bold leading-tight text-slate-900 dark:text-white line-clamp-2 mb-1">
                                                        {product.title}
                                                    </h3>
                                                </Link>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-bold text-primary">₵{formatPrice(product.price)}</span>
                                                    {hasPriceDrop && (
                                                        <span className="text-[10px] text-slate-400 font-medium line-through">₵{formatPrice(originalPrice)}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {seller && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative size-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[8px] font-bold ring-1 ring-primary/20 overflow-hidden">
                                                            {seller.avatar_url ? (
                                                                <Image src={seller.avatar_url} alt={seller.display_name} fill className="object-cover" />
                                                            ) : (
                                                                <span>{seller.display_name?.[0]}</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-medium truncate">
                                                            {seller.display_name}
                                                        </span>
                                                    </div>
                                                )}

                                                {product.status !== 'Sold' && (
                                                    <Link
                                                        href={`/dashboard/messages/new?seller=${product.seller_id}`}
                                                        className="w-full h-9 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[11px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                                                    >
                                                        <DynamicLucideIcon name="chat_bubble" className="text-[16px]" />
                                                        <span>Chat</span>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : searchQuery.trim() ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
                            <div className="size-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                                <DynamicLucideIcon name="search" className="text-4xl opacity-50" />
                            </div>
                            <p className="font-bold text-lg text-slate-900 dark:text-white mb-1">No matching saved items</p>
                            <p className="text-sm mb-6 text-center text-slate-500 dark:text-slate-400">
                                No items in your wishlist match &quot;{searchQuery}&quot;
                            </p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="h-11 flex items-center justify-center px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
                            >
                                Clear Search
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-600">
                            <div className="size-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                                <DynamicLucideIcon name="favorite" className="text-4xl opacity-50" />
                            </div>
                            <p className="font-bold text-lg text-slate-900 dark:text-white mb-1">Your wishlist is empty</p>
                            <p className="text-sm mb-6">Explore the marketplace for items you love.</p>
                            <Link href="/marketplace" className="h-12 flex items-center justify-center px-8 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-[0.98]">
                                Explore Items
                            </Link>
                        </div>
                    )}

                    {filteredItems.length > 0 && (
                        <div className="py-12 flex items-center justify-center">
                            <div className="h-px bg-slate-100 dark:bg-white/5 flex-1"></div>
                            <p className="px-4 text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider">End of list</p>
                            <div className="h-px bg-slate-100 dark:bg-white/5 flex-1"></div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
