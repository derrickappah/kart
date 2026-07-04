import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { createClient } from '../utils/supabase/server';
import SearchBar from "../components/SearchBar";
import WishlistButton from "../components/WishlistButton";
import PromotedBanner from "../components/PromotedBanner";
import AdTracker from "../components/AdTracker";
import { toSentenceCase, seededShuffle, formatPrice } from '../utils/formatters';
import FeaturedSlider from "../components/FeaturedSlider";

export const revalidate = 60;


const categories = [
  { name: 'All' },
  { name: 'Textbooks' },
  { name: 'Electronics' },
  { name: 'Dorm Furniture' },
  { name: 'Clothing' },
  { name: 'School Supplies' },
  { name: 'Tickets & Events' },
  { name: 'Services & Tutoring' },
  { name: 'Beauty & Grooming' },
  { name: 'Sports & Fitness' },
  { name: 'Kitchenware' },
  { name: 'Musical Instruments' },
  { name: 'Games & Consoles' },
  { name: 'Health & Wellness' },
  { name: 'Arts & Crafts' },
  { name: 'Home Appliances' },
];

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

async function FeaturedSection({ wishlistIds, boostedProducts, latestProducts }) {
  const displayFeatured = boostedProducts.length > 0 ? boostedProducts : latestProducts.slice(0, 10);

  const getRecReason = (product) => {
    if (product.is_boosted) return "Highest Priority";
    if (product.category === 'Textbooks') return "Highly requested in your level";
    if (product.campus) return `Trending at ${product.campus}`;
    return "Based on your search interest";
  };

  const getBadgeStyle = (recReason) => {
    if (recReason === "Highest Priority") {
      return {
        bg: "bg-indigo-50/95 dark:bg-[#1a1c2e]/90 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40",
        dot: "bg-indigo-500",
        label: "Top Pick"
      };
    } else if (recReason.includes("Highly requested")) {
      return {
        bg: "bg-rose-50/95 dark:bg-[#2e1a22]/90 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40",
        dot: "bg-rose-500",
        label: "For You"
      };
    } else if (recReason.includes("Trending")) {
      return {
        bg: "bg-amber-50/95 dark:bg-[#2c2017]/90 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40",
        dot: "bg-amber-500",
        label: "Popular"
      };
    } else {
      return {
        bg: "bg-teal-50/95 dark:bg-[#182a26]/90 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/40",
        dot: "bg-teal-500",
        label: "Matching"
      };
    }
  };

  return (
    <>
      {/* Featured Section */}
      <div className="flex items-center justify-between px-5 pt-2 pb-4">
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
        {latestProducts.map(product => {
          const recReason = getRecReason(product);
          const badge = getBadgeStyle(recReason);

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
                
                {/* Premium Recommendation Badge */}
                <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm border flex items-center gap-1.5 ${badge.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                  {badge.label}
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

  // Expire any completed promotions on page load (runs on ISR revalidation once every 60s)
  const { error: expireError } = await supabase.rpc('expire_completed_promotions');
  if (expireError) {
    console.error('Error running expire_completed_promotions RPC:', expireError);
  }

  const [wishlistRes, adsRes, latestRes] = await Promise.all([
    user
      ? supabase.from('wishlist').select('product_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    supabase
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
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .limit(30),
    supabase
      .from('products')
      .select('*, seller:profiles(display_name, avatar_url, is_verified)')
      .eq('status', 'Active')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const wishlistIds = wishlistRes.data?.map(item => item.product_id) || [];
  
  // Format active promotions to match products shape with advertisement_id
  const activeAds = (adsRes.data || []).map(ad => ({
    ...ad.product,
    advertisement_id: ad.id,
    ad_type: ad.ad_type
  }));

  const bannerProducts = seededShuffle(activeAds, 42);
  const boostedProducts = seededShuffle(activeAds.filter(ad => ad.ad_type === 'Boost'), 43);
  const latestProducts = seededShuffle(latestRes.data || [], 44);

  return (
    <div className="bg-white dark:bg-[#242428] text-gray-900 dark:text-gray-50 font-display antialiased min-h-screen">
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 max-w-md mx-auto bg-white dark:bg-[#242428]">
        <PromotedBanner products={bannerProducts} />

        <div className="px-4 py-3 sticky top-0 z-40 bg-white/95 dark:bg-[#242428]/95 backdrop-blur-md border-b border-gray-100/50 dark:border-gray-800/30">
          <SearchBar
            placeholder="Search campus finds..."
            showFilter={true}
            leftContent={
              <div className="flex items-center overflow-x-auto no-scrollbar space-x-2 w-full py-1">
                {categories.map((cat) => (
                  <Link
                    key={cat.name}
                    href={cat.name === 'All' ? '/marketplace' : `/marketplace?category=${cat.name}`}
                    className="flex h-9 items-center justify-center rounded-full px-4 text-xs font-black transition-all active:scale-95 whitespace-nowrap bg-primary/10 text-primary hover:bg-primary/20 border border-primary/15 dark:bg-primary/20 dark:text-blue-400 dark:border-primary/25"
                  >
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            }
          />
        </div>

        {/* Heavy products section is streamed separately — page renders above instantly */}
        <Suspense fallback={
          <div className="px-5">
            <div className="h-7 w-40 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-full mb-4" />
            <div className="flex gap-4 overflow-hidden pb-6">
              {[1,2,3].map(i => <ProductCardSkeleton key={i} />)}
            </div>
          </div>
        }>
          <FeaturedSection wishlistIds={wishlistIds} boostedProducts={boostedProducts} latestProducts={latestProducts} />
        </Suspense>
      </div>
    </div>
  );
}
