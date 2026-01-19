import Link from 'next/link';
import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';

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

        {/* Billing Toggle */}
        <div className="flex px-6 py-6">
          <div className="flex h-12 flex-1 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-white dark:has-[:checked]:bg-slate-700 has-[:checked]:shadow-sm has-[:checked]:text-[#0e171b] dark:has-[:checked]:text-white text-slate-500 dark:text-slate-400 text-sm font-bold transition-all">
              <span className="truncate">Monthly</span>
              <input defaultChecked className="invisible w-0" name="billing-cycle" type="radio" value="Monthly"/>
            </label>
            <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-white dark:has-[:checked]:bg-slate-700 has-[:checked]:shadow-sm has-[:checked]:text-[#0e171b] dark:has-[:checked]:text-white text-slate-500 dark:text-slate-400 text-sm font-bold transition-all">
              <span className="truncate">Annual</span>
              <input className="invisible w-0" name="billing-cycle" type="radio" value="Annual"/>
            </label>
          </div>
        </div>

        {/* Savings Hint */}
        <div className="px-6 mb-2">
          <div className="inline-flex items-center gap-2 bg-[#1daddd]/10 text-[#1daddd] px-3 py-1.5 rounded-full border border-[#1daddd]/20">
            <span className="material-symbols-outlined text-[16px] fill-current">auto_awesome</span>
            <span className="text-xs font-bold tracking-wide">SAVE 20% WITH ANNUAL BILLING</span>
          </div>
        </div>

        {/* Pricing Cards Container */}
        <div className="flex flex-col gap-6 px-6 py-4 pb-24">

          {/* Basic Plan */}
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm transition-all hover:border-slate-300">
            <div className="flex flex-col gap-1">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Basic</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-[#0e171b] dark:text-white text-4xl font-extrabold leading-tight tracking-tighter">Free</span>
              </div>
              <p className="text-slate-400 text-xs">For casual sellers just starting out.</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="text-[14px] font-medium leading-normal flex gap-3 text-slate-600 dark:text-slate-300">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">check_circle</span>
                3 Standard Listings
              </div>
              <div className="text-[14px] font-medium leading-normal flex gap-3 text-slate-600 dark:text-slate-300">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">check_circle</span>
                Basic Campus Support
              </div>
            </div>
            <button className="w-full flex cursor-pointer items-center justify-center rounded-xl h-12 px-4 bg-slate-100 dark:bg-slate-800 text-[#0e171b] dark:text-white text-sm font-bold tracking-tight transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">
              Get Started
            </button>
          </div>

          {/* Pro Plan (Popular/Highlighted) */}
          <div className="relative flex flex-col gap-5 rounded-2xl border-2 border-[#1daddd] bg-white dark:bg-slate-900 p-6 shadow-[0_10px_30px_rgba(25,161,230,0.15)] transition-all">
            <div className="absolute -top-3 right-6 bg-[#1daddd] text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
              Best Value
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-[#1daddd] text-sm font-bold uppercase tracking-wider">Pro</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-[#0e171b] dark:text-white text-4xl font-extrabold leading-tight tracking-tighter">$9.99</span>
                <span className="text-slate-500 dark:text-slate-400 text-base font-semibold leading-tight">/mo</span>
              </div>
              <p className="text-slate-400 text-xs">Recommended for serious campus sellers.</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="text-[14px] font-semibold leading-normal flex gap-3 text-slate-700 dark:text-slate-200">
                <span className="material-symbols-outlined text-[#1daddd] text-[20px] fill-current">check_circle</span>
                10 Featured Listings
              </div>
              <div className="text-[14px] font-semibold leading-normal flex gap-3 text-slate-700 dark:text-slate-200">
                <span className="material-symbols-outlined text-[#1daddd] text-[20px] fill-current">check_circle</span>
                Priority Campus Support
              </div>
              <div className="text-[14px] font-semibold leading-normal flex gap-3 text-slate-700 dark:text-slate-200">
                <span className="material-symbols-outlined text-[#1daddd] text-[20px] fill-current">check_circle</span>
                Analytics Dashboard
              </div>
              <div className="text-[14px] font-semibold leading-normal flex gap-3 text-slate-700 dark:text-slate-200">
                <span className="material-symbols-outlined text-[#1daddd] text-[20px] fill-current">check_circle</span>
                Verified Seller Badge
              </div>
            </div>
            <button className="w-full flex cursor-pointer items-center justify-center rounded-xl h-12 px-4 bg-[#1daddd] text-white text-sm font-bold tracking-tight shadow-md hover:bg-[#1daddd]/90 transition-all">
              Upgrade Now
            </button>
          </div>

          {/* Business Plan */}
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm transition-all hover:border-slate-300">
            <div className="flex flex-col gap-1">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Business</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-[#0e171b] dark:text-white text-4xl font-extrabold leading-tight tracking-tighter">$24.99</span>
                <span className="text-slate-500 dark:text-slate-400 text-base font-semibold leading-tight">/mo</span>
              </div>
              <p className="text-slate-400 text-xs">For organizations and high-volume shops.</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="text-[14px] font-medium leading-normal flex gap-3 text-slate-600 dark:text-slate-300">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">check_circle</span>
                Unlimited Listings
              </div>
              <div className="text-[14px] font-medium leading-normal flex gap-3 text-slate-600 dark:text-slate-300">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">check_circle</span>
                24/7 Dedicated Support
              </div>
              <div className="text-[14px] font-medium leading-normal flex gap-3 text-slate-600 dark:text-slate-300">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">check_circle</span>
                Bulk CSV Upload Tools
              </div>
              <div className="text-[14px] font-medium leading-normal flex gap-3 text-slate-600 dark:text-slate-300">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">check_circle</span>
                Custom Storefront UI
              </div>
            </div>
            <button className="w-full flex cursor-pointer items-center justify-center rounded-xl h-12 px-4 bg-slate-100 dark:bg-slate-800 text-[#0e171b] dark:text-white text-sm font-bold tracking-tight transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">
              Contact Us
            </button>
          </div>
        </div>

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
