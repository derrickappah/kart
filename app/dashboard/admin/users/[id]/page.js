import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import UserDetailsClient from './UserDetailsClient';

export default async function UserDetailsPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) redirect('/login');

    // 2. Admin Check (Security-in-depth)
    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', authUser.id)
        .single();

    if (!adminProfile?.is_admin) {
        redirect('/');
    }

    // 3. Fetch data using service role client to bypass user RLS policies
    const adminSupabase = createServiceRoleClient();

    // Fetch user profile first
    const { data: profile, error: profileError } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    if (profileError || !profile) {
        notFound();
    }

    // Fetch related details in parallel using admin client
    const [walletResult, productsResult, ordersResult] = await Promise.all([
        adminSupabase.from('wallets').select('*').eq('user_id', id).maybeSingle(),
        adminSupabase.from('products').select('*').eq('seller_id', id).order('created_at', { ascending: false }),
        adminSupabase.from('orders').select('*, product:product_id(title, image_url)').or(`buyer_id.eq.${id},seller_id.eq.${id}`).order('created_at', { ascending: false })
    ]);

    const wallet = walletResult.data || null;
    const products = productsResult.data || [];
    const orders = ordersResult.data || [];

    // Fetch wallet transactions if wallet exists using admin client
    let walletTransactions = [];
    if (wallet) {
        const { data: transactions } = await adminSupabase
            .from('wallet_transactions')
            .select('*')
            .eq('wallet_id', wallet.id)
            .order('created_at', { ascending: false });
        walletTransactions = transactions || [];
    }

    return (
        <UserDetailsClient
            profile={profile}
            wallet={wallet}
            products={products}
            orders={orders}
            walletTransactions={walletTransactions}
        />
    );
}
