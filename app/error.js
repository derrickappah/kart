'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#242428] text-gray-900 dark:text-gray-50 flex flex-col items-center justify-center p-6 text-center font-display antialiased">
      <div className="w-full max-w-md flex flex-col items-center space-y-6">
        {/* Animated/Styled Error Icon Container */}
        <div className="size-20 rounded-3xl bg-red-500/10 dark:bg-red-500/20 text-red-500 flex items-center justify-center shadow-lg border border-red-500/25">
          <DynamicLucideIcon name="gpp_bad" className="text-4xl" />
        </div>

        {/* Headline */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Something Went Wrong</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm max-w-xs mx-auto">
            An unexpected error occurred while loading this page. Our team has been notified.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col space-y-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full btn-primary h-14 text-base font-bold shadow-lg shadow-primary/20"
          >
            <DynamicLucideIcon name="refresh" className="text-xl" />
            <span>Try Again</span>
          </button>
          
          <Link
            href="/"
            className="w-full btn-secondary h-14 text-base font-bold"
          >
            <DynamicLucideIcon name="home" className="text-xl" />
            <span>Go to Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
