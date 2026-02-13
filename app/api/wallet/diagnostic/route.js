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

        // Probe Wallets table
        const { error: walletsCurErr } = await adminSupabase.from('wallets').select('currency').limit(1);
        const { error: walletsUpdErr } = await adminSupabase.from('wallets').select('updated_at').limit(1);

        // Probe Wallet Transactions table
        const { error: transRefErr } = await adminSupabase.from('wallet_transactions').select('reference').limit(1);
        const { error: transDescErr } = await adminSupabase.from('wallet_transactions').select('description').limit(1);
        const { error: transBeforeErr } = await adminSupabase.from('wallet_transactions').select('balance_before').limit(1);

        // Get one full row from each to see ALL available columns
        const { data: walletRow } = await adminSupabase.from('wallets').select('*').limit(1).single();
        const { data: transRow } = await adminSupabase.from('wallet_transactions').select('*').limit(1).single();

        return NextResponse.json({
            user_id: user.id,
            wallets_schema: {
                has_currency: !walletsCurErr,
                has_updated_at: !walletsUpdErr,
                available_columns: walletRow ? Object.keys(walletRow) : 'No rows to check',
                currency_error: walletsCurErr?.message,
            },
            transactions_schema: {
                has_reference: !transRefErr,
                has_description: !transDescErr,
                has_balance_before: !transBeforeErr,
                available_columns: transRow ? Object.keys(transRow) : 'No rows to check',
                reference_error: transRefErr?.message,
            },
            current_user_wallet: await adminSupabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle(),
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
