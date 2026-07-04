import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import TransactionsClient from './TransactionsClient';

export default async function AdminTransactionsPage() {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // 2. Admin Check (Security-in-depth)
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_admin) {
        redirect('/');
    }

    // 3. Fetch data using service role client to bypass user RLS policies and see all transactions
    const adminSupabase = createServiceRoleClient();
    const { data: transactionsData, error: queryError } = await adminSupabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false });

    if (queryError) {
        console.error('Error fetching transactions:', queryError);
    }

    const rawTransactions = transactionsData || [];
    let normalizedTransactions = [];

    if (rawTransactions.length > 0) {
        const walletIds = [...new Set(rawTransactions.map(t => t.wallet_id).filter(Boolean))];
        const orderIds = [...new Set(rawTransactions.map(t => t.order_id).filter(Boolean))];

        // Fetch wallets and orders in parallel
        const [walletsRes, ordersRes] = await Promise.all([
            walletIds.length > 0 
                ? adminSupabase.from('wallets').select('id, user_id').in('id', walletIds)
                : Promise.resolve({ data: [] }),
            orderIds.length > 0
                ? adminSupabase.from('orders').select('id, status, total_amount, product_id').in('id', orderIds)
                : Promise.resolve({ data: [] })
        ]);

        const wallets = walletsRes.data || [];
        const orders = ordersRes.data || [];

        const userIds = [...new Set(wallets.map(w => w.user_id).filter(Boolean))];
        const productIds = [...new Set(orders.map(o => o.product_id).filter(Boolean))];

        // Fetch profiles and products in parallel
        const [profilesRes, productsRes] = await Promise.all([
            userIds.length > 0
                ? adminSupabase.from('profiles').select('id, display_name, email, avatar_url').in('id', userIds)
                : Promise.resolve({ data: [] }),
            productIds.length > 0
                ? adminSupabase.from('products').select('id, title').in('id', productIds)
                : Promise.resolve({ data: [] })
        ]);

        const profiles = profilesRes.data || [];
        const products = productsRes.data || [];

        // Normalize transactions by merging in JS
        normalizedTransactions = rawTransactions.map(t => {
            const wallet = wallets.find(w => w.id === t.wallet_id) || null;
            const profile = wallet ? (profiles.find(p => p.id === wallet.user_id) || null) : null;
            const orderObj = t.order_id ? (orders.find(o => o.id === t.order_id) || null) : null;
            const productObj = orderObj ? (products.find(p => p.id === orderObj.product_id) || null) : null;

            return {
                ...t,
                wallet: wallet ? {
                    ...wallet,
                    profile
                } : null,
                order: orderObj ? {
                    ...orderObj,
                    product: productObj
                } : null
            };
        });
    }

    // 4. Calculate metrics
    const transactions = normalizedTransactions;
    const totalCount = transactions.length;

    // Filters for volume calculation
    const creditTransactions = transactions.filter(t => t.transaction_type === 'Credit');
    const debitTransactions = transactions.filter(t => t.transaction_type === 'Debit');
    const withdrawalTransactions = transactions.filter(t => t.transaction_type === 'Withdrawal');

    const totalVolume = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const creditVolume = creditTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const debitVolume = debitTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const withdrawalVolume = withdrawalTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    return (
        <div className="space-y-8 pb-12">
            <TransactionsClient
                initialTransactions={transactions}
                stats={{
                    total: totalCount,
                    creditCount: creditTransactions.length,
                    debitCount: debitTransactions.length,
                    withdrawalCount: withdrawalTransactions.length,
                    totalVolume,
                    creditVolume,
                    debitVolume,
                    withdrawalVolume
                }}
                error={queryError ? queryError.message : null}
            />
        </div>
    );
}
