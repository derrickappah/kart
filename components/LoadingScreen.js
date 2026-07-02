'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Lottie from 'lottie-react';
import loadingAnimation from '@/public/kartloading.json';

export default function LoadingScreen({ message = "Loading KART...", fullScreen = false }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const content = (
    <div 
      className={
        fullScreen
          ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#242428] max-w-md mx-auto left-0 right-0 transition-colors duration-300 h-screen w-screen"
          : "w-full min-h-[calc(100vh-160px)] flex flex-col items-center justify-center bg-white dark:bg-[#242428] transition-colors duration-300"
      }
    >
      <div className="w-36 h-36 flex items-center justify-center relative">
        {/* Subtle radial backing brand glow */}
        <div className="absolute inset-4 bg-[#1daddd]/10 rounded-full blur-2xl animate-pulse"></div>
        <Lottie
          animationData={loadingAnimation}
          loop={true}
          className="w-full h-full relative z-10"
        />
      </div>
    </div>
  );

  if (fullScreen) {
    if (!mounted) return null;
    return createPortal(content, document.body);
  }

  return content;
}
