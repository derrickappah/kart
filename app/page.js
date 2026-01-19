import Link from 'next/link';
import { createClient } from '../utils/supabase/server';
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";

export default async function Home() {
  console.log('[HomePage] Execution started');
  console.log('[HomePage] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('[HomePage] Key Length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);
  const supabase = await createClient();

  // Fetch featured/boosted products
  const { data: featuredProducts } = await supabase
    .from('products')
    .select('*, seller:profiles!seller_id(display_name, avatar_url)')
    .or('is_featured.eq.true,is_boosted.eq.true')
    .eq('status', 'Active')
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch latest products
  const { data: latestProducts } = await supabase
    .from('products')
    .select('*, seller:profiles!seller_id(display_name, avatar_url)')
    .eq('status', 'Active')
    .order('created_at', { ascending: false })
    .limit(10);

  const displayProducts = featuredProducts && featuredProducts.length > 0 ? featuredProducts : latestProducts;

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
        {/* Search Bar */}
        <div className="px-5 py-2 mt-4">
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

        {/* Section Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Featured for You</h1>
          <button className="text-sm font-semibold text-primary hover:text-primary-dark">See All</button>
        </div>

        {/* Product Feed */}
        <div className="flex flex-col gap-6 px-5">
          {displayProducts && displayProducts.length > 0 ? (
            displayProducts.map(product => (
              <div key={product.id} className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-lg dark:bg-[#2d2d32] dark:shadow-none dark:border dark:border-gray-700/50">
                {/* Image */}
                <Link href={`/marketplace/${product.id}`} className="relative aspect-[4/3] w-full overflow-hidden bg-gray-200">
                  <img
                    src={product.image_url || product.images?.[0]}
                    alt={product.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <button className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-colors hover:bg-white/40 z-10">
                    <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 0" }}>favorite</span>
                  </button>
                </Link>

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
                    <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                    Chat with Seller
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No listings found. Check back soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
