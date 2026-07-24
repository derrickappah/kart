import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { initiateTransfer, createTransferRecipient, getBanks } from '@/lib/paystack';

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
    const { withdrawalRequestId, amount, userId } = body;

    if (!withdrawalRequestId || !amount || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let adminSupabase;
    try {
      adminSupabase = createServiceRoleClient();
    } catch {
      adminSupabase = supabase;
    }

    // Get withdrawal request
    const { data: withdrawalRequest, error: requestError } = await adminSupabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalRequestId)
      .single();

    if (requestError || !withdrawalRequest) {
      console.error('Error fetching withdrawal request:', requestError);
      return NextResponse.json({ error: 'Withdrawal request not found' }, { status: 404 });
    }

    // Fetch related wallet and user data separately using adminSupabase (bypasses RLS)
    let wallet = null;
    let requestUser = null;

    if (withdrawalRequest.wallet_id) {
      const { data: walletData } = await adminSupabase
        .from('wallets')
        .select('*')
        .eq('id', withdrawalRequest.wallet_id)
        .maybeSingle();
      
      if (walletData) {
        wallet = walletData;
      }
    }

    if (!wallet && (withdrawalRequest.user_id || userId)) {
      const { data: walletData } = await adminSupabase
        .from('wallets')
        .select('*')
        .eq('user_id', withdrawalRequest.user_id || userId)
        .maybeSingle();

      if (walletData) {
        wallet = walletData;
      }
    }

    if (withdrawalRequest.user_id) {
      const { data: userData } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', withdrawalRequest.user_id)
        .maybeSingle();
      
      if (userData) {
        requestUser = userData;
      }
    }

    if (withdrawalRequest.status !== 'Pending') {
      return NextResponse.json(
        { error: `Withdrawal request is already ${withdrawalRequest.status}` },
        { status: 400 }
      );
    }

    // Verify wallet funds
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found for this withdrawal request' }, { status: 404 });
    }
    
    const walletBalance = parseFloat(wallet.balance || 0);
    const walletPending = parseFloat(wallet.pending_balance || 0);
    const withdrawAmount = parseFloat(amount);
    const totalAvailableFunds = walletBalance + walletPending;

    if (withdrawAmount > totalAvailableFunds) {
      return NextResponse.json(
        { error: `Insufficient wallet funds. Total available (balance + pending): GHS ${totalAvailableFunds.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Resolve user's payment details (checking both withdrawalRequest.payout_details and user profile)
    const reqDetails = withdrawalRequest.payout_details || {};
    const reqMethod = (withdrawalRequest.payout_method || '').toLowerCase();

    const bankDetails = (reqDetails.account_number && reqDetails.bank_code) 
      ? reqDetails 
      : (requestUser?.bank_account_details || {});

    const momoDetails = (reqDetails.number && (reqDetails.provider || reqDetails.network))
      ? { number: reqDetails.number, network: reqDetails.provider || reqDetails.network, name: reqDetails.name }
      : (requestUser?.momo_details || {});

    const hasBankDetails = Boolean(bankDetails && bankDetails.account_number && bankDetails.bank_code);
    const hasMomoDetails = Boolean(momoDetails && momoDetails.number && (momoDetails.network || momoDetails.provider));

    if (!hasBankDetails && !hasMomoDetails) {
      return NextResponse.json(
        { error: 'Seller has not provided payment details (bank account or mobile money). Please contact them to add payment details.' },
        { status: 400 }
      );
    }

    // Determine transfer type and details
    const useMomo = reqMethod.includes('momo') || reqMethod.includes('mobile') || (hasMomoDetails && !hasBankDetails);
    const transferType = useMomo ? 'mobile_money' : 'nuban';
    const recipientName = (useMomo ? momoDetails.name : bankDetails.account_name) || requestUser?.display_name || requestUser?.email || 'Payee';
    
    let recipientAccountNumber = useMomo ? momoDetails.number : bankDetails.account_number;
    let recipientBankCode = useMomo ? null : bankDetails.bank_code;
    const momoNetwork = useMomo ? (momoDetails.network || momoDetails.provider) : null;

    // Create transfer recipient (if not exists) and initiate transfer
    let transferReference = `withdrawal_${withdrawalRequestId}_${Date.now()}_retry`;
    
    try {
      // For mobile_money, fetch the correct bank_code from Paystack's bank list
      if (useMomo && !recipientBankCode) {
        try {
          const banksResponse = await getBanks('GHS');
          const banks = banksResponse.data || [];
          
          const networkSearchTerms = {
            'MTN': ['MTN', 'mtn'],
            'Vodafone': ['Vodafone', 'VODAFONE', 'vodafone', 'Telecel', 'telecel'],
            'AirtelTigo': ['AirtelTigo', 'AIRTELTIGO', 'airteltigo', 'Airtel', 'Tigo', 'AT', 'at']
          };
          
          const searchTerms = networkSearchTerms[momoNetwork] || [momoNetwork];
          const mobileMoneyBank = banks.find(bank => {
            const bankName = (bank.name || '').toLowerCase();
            return searchTerms.some(term => bankName.includes(term.toLowerCase()));
          });
          
          if (mobileMoneyBank && mobileMoneyBank.code) {
            recipientBankCode = mobileMoneyBank.code;
          } else {
            const networkMap = {
              'MTN': 'MTN',
              'Vodafone': 'VODAFONE',
              'AirtelTigo': 'AIRTELTIGO'
            };
            recipientBankCode = networkMap[momoNetwork] || momoNetwork;
          }
        } catch (bankListError) {
          console.error('Error fetching bank list from Paystack:', bankListError);
          const networkMap = {
            'MTN': 'MTN',
            'Vodafone': 'VODAFONE',
            'AirtelTigo': 'AIRTELTIGO'
          };
          recipientBankCode = networkMap[momoNetwork] || momoNetwork;
        }
      }
      
      // Create or get recipient
      const recipientParams = {
        type: transferType,
        name: recipientName,
        account_number: recipientAccountNumber,
        currency: 'GHS',
      };
      
      if (recipientBankCode) {
        recipientParams.bank_code = recipientBankCode;
      }
      
      const recipientData = await createTransferRecipient(recipientParams);

      // Initiate transfer
      const transferData = await initiateTransfer({
        recipient: recipientData.data.recipient_code,
        amount: withdrawAmount,
        reference: transferReference,
        reason: `Withdrawal request ${withdrawalRequestId} (retry)`,
      });

      transferReference = transferData.data.reference || transferReference;

      // Get current retry count
      const currentRetryCount = (withdrawalRequest.paystack_retry_count || 0);

      // Update withdrawal request using adminSupabase
      const { data: updatedRequest, error: updateError } = await adminSupabase
        .from('withdrawal_requests')
        .update({
          status: 'Approved',
          admin_id: user.id,
          paystack_transfer_reference: transferReference,
          processing_method: 'paystack',
          paystack_retry_count: currentRetryCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', withdrawalRequestId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating withdrawal request:', updateError);
        throw updateError;
      }

      // Deduct from pending_balance (or balance if pending_balance is insufficient) using adminSupabase
      let newPendingBalance = Math.max(0, walletPending - withdrawAmount);
      let newBalance = walletBalance;
      if (withdrawAmount > walletPending) {
        const remainingToDeduct = withdrawAmount - walletPending;
        newBalance = Math.max(0, walletBalance - remainingToDeduct);
      }

      const { error: walletUpdateError } = await adminSupabase
        .from('wallets')
        .update({
          balance: newBalance,
          pending_balance: newPendingBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id);

      if (walletUpdateError) {
        console.error('Error updating wallet balance:', walletUpdateError);
        throw walletUpdateError;
      }

      // Create wallet transaction using adminSupabase
      const { error: transactionError } = await adminSupabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        transaction_type: 'Withdrawal',
        amount: withdrawAmount,
        balance_before: walletBalance,
        balance_after: newBalance,
        status: 'Completed',
        admin_notes: `Withdrawal approved and transferred via Paystack (retry attempt ${currentRetryCount + 1}). Reference: ${transferReference}`,
      });

      if (transactionError) {
        console.error('Error creating wallet transaction:', transactionError);
      }

      // Create notification using adminSupabase
      const paymentMethod = useMomo ? 'mobile money account' : 'bank account';
      const { error: notificationError } = await adminSupabase.from('notifications').insert({
        user_id: userId,
        type: 'WithdrawalApproved',
        title: 'Withdrawal Approved',
        message: `Your withdrawal request of GHS ${withdrawAmount.toFixed(2)} has been approved and transferred to your ${paymentMethod}.`,
      });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      return NextResponse.json({
        success: true,
        withdrawal_request: updatedRequest,
        transfer_reference: transferReference,
      });
    } catch (paystackError) {
      console.error('Paystack transfer retry error:', paystackError);
      
      // Get current retry count
      const currentRetryCount = (withdrawalRequest.paystack_retry_count || 0);
      
      // Update request with error but keep as Pending
      const { error: updateError } = await adminSupabase
        .from('withdrawal_requests')
        .update({
          status: 'Pending',
          admin_id: user.id,
          admin_notes: `Paystack Error (Retry ${currentRetryCount + 1}): ${paystackError.message}`,
          processing_method: null,
          paystack_retry_count: currentRetryCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', withdrawalRequestId);

      if (updateError) {
        console.error('Error updating withdrawal request status:', updateError);
      }

      return NextResponse.json(
        { 
          error: `Paystack transfer failed: ${paystackError.message}`,
          canRetry: true,
          retryCount: currentRetryCount + 1
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Retry Paystack withdrawal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retry Paystack withdrawal' },
      { status: 500 }
    );
  }
}

