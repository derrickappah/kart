'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function WishlistClient({ initialItems }) {
    const router = useRouter();
    const supabase = createClient();
    const [items, setItems] = useState(initialItems || []);

    const removeFromWishlist = async (wishlistItemId) => {
        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('id', wishlistItemId);

        if (!error) {
            setItems(items.filter(item => item.id !== wishlistItemId));
        }
    };

    return (
        <div className="bg-[#f7f7f7] dark:bg-[#22262a] font-display text-[#1A1A1A] dark:text-white antialiased min-h-screen transition-colors duration-200">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-[#f7f7f7] dark:bg-[#22262a] shadow-2xl overflow-hidden">
                {/* Header */}
                <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[#f7f7f7]/95 dark:bg-[#22262a]/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                    <h1 className="text-xl font-bold tracking-tight text-[#0e191b] dark:text-white">Saved Items</h1>
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
                        <span className="material-symbols-outlined text-[18px]">sort</span>
                        <span className="text-sm font-semibold">Filter</span>
                    </button>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 pb-24">
                    {items.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 items-start">
                            {items.map((item) => {
                                const product = item.product;
                                if (!product) return null;
                                
                                const seller = product.seller;
                                const originalPrice = product.original_price || parseFloat(product.price) * 1.1; // Fallback for design demo
                                const hasPriceDrop = originalPrice > product.price;

                                return (
                                    <div key={item.id} className="relative group bg-white dark:bg-[#2d3339] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-transparent dark:border-gray-800">
                                        <div className="relative">
                                            <Link href={`/marketplace/${product.id}`}>
                                                <div className={`w-full aspect-[3/4] relative ${product.status === 'Sold' ? 'grayscale' : ''}`}>
                                                    {product.image_url ? (
                                                        <Image 
                                                            src={product.image_url} 
                                                            alt={product.title}
                                                            fill
                                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-3xl text-gray-400">image</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                            
                                            <button 
                                                onClick={() => removeFromWishlist(item.id)}
                                                className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-black/50 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform active:scale-95 group/heart text-[#149cb8]"
                                            >
                                                <span className="material-symbols-outlined text-[20px] fill-current">favorite</span>
                                            </button>

                                            {product.status === 'Sold' && (
                                                <div className="absolute inset-0 bg-white/60 dark:bg-black/60 z-10 flex items-center justify-center pointer-events-none">
                                                    <span className="bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-3 py-1 text-[10px] font-bold rounded uppercase tracking-wider transform -rotate-12 shadow-lg border-2 border-white dark:border-gray-900">Sold</span>
                                                </div>
                                            )}

                                            {hasPriceDrop && product.status !== 'Sold' && (
                                                <div className="absolute bottom-2 left-2 bg-[#FF7F50] text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">trending_down</span>
                                                    <span>Price Drop</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-3">
                                            <Link href={`/marketplace/${product.id}`}>
                                                <h3 className="text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
                                                    {product.title}
                                                </h3>
                                            </Link>
                                            
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">₵{parseFloat(product.price).toFixed(0)}</span>
                                                {hasPriceDrop && (
                                                    <span className="text-xs text-gray-400 line-through">₵{parseFloat(originalPrice).toFixed(0)}</span>
                                                )}
                                            </div>

                                            {seller && (
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="relative w-5 h-5 rounded-full overflow-hidden bg-gray-300 shrink-0">
                                                        {seller.avatar_url ? (
                                                            <Image src={seller.avatar_url} alt={seller.display_name} fill className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-[#149cb8] text-white text-[8px] font-bold">
                                                                {seller.display_name?.[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                                        {seller.display_name} • {seller.university?.split(' ')[0]}
                                                    </span>
                                                </div>
                                            )}

                                            {product.status === 'Sold' ? (
                                                <button className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg text-xs font-semibold cursor-not-allowed" disabled>
                                                    Not Available
                                                </button>
                                            ) : (
                                                <Link 
                                                    href={`/dashboard/messages/new?seller=${product.seller_id}`}
                                                    className="w-full py-2 bg-[#149cb8]/10 hover:bg-[#149cb8]/20 text-[#149cb8] rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                                                    Chat
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <span className="material-symbols-outlined text-6xl mb-4 opacity-20">favorite</span>
                            <p className="font-bold">Your wishlist is empty</p>
                            <Link href="/marketplace" className="text-[#149cb8] text-sm mt-2 underline font-semibold">
                                Explore Items
                            </Link>
                        </div>
                    )}
                    
                    {items.length > 0 && (
                        <div className="h-10 flex items-center justify-center mt-6">
                            <p className="text-xs text-gray-400 dark:text-gray-600 font-medium">You've reached the end of your list</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
