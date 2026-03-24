import Link from 'next/link';
import { createClient } from '../../../utils/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { signout } from '../../auth/actions';
import ManualActivationButton from './ManualActivationButton';
import SellerDashboardClient from './SellerDashboardClient';

export default async function SellerDashboard() {
    const supabase = await createClient();

    // 1. Get User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        redirect('/login');
    }

    // Parallelize all independent queries
    const [
        { data: profile },
        { data: allSubscriptions },
        { data: listings },
        { data: sellerOrders },
        { count: activePromotions }
    ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('subscriptions').select('*, plan:subscription_plans(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
        supabase.from('orders').select('total_amount, status, seller_payout_amount, created_at').eq('seller_id', user.id).in('status', ['Paid', 'Completed', 'Delivered']),
        supabase.from('advertisements').select('*', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'Active')
    ]);

    // Find active subscription (case-insensitive status check)
    const subscription = allSubscriptions?.find(sub =>
        (sub.status === 'Active' || sub.status === 'active') &&
        new Date(sub.end_date) > new Date()
    );

    // Find pending subscriptions
    const pendingSubscriptions = allSubscriptions?.filter(sub =>
        sub.status === 'Pending' || sub.status === 'pending'
    ) || [];

    const isSubscribed = !!(subscription && new Date(subscription.end_date) > new Date());
    const daysUntilExpiry = subscription ? Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

    // Calculate Stats
    const products = listings || [];
    const activeListings = products.filter(p => p.status === 'Active' || !p.status).length;

    const totalEarnings = sellerOrders?.reduce((sum, order) => {
        const amount = parseFloat(order.seller_payout_amount || order.total_amount || 0);
        return sum + amount;
    }, 0) || 0;
    const itemsSold = sellerOrders?.length || 0;

    // Calculate Last 7 Days Earnings for Chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const chartData = Array(7).fill(0);
    const dayLabels = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

        const dayTotal = sellerOrders?.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate.toDateString() === d.toDateString();
        }).reduce((sum, order) => sum + parseFloat(order.seller_payout_amount || order.total_amount || 0), 0) || 0;

        chartData[i] = dayTotal;
    }

    return (
        <SellerDashboardClient
            user={user}
            profile={profile}
            listings={listings}
            isSubscribed={isSubscribed}
            subscription={subscription}
            pendingSubscriptions={pendingSubscriptions}
            totalEarnings={totalEarnings}
            itemsSold={itemsSold}
            activeListings={activeListings}
            daysUntilExpiry={daysUntilExpiry}
            activePromotions={activePromotions || 0}
            chartData={chartData}
            dayLabels={dayLabels}
        />
    );
}
