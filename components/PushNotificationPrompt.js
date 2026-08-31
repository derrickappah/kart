'use client';

import { useState, useEffect } from 'react';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { isPushSupported, getPushPermissionStatus, registerForPushNotifications } from '@/lib/pushClient';
import { createClient } from '@/utils/supabase/client';

const DISMISS_COOLDOWN_DAYS = 7;

export default function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const checkPromptEligibility = async () => {
      if (!isPushSupported()) return;

      // Check if user previously dismissed recently
      try {
        const dismissedAt = localStorage.getItem('kart_push_prompt_dismissed');
        if (dismissedAt) {
          const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
          if (daysSince < DISMISS_COOLDOWN_DAYS) {
            return;
          }
        }
      } catch (e) {
        // LocalStorage access issues safe fallback
      }

      // Check current permission
      const status = await getPushPermissionStatus();
      if (status === 'granted' || status === 'denied') {
        return; // Already decided
      }

      // Ensure user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Slight delay so it doesn't immediately flash on load
      const timer = setTimeout(() => {
        setVisible(true);
      }, 2500);

      return () => clearTimeout(timer);
    };

    checkPromptEligibility();
  }, [supabase]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const result = await registerForPushNotifications();
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          setVisible(false);
        }, 1500);
      } else {
        // If permission was denied or failed, record dismissal so we don't nag
        localStorage.setItem('kart_push_prompt_dismissed', Date.now().toString());
        setVisible(false);
      }
    } catch (err) {
      console.error('[PushPrompt] Enable error:', err);
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('kart_push_prompt_dismissed', Date.now().toString());
    } catch (e) {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-white dark:bg-[#1E292B] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
        {success ? (
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 py-2">
            <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <DynamicLucideIcon name="check_circle" size={24} />
            </div>
            <div>
              <p className="font-bold text-sm">Notifications Enabled!</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">You will now receive instant order & message updates.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <DynamicLucideIcon name="notifications" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Stay in the Loop</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Get instant alerts on order updates, sales, and chat messages.</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1 -mt-1 rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <DynamicLucideIcon name="close" size={18} />
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? 'Enabling...' : 'Enable Alerts'}
                {!loading && <DynamicLucideIcon name="arrow_forward" size={14} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
