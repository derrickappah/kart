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

        // 1. Check user profile
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // 2. Check wallet record for this user
        const { data: wallet, error: walletError } = await adminSupabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        // 3. Check for ANY wallet records (system-wide)
        const { data: allWallets } = await adminSupabase
            .from('wallets')
            .select('id, user_id, balance, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        const { count: totalWallets } = await adminSupabase
            .from('wallets')
            .select('*', { count: 'exact', head: true });

        // 4. Check for ANY transactions (system-wide)
        const { data: allTrans } = await adminSupabase
            .from('wallet_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        // 5. Try to get schema info via error hint
        const { error: schemaHint } = await adminSupabase
            .from('wallets')
            .select('non_existent_column');

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                profile_exists: !!profile,
            },
            wallet: {
                user_wallet: wallet || 'No wallet found',
                wallet_error: walletError,
                system_total_count: totalWallets,
                recent_system_wallets: allWallets || [],
            },
            transactions: {
                latest_system_transactions: allTrans || [],
            },
            schema: {
                error_hint: schemaHint?.message,
            },
            env: {
                has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                has_paystack_key: !!process.env.PAYSTACK_SECRET_KEY,
            }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
