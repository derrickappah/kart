import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import FilterSidebar from '../../components/FilterSidebar';
import SearchBar from '../../components/SearchBar';
import MarketplaceControls from '../../components/MarketplaceControls';
import WishlistButton from '../../components/WishlistButton';
import { createClient } from '../../utils/supabase/server';
import { toSentenceCase } from '../../utils/formatters';

export const revalidate = 60;

export default async function Marketplace({ searchParams }) {
    const params = await searchParams;
    const supabase = await createClient();

    // Build the product query first (no await yet)
    let query = supabase
        .from('products')
        .select('*')
        .eq('status', 'Active');

    if (params?.category) {
        const categories = params.category.split(',');
        query = categories.length === 1
            ? query.eq('category', categories[0])
            : query.in('category', categories);
    }
    if (params?.condition) {
        const conditions = params.condition.split(',');
        query = conditions.length === 1
            ? query.eq('condition', conditions[0])
            : query.in('condition', conditions);
    }
    if (params?.minPrice) query = query.gte('price', parseFloat(params.minPrice));
    if (params?.maxPrice) query = query.lte('price', parseFloat(params.maxPrice));
    if (params?.campus) query = query.ilike('campus', `%${params.campus}%`);
    if (params?.search) query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);

    const sortOption = params?.sort || 'newest';
    switch (sortOption) {
        case 'oldest':   query = query.order('is_boosted', { ascending: false, nullsFirst: false }).order('is_featured', { ascending: false, nullsFirst: false }).order('created_at', { ascending: true }); break;
        case 'price-low': query = query.order('is_boosted', { ascending: false, nullsFirst: false }).order('is_featured', { ascending: false, nullsFirst: false }).order('price', { ascending: true }); break;
        case 'price-high': query = query.order('is_boosted', { ascending: false, nullsFirst: false }).order('is_featured', { ascending: false, nullsFirst: false }).order('price', { ascending: false }); break;
        default:          query = query.order('is_boosted', { ascending: false, nullsFirst: false }).order('is_featured', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }); break;
    }

    // Run auth and product query in parallel
    const [authRes, wishlistProduct] = await Promise.all([
        supabase.auth.getUser(),
        query.limit(40)
    ]);
    const user = authRes.data?.user;

    const [wishlistRes] = await Promise.all([
        user
            ? supabase.from('wishlist').select('product_id').eq('user_id', user.id)
            : Promise.resolve({ data: [] }),
    ]);
    const productsRes = wishlistProduct;

    const wishlistIds = wishlistRes.data?.map(item => item.product_id) || [];
    const rawProducts = productsRes.data;

    const products = (sortOption === 'newest' && !params?.search && !params?.category)
        ? (rawProducts ? [...rawProducts].sort(() => Math.random() - 0.5) : [])
        : rawProducts;

    return (
        <div className="bg-white dark:bg-[#242428] min-h-screen font-display antialiased">
            <div className="max-w-md mx-auto relative flex flex-col min-h-screen pb-24 shadow-2xl bg-white dark:bg-[#242428]">
                <header className="bg-white/95 dark:bg-[#242428]/95 border-b border-gray-100 dark:border-gray-800 px-4 py-4">
                    <SearchBar placeholder="Search campus finds..." />
                </header>

                <main className="px-4 pt-4 flex-1">
                    <div className="mb-4">
                        <Suspense fallback={<div className="h-10 w-32 bg-gray-100 animate-pulse rounded-full" />}>
                            <MarketplaceControls resultCount={products?.length || 0} />
                        </Suspense>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pb-8">
                        {products && products.length > 0 ? (
                            products.map((p) => (
                                <Link href={`/marketplace/${p.id}`} key={p.id} className="group flex flex-col gap-2 relative">
                                    <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 dark:bg-[#2f2f35]">
                                        <Image
                                            src={p.images?.[0] || p.image_url || '/placeholder.png'}
                                            alt={p.title}
                                            fill
                                            sizes="(max-width: 768px) 50vw, 200px"
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <WishlistButton
                                            productId={p.id}
                                            initialIsSaved={wishlistIds.includes(p.id)}
                                        />
                                        {p.condition && (
                                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider">
                                                {p.condition}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-0.5 px-1">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">{toSentenceCase(p.title)}</h3>
                                        <p className="text-primary text-base font-extrabold">GHS {p.price}</p>
                                        <div className="flex items-center gap-1 text-gray-400">
                                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                                            <p className="text-[10px] font-bold truncate uppercase">{p.campus || 'On Campus'}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-2 py-20 text-center flex flex-col items-center justify-center text-gray-500">
                                <span className="material-symbols-outlined text-6xl mb-4 opacity-20">search_off</span>
                                <p className="font-medium">No items found matching your search.</p>
                            </div>
                        )}
                    </div>
                </main>

                <Suspense fallback={null}>
                    <FilterSidebar />
                </Suspense>
            </div>
        </div>
    );
}
