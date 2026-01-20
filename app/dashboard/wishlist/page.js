import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import WishlistClient from './WishlistClient';
export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user's wishlist items with product and seller details
  const { data: wishlistItems, error } = await supabase
    .from('wishlist')
    .select(`
      *,
      product:products(
        *,
        seller:profiles(
          display_name,
          avatar_url
        )
      )
    `)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error loading wishlist:', error);
  }

  console.log('[WishlistPage] Items found:', wishlistItems?.length || 0);
  if (wishlistItems?.length > 0) {
    console.log('[WishlistPage] First item product:', wishlistItems[0].product);
  }

  return (
    <WishlistClient initialItems={wishlistItems || []} />
  );
}
