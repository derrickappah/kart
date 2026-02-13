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

        // Check withdrawal_requests table schema
        const { data: schemaData, error: schemaError } = await adminSupabase
            .from('withdrawal_requests')
            .select('*')
            .limit(1);

        // Try to get user's wallet
        const { data: wallet } = await adminSupabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        // Try a test insert (will rollback)
        let testInsertResult = null;
        try {
            const { data: testData, error: testError } = await adminSupabase
                .from('withdrawal_requests')
                .insert({
                    wallet_id: wallet?.id || 'test-wallet-id',
                    user_id: user.id,
                    amount: 1.00,
                    currency: 'GHS',
                    status: 'Pending',
                    payout_method: 'bank',
                    payout_details: { test: true }
                })
                .select()
                .single();

            if (testError) {
                testInsertResult = {
                    success: false,
                    error: testError.message,
                    code: testError.code,
                    details: testError.details,
                    hint: testError.hint
                };
            } else {
                // Delete the test record
                await adminSupabase
                    .from('withdrawal_requests')
                    .delete()
                    .eq('id', testData.id);

                testInsertResult = { success: true };
            }
        } catch (err) {
            testInsertResult = { success: false, error: err.message };
        }

        return NextResponse.json({
            user_id: user.id,
            wallet: wallet || 'No wallet found',
            schema_check: schemaError ? { error: schemaError.message } : { success: true },
            test_insert: testInsertResult,
            instructions: [
                "1. Check test_insert for specific error details",
                "2. If column missing, run the SQL fix: withdrawal_request_update.sql",
                "3. Common issues: missing payout_details column, missing payout_method column"
            ]
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
