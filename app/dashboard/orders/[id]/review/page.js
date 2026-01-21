import { createClient } from '@/utils/supabase/server';
import ReviewClient from './ReviewClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ReviewPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Fetch order details for the review screen
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
            *,
            product:products(*),
            seller:profiles!orders_seller_id_profiles_fkey(*)
        `)
        .eq('id', id)
        .single();

    if (orderError || !order) {
        return (
            <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#131d1f] text-[#0e181b] dark:text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
                </div>
                <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
                <p className="text-gray-400 mb-8 max-w-xs">The order you're looking for doesn't exist or you don't have access to it.</p>
                <Link href="/dashboard/orders" className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors font-medium">
                    Back to Orders
                </Link>
            </div>
        );
    }

    return <ReviewClient orderId={id} seller={order.seller} product={order.product} />;
}
