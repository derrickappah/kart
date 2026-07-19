'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// Module-scoped stable client — avoids re-creation on every render
const supabase = createClient();

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BN_Can8H6Pp8fuaw3F26G3argkqh6ytLU2ShaHb65onYYeWkUoB2gFoq3ow0IlfCEp1g4ZrRbdfg-PvYDyB6hfY';

// Helper to convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const Toggle = ({ active, onToggle, label, description, icon, disabled = false }) => (
  <div className="flex items-center justify-between p-4 bg-white dark:bg-[#1E292B] rounded-2xl shadow-sm border border-transparent dark:border-slate-800 transition-all duration-200">
    <div className="flex items-center gap-4">
      <div
        aria-hidden="true"
        className={`size-10 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
      >
        <DynamicLucideIcon name={icon} />
      </div>
      <div>
        <p id={`toggle-label-${label.replace(/\s+/g,'-').toLowerCase()}`} className="font-bold text-slate-900 dark:text-white text-sm">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
    <button
      role="switch"
      disabled={disabled}
      aria-checked={active}
      aria-labelledby={`toggle-label-${label.replace(/\s+/g,'-').toLowerCase()}`}
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className={`absolute top-1 left-1 size-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${active ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

const SkeletonToggle = () => (
  <div className="flex items-center justify-between p-4 bg-white dark:bg-[#1E292B] rounded-2xl border border-transparent dark:border-slate-800 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-2">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    </div>
    <div className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
  </div>
);

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState({
    push_orders: true,
    push_messages: true,
    push_promotions: false,
    email_weekly: true,
  });

  // Push notification state variables
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [registeringPush, setRegisteringPush] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  useEffect(() => {
    const checkPushSupport = async () => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
        setPushSupported(true);
        setPushPermission(Notification.permission);

        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (err) {
          console.error('Error checking push subscription:', err);
        }
      }
    };

    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('notification_prefs')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            showToast('Failed to fetch user settings', 'error');
          } else if (data?.notification_prefs) {
            setSettings({
              ...settings,
              ...data.notification_prefs
            });
          }
          setProfile(user);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };

    // Register service worker if supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
        checkPushSupport();
      }).catch(err => {
        console.error('Service worker registration failed:', err);
      });
    }

    getProfile();
  }, []);

  const toggleSetting = async (key) => {
    if (!profile) {
      showToast('You must be logged in to modify settings', 'error');
      return;
    }

    const prevSettings = settings;
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    const { error } = await supabase
      .from('profiles')
      .update({ notification_prefs: newSettings })
      .eq('id', profile.id);

    if (error) {
      setSettings(prevSettings);
      showToast('Failed to save setting. Rolled back.', 'error');
    } else {
      showToast('Preferences updated successfully!', 'success');
    }
  };

  // Push Subscription Enable/Disable logic
  const subscribeToPush = async () => {
    if (!pushSupported || !profile) return;
    setRegisteringPush(true);
    showToast('Requesting push permissions...', 'info');

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== 'granted') {
        throw new Error('Push permission denied');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register subscription on server');
      }

      setIsSubscribed(true);
      showToast('Push notifications enabled!', 'success');
    } catch (err) {
      console.error('Error subscribing to push:', err);
      showToast(err.message || 'Push registration failed', 'error');
    } finally {
      setRegisteringPush(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!pushSupported || !profile) return;
    setRegisteringPush(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Call backend to delete
        const response = await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        if (!response.ok) {
          throw new Error('Failed to remove subscription from server');
        }

        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      showToast('Push notifications disabled.', 'success');
    } catch (err) {
      console.error('Error unsubscribing from push:', err);
      showToast('Unsubscription failed', 'error');
    } finally {
      setRegisteringPush(false);
    }
  };

  const sendTestNotification = async () => {
    if (!profile) return;
    setSendingTest(true);

    try {
      const response = await fetch('/api/notifications/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          title: 'Hello from KART! 🚀',
          message: 'Your push notifications are successfully configured and working!'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send test push notification');
      }

      showToast('Test push notification triggered!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to trigger test push', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-[#242428] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
      {/* Header */}
      <header className="px-4 pt-6 flex items-center gap-4 max-w-md mx-auto w-full">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-[#1E292B] shadow-sm hover:bg-slate-100 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
        >
          <DynamicLucideIcon name="arrow_back" />
        </button>
        <h1 className="text-xl font-bold">Notification Preferences</h1>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pt-8 pb-20 space-y-6 max-w-md mx-auto w-full">
        {loading ? (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-2">Loading Preferences</h2>
            <SkeletonToggle />
            <SkeletonToggle />
            <SkeletonToggle />
            <SkeletonToggle />
          </div>
        ) : (
          <>
            {/* Push Notifications Section */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-2">Push Notifications</h2>

              <Toggle
                label="Orders & Sales"
                description="Get notified when someone buys your item"
                icon="shopping_bag"
                active={settings.push_orders}
                onToggle={() => toggleSetting('push_orders')}
              />

              <Toggle
                label="Messages"
                description="Alerts for new chat messages"
                icon="chat"
                active={settings.push_messages}
                onToggle={() => toggleSetting('push_messages')}
              />

              <Toggle
                label="Promotions"
                description="Updates on sales and special offers"
                icon="campaign"
                active={settings.push_promotions}
                onToggle={() => toggleSetting('push_promotions')}
              />
            </div>

            {/* Push System Enrollment Integration */}
            <div className="bg-white dark:bg-[#1E292B] rounded-3xl p-5 shadow-sm border border-transparent dark:border-slate-800 space-y-4">
              <div className="flex gap-3">
                <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <DynamicLucideIcon name="notifications" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight text-slate-900 dark:text-white">Device Web Push Delivery</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Enroll your current web browser to receive live alert popups even when you are not using the app.
                  </p>
                </div>
              </div>

              {!pushSupported ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2">
                  <DynamicLucideIcon name="error" className="text-red-500 text-sm shrink-0 mt-0.5" />
                  <p className="text-red-500 text-xs font-medium leading-relaxed">
                    Your web browser does not support Web Push. Try on a mobile device or modern desktop browser.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-3 text-xs font-semibold">
                    <span className="text-slate-500">Status</span>
                    <span className={`px-2 py-0.5 rounded-full capitalize font-bold ${
                      isSubscribed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {isSubscribed ? 'Subscribed' : 'Not Subscribed'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {isSubscribed ? (
                      <>
                        <button
                          onClick={unsubscribeFromPush}
                          disabled={registeringPush}
                          className="flex-1 py-3 px-4 rounded-xl border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/5 transition-colors disabled:opacity-50"
                        >
                          Disable Push
                        </button>
                        <button
                          onClick={sendTestNotification}
                          disabled={sendingTest}
                          className="flex-1 py-3 px-4 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          {sendingTest ? 'Sending...' : 'Test Push'}
                          {!sendingTest && <DynamicLucideIcon name="send" size={14} />}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={subscribeToPush}
                        disabled={registeringPush}
                        className="w-full py-3.5 px-4 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] disabled:opacity-50"
                      >
                        {registeringPush ? 'Enrolling...' : 'Enable Push Notifications'}
                        {!registeringPush && <DynamicLucideIcon name="check_circle" size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Email Preferences Section */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-2 pt-2">Email Preferences</h2>

              <Toggle
                label="Weekly Digest"
                description="Summary of your activity and trends"
                icon="mail"
                active={settings.email_weekly}
                onToggle={() => toggleSetting('email_weekly')}
              />
            </div>

            {/* Sync Banner */}
            <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center gap-2">
              <DynamicLucideIcon name="lock" className="text-slate-400 text-sm" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                Preferences are synced across all your devices
              </span>
            </div>
          </>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[11000] animate-in slide-in-from-bottom-5 fade-in duration-300 px-4 w-full max-w-xs"
        >
          <div className={`p-4 rounded-2xl flex items-center gap-3 shadow-xl border ${
            toast.type === 'success' 
              ? 'bg-emerald-600 border-emerald-500 text-white' 
              : toast.type === 'error'
                ? 'bg-red-600 border-red-500 text-white'
                : 'bg-blue-600 border-blue-500 text-white'
          }`}>
            <DynamicLucideIcon name={toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'} className="text-xl shrink-0" />
            <span className="text-xs font-bold leading-normal tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
