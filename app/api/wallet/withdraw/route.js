import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, method } = body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const withdrawAmount = parseFloat(amount);
    const availableBalance = parseFloat(wallet.balance || 0);

    if (withdrawAmount > availableBalance) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: GHS ${availableBalance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Create withdrawal request
    const { data: withdrawalRequest, error: requestError } = await supabase
      .from('withdrawal_requests')
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        amount: withdrawAmount,
        currency: 'GHS',
        status: 'Pending',
        payout_method: method || 'bank',
        payout_details: body.details || {},
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating withdrawal request:', requestError);
      return NextResponse.json(
        { error: 'Failed to create withdrawal request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawal_request: withdrawalRequest,
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process withdrawal request' },
      { status: 500 }
    );
  }
}
