import Link from 'next/link';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#242428] text-gray-900 dark:text-gray-50 flex flex-col items-center justify-center p-6 text-center font-display antialiased">
      <div className="w-full max-w-md flex flex-col items-center space-y-6">
        {/* Animated/Styled 404 Icon Container */}
        <div className="size-20 rounded-3xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shadow-lg border border-primary/25">
          <DynamicLucideIcon name="search_off" className="text-4xl" />
        </div>

        {/* Headline */}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Page Not Found</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm max-w-xs mx-auto">
            The page you are looking for doesn&apos;t exist, or has been moved to a different URL.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col space-y-3 pt-2">
          <Link
            href="/marketplace"
            className="w-full btn-primary h-14 text-base font-bold shadow-lg shadow-primary/20"
          >
            <DynamicLucideIcon name="storefront" className="text-xl" />
            <span>Browse Marketplace</span>
          </Link>
          
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
