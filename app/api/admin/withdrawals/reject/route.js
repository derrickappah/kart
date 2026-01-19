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
    const { withdrawalRequestId, reason } = body;

    if (!withdrawalRequestId) {
      return NextResponse.json({ error: 'Withdrawal request ID is required' }, { status: 400 });
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

    if (withdrawalRequest.status !== 'Pending') {
      return NextResponse.json(
        { error: `Withdrawal request is already ${withdrawalRequest.status}` },
        { status: 400 }
      );
    }

    // Update withdrawal request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'Rejected',
        admin_id: user.id,
        admin_notes: reason || 'No reason provided',
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalRequestId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating withdrawal request:', updateError);
      return NextResponse.json(
        { error: 'Failed to reject withdrawal request' },
        { status: 500 }
      );
    }

    // Create notification
    const { error: notificationError } = await supabase.from('notifications').insert({
      user_id: withdrawalRequest.user_id,
      type: 'WithdrawalRejected',
      title: 'Withdrawal Rejected',
      message: `Your withdrawal request of GHS ${parseFloat(withdrawalRequest.amount).toFixed(2)} has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
    });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't throw here, rejection is already processed
    }

    return NextResponse.json({
      success: true,
      withdrawal_request: updatedRequest,
    });
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject withdrawal' },
      { status: 500 }
    );
  }
}
