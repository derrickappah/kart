import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, method, details } = body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const withdrawAmount = parseFloat(amount);
    const adminSupabase = createServiceRoleClient();

    // 1. Try Atomic RPC first
    const { data: rpcResult, error: rpcError } = await adminSupabase.rpc('execute_wallet_withdrawal', {
      p_user_id: user.id,
      p_amount: withdrawAmount,
      p_method: method || 'bank',
      p_payout_details: details || {}
    });

    if (!rpcError && rpcResult && rpcResult.success) {
      return NextResponse.json({
        success: true,
        withdrawal_request_id: rpcResult.withdrawal_request_id,
        new_balance: rpcResult.new_balance,
        pending_balance: rpcResult.pending_balance,
      });
    }

    if (rpcError && !rpcError.message?.includes('function public.execute_wallet_withdrawal') && !rpcError.message?.includes('does not exist')) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }

    // 2. Fallback: Sequential execution
    const { data: wallet, error: walletError } = await adminSupabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const availableBalance = parseFloat(wallet.balance || 0);

    if (withdrawAmount > availableBalance) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: GHS ${availableBalance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Create withdrawal request
    const { data: withdrawalRequest, error: requestError } = await adminSupabase
      .from('withdrawal_requests')
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        amount: withdrawAmount,
        currency: 'GHS',
        status: 'Pending',
        payout_method: method || 'bank',
        payout_details: details || {},
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating withdrawal request:', requestError);
      return NextResponse.json(
        {
          error: 'Failed to create withdrawal request',
          details: requestError.message,
        },
        { status: 500 }
      );
    }

    // Update wallet
    const newBalance = availableBalance - withdrawAmount;
    const newPendingBalance = parseFloat(wallet.pending_balance || 0) + withdrawAmount;

    const { error: walletUpdateError } = await adminSupabase
      .from('wallets')
      .update({
        balance: newBalance,
        pending_balance: newPendingBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (walletUpdateError) {
      console.error('Error updating wallet:', walletUpdateError);
      await adminSupabase
        .from('withdrawal_requests')
        .delete()
        .eq('id', withdrawalRequest.id);

      return NextResponse.json(
        { error: 'Failed to update wallet balance' },
        { status: 500 }
      );
    }

    // Record transaction
    await adminSupabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      amount: withdrawAmount,
      transaction_type: 'Withdrawal',
      status: 'Pending',
      balance_before: availableBalance,
      balance_after: newBalance,
      reference: withdrawalRequest.id,
      description: 'Withdrawal Request',
      admin_notes: `Withdrawal request #${withdrawalRequest.id}. Method: ${method || 'bank'}`,
    });

    return NextResponse.json({
      success: true,
      withdrawal_request: withdrawalRequest,
      new_balance: newBalance,
      pending_balance: newPendingBalance,
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process withdrawal request' },
      { status: 500 }
    );
  }
}
