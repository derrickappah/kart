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

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display text-[#0e171b] dark:text-slate-100 min-h-screen transition-colors duration-200 subscription-page">
      <div className="relative flex h-auto min-h-screen w-full flex-col max-w-[430px] mx-auto overflow-x-hidden border-x border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-[#111d21]">

        <div className="px-6 pt-6">
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">Scale your campus shop</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Choose the plan that fits your selling goals and reach more students across campus.</p>
        </div>

        {/* Subscription Content */}
        <SubscriptionClient plans={plans || []} />

        {/* Sticky Bottom Navigation */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-[#111d21]/95 backdrop-blur-md px-6 pb-6 pt-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center max-w-sm mx-auto">
            <Link href="/" className="flex flex-col items-center gap-1 text-slate-400">
              <span className="material-symbols-outlined text-[26px]">home</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
            </Link>
            <Link href="/marketplace" className="flex flex-col items-center gap-1 text-slate-400">
              <span className="material-symbols-outlined text-[26px]">search</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Search</span>
            </Link>
            <Link href="/dashboard/seller/create" className="flex flex-col items-center gap-1 bg-[#1daddd] text-white size-14 -mt-8 rounded-full shadow-lg border-4 border-white dark:border-[#111d21]">
              <span className="material-symbols-outlined text-[32px] mt-2">add</span>
            </Link>
            <Link href="/notifications" className="flex flex-col items-center gap-1 text-slate-400">
              <span className="material-symbols-outlined text-[26px]">notifications</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Activity</span>
            </Link>
            <Link href="/profile" className="flex flex-col items-center gap-1 text-[#1daddd]">
              <span className="material-symbols-outlined text-[26px] fill-current">account_circle</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Profile</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
