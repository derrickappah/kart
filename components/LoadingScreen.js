'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import Lottie from 'lottie-react';
import loadingAnimation from '@/public/kartloading.json';

export default function LoadingScreen({ message = "Loading KART...", fullScreen = false }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const isProductPage = pathname?.startsWith('/marketplace/') && pathname !== '/marketplace/categories';

  const isEditingPage = (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/maintenance' ||
    pathname?.includes('/create') ||
    pathname?.includes('/edit') ||
    pathname?.includes('/promote/') ||
    pathname?.includes('/withdraw') ||
    pathname?.includes('/buy') ||
    pathname?.includes('/review') ||
    pathname?.includes('/verify') ||
    pathname?.includes('/success') ||
    pathname?.startsWith('/dashboard/admin') ||
    (pathname?.startsWith('/dashboard/messages/') && pathname !== '/dashboard/messages') ||
    (pathname?.startsWith('/dashboard/seller/listings/') && pathname.split('/').length > 4)
  ) && !pathname?.includes('/profile/edit');

  const hasGlobalNavPadding = !isEditingPage && !isProductPage;
  const minHeightClass = hasGlobalNavPadding 
    ? "min-h-[calc(100dvh-130px)]" 
    : "min-h-[100dvh]";

  const content = (
    <div 
      className={
        fullScreen
          ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#242428] w-full h-[100dvh] transition-colors duration-300"
          : `w-full flex-1 ${minHeightClass} flex flex-col items-center justify-center bg-white dark:bg-[#242428] transition-colors duration-300`
      }
    >
      <div className="w-36 h-36 flex items-center justify-center relative select-none">
        {/* Subtle radial backing brand glow */}
        <div className="absolute inset-4 bg-[#1daddd]/10 rounded-full blur-2xl animate-pulse pointer-events-none"></div>
        <Lottie
          animationData={loadingAnimation}
          loop={true}
          className="w-full h-full relative z-10 flex items-center justify-center"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );

  if (fullScreen && mounted) {
    return createPortal(content, document.body);
  }

  return content;
}
