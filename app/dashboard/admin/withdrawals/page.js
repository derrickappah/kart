import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import WithdrawalsClient from './WithdrawalsClient';

export default async function AdminWithdrawalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Admin check is handled by layout
  // Fetch withdrawal requests
  const { data: withdrawalRequests, error: queryError } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .order('created_at', { ascending: false });

  // Log error if query fails
  if (queryError) {
    console.error('Error fetching withdrawal requests:', queryError);
  }

  // Fetch related data separately if we have requests
  let normalizedRequests = [];
  if (withdrawalRequests && withdrawalRequests.length > 0) {
    // Get unique user IDs and wallet IDs
    const userIds = [...new Set(withdrawalRequests.map(r => r.user_id).filter(Boolean))];
    const walletIds = [...new Set(withdrawalRequests.map(r => r.wallet_id).filter(Boolean))];

    // Fetch profiles with payment details
    let profiles = [];
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email, bank_account_details, momo_details')
        .in('id', userIds);
      
      if (!profilesError && profilesData) {
        profiles = profilesData;
      }
    }

    // Fetch wallets
    let wallets = [];
    if (walletIds.length > 0) {
      const { data: walletsData, error: walletsError } = await supabase
        .from('wallets')
        .select('id, balance')
        .in('id', walletIds);
      
      if (!walletsError && walletsData) {
        wallets = walletsData;
      }
    }

    // Join the data
    normalizedRequests = withdrawalRequests.map(request => ({
      ...request,
      user: profiles.find(p => p.id === request.user_id) || null,
      wallet: wallets.find(w => w.id === request.wallet_id) || null,
    }));
  }

  // Calculate stats
  const totalCount = normalizedRequests.length;
  const pendingCount = normalizedRequests.filter(r => r.status === 'Pending').length;
  const approvedCount = normalizedRequests.filter(r => r.status === 'Approved').length;
  const rejectedCount = normalizedRequests.filter(r => r.status === 'Rejected').length;
  const completedCount = normalizedRequests.filter(r => r.status === 'Completed').length;
  const totalAmount = normalizedRequests.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  const pendingAmount = normalizedRequests
    .filter(r => r.status === 'Pending')
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

  return (
    <WithdrawalsClient 
      initialRequests={normalizedRequests}
      stats={{
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        completed: completedCount,
        totalAmount: totalAmount,
        pendingAmount: pendingAmount
      }}
      error={queryError ? queryError.message : null}
    />
  );
}
