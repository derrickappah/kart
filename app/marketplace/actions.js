'use server';

import { createClient } from '@/utils/supabase/server';
import { interleavePromotedListings, getFairRotatedPromotions } from '@/utils/promotionAlgorithm';
import { getOrSet } from '@/lib/cache';

/**
 * Sanitize a free-text search parameter: trim, cap at 200 chars,
 * and strip characters that have no business being in an ilike query.
 */
function sanitizeTextParam(val) {
    if (!val || typeof val !== 'string') return '';
    return val.trim().slice(0, 200);
}

/**
 * Fetch a paginated batch of marketplace products with all active filters.
 */
export async function fetchMarketplaceProducts({
    page = 1,
    limit = 12,
    search = '',
    campus = '',
    category = '',
    condition = '',
    minPrice = null,
    maxPrice = null,
    sort = 'newest'
} = {}) {
    try {
        const supabase = await createClient();

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        // Sanitize inputs
        const searchQuery = sanitizeTextParam(search);
        const campusQuery = sanitizeTextParam(campus);

        const minPriceRaw = typeof minPrice === 'number' ? minPrice : parseFloat(minPrice);
        const maxPriceRaw = typeof maxPrice === 'number' ? maxPrice : parseFloat(maxPrice);
        const minPriceVal = isNaN(minPriceRaw) || minPriceRaw < 0 ? null : minPriceRaw;
        const maxPriceVal = isNaN(maxPriceRaw) || maxPriceRaw < 0 ? null : maxPriceRaw;

        // Build base query
        let query = supabase
            .from('products')
            .select('*, advertisements(id, status, start_date, end_date)')
            .eq('status', 'Active');

        if (category) {
            const categories = (Array.isArray(category) ? category : String(category).split(','))
                .map(c => (typeof c === 'string' ? c.trim() : ''))
                .filter(Boolean)
                .slice(0, 20);

            if (categories.length > 0) {
                query = categories.length === 1
                    ? query.eq('category', categories[0])
                    : query.in('category', categories);
            }
        }

        if (condition) {
            const conditions = (Array.isArray(condition) ? condition : String(condition).split(','))
                .map(c => (typeof c === 'string' ? c.trim() : ''))
                .filter(Boolean)
                .slice(0, 10);

            if (conditions.length > 0) {
                query = conditions.length === 1
                    ? query.eq('condition', conditions[0])
                    : query.in('condition', conditions);
            }
        }

        if (minPriceVal !== null) query = query.gte('price', minPriceVal);
        if (maxPriceVal !== null) query = query.lte('price', maxPriceVal);
        if (campusQuery) query = query.ilike('campus', `%${campusQuery}%`);
        if (searchQuery) query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

        const sortOption = sort || 'newest';
        switch (sortOption) {
            case 'oldest':
                query = query.order('created_at', { ascending: true });
                break;
            case 'price-low':
                query = query.order('price', { ascending: true });
                break;
            case 'price-high':
                query = query.order('price', { ascending: false });
                break;
            default:
                query = query.order('created_at', { ascending: false });
                break;
        }

        const filterKey = `marketplace:feed:${JSON.stringify({
            page: pageNum,
            limit: limitNum,
            search: searchQuery,
            campus: campusQuery,
            category: category || '',
            condition: condition || '',
            minPrice: minPriceVal,
            maxPrice: maxPriceVal,
            sort: sortOption
        })}`;

        // Request limitNum + 1 items to verify if next page exists
        const [authRes, productsRes] = await Promise.all([
            supabase.auth.getUser(),
            getOrSet(filterKey, async () => {
                const res = await query.range(from, to + 1);
                if (res.error) throw new Error(res.error.message || 'Failed to retrieve listings');
                return { data: res.data || [] };
            }, 45).catch(err => ({ error: err.message, data: [] }))
        ]);

        if (productsRes.error) {
            console.error('Error fetching marketplace products:', productsRes.error);
            return {
                products: [],
                hasMore: false,
                wishlistIds: [],
                error: productsRes.error || 'Failed to retrieve listings'
            };
        }

        const user = authRes.data?.user;
        const [wishlistRes] = await Promise.all([
            user
                ? supabase.from('wishlist').select('product_id').eq('user_id', user.id)
                : Promise.resolve({ data: [] }),
        ]);

        const wishlistIds = wishlistRes.data?.map(item => item.product_id) || [];
        let rawProducts = productsRes.data || [];

        const hasMore = rawProducts.length > limitNum;
        if (hasMore) {
            rawProducts = rawProducts.slice(0, limitNum);
        }

        // Map products to extract active advertisement_id
        const now = new Date();
        const rawProductsWithAdId = rawProducts.map(p => {
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

        let products = rawProductsWithAdId;
        const isExplicitSort = sortOption === 'price-low' || sortOption === 'price-high' || sortOption === 'oldest';

        if (!isExplicitSort) {
            const promoted = rawProductsWithAdId.filter(p => p.advertisement_id || p.is_boosted || p.is_featured);
            const organic = rawProductsWithAdId.filter(p => !p.advertisement_id && !p.is_boosted && !p.is_featured);

            const rotatedPromoted = getFairRotatedPromotions(promoted, {
                userCampus: campusQuery,
                windowMinutes: 30,
                seedOffset: 10
            });

            products = interleavePromotedListings(organic, rotatedPromoted, {
                firstAdIndex: 0,
                interval: 4
            });
        }

        return {
            products,
            hasMore,
            wishlistIds,
            error: null
        };
    } catch (err) {
        console.error('Unexpected error in fetchMarketplaceProducts:', err);
        return {
            products: [],
            hasMore: false,
            wishlistIds: [],
            error: err.message || 'An unexpected error occurred'
        };
    }
}
