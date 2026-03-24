import Link from 'next/link';
import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';
import SubscriptionClient from './SubscriptionClient';

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch subscription plans
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('duration_months', { ascending: true });

  // Fetch user's current subscription status
  const { data: currentSubscription } = await supabase
    .from('subscriptions')
    .select('*, plan:subscription_plans(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display text-[#0e171b] dark:text-slate-100 min-h-screen transition-colors duration-200 subscription-page">
      <div className="relative flex h-auto min-h-screen w-full flex-col max-w-[430px] mx-auto overflow-x-hidden border-x border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-[#111d21]">

        <div className="px-6 pt-6">
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">Scale your campus shop</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Choose the plan that fits your selling goals and reach more students across campus.</p>
        </div>

        {/* Subscription Content */}
        <SubscriptionClient plans={plans || []} currentSubscription={currentSubscription} />

      </div>
    </div>
  );
}

