import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import crypto from 'crypto';

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
        let paystackTestResult = null;
        let webhookSimResult = null;

        if (action === 'test_write') {
            const { data: wallet } = await adminSupabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle();
            if (!wallet) {
                const { data, error } = await adminSupabase.from('wallets').insert({ user_id: user.id, balance: 0.01, currency: 'GHS' }).select().single();
                testWriteResult = { action: 'insert', data, error };
            } else {
                const { data, error } = await adminSupabase.from('wallets').update({ balance: parseFloat(wallet.balance) + 0.01 }).eq('id', wallet.id).select().single();
                testWriteResult = { action: 'update', data, error };
            }
        }

        if (action === 'test_paystack') {
            try {
                const response = await fetch('https://api.paystack.co/integration/payment_session_timeout', {
                    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
                });
                const data = await response.json();
                paystackTestResult = { success: response.ok, data };
            } catch (err) {
                paystackTestResult = { success: false, error: err.message };
            }
        }

        if (action === 'simulate_webhook') {
            try {
                const payload = {
                    event: 'charge.success',
                    data: {
                        reference: `sim_${Date.now()}`,
                        status: 'success',
                        amount: 100, // 1 GHS
                        customer: { email: user.email }
                    }
                };
                const bodyText = JSON.stringify(payload);
                const signature = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(bodyText).digest('hex');

                const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || (request.headers.get('origin') || 'http://localhost:3000')}/api/paystack/webhook`, {
                    method: 'POST',
                    headers: {
                        'x-paystack-signature': signature,
                        'Content-Type': 'application/json'
                    },
                    body: bodyText
                });
                const data = await response.json();
                webhookSimResult = { status: response.status, data };
            } catch (err) {
                webhookSimResult = { error: err.message };
            }
        }

        const { data: wallet } = await adminSupabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle();
        const { data: allWallets } = await adminSupabase.from('wallets').select('id, user_id, balance, created_at').order('created_at', { ascending: false }).limit(3);
        const { data: allTrans } = await adminSupabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(3);

        return NextResponse.json({
            user_id: user.id,
            email: user.email,
            wallet: wallet || 'No wallet found',
            test_write_result: testWriteResult,
            paystack_test_result: paystackTestResult,
            webhook_sim_result: webhookSimResult,
            system_stats: {
                total_wallets: (await adminSupabase.from('wallets').select('*', { count: 'exact', head: true })).count,
                recent_wallets: allWallets,
                recent_transactions: allTrans,
            },
            env: {
                has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                has_paystack_key: !!process.env.PAYSTACK_SECRET_KEY,
                paystack_key_prefix: process.env.PAYSTACK_SECRET_KEY?.substring(0, 7),
            },
            instructions: [
                "1. If paystack_test_result is success: false, your Secret Key is invalid.",
                "2. Visit ?action=simulate_webhook to test IF the webhook accepts local calls with your secret key.",
                "3. If simulate_webhook returns 'Transaction verification failed', that is GOOD - it means signature verification PASSED and it reached the verification step (which fails for dummy references)."
            ]
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
