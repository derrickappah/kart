import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DepositClient from './DepositClient';

export const dynamic = 'force-dynamic';

export default async function DepositPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    return (
        <DepositClient
            initialWallet={wallet || { balance: 0, pending_balance: 0 }}
            user={user}
        />
    );
}
