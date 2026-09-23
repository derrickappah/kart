import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { createClient } from '../utils/supabase/server';
import WishlistButton from "../components/WishlistButton";
import StreakBadge from "../components/StreakBadge";
import PromotedBanner from "../components/PromotedBanner";
import AdTracker from "../components/AdTracker";
import { toSentenceCase, seededShuffle, formatPrice } from '../utils/formatters';
import { getFairRotatedPromotions, getDivergentFeaturedPromotions, getFairTimeSeed } from '../utils/promotionAlgorithm';
import FeaturedSlider from "../components/FeaturedSlider";
import { getOrSet } from '@/lib/cache';
import { topFourCategories } from '../utils/categories';

export const revalidate = 60;


function ProductCardSkeleton() {
  return (
    <div className="min-w-[280px] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#2d2d32] border dark:border-gray-700/50">
      <div className="animate-pulse bg-gray-100 dark:bg-gray-800 aspect-[4/3] w-full" />
      <div className="flex flex-col p-4 gap-2">
        <div className="animate-pulse h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
        <div className="animate-pulse h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
      </div>
    </div>
  );
}

async function FeaturedSection({ wishlistIds, featuredProducts, latestProducts }) {
  const TARGET_FEATURED_COUNT = 10;
  const featuredIds = new Set(featuredProducts.map(p => p.id));
  const organicFill = latestProducts
    .filter(p => !featuredIds.has(p.id))
    .slice(0, Math.max(0, TARGET_FEATURED_COUNT - featuredProducts.length));

  const displayFeatured = [...featuredProducts, ...organicFill];
  const displayRecommended = latestProducts.filter(p => !displayFeatured.some(f => f.id === p.id));

  return (
    <>
      {/* Featured Section */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Featured for You</h2>
        <Link href="/marketplace" className="text-sm font-semibold text-primary hover:text-primary-dark">See All</Link>
      </div>
      <FeaturedSlider products={displayFeatured} wishlistIds={wishlistIds} />

      {/* Recommended Section */}
      <div className="flex items-center justify-between px-5 pt-4 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Recommended for You</h2>
        <Link href="/marketplace" className="text-sm font-semibold text-primary hover:text-primary-dark">View New</Link>
      </div>
      <div className="grid grid-cols-2 gap-4 px-5">
        {displayRecommended.map(product => {
          return (
            <Link
              key={product.id}
              href={`/marketplace/${product.id}`}
              className="group flex flex-col gap-2 relative h-full w-full cursor-pointer"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-[#2d2d32] border dark:border-gray-700/50">
                <Image
                  src={product.image_url || product.images?.[0] || '/placeholder.png'}
                  alt={product.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 200px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Tiny Streak Lottie Badge */}
                <div className="absolute top-1.5 left-1.5 z-10 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
                  <StreakBadge className="size-6" />
                </div>

                {product.condition && (
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[9px] font-black text-white uppercase tracking-wider">
                    {product.condition}
                  </div>
                )}
                <WishlistButton productId={product.id} initialIsSaved={wishlistIds.includes(product.id)} />
              </div>
              <div className="flex flex-col gap-0.5 px-1">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">{toSentenceCase(product.title)}</h3>
                <p className="text-primary text-base font-extrabold">₵ {formatPrice(product.price)}</p>
                <div className="flex items-center gap-1 text-gray-400">
                  <DynamicLucideIcon name="location_on" size={14} className="text-[14px]" aria-hidden="true" />
                  <p className="text-[10px] font-bold truncate uppercase">{product.campus || 'On Campus'}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [wishlistRes, adsData, latestData] = await Promise.all([
    user
      ? supabase.from('wishlist').select('product_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    getOrSet('home:ads:active', async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('advertisements')
        .select(`
          id,
          ad_type,
          product:products!inner(
            *,
            seller:profiles(display_name, avatar_url, is_verified)
          )
        `)
        .eq('status', 'Active')
        .eq('product.status', 'Active')
        .lte('start_date', nowIso)
        .gte('end_date', nowIso)
        .limit(40);
      return data || [];
    }, 60),
    getOrSet('home:products:latest', async () => {
      const { data } = await supabase
        .from('products')
        .select('*, seller:profiles(display_name, avatar_url, is_verified)')
        .eq('status', 'Active')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    }, 60),
  ]);

  const wishlistIds = wishlistRes.data?.map(item => item.product_id) || [];
  
  // Format active promotions to match products shape with advertisement_id
  const activeAds = (adsData || [])
    .filter(ad => ad?.product && ad.product.id)
    .map(ad => ({
      ...ad.product,
      advertisement_id: ad.id,
      ad_type: ad.ad_type
    }));

  // Algorithmic fair rotation for Banner and Featured listings (only genuine Featured or Campus Ads in hero banner)
  const bannerCandidateAds = activeAds.filter(ad => ad.ad_type === 'Featured' || ad.ad_type === 'Campus Ad');
  const bannerProducts = getFairRotatedPromotions(
    bannerCandidateAds,
    { windowMinutes: 30, seedOffset: 0 }
  ).slice(0, 5);

  // Both Featured and Boost campaigns are included with divergent ordering so they never mirror the banner order
  const featuredProducts = getDivergentFeaturedPromotions(
    activeAds,
    bannerProducts,
    { windowMinutes: 30, seedOffset: 1 }
  );
  const latestProducts = seededShuffle(latestData || [], getFairTimeSeed(30, 2));

  // Ensure hero is always populated even if no active paid advertisements exist
  const heroProducts = bannerProducts.length > 0
    ? bannerProducts
    : (featuredProducts.length > 0 ? featuredProducts.slice(0, 5) : latestProducts.slice(0, 5));

  return (
    <div className="bg-white dark:bg-[#242428] text-gray-900 dark:text-gray-50 font-display antialiased min-h-screen">
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-4 md:pb-8 max-w-md mx-auto bg-white dark:bg-[#242428]">
        <PromotedBanner products={heroProducts} />

        {/* Shop by Category Section */}
        <section className="pt-5 pb-2" aria-label="Shop by category">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Shop by Category</h2>
            <Link
              href="/marketplace/categories"
              className="text-xs font-bold text-primary hover:text-primary-dark transition-colors"
            >
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 px-5">
            {topFourCategories.map((category) => (
              <Link
                key={category.name}
                href={`/marketplace?category=${encodeURIComponent(category.name)}`}
                className="relative overflow-hidden rounded-2xl bg-[#EEF2F4] dark:bg-[#2A2E33] border border-gray-100/80 dark:border-gray-800/60 p-3.5 h-[116px] sm:h-32 flex flex-col justify-between group active:scale-[0.98] transition-all block w-full"
                aria-label={`Browse ${category.name}`}
              >
                <div className="z-10 flex flex-col max-w-[62%]">
                  <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">
                    {category.name}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug line-clamp-2">
                    {category.subtitle}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-20 h-20 sm:w-24 sm:h-24 pointer-events-none">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.12)] group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100px, 120px"
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Heavy products section is streamed separately — page renders above instantly */}
        <Suspense fallback={
          <div className="px-5">
            <div className="h-7 w-40 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-full mb-4" />
            <div className="flex gap-4 overflow-hidden pb-6">
              {[1,2,3].map(i => <ProductCardSkeleton key={i} />)}
            </div>
          </div>
        }>
          <FeaturedSection wishlistIds={wishlistIds} featuredProducts={featuredProducts} latestProducts={latestProducts} />
        </Suspense>
      </div>
    </div>
  );
}
