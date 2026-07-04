import { createClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import UserDetailsClient from './UserDetailsClient';

export default async function UserDetailsPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check (admin check is handled by layout)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) redirect('/login');

    // Fetch user profile first
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    if (profileError || !profile) {
        notFound();
    }

    // Fetch related details in parallel
    const [walletResult, productsResult, ordersResult] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', id).maybeSingle(),
        supabase.from('products').select('*').eq('seller_id', id).order('created_at', { ascending: false }),
        supabase.from('orders').select('*, product:product_id(title, image_url)').or(`buyer_id.eq.${id},seller_id.eq.${id}`).order('created_at', { ascending: false })
    ]);

    const wallet = walletResult.data || null;
    const products = productsResult.data || [];
    const orders = ordersResult.data || [];

    // Fetch wallet transactions if wallet exists
    let walletTransactions = [];
    if (wallet) {
        const { data: transactions } = await supabase
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
