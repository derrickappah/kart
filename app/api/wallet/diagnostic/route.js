import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function GET(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminSupabase = createServiceRoleClient();
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        let testWriteResult = null;

        if (action === 'test_write') {
            // Attempt to create a test wallet or update if exists
            const { data: wallet } = await adminSupabase
                .from('wallets')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!wallet) {
                const { data, error } = await adminSupabase
                    .from('wallets')
                    .insert({ user_id: user.id, balance: 0.01, currency: 'GHS' })
                    .select()
                    .single();
                testWriteResult = { action: 'insert', data, error };
            } else {
                const { data, error } = await adminSupabase
                    .from('wallets')
                    .update({ balance: parseFloat(wallet.balance) + 0.01 })
                    .eq('id', wallet.id)
                    .select()
                    .single();
                testWriteResult = { action: 'update', data, error };
            }
        }

        // Standard diagnostic data
        const { data: wallet } = await adminSupabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle();
        const { data: allWallets } = await adminSupabase.from('wallets').select('id, user_id, balance, created_at').order('created_at', { ascending: false }).limit(3);
        const { data: allTrans } = await adminSupabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(3);

        return NextResponse.json({
            user_id: user.id,
            test_write_result: testWriteResult,
            wallet: wallet || 'No wallet found',
            system_stats: {
                total_wallets: (await adminSupabase.from('wallets').select('*', { count: 'exact', head: true })).count,
                recent_wallets: allWallets,
                recent_transactions: allTrans,
            },
            env: {
                has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                service_key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10),
                has_paystack_key: !!process.env.PAYSTACK_SECRET_KEY,
                paystack_key_prefix: process.env.PAYSTACK_SECRET_KEY?.substring(0, 7),
            },
            debug_tip: "If test_write fails here, the service role key is likely invalid or RLS is blocking even service role (rare). If it succeeds but deposits don't work, Paystack webhook is not reaching your server or secret key is wrong."
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
