'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubscriptionClient({ plans = [], currentSubscription = null }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [billingCycle, setBillingCycle] = useState('Monthly');
    const router = useRouter();

    const isActive = currentSubscription?.status === 'Active';
    const isPending = currentSubscription?.status === 'Pending';

    const handleSubscribe = async (planId) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/subscriptions/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ planId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initialize subscription');
            }

            if (data.authorization_url) {
                // Redirect to Paystack
                window.location.href = data.authorization_url;
            } else {
                throw new Error('No payment URL received');
            }
        } catch (err) {
            console.error('Subscription error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredPlans = plans.filter(plan => {
        if (billingCycle === 'Monthly') return plan.duration_months === 1;
        if (billingCycle === 'Annual') return plan.duration_months === 12;
        return true;
    });

    return (
        <div className="flex flex-col gap-6 px-6 py-4 pb-24">
            {/* Billing Toggle */}
            <div className="flex py-6">
                <div className="flex h-12 flex-1 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                    <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 ${billingCycle === 'Monthly' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#0e171b] dark:text-white' : 'text-slate-500 dark:text-slate-400'} text-sm font-bold transition-all`}>
                        <span className="truncate">Monthly</span>
                        <input
                            className="invisible w-0"
                            name="billing-cycle"
                            type="radio"
                            value="Monthly"
                            checked={billingCycle === 'Monthly'}
                            onChange={() => setBillingCycle('Monthly')}
                        />
                    </label>
                    <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 ${billingCycle === 'Annual' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#0e171b] dark:text-white' : 'text-slate-500 dark:text-slate-400'} text-sm font-bold transition-all`}>
                        <span className="truncate">Annual</span>
                        <input
                            className="invisible w-0"
                            name="billing-cycle"
                            type="radio"
                            value="Annual"
                            checked={billingCycle === 'Annual'}
                            onChange={() => setBillingCycle('Annual')}
                        />
                    </label>
                </div>
            </div>

            {/* Savings Hint */}
            {billingCycle === 'Annual' && (
                <div className="mb-2">
                    <div className="inline-flex items-center gap-2 bg-[#1daddd]/10 text-[#1daddd] px-3 py-1.5 rounded-full border border-[#1daddd]/20">
                        <span className="material-symbols-outlined text-[16px] fill-current">auto_awesome</span>
                        <span className="text-xs font-bold tracking-wide">SAVE 20% WITH ANNUAL BILLING</span>
                    </div>
                </div>
            )}

            {isActive && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm border border-emerald-100 dark:border-emerald-500/20 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] fill-current">check_circle</span>
                    <div>
                        <p className="font-bold">You have an active {currentSubscription.plan?.name} subscription</p>
                        <p className="text-xs opacity-80">Valid until {new Date(currentSubscription.end_date).toLocaleDateString()}</p>
                    </div>
                </div>
            )}

            {isPending && !isActive && (
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-sm border border-amber-100 dark:border-amber-500/20 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] fill-current">pending</span>
                    <div>
                        <p className="font-bold">You have a pending subscription</p>
                        <p className="text-xs opacity-80">Please complete your payment to activate.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm mb-4">
                    {error}
                </div>
            )}

            {/* Pricing Cards */}
            <div className="flex flex-col gap-6">
                {filteredPlans.map((plan) => {
                    const isCurrentPlan = currentSubscription?.plan_id === plan.id;
                    return (
                        <div key={plan.id} className={`relative flex flex-col gap-5 rounded-2xl border ${plan.duration_months === 12 ? 'border-2 border-[#1daddd] shadow-[0_10px_30px_rgba(25,161,230,0.15)]' : 'border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-900 p-6 transition-all`}>
                            {plan.duration_months === 12 && (
                                <div className="absolute -top-3 right-6 bg-[#1daddd] text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                                    Best Value
                                </div>
                            )}
                            <div className="flex flex-col gap-1">
                                <h3 className={`text-sm font-bold uppercase tracking-wider ${plan.duration_months === 12 ? 'text-[#1daddd]' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {plan.name}
                                </h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[#0e171b] dark:text-white text-4xl font-extrabold leading-tight tracking-tighter">
                                        ₵{plan.price}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 text-base font-semibold leading-tight">
                                        /{plan.duration_months === 12 ? 'yr' : 'mo'}
                                    </span>
                                </div>
                                <p className="text-slate-400 text-xs">{plan.description || `For ${plan.duration_months > 1 ? 'long-term' : 'regular'} campus sellers.`}</p>
                            </div>

                            <div className="flex flex-col gap-3">
                                {plan.features?.map((feature, index) => (
                                    <div key={index} className="text-[14px] font-medium leading-normal flex gap-3 text-slate-700 dark:text-slate-200">
                                        <span className={`material-symbols-outlined ${plan.duration_months === 12 ? 'text-[#1daddd] fill-current' : 'text-slate-400'} text-[20px]`}>check_circle</span>
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            <button
                                disabled={loading || isActive || isPending}
                                onClick={() => handleSubscribe(plan.id)}
                                className={`w-full flex cursor-pointer items-center justify-center rounded-xl h-12 px-4 ${plan.duration_months === 12 ? 'bg-[#1daddd] text-white shadow-md hover:bg-[#1daddd]/90' : 'bg-slate-100 dark:bg-slate-800 text-[#0e171b] dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'} text-sm font-bold tracking-tight transition-all disabled:opacity-50`}
                            >
                                {loading ? 'Processing...' : (
                                    isActive ? (isCurrentPlan ? 'Current Plan' : 'Active Plan') :
                                        (isPending ? 'Pending Payment' : (plan.price === 0 ? 'Get Started' : 'Upgrade Now'))
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
