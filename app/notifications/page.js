'use client';
/**
 * /notifications — Legacy standalone notifications page.
 * Redirects to the canonical /dashboard/notifications route which is
 * server-rendered, properly authenticated, and maintained.
 *
 * Keeping this file in place ensures deep-links and bookmarks don't 404.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';

export default function NotificationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/notifications');
  }, [router]);

  // Show a minimal loading state while the redirect happens
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#242428]">
      <DynamicLucideIcon
        name="progress_activity"
        size={32}
        className="text-[#1daddd] animate-spin mb-3"
      />
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
        Loading notifications…
      </p>
    </div>
  );
}