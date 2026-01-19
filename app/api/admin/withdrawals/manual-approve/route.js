import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      withdrawalRequestId, 
      amount, 
      userId,
      manualReference,
      manualTransactionId,
      manualReceiptUrl,
      manualNotes
    } = body;

    if (!withdrawalRequestId || !amount || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get withdrawal request
    const { data: withdrawalRequest, error: requestError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalRequestId)
      .single();

    if (requestError || !withdrawalRequest) {
      console.error('Error fetching withdrawal request:', requestError);
      return NextResponse.json({ error: 'Withdrawal request not found' }, { status: 404 });
    }

    // Fetch wallet
    let wallet = null;
    if (withdrawalRequest.wallet_id) {
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', withdrawalRequest.wallet_id)
        .single();
      
      if (!walletError && walletData) {
        wallet = walletData;
      }
    }

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found for this withdrawal request' }, { status: 404 });
    }

    if (withdrawalRequest.status !== 'Pending') {
      return NextResponse.json(
        { error: `Withdrawal request is already ${withdrawalRequest.status}` },
        { status: 400 }
      );
    }

    const walletBalance = parseFloat(wallet.balance || 0);
    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount > walletBalance) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400 }
      );
    }

    // Update withdrawal request with manual processing details
    const { data: updatedRequest, error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'Approved',
        admin_id: user.id,
        processing_method: 'manual',
        manual_reference: manualReference || null,
        manual_transaction_id: manualTransactionId || null,
        manual_receipt_url: manualReceiptUrl || null,
        manual_notes: manualNotes || null,
        admin_notes: `Manually processed outside Paystack. ${manualNotes ? `Notes: ${manualNotes}` : ''}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalRequestId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating withdrawal request:', updateError);
      throw updateError;
    }

    // Deduct from wallet balance
    const newBalance = walletBalance - withdrawAmount;
    const { error: walletUpdateError } = await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalRequest.wallet_id);

    if (walletUpdateError) {
      console.error('Error updating wallet balance:', walletUpdateError);
      throw walletUpdateError;
    }

    // Create wallet transaction
    const transactionNotes = `Withdrawal approved and processed manually. ${manualReference ? `Reference: ${manualReference}` : ''} ${manualTransactionId ? `Transaction ID: ${manualTransactionId}` : ''}`.trim();
    const { error: transactionError } = await supabase.from('wallet_transactions').insert({
      wallet_id: withdrawalRequest.wallet_id,
      transaction_type: 'Withdrawal',
      amount: withdrawAmount,
      balance_before: walletBalance,
      balance_after: newBalance,
      status: 'Completed',
      admin_notes: transactionNotes,
    });

    if (transactionError) {
      console.error('Error creating wallet transaction:', transactionError);
      // Don't throw here, transaction is already processed
    }

    // Create notification
    const { error: notificationError } = await supabase.from('notifications').insert({
      user_id: userId,
      type: 'WithdrawalApproved',
      title: 'Withdrawal Approved',
      message: `Your withdrawal request of GHS ${withdrawAmount.toFixed(2)} has been approved and processed manually. ${manualReference ? `Reference: ${manualReference}` : ''}`,
    });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't throw here, withdrawal is already processed
    }

    return NextResponse.json({
      success: true,
      withdrawal_request: updatedRequest,
    });
  } catch (error) {
    console.error('Manual approve withdrawal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to manually approve withdrawal' },
      { status: 500 }
    );
  }
}
