import Link from 'next/link';
import { createClient } from '../utils/supabase/server';
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import WishlistButton from "../components/WishlistButton";
import PromotedBanner from "../components/PromotedBanner";

export const dynamic = "force-dynamic";

export default async function Home() {
  console.log('[HomePage] Execution started');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('[HomePage] Supabase URL:', supabaseUrl);
  console.log('[HomePage] Key Length:', supabaseAnonKey?.length || 0);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[HomePage] Missing Supabase environment variables');
  }

  const supabase = await createClient();

  // Get current user for wishlist check
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user's wishlist IDs
  let wishlistIds = [];
  if (user) {
    const { data: wishlistItems } = await supabase
      .from('wishlist')
      .select('product_id')
      .eq('user_id', user.id);
    wishlistIds = wishlistItems?.map(item => item.product_id) || [];
  }

  // Fetch banner products (Featured & Boosted)
  const { data: rawBannerProducts } = await supabase
    .from('products')
    .select('*, seller:profiles(display_name, avatar_url)')
    .or('is_featured.eq.true,is_boosted.eq.true')
    .eq('status', 'Active')
    .limit(15);

  // Shuffle the products randomly
  const bannerProducts = rawBannerProducts ? [...rawBannerProducts].sort(() => Math.random() - 0.5) : [];

  // Fetch boosted products (for horizontal scroll)
  const { data: rawBoostedProducts } = await supabase
    .from('products')
    .select('*, seller:profiles(display_name, avatar_url)')
    .eq('is_boosted', true)
    .eq('status', 'Active')
    .limit(20);

  // Shuffle boosted products
  const boostedProducts = rawBoostedProducts ? [...rawBoostedProducts].sort(() => Math.random() - 0.5) : [];

  // Fetch latest products
  const { data: rawLatestProducts } = await supabase
    .from('products')
    .select('*, seller:profiles(display_name, avatar_url)')
    .eq('status', 'Active')
    .order('created_at', { ascending: false })
    .limit(20);

  // Shuffle latest products
  const latestProducts = rawLatestProducts ? [...rawLatestProducts].sort(() => Math.random() - 0.5) : [];

  // Fallback for featured section if no boosted products
  // Using the shuffled latest products for fallback too
  const displayFeatured = boostedProducts && boostedProducts.length > 0 ? boostedProducts : latestProducts.slice(0, 10);


  const categories = [
    { name: 'All', active: true },
    { name: 'Textbooks', active: false },
    { name: 'Electronics', active: false },
    { name: 'Furniture', active: false },
    { name: 'Clothing', active: false }
  ];

  return (
    <div className="bg-white dark:bg-[#242428] text-gray-900 dark:text-gray-50 font-display antialiased min-h-screen">
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 max-w-md mx-auto bg-white dark:bg-[#242428]">
        {/* Promoted Banner Section */}
        <PromotedBanner products={bannerProducts} />

        {/* Search Bar */}
        <div className="px-5 py-2">
          <SearchBar placeholder="Search campus finds..." />
        </div>

        {/* Category Chips */}
        <div className="flex w-full overflow-x-auto px-5 py-4 no-scrollbar space-x-3">
          {categories.map((cat) => (
            <button
              key={cat.name}
              className={`chip ${cat.active ? 'chip-active' : 'chip-inactive'}`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Featured Section */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Featured for You</h1>
          <button className="text-sm font-semibold text-primary hover:text-primary-dark">See All</button>
        </div>

        {/* Horizontal Featured Feed */}
        <div className="flex w-full overflow-x-auto px-5 pb-6 no-scrollbar space-x-4">
          {displayFeatured && displayFeatured.length > 0 ? (
            displayFeatured.map(product => (
              <div key={product.id} className="min-w-[280px] group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-lg dark:bg-[#2d2d32] dark:shadow-none dark:border dark:border-gray-700/50">
                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-200">
                  <Link href={`/marketplace/${product.id}`} className="absolute inset-0">
                    <img
                      src={product.image_url || product.images?.[0]}
                      alt={product.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </Link>
                  <WishlistButton
                    productId={product.id}
                    initialIsSaved={wishlistIds.includes(product.id)}
                  />
                </div>

                {/* Content */}
                <div className="flex flex-col p-4">
                  <h3 className="text-base font-bold leading-tight text-gray-900 dark:text-white line-clamp-1">{product.title}</h3>
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
                      <p className="text-xs font-medium text-gray-500 truncate">{product.seller?.display_name || 'Seller'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="w-full text-center py-8">
              <p className="text-gray-500 text-sm">No featured listings.</p>
            </div>
          )}
        </div>

        {/* Recommended Section Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Recommended for You</h1>
          <Link href="/marketplace" className="text-sm font-semibold text-primary hover:text-primary-dark">View New</Link>
        </div>

        {/* Vertical Recommended Feed */}
        <div className="flex flex-col gap-6 px-5">
          {latestProducts && latestProducts.length > 0 ? (
            latestProducts.map(product => (
              <div key={product.id} className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-lg dark:bg-[#2d2d32] dark:shadow-none dark:border dark:border-gray-700/50">
                {/* Image */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-200">
                  <Link href={`/marketplace/${product.id}`} className="absolute inset-0">
                    <img
                      src={product.image_url || product.images?.[0]}
                      alt={product.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </Link>
                  <WishlistButton
                    productId={product.id}
                    initialIsSaved={wishlistIds.includes(product.id)}
                  />
                </div>

                {/* Content */}
                <div className="flex flex-col p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="pr-4 flex-1">
                      <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-white line-clamp-2">{product.title}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        {product.seller?.avatar_url ? (
                          <img src={product.seller.avatar_url} className="h-5 w-5 rounded-full object-cover" alt={product.seller.display_name} />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[10px] text-white font-bold">
                            {product.seller?.display_name?.[0] || 'U'}
                          </div>
                        )}
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{product.seller?.display_name || 'Seller'}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-xl font-bold text-gray-900 dark:text-white">GHS {product.price}</p>
                  </div>
                  <Link
                    href={`/marketplace/${product.id}`}
                    className="mt-2 btn-primary"
                  >
                    <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                    View Details
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No recommendations found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
