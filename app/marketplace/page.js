import { Suspense } from 'react';
import MarketplaceFeed from './MarketplaceFeed';
import MarketplaceSkeleton from './MarketplaceSkeleton';
import { fetchMarketplaceProducts } from './actions';

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

async function MarketplaceFeedSection({ filterParams, searchQuery, hasActiveFilters, clearFiltersHref }) {
    const initialData = await fetchMarketplaceProducts({
        page: 1,
        limit: 12,
        ...filterParams
    });

    const products = initialData.products || [];
    const hasDbError = !!initialData.error;
    const wishlistIds = initialData.wishlistIds || [];
    const hasMore = initialData.hasMore || false;

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
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
            />
            <MarketplaceFeed
                initialProducts={products}
                initialHasMore={hasMore}
                initialWishlistIds={wishlistIds}
                hasDbError={hasDbError}
                filterParams={filterParams}
                searchQuery={searchQuery}
                hasActiveFilters={hasActiveFilters}
                clearFiltersHref={clearFiltersHref}
            />
        </>
    );
}

export default async function Marketplace({ searchParams }) {
    const params = await searchParams;

    const searchQuery = sanitizeTextParam(params?.search);
    const campusQuery = sanitizeTextParam(params?.campus);
    const minPriceRaw = parseFloat(params?.minPrice);
    const maxPriceRaw = parseFloat(params?.maxPrice);
    const minPrice = isNaN(minPriceRaw) || minPriceRaw < 0 ? null : minPriceRaw;
    const maxPrice = isNaN(maxPriceRaw) || maxPriceRaw < 0 ? null : maxPriceRaw;
    const sortOption = params?.sort || 'newest';

    const filterParams = {
        search: searchQuery,
        campus: campusQuery,
        category: params?.category || '',
        condition: params?.condition || '',
        minPrice,
        maxPrice,
        sort: sortOption
    };

    const hasActiveFilters = !!(params?.category || params?.condition || params?.minPrice || params?.maxPrice || params?.campus);

    // Build intelligent reset URL that preserves active text search query
    const clearFiltersHref = searchQuery
        ? `/marketplace?search=${encodeURIComponent(searchQuery)}`
        : '/marketplace';

    return (
        <div className="bg-white dark:bg-[#242428] min-h-screen font-display antialiased">
            <div className="max-w-md mx-auto relative flex flex-col min-h-screen pb-4 md:pb-8 shadow-2xl bg-white dark:bg-[#242428]">
                <main className="px-4 pt-3 flex-1">
                    <Suspense key={JSON.stringify(filterParams)} fallback={<MarketplaceSkeleton count={8} />}>
                        <MarketplaceFeedSection
                            filterParams={filterParams}
                            searchQuery={searchQuery}
                            hasActiveFilters={hasActiveFilters}
                            clearFiltersHref={clearFiltersHref}
                        />
                    </Suspense>
                </main>
            </div>
        </div>
    );
}
