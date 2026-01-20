'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionId = searchParams.get('subscriptionId');
  const reference = searchParams.get('reference');

  useEffect(() => {
    async function verifyPayment() {
      if (!subscriptionId || !reference) {
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch('/api/subscriptions/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subscriptionId, reference }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Verification failed');
        }

        console.log('Payment verified successfully');
      } catch (err) {
        console.error('Verification error:', err);
        setError(err.message);
      } finally {
        setVerifying(false);
      }
    }

    verifyPayment();
  }, [subscriptionId, reference]);

  if (verifying) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="w-12 h-12 border-4 border-[#1daddd] border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold">Verifying your payment...</h2>
        <p className="text-gray-500 text-center mt-2">Please don't close this page.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
      {/* Success Icon */}
      <div className="relative mb-8 flex items-center justify-center">
        <div className="absolute w-32 h-32 bg-[#1daddd]/10 dark:bg-[#1daddd]/5 rounded-full"></div>
        <div className={`relative ${error ? 'bg-red-500' : 'bg-[#1daddd]'} text-white size-24 rounded-full flex items-center justify-center shadow-lg shadow-[#1daddd]/30`}>
          <span className="material-symbols-outlined !text-5xl" style={{ fontVariationSettings: "'wght' 700" }}>
            {error ? 'error' : 'check'}
          </span>
        </div>
      </div>

      {/* Headline Section */}
      <h1 className="text-[#0e1b12] dark:text-white text-3xl font-bold tracking-tight text-center pb-3">
        {error ? 'Payment Issue' : "You're now a Pro!"}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-relaxed text-center max-w-xs mb-10">
        {error
          ? `There was an issue verifying your payment: ${error}. Please contact support if the amount was deducted.`
          : "Welcome to the elite circle of campus sellers. Your journey to faster sales starts here."}
      </p>

      {/* Features Summary Card (Only show on success) */}
      {!error && (
        <div className="w-full bg-white dark:bg-[#2a2a2d] rounded-xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 mb-10">
          <h4 className="text-[#1daddd] text-xs font-bold leading-normal tracking-[0.15em] mb-5 uppercase text-center">Unlocked Pro Features</h4>
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="bg-[#1daddd]/10 dark:bg-[#1daddd]/20 p-2 rounded-lg">
                <span className="material-symbols-outlined text-[#1daddd]">all_inclusive</span>
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-bold">Unlimited Listings</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">Post as many items as you want</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[#1daddd]/10 dark:bg-[#1daddd]/20 p-2 rounded-lg">
                <span className="material-symbols-outlined text-[#1daddd]">verified</span>
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-bold">Featured Badges</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">Stand out in the marketplace</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[#1daddd]/10 dark:bg-[#1daddd]/20 p-2 rounded-lg">
                <span className="material-symbols-outlined text-[#1daddd]">support_agent</span>
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-bold">Priority Support</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">Get help whenever you need it</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA Buttons */}
      <div className="w-full space-y-4 mt-auto">
        <Link href="/dashboard/seller" className="w-full bg-[#1daddd] hover:bg-[#1daddd]/90 text-white font-bold py-4 rounded-xl transition-all shadow-[0_10px_40px_-10px_rgba(32,223,96,0.15)] flex items-center justify-center gap-2 block text-center">
          Go to Seller Dashboard
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
        <Link href="/subscriptions" className="w-full py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[#1daddd] transition-colors flex items-center justify-center gap-1 text-center">
          <span className="material-symbols-outlined text-sm">history</span>
          Back to Plans
        </Link>
      </div>
    </div>
  );
}

export default function SubscriptionSuccess() {
  return (
    <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display text-[#0e1b12] dark:text-white transition-colors duration-300">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto">
        {/* Top App Bar */}
        <div className="flex items-center p-4 justify-between">
          <Link href="/" className="text-[#0e1b12] dark:text-white flex size-12 shrink-0 items-center justify-start">
            <span className="material-symbols-outlined cursor-pointer">close</span>
          </Link>
          <h2 className="text-sm font-bold uppercase tracking-widest flex-1 text-center pr-12 opacity-40">Success</h2>
        </div>

        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#1daddd] border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <SuccessContent />
        </Suspense>

        {/* Safe Area Spacer */}
        <div className="h-8 bg-transparent"></div>
      </div>
    </div>
  );
}
