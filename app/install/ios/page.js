'use client';

import Link from 'next/link';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect } from 'react';

export default function IOSInstallGuidePage() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isSafari, setIsSafari] = useState(true);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsStandalone(true);
    }

    // Check if browser is Safari
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isWebKit = /WebKit/i.test(ua);
    const isOtherBrowser = /CriOS|FxiOS|OPiOS|mercury/i.test(ua);
    setIsSafari(isIOS && isWebKit && !isOtherBrowser);
  }, []);

  return (
    <main className="bg-slate-50 dark:bg-[#1A1A1E] min-h-screen py-10 px-4 sm:px-6 font-display text-slate-900 dark:text-white transition-colors duration-200">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Navigation / Header */}
        <div className="flex items-center justify-between pb-2">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <DynamicLucideIcon name="arrow_back" size={20} />
            <span>Back to Settings</span>
          </Link>
          <Link
            href="/marketplace"
            className="text-xs font-semibold text-[#247d8f] hover:underline"
          >
            Go to Marketplace
          </Link>
        </div>

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-[#1E292B] to-[#121A1C] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#247d8f]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="size-20 rounded-2xl bg-white/10 backdrop-blur-md p-2.5 shadow-inner border border-white/20 mb-4 flex items-center justify-center">
              <img src="/icon.png" alt="KART App Icon" className="w-full h-full object-contain rounded-xl" />
            </div>
            
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wide text-white/90 mb-3 border border-white/15">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-5.35.21-10.33-1.95-14.94-6.49-3.41-3.3-7.39-8.48-11.94-15.54-6.46-10.08-11.2-21.43-14.22-34.05-3.02-12.63-4.53-24.35-4.53-35.18 0-14.59 3.59-26.69 10.77-36.3 7.18-9.61 16.32-14.53 27.42-14.75 5.35 0 11.07 1.34 17.16 4.02 6.09 2.68 10.02 4.07 11.79 4.17 1.45 0 5.61-1.46 12.48-4.38 6.87-2.92 12.77-4.18 17.7-3.79 13.59 1.17 24.13 6.47 31.62 15.9-12.04 7.29-17.96 17.26-17.76 29.91.2 9.87 4.01 18.23 11.44 25.08 7.43 6.85 16.27 10.84 26.52 11.96-2.58 7.82-5.74 15.34-9.49 22.56zM119.22 33.72c0-7.33 2.66-14.23 7.98-20.7 5.32-6.47 11.83-10.81 19.53-13.02.39 1.45.59 2.92.59 4.41 0 7.33-2.73 14.36-8.19 21.09-5.46 6.73-12.04 10.88-19.74 12.44-.13-1.39-.17-2.79-.17-4.22z"/>
              </svg>
              iOS & iPadOS Setup Guide
            </span>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              Install KART on your iPhone & iPad
            </h1>
            <p className="text-white/80 text-sm max-w-md font-normal">
              Follow these simple steps to add KART to your Home Screen for the best native app experience.
            </p>
          </div>
        </div>

        {/* Standalone Alert if already installed */}
        {isStandalone && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <DynamicLucideIcon name="check_circle" size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">KART is Already Installed!</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">You are currently running the installed home screen version of KART.</p>
            </div>
          </div>
        )}

        {/* Safari Tip if opened in Chrome/Firefox iOS */}
        {!isSafari && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 flex items-start gap-3">
            <div className="size-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <DynamicLucideIcon name="info" size={18} />
            </div>
            <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-bold block text-sm">Important for Apple Users:</span>
              <p>Apple requires using the <strong>Safari</strong> browser to add web apps to your Home Screen. If you are using Chrome, Brave, or Firefox on iOS, please copy the link and open it in Safari.</p>
            </div>
          </div>
        )}

        {/* Step-by-Step Instructions */}
        <div className="bg-white dark:bg-[#1E292B] rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-white/5 space-y-6">
          <h2 className="text-base font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Installation Steps
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4 items-start">
              <div className="flex items-center justify-center size-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black text-sm shrink-0 border border-blue-100 dark:border-blue-800">
                1
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Open Safari
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Make sure you are browsing KART in the <strong>Safari</strong> browser on your iPhone or iPad.
                </p>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-white/5 ml-13"></div>

            {/* Step 2 */}
            <div className="flex gap-4 items-start">
              <div className="flex items-center justify-center size-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black text-sm shrink-0 border border-blue-100 dark:border-blue-800">
                2
              </div>
              <div className="flex-1 space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Tap the Share Button
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Look at the bottom toolbar (or top right on iPad) and tap the <strong>Share</strong> button (the square with an arrow pointing upward).
                </p>
                <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                  </svg>
                  <span>Share Icon</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-white/5 ml-13"></div>

            {/* Step 3 */}
            <div className="flex gap-4 items-start">
              <div className="flex items-center justify-center size-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black text-sm shrink-0 border border-blue-100 dark:border-blue-800">
                3
              </div>
              <div className="flex-1 space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Select "Add to Home Screen"
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Scroll down the share menu list and tap on <strong>"Add to Home Screen"</strong> with the plus sign icon.
                </p>
                <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <div className="size-4 rounded border-2 border-slate-600 dark:border-slate-400 flex items-center justify-center font-bold text-[10px]">
                    +
                  </div>
                  <span>Add to Home Screen</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-white/5 ml-13"></div>

            {/* Step 4 */}
            <div className="flex gap-4 items-start">
              <div className="flex items-center justify-center size-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-black text-sm shrink-0 border border-emerald-100 dark:border-emerald-800">
                4
              </div>
              <div className="flex-1 space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Tap "Add" in Top Right
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Review the name and tap <strong>Add</strong> in the top right corner of your screen.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Card */}
        <div className="bg-white dark:bg-[#1E292B] rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-white/5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <DynamicLucideIcon name="sparkles" className="text-[#247d8f]" size={18} />
            Why install KART as a Home Screen App?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5">
              <DynamicLucideIcon name="zap" className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Instant Launch</span>
                <span>Opens in standalone mode without browser URL bars or tabs.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5">
              <DynamicLucideIcon name="notifications" className="text-blue-500 shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Live Push Notifications</span>
                <span>Get real-time updates when messages and order updates arrive.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5">
              <DynamicLucideIcon name="shield_check" className="text-emerald-500 shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Zero Storage Waste</span>
                <span>Uses under 2MB of phone storage compared to heavy app store apps.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5">
              <DynamicLucideIcon name="refresh" className="text-purple-500 shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Always Up to Date</span>
                <span>Automatically updates seamlessly without manual app downloads.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard/settings"
            className="flex-1 bg-white dark:bg-[#1E292B] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-900 dark:text-white font-bold py-3.5 px-4 rounded-2xl text-sm text-center shadow-sm active:scale-95 transition-all"
          >
            Back to Settings
          </Link>
          <Link
            href="/marketplace"
            className="flex-1 bg-[#247d8f] hover:bg-[#1d6776] text-white font-bold py-3.5 px-4 rounded-2xl text-sm text-center shadow-lg shadow-[#247d8f]/20 active:scale-95 transition-all"
          >
            Explore Marketplace
          </Link>
        </div>

      </div>
    </main>
  );
}
