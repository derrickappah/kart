import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import MyListingsClient from './MyListingsClient';

export default async function SellerAdsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user's products (listings) with stats
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading products:', error);
  }

  return (
    <MyListingsClient initialProducts={products || []} />
  );
}
