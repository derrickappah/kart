import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.escrow_status !== 'Held') {
      return NextResponse.json(
        { error: `Order escrow status is ${order.escrow_status}, not Held` },
        { status: 400 }
      );
    }

    if (order.status !== 'Paid') {
      return NextResponse.json(
        { error: `Order status must be Paid to release escrow` },
        { status: 400 }
      );
    }

    // Use service role client for admin operations to bypass RLS
    // This allows admin to create/update wallets for other users
    let adminSupabase;
    try {
      adminSupabase = createServiceRoleClient();
    } catch (serviceRoleError) {
      console.error('Service role client not available, falling back to regular client:', serviceRoleError);
      // Fall back to regular client if service role key is not set
      adminSupabase = supabase;
    }

    // Get or create seller wallet using admin client
    let { data: wallet, error: walletFetchError } = await adminSupabase
      .from('wallets')
      .select('*')
      .eq('user_id', order.seller_id)
      .single();

    if (walletFetchError && walletFetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected if wallet doesn't exist
      console.error('Error fetching wallet:', walletFetchError);
      return NextResponse.json(
        { error: 'Failed to fetch seller wallet' },
        { status: 500 }
      );
    }

    if (!wallet) {
      const { data: newWallet, error: walletCreateError } = await adminSupabase
        .from('wallets')
        .insert({
          user_id: order.seller_id,
          balance: 0,
          pending_balance: 0,
          currency: 'GHS',
        })
        .select()
        .single();

      if (walletCreateError || !newWallet) {
        console.error('Error creating wallet:', {
          error: walletCreateError,
          code: walletCreateError?.code,
          message: walletCreateError?.message,
          details: walletCreateError?.details,
          hint: walletCreateError?.hint,
          seller_id: order.seller_id,
        });
        
        // If RLS policy error, provide more specific message
        if (walletCreateError?.code === '42501' || walletCreateError?.message?.includes('policy')) {
          return NextResponse.json(
            { 
              error: 'Permission denied: Admin cannot create wallet for seller. Please ensure SUPABASE_SERVICE_ROLE_KEY is set or RLS policy allows admin inserts.',
              details: process.env.NODE_ENV === 'development' ? walletCreateError.message : undefined
            },
            { status: 403 }
          );
        }
        
        return NextResponse.json(
          { 
            error: 'Failed to create seller wallet',
            details: process.env.NODE_ENV === 'development' ? walletCreateError?.message : undefined
          },
          { status: 500 }
        );
      }
      wallet = newWallet;
    }

    // Ensure wallet exists and has required properties
    if (!wallet || !wallet.id) {
      console.error('Wallet is null or missing id after creation attempt');
      return NextResponse.json(
        { error: 'Wallet not available for escrow release' },
        { status: 500 }
      );
    }

    const payoutAmount = parseFloat(order.seller_payout_amount);
    const currentBalance = parseFloat(wallet.balance || 0);
    const currentPending = parseFloat(wallet.pending_balance || 0);
    const newBalance = currentBalance + payoutAmount;
    const newPending = Math.max(0, currentPending - payoutAmount);

    // Update wallet using admin client
    const { error: walletUpdateError } = await adminSupabase
      .from('wallets')
      .update({
        balance: newBalance,
        pending_balance: newPending,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (walletUpdateError) {
      console.error('Error updating wallet:', walletUpdateError);
      return NextResponse.json(
        { error: 'Failed to update seller wallet balance' },
        { status: 500 }
      );
    }

    // Create wallet transaction using admin client
    const { error: transactionError } = await adminSupabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        order_id: order.id,
        transaction_type: 'Credit',
        amount: payoutAmount,
        balance_before: currentBalance,
        balance_after: newBalance,
        status: 'Completed',
        admin_notes: 'Escrow released by admin',
      });

    if (transactionError) {
      console.error('Error creating wallet transaction:', transactionError);
      return NextResponse.json(
        { error: 'Failed to record wallet transaction' },
        { status: 500 }
      );
    }

    // Update order escrow status
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        escrow_status: 'Released',
        escrow_released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (orderUpdateError) {
      console.error('Error updating order escrow status:', orderUpdateError);
      return NextResponse.json(
        { error: 'Failed to update order escrow status' },
        { status: 500 }
      );
    }

    // Record status change (non-critical - log errors but don't fail)
    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert({
        order_id: order.id,
        old_status: order.status,
        new_status: order.status,
        changed_by: user.id,
        notes: 'Escrow released to seller wallet',
      });

    if (historyError) {
      console.error('Error recording order status history:', historyError);
      // Non-critical error - continue execution
    }

    // Create notification for seller (non-critical - log errors but don't fail)
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: order.seller_id,
        type: 'EscrowReleased',
        title: 'Escrow Released',
        message: `GHS ${payoutAmount.toFixed(2)} has been released to your wallet for order #${order.id.slice(0, 8)}.`,
        related_order_id: order.id,
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Non-critical error - continue execution
    }

    return NextResponse.json({
      success: true,
      message: 'Escrow released successfully',
    });
  } catch (error) {
    console.error('Release escrow error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      {
        error: error.message || 'Failed to release escrow',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
