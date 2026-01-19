import Link from 'next/link';
import { createClient } from '../../../utils/supabase/server';
import { redirect } from 'next/navigation';
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

    // 2. Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // 3. Check Subscription Status - Get all subscriptions, not just active
    const { data: allSubscriptions } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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

    // 4. Fetch User's Listings
    const { data: listings } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

    // 5. Calculate Stats
    const products = listings || [];
    const activeListings = products.filter(p => p.status === 'Active' || !p.status).length;
    
    // Calculate total earnings from orders
    const { data: sellerOrders } = await supabase
        .from('orders')
        .select('total_amount, status')
        .eq('seller_id', user.id)
        .eq('status', 'Completed');
    
    const totalEarnings = sellerOrders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;
    const itemsSold = sellerOrders?.length || 0;

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
        />
    );
}
