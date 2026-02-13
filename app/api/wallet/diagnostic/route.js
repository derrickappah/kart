import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminSupabase = createServiceRoleClient();

        // 1. Check wallet record
        const { data: wallet, error: walletError } = await adminSupabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        // 2. Check latest transactions
        const { data: transactions, error: transError } = await adminSupabase
            .from('wallet_transactions')
            .select('*')
            .eq('wallet_id', wallet?.id)
            .order('created_at', { ascending: false })
            .limit(5);

        // 3. Get table info (hacky way to check columns)
        const { data: columns } = await adminSupabase.rpc('get_table_columns', { table_name: 'wallets' }) || { data: 'RPC not found' };

        return NextResponse.json({
            user_id: user.id,
            email: user.email,
            wallet: wallet || 'No wallet found',
            wallet_error: walletError,
            recent_transactions: transactions || [],
            trans_error: transError,
            env_status: {
                has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                has_paystack_key: !!process.env.PAYSTACK_SECRET_KEY,
            }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
