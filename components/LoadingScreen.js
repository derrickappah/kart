'use client';
import Lottie from 'lottie-react';
import loadingAnimation from '@/public/kartloading.json';

export default function LoadingScreen({ message = "Loading KART...", fullScreen = false }) {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-[#242428] max-w-md mx-auto left-0 right-0 transition-colors duration-300"
    : "w-full min-h-[calc(100vh-160px)] flex flex-col items-center justify-center bg-white dark:bg-[#242428] transition-colors duration-300";

  return (
    <div className={containerClasses}>
      <div className="w-36 h-36 flex items-center justify-center relative">
        {/* Subtle radial backing brand glow */}
        <div className="absolute inset-4 bg-[#1daddd]/10 rounded-full blur-2xl animate-pulse"></div>
        <Lottie
          animationData={loadingAnimation}
          loop={true}
          className="w-full h-full relative z-10"
        />
      </div>
      <p className="mt-4 text-[#4f8596] dark:text-[#8fc3d3] text-sm font-semibold tracking-widest uppercase animate-pulse">
        {message}
      </p>
    </div>
  );
}
