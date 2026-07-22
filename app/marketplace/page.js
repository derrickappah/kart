import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import SearchBar from '../../components/SearchBar';
import WishlistButton from '../../components/WishlistButton';
import AdTracker from '../../components/AdTracker';
import { createClient } from '../../utils/supabase/server';
import { toSentenceCase, seededShuffle, formatPrice } from '../../utils/formatters';

export const revalidate = 60;

export const metadata = {
    title: 'Marketplace | KART – Campus Finds',
    description: 'Buy and sell textbooks, electronics, clothing, and more on your campus with KART — the trusted student marketplace.',
    openGraph: {
        title: 'KART Marketplace – Campus Finds',
        description: 'Browse thousands of student listings. Buy and sell safely on campus.',
        url: 'https://www.kart.cx/marketplace',
        type: 'website',
    },
    alternates: {
        canonical: 'https://www.kart.cx/marketplace',
    },
};

/**
 * Sanitize a free-text search parameter: trim, cap at 200 chars,
 * and strip characters that have no business being in an ilike query.
 */
function sanitizeTextParam(val) {
    if (!val || typeof val !== 'string') return '';
    return val.trim().slice(0, 200);
}

/**
 * Return a deterministic daily seed so the shuffle changes once per day
 * rather than being locked to a fixed constant forever.
 */
function getDailySeed(offset = 0) {
    const now = new Date();
    // Format: YYYYMMDD as an integer, plus optional offset to vary groups
    const dateInt = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
    return dateInt + offset;
}

export default async function Marketplace({ searchParams }) {
    const params = await searchParams;
    const supabase = await createClient();

    // Expire completed promotions on load to ensure only active promotions affect sorting/ranking
    const { error: expireError } = await supabase.rpc('expire_completed_promotions');
    if (expireError) {
        console.error('Error running expire_completed_promotions RPC:', expireError);
    }

    // Sanitize inputs before using in queries
    const searchQuery = sanitizeTextParam(params?.search);
    const campusQuery = sanitizeTextParam(params?.campus);
    const minPriceRaw = parseFloat(params?.minPrice);
    const maxPriceRaw = parseFloat(params?.maxPrice);
    const minPrice = isNaN(minPriceRaw) || minPriceRaw < 0 ? null : minPriceRaw;
    const maxPrice = isNaN(maxPriceRaw) || maxPriceRaw < 0 ? null : maxPriceRaw;

    // Build the product query first (no await yet)
    let query = supabase
        .from('products')
        .select('*, advertisements(id, status, start_date, end_date)')
        .eq('status', 'Active');

    if (params?.category) {
        const categories = params.category
            .split(',')
            .map(c => c.trim())
            .filter(Boolean)
            .slice(0, 20); // limit array length
        
        if (categories.length > 0) {
            query = categories.length === 1
                ? query.eq('category', categories[0])
                : query.in('category', categories);
        }
    }
    if (params?.condition) {
        const conditions = params.condition
            .split(',')
            .map(c => c.trim())
            .filter(Boolean)
            .slice(0, 10);
            
        if (conditions.length > 0) {
            query = conditions.length === 1
                ? query.eq('condition', conditions[0])
                : query.in('condition', conditions);
        }
    }
    if (minPrice !== null) query = query.gte('price', minPrice);
    if (maxPrice !== null) query = query.lte('price', maxPrice);
    if (campusQuery) query = query.ilike('campus', `%${campusQuery}%`);
    if (searchQuery) query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

    const sortOption = params?.sort || 'newest';
    switch (sortOption) {
        case 'oldest':    query = query.order('is_boosted', { ascending: false, nullsFirst: false }).order('is_featured', { ascending: false, nullsFirst: false }).order('created_at', { ascending: true }); break;
        case 'price-low': query = query.order('is_boosted', { ascending: false, nullsFirst: false }).order('is_featured', { ascending: false, nullsFirst: false }).order('price', { ascending: true }); break;
        case 'price-high': query = query.order('is_boosted', { ascending: false, nullsFirst: false }).order('is_featured', { ascending: false, nullsFirst: false }).order('price', { ascending: false }); break;
        default:           query = query.order('is_boosted', { ascending: false, nullsFirst: false }).order('is_featured', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }); break;
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
    const hasDbError = !!productsRes.error;

    if (productsRes.error) {
        console.error('Error fetching marketplace products:', productsRes.error);
    }

    const wishlistIds = wishlistRes.data?.map(item => item.product_id) || [];
    const rawProducts = productsRes.data || [];

    // Map products to extract active advertisement_id
    const rawProductsWithAdId = rawProducts.map(p => {
        const now = new Date();
        const activeAd = p.advertisements?.find(ad =>
            ad.status === 'Active' &&
            new Date(ad.start_date) <= now &&
            new Date(ad.end_date) >= now
        );
        const { advertisements, ...productData } = p;
        return {
            ...productData,
            advertisement_id: activeAd?.id || null
        };
    });

    // Apply daily-rotating seeded shuffle for the default "newest" view
    // so boosted/featured items feel organic rather than algorithmically obvious
    let products = rawProductsWithAdId;
    const isDefaultView = sortOption === 'newest' && !searchQuery && !params?.category;
    if (isDefaultView) {
        const boosted = rawProductsWithAdId.filter(p => p.is_boosted);
        const featured = rawProductsWithAdId.filter(p => !p.is_boosted && p.is_featured);
        const regular = rawProductsWithAdId.filter(p => !p.is_boosted && !p.is_featured);

        products = [
            ...seededShuffle(boosted, getDailySeed(0)),
            ...seededShuffle(featured, getDailySeed(1)),
            ...seededShuffle(regular, Math.floor(Math.random() * 1000000))
        ];
    }

    // Determine if any filters are active for better empty state messaging
    const hasActiveFilters = !!(params?.category || params?.condition || params?.minPrice || params?.maxPrice || params?.campus);
    const hasActiveSearch = !!searchQuery;

    // Build intelligent reset URL that preserves active text search query
    const clearFiltersHref = searchQuery
        ? `/marketplace?search=${encodeURIComponent(searchQuery)}`
        : '/marketplace';

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'itemListElement': products.map((p, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'url': `https://www.kart.cx/marketplace/${p.id}`,
            'name': p.title
        }))
    };

    return (
        <div className="bg-white dark:bg-[#242428] min-h-screen font-display antialiased">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="max-w-md mx-auto relative flex flex-col min-h-screen pb-24 shadow-2xl bg-white dark:bg-[#242428]">
                <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#242428]/95 px-4 pt-3 pb-2 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                    <SearchBar placeholder="Search campus finds..." showFilter={true} />
                </header>

                <main className="px-4 pt-1 flex-1">
                    <div className="grid grid-cols-2 gap-4 pb-8">
                        {hasDbError ? (
                            <div className="col-span-2 py-16 px-6 text-center flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-3xl text-red-500">
                                <DynamicLucideIcon name="report" className="text-4xl mb-3 opacity-80" aria-hidden="true" />
                                <p className="font-bold text-red-900 dark:text-red-300">
                                    Failed to retrieve listings
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-xs mx-auto">
                                    There was an issue communicating with the database. Please try again.
                                </p>
                                <Link
                                    href="/marketplace"
                                    className="mt-4 px-5 py-2.5 bg-red-600 hover:bg-red-750 text-white rounded-2xl text-xs font-bold shadow-md shadow-red-500/20 transition-all active:scale-[0.98]"
                                >
                                    Retry Connection
                                </Link>
                            </div>
                        ) : products && products.length > 0 ? (
                            products.map((p) => {
                                const cardContent = (
                                    <Link
                                        href={`/marketplace/${p.id}`}
                                        className="group flex flex-col gap-2 relative h-full w-full"
                                        aria-label={`${toSentenceCase(p.title)} — ₵ ${formatPrice(p.price)}`}
                                    >
                                        <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 dark:bg-[#2f2f35]">
                                            <Image
                                                src={p.images?.[0] || p.image_url || '/placeholder.png'}
                                                alt={toSentenceCase(p.title)}
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
                                            <p className="text-primary text-base font-extrabold">₵ {formatPrice(p.price)}</p>
                                            <div className="flex items-center gap-1 text-gray-400">
                                                <DynamicLucideIcon name="location_on" size={14} className="text-[14px]" aria-hidden="true" />
                                                <p className="text-[10px] font-bold truncate uppercase">{p.campus || 'On Campus'}</p>
                                            </div>
                                        </div>
                                    </Link>
                                );

                                return p.advertisement_id ? (
                                    <AdTracker key={p.id} advertisementId={p.advertisement_id}>
                                        {cardContent}
                                    </AdTracker>
                                ) : (
                                    <div key={p.id} className="contents">
                                        {cardContent}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-2 py-20 text-center flex flex-col items-center justify-center text-gray-500">
                                <DynamicLucideIcon name="search_off" className="text-6xl mb-4 opacity-20" aria-hidden="true" />
                                <p className="font-semibold text-gray-700 dark:text-gray-300">
                                    {hasActiveSearch
                                        ? `No results for "${searchQuery}"`
                                        : hasActiveFilters
                                            ? 'No items match your filters'
                                            : 'No items available right now'}
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                    {(hasActiveSearch || hasActiveFilters)
                                        ? 'Try adjusting your search or filters'
                                        : 'Check back soon — listings are added daily'}
                                </p>
                                {(hasActiveSearch || hasActiveFilters) && (
                                    <Link
                                        href={clearFiltersHref}
                                        className="mt-4 text-primary font-bold text-sm hover:underline"
                                    >
                                        Clear all filters
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </main>

            </div>
        </div>
    );
}
