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
        .select(`
            *,
            wallet:wallets (
                id,
                user_id,
                profile:profiles (
                    id,
                    display_name,
                    email,
                    avatar_url
                )
            ),
            order:orders (
                id,
                status,
                total_amount,
                product:products (
                    id,
                    title
                )
            )
        `)
        .order('created_at', { ascending: false });

    if (queryError) {
        console.error('Error fetching transactions:', queryError);
    }

    // 4. Calculate metrics
    const transactions = transactionsData || [];
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
