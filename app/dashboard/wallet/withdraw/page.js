import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import WithdrawFundsClient from './WithdrawFundsClient';

export default async function WithdrawPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!wallet) {
    redirect('/dashboard/wallet');
  }

  return (
    <WithdrawFundsClient initialWallet={wallet} />
  );
}
