import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { createClient } from '../utils/supabase/server';
import SearchBar from "../components/SearchBar";
import WishlistButton from "../components/WishlistButton";
import PromotedBanner from "../components/PromotedBanner";
import { toSentenceCase } from '../utils/formatters';

export const revalidate = 60;

async function getHomeData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [wishlistRes, bannerRes, boostedRes, latestRes] = await Promise.all([
    user
      ? supabase.from('wishlist').select('product_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    supabase
      .from('products')
      .select('*, seller:profiles(display_name, avatar_url, is_verified)')
      .or('is_featured.eq.true,is_boosted.eq.true')
      .eq('status', 'Active')
      .limit(15),
    supabase
      .from('products')
      .select('*, seller:profiles(display_name, avatar_url, is_verified)')
      .eq('is_boosted', true)
      .eq('status', 'Active')
      .limit(20),
    supabase
      .from('products')
      .select('*, seller:profiles(display_name, avatar_url, is_verified)')
      .eq('status', 'Active')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    wishlistIds: wishlistRes.data?.map(item => item.product_id) || [],
    bannerProducts: bannerRes.data ? [...bannerRes.data].sort(() => Math.random() - 0.5) : [],
    boostedProducts: boostedRes.data ? [...boostedRes.data].sort(() => Math.random() - 0.5) : [],
    latestProducts: latestRes.data ? [...latestRes.data].sort(() => Math.random() - 0.5) : [],
  };
}

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

  return (
    <>
      {/* Featured Section */}
      <div className="flex items-center justify-between px-5 pt-2 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Featured for You</h2>
        <Link href="/marketplace" className="text-sm font-semibold text-primary hover:text-primary-dark">See All</Link>
      </div>
      <div className="flex w-full overflow-x-auto px-5 pb-6 no-scrollbar space-x-4">
        {displayFeatured.map(product => (
          <Link
            key={product.id}
            href={`/marketplace/${product.id}`}
            className="min-w-[280px] group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-lg dark:bg-[#2d2d32] dark:shadow-none dark:border dark:border-gray-700/50 cursor-pointer"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-200">
              <Image
                src={product.image_url || product.images?.[0] || '/placeholder.png'}
                alt={product.title}
                fill
                sizes="280px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {product.condition && (
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
                  {product.condition}
                </div>
              )}
              <WishlistButton productId={product.id} initialIsSaved={wishlistIds.includes(product.id)} />
            </div>
            <div className="flex flex-col p-4">
              <h3 className="text-base font-bold leading-tight text-gray-900 dark:text-white line-clamp-1">{toSentenceCase(product.title)}</h3>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-bold text-primary">GHS {product.price}</p>
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {product.seller?.avatar_url ? (
                    <img src={product.seller.avatar_url} className="h-5 w-5 rounded-full object-cover shrink-0" alt={product.seller.display_name} />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold shrink-0">
                      {product.seller?.display_name?.[0] || 'U'}
                    </div>
                  )}
                  <p className="text-xs font-semibold text-gray-500 truncate">{product.seller?.display_name || 'Seller'}</p>
                  {product.seller?.is_verified && <span className="material-symbols-outlined text-primary text-[14px] font-bold">verified</span>}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recommended Section */}
      <div className="flex items-center justify-between px-5 pt-4 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Recommended for You</h2>
        <Link href="/marketplace" className="text-sm font-semibold text-primary hover:text-primary-dark">View New</Link>
      </div>
      <div className="flex flex-col gap-6 px-5">
        {latestProducts.map(product => (
          <Link
            key={product.id}
            href={`/marketplace/${product.id}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-lg dark:bg-[#2d2d32] dark:shadow-none dark:border dark:border-gray-700/50 cursor-pointer"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-200">
              <Image
                src={product.image_url || product.images?.[0] || '/placeholder.png'}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 100vw, 448px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {product.condition && (
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
                  {product.condition}
                </div>
              )}
              <WishlistButton productId={product.id} initialIsSaved={wishlistIds.includes(product.id)} />
            </div>
            <div className="flex flex-col p-4">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[9px] font-black uppercase tracking-widest border border-primary/20">{getRecReason(product)}</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-md text-[9px] font-black uppercase tracking-widest border border-gray-200 dark:border-gray-700">{product.category || 'General'}</span>
              </div>
              <div className="mb-3 flex items-start justify-between">
                <div className="pr-4 flex-1">
                  <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-white line-clamp-2">{toSentenceCase(product.title)}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    {product.seller?.avatar_url ? (
                      <img src={product.seller.avatar_url} className="h-5 w-5 rounded-full object-cover" alt={product.seller.display_name} />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[10px] text-white font-bold">{product.seller?.display_name?.[0] || 'U'}</div>
                    )}
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">{product.seller?.display_name || 'Seller'}</p>
                    {product.seller?.is_verified && <span className="material-symbols-outlined text-primary text-[14px] font-bold">verified</span>}
                  </div>
                </div>
                <p className="shrink-0 text-xl font-black text-primary tracking-tighter">GHS {product.price}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [wishlistRes, bannerRes, boostedRes, latestRes] = await Promise.all([
    user
      ? supabase.from('wishlist').select('product_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    supabase
      .from('products')
      .select('*, seller:profiles(display_name, avatar_url, is_verified)')
      .or('is_featured.eq.true,is_boosted.eq.true')
      .eq('status', 'Active')
      .limit(15),
    supabase
      .from('products')
      .select('*, seller:profiles(display_name, avatar_url, is_verified)')
      .eq('is_boosted', true)
      .eq('status', 'Active')
      .limit(20),
    supabase
      .from('products')
      .select('*, seller:profiles(display_name, avatar_url, is_verified)')
      .eq('status', 'Active')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const wishlistIds = wishlistRes.data?.map(item => item.product_id) || [];
  const bannerProducts = bannerRes.data ? [...bannerRes.data].sort(() => Math.random() - 0.5) : [];
  const boostedProducts = boostedRes.data ? [...boostedRes.data].sort(() => Math.random() - 0.5) : [];
  const latestProducts = latestRes.data ? [...latestRes.data].sort(() => Math.random() - 0.5) : [];

  return (
    <div className="bg-white dark:bg-[#242428] text-gray-900 dark:text-gray-50 font-display antialiased min-h-screen">
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 max-w-md mx-auto bg-white dark:bg-[#242428]">
        <PromotedBanner products={bannerProducts} />

        <div className="px-5 py-2">
          <SearchBar placeholder="Search campus finds..." />
        </div>

        <div className="flex w-full overflow-x-auto px-5 py-4 no-scrollbar space-x-3">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={cat.name === 'All' ? '/marketplace' : `/marketplace?category=${cat.name}`}
              className="chip chip-inactive whitespace-nowrap"
            >
              <span>{cat.name}</span>
            </Link>
          ))}
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
