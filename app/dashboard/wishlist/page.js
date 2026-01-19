import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import WishlistClient from './WishlistClient';

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
        seller:profiles!products_seller_id_fkey(
          display_name,
          avatar_url,
          university
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading wishlist:', error);
  }

  return (
    <WishlistClient initialItems={wishlistItems || []} />
  );
}
