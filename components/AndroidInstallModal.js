'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';

export default function AndroidInstallModal({ isOpen, onClose, isInstalled, onTriggerPrompt, hasPrompt }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-display">
      <div className="bg-white dark:bg-[#1E292B] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-white/10 relative overflow-hidden text-slate-900 dark:text-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <DynamicLucideIcon name="close" size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-2 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center">
            <img src="/icon.png" alt="KART" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {isInstalled ? 'KART is Already Installed' : 'Install KART App'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Fast, lightweight & instant campus marketplace
            </p>
          </div>
        </div>

        {isInstalled ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              KART is already installed on this device! You can open it directly from your app drawer or home screen anytime.
            </div>
            <button
              onClick={onClose}
              className="w-full bg-[#247d8f] hover:bg-[#1d6776] text-white font-bold py-3.5 rounded-2xl text-sm transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {hasPrompt ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Click the button below to immediately add KART to your device&apos;s home screen and app launcher.
                </p>
                <div className="flex gap-2.5">
                  <button
                    onClick={onTriggerPrompt}
                    className="flex-1 bg-[#247d8f] hover:bg-[#1d6776] text-white font-bold py-3.5 rounded-2xl text-sm shadow-lg shadow-[#247d8f]/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <DynamicLucideIcon name="download" size={18} />
                    Install Now
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-3.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  To install KART on Android or Chrome browser:
                </p>

                <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5">
                    <span className="size-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                    <span>Tap the <strong>Chrome Menu (⋮)</strong> in the top right.</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5">
                    <span className="size-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                    <span>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5">
                    <span className="size-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                    <span>Tap <strong>Install</strong> to confirm.</span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full bg-[#247d8f] hover:bg-[#1d6776] text-white font-bold py-3 rounded-2xl text-sm transition-colors"
                >
                  Got It
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
