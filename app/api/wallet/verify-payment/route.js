import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { verifyTransaction } from '@/lib/paystack';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { reference } = await request.json();

        if (!reference) {
            return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
        }

        console.log('[Verify] Verifying transaction:', reference);

        // Verify with Paystack
        const verification = await verifyTransaction(reference);

        if (verification.data.status !== 'success') {
            return NextResponse.json({
                success: false,
                message: 'Payment not successful',
                status: verification.data.status
            });
        }

        // Check if this is a wallet deposit
        const isWalletDeposit = reference.startsWith('wdp_') || reference.startsWith('wallet_dep_');

        if (!isWalletDeposit) {
            return NextResponse.json({
                success: false,
                message: 'Not a wallet deposit'
            });
        }

        const adminSupabase = createServiceRoleClient();
        const amount = verification.data.amount / 100;

        // Get or create wallet
        let { data: wallet, error: walletError } = await adminSupabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        const currentBalance = wallet ? (parseFloat(wallet.balance) || 0) : 0;
        let finalBalance = currentBalance;

        if (!wallet) {
            // Create wallet
            finalBalance = amount;
            const { data: newWallet, error: createError } = await adminSupabase
                .from('wallets')
                .insert({
                    user_id: user.id,
                    balance: finalBalance,
                    currency: 'GHS',
                })
                .select()
                .single();

            if (createError) {
                console.error('[Verify] Error creating wallet:', createError);
                throw createError;
            }
            wallet = newWallet;
        } else {
            // Check if already processed
            const { data: existingTrans } = await adminSupabase
                .from('wallet_transactions')
                .select('id')
                .eq('reference', reference)
                .maybeSingle();

            if (existingTrans) {
                return NextResponse.json({
                    success: true,
                    message: 'Already processed',
                    balance: wallet.balance
                });
            }

            // Update balance
            finalBalance = currentBalance + amount;
            const { error: updateError } = await adminSupabase
                .from('wallets')
                .update({
                    balance: finalBalance,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', wallet.id);

            if (updateError) {
                console.error('[Verify] Error updating wallet:', updateError);
                throw updateError;
            }
        }

        // Record transaction
        await adminSupabase.from('wallet_transactions').insert({
            wallet_id: wallet.id,
            amount: amount,
            transaction_type: 'Credit',
            status: 'Completed',
            balance_before: currentBalance,
            balance_after: finalBalance,
            reference: reference,
            description: 'Wallet Deposit',
            admin_notes: `Wallet Deposit via Paystack (Polling). Ref: ${reference}`,
        });

        // Create notification
        await adminSupabase.from('notifications').insert({
            user_id: user.id,
            type: 'PaymentReceived',
            title: 'Wallet Top-up Successful',
            message: `GHS ${amount.toFixed(2)} has been added to your wallet.`,
        });

        console.log('[Verify] Wallet deposit processed successfully:', { reference, amount, finalBalance });

        return NextResponse.json({
            success: true,
            message: 'Deposit processed successfully',
            balance: finalBalance,
            amount: amount
        });

    } catch (error) {
        console.error('[Verify] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
