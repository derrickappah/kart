import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import WalletClient from './WalletClient';

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Optimize: Single query to get both wallet and transactions if possible, 
  // or parallelize with Promise.all more robustly.
  const { data: wallet } = await supabase
    .from('wallets')
    .select('*, wallet_transactions(*, order:orders(id, product:products(title)))')
    .eq('user_id', user.id)
    .maybeSingle();

  const transactions = wallet?.wallet_transactions || [];

  return (
    <WalletClient 
      initialWallet={wallet || { balance: 0, pending_balance: 0 }} 
      initialTransactions={transactions} 
    />
  );
}
