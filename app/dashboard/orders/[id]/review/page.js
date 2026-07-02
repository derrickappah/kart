import DynamicLucideIcon from '@/components/DynamicLucideIcon';
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

    // Fetch order details for the review screen — only select what we need
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
            id,
            buyer_id,
            status,
            product:products(id, title, images, image_url, category),
            seller:profiles!orders_seller_id_profiles_fkey(id, display_name, avatar_url, is_verified)
        `)
        .eq('id', id)
        .single();

    if (orderError || !order) {
        return (
            <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#131d1f] text-[#0e181b] dark:text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                    <DynamicLucideIcon name="error" className="text-red-500 text-3xl" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
                <p className="text-gray-400 mb-8 max-w-xs">The order you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
                <Link href="/dashboard/orders" className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors font-medium">
                    Back to Orders
                </Link>
            </div>
        );
    }

    // Security: only the buyer of this order can submit a review
    if (order.buyer_id !== user.id) {
        redirect('/dashboard/orders');
    }

    // UX: only allow reviews for delivered orders
    if (order.status !== 'Delivered' && order.status !== 'Completed') {
        return (
            <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#131d1f] text-[#0e181b] dark:text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                    <DynamicLucideIcon name="schedule" className="text-amber-500 text-3xl" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Review Not Available</h1>
                <p className="text-gray-400 mb-8 max-w-xs">
                    You can leave a review once the delivery has been confirmed. Current status: <strong>{order.status}</strong>.
                </p>
                <Link href={`/dashboard/orders/${id}`} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors font-medium">
                    Back to Order
                </Link>
            </div>
        );
    }

    return <ReviewClient orderId={id} seller={order.seller} product={order.product} />;
}
