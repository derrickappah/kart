import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import OrdersClient from './OrdersClient';

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch buyer's orders with product and seller details
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      product:products(id, title, images, image_url),
      seller:profiles!orders_seller_id_profiles_fkey(display_name, email, is_verified)
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading orders:', error);
  }

  return (
    <OrdersClient orders={orders || []} />
  );
}
