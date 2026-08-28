/**
 * Promotion Algorithm Utilities
 * 
 * Provides:
 * 1. Fair rolling-window time seeds for equitable ad impression distribution.
 * 2. Multi-factor ranking scoring (tier base, campus proximity, listing completeness).
 * 3. Organic slot-interleaving to blend promoted listings into the feed without spamming.
 */

import { seededShuffle } from './formatters';

/**
 * Returns a rolling time seed (e.g. shifts every 30 minutes)
 * to ensure that all active paying advertisers rotate through top positions fairly
 * rather than one seller monopolizing position #1 all day.
 * 
 * @param {number} windowMinutes - Time window size in minutes (default: 30)
 * @param {number} offset - Optional offset for different components
 * @returns {number} Deterministic integer seed for the current time window
 */
export function getFairTimeSeed(windowMinutes = 30, offset = 0) {
    const now = new Date();
    const totalMinutes = Math.floor(now.getTime() / (windowMinutes * 60 * 1000));
    return totalMinutes + offset;
}

/**
 * Calculates a multi-factor promotion score for a listing.
 * 
 * Score components:
 * - Tier Weight: Featured Spotlight (3.0), Boost (2.0), Organic (1.0)
 * - Campus Match: +50% relevance if listing is on the user's campus
 * - Quality Factor: +20% if verified seller, +10% if multiple images
 * 
 * @param {Object} product - Product record with seller & ads info
 * @param {Object} context - User context (campus, etc.)
 * @returns {number} Final promotion score
 */
export function computePromotionScore(product, context = {}) {
    let score = 1.0;

    // 1. Tier Weight
    if (product.ad_type === 'Featured' || product.is_featured) {
        score *= 3.0;
    } else if (product.ad_type === 'Boost' || product.is_boosted) {
        score *= 2.0;
    }

    // 2. Campus Proximity
    if (context.userCampus && product.campus) {
        if (product.campus.toLowerCase() === context.userCampus.toLowerCase()) {
            score *= 1.5;
        }
    }

    // 3. Quality signals
    if (product.seller?.is_verified) {
        score *= 1.2;
    }
    if (Array.isArray(product.images) && product.images.length >= 2) {
        score *= 1.1;
    }

    return score;
}

/**
 * Interleaves promoted listings into an organic listing feed at natural intervals.
 * 
 * Standard ad density: 1 promoted listing every 4 organic listings (20% ad density).
 * Positions: #1, #5, #9, #13, etc.
 * 
 * @param {Array} organicListings - Array of regular non-promoted listings
 * @param {Array} promotedListings - Array of active promoted listings (already rotated/scored)
 * @param {Object} options - Interleaving configuration
 * @returns {Array} Seamlessly interleaved listings
 */
export function interleavePromotedListings(organicListings = [], promotedListings = [], options = {}) {
    const {
        firstAdIndex = 0,     // Slot 0 (1st item) or slot 1 (2nd item)
        interval = 4,         // 1 sponsored item every 4 organic items
        maxAds = null         // Max number of sponsored items to inject
    } = options;

    if (!promotedListings || promotedListings.length === 0) {
        return organicListings;
    }
    if (!organicListings || organicListings.length === 0) {
        return promotedListings;
    }

    const result = [];
    let organicIdx = 0;
    let promoIdx = 0;
    const maxPromosToInsert = maxAds !== null ? Math.min(maxAds, promotedListings.length) : promotedListings.length;

    // Build the interleaved feed
    while (organicIdx < organicListings.length || (promoIdx < maxPromosToInsert)) {
        const currentPosition = result.length;

        // Check if current slot is an ad insertion slot
        const isAdSlot = promoIdx < maxPromosToInsert && (
            currentPosition === firstAdIndex ||
            (currentPosition > firstAdIndex && (currentPosition - firstAdIndex) % (interval + 1) === 0)
        );

        if (isAdSlot) {
            result.push(promotedListings[promoIdx]);
            promoIdx++;
        } else if (organicIdx < organicListings.length) {
            result.push(organicListings[organicIdx]);
            organicIdx++;
        } else if (promoIdx < maxPromosToInsert) {
            // If organic items run out, append any remaining promo items
            result.push(promotedListings[promoIdx]);
            promoIdx++;
        }
    }

    return result;
}

/**
 * Sorts and fairly rotates active promotions using time-windowed seeding and scoring.
 * 
 * @param {Array} ads - List of promoted listings
 * @param {Object} context - Optional context (userCampus, seedOffset)
 * @returns {Array} Sorted & fairly rotated promoted listings
 */
export function getFairRotatedPromotions(ads = [], context = {}) {
    if (!ads || ads.length <= 1) return ads || [];

    // Step 1: Shuffle deterministically within the current time window for fairness
    const seed = getFairTimeSeed(context.windowMinutes || 30, context.seedOffset || 0);
    const shuffled = seededShuffle(ads, seed);

    // Step 2: Apply multi-factor score adjustment
    return [...shuffled].sort((a, b) => {
        const scoreA = computePromotionScore(a, context);
        const scoreB = computePromotionScore(b, context);
        return scoreB - scoreA;
    });
}

/**
 * Ensures the Featured slider never shows the same items in the same order as the Hero Banner.
 * 
 * Strategy:
 * 1. Identify items already prioritized in the hero banner.
 * 2. Prioritize active ads that are NOT in the hero banner top slots.
 * 3. Append remaining ads with a circular shift / divergent seed so they never match the banner sequence.
 * 
 * @param {Array} activeAds - All active promoted listings
 * @param {Array} bannerProducts - Selected banner products
 * @param {Object} context - Optional context (windowMinutes, seedOffset)
 * @returns {Array} Distinctly ordered promotions for Featured slider
 */
export function getDivergentFeaturedPromotions(activeAds = [], bannerProducts = [], context = {}) {
    if (!activeAds || activeAds.length === 0) return [];
    if (!bannerProducts || bannerProducts.length === 0) {
        return getFairRotatedPromotions(activeAds, { ...context, seedOffset: (context.seedOffset || 0) + 1 });
    }

    const bannerIdSet = new Set(bannerProducts.map(p => p.id));
    const nonBannerAds = activeAds.filter(p => !bannerIdSet.has(p.id));
    const rotatedNonBanner = getFairRotatedPromotions(nonBannerAds, {
        ...context,
        seedOffset: (context.seedOffset || 0) + 2
    });

    // Circular shift banner items to guarantee position #0 is different and sequence never matches
    const bannerItemsReordered = bannerProducts.length > 1
        ? [...bannerProducts.slice(1), bannerProducts[0]]
        : bannerProducts;

    return [...rotatedNonBanner, ...bannerItemsReordered];
}

