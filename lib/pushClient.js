'use client';

import { Capacitor } from '@capacitor/core';

// Helper to convert base64 VAPID key to Uint8Array for browser PushManager
export function urlBase64ToUint8Array(base64String) {
  if (!base64String) return new Uint8Array();
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported on the current platform
 */
export function isPushSupported() {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get current platform identifier ('android' | 'ios' | 'web')
 */
export function getPushPlatform() {
  if (typeof window === 'undefined') return 'web';
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform(); // 'android' or 'ios'
  }
  return 'web';
}

/**
 * Check current push notification permission status
 */
export async function getPushPermissionStatus() {
  if (typeof window === 'undefined') return 'denied';

  if (Capacitor.isNativePlatform()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const status = await PushNotifications.checkPermissions();
      return status.receive; // 'granted', 'denied', or 'prompt'
    } catch (err) {
      console.warn('[PushClient] Error checking native permissions:', err);
      return 'prompt';
    }
  }

  if ('Notification' in window) {
    return Notification.permission; // 'granted', 'denied', or 'default'
  }

  return 'denied';
}

/**
 * Register device for push notifications (Web or Mobile)
 * @param {Object} options
 * @param {Function} options.onNotificationReceived - Callback when a push arrives in foreground
 * @param {Function} options.onNotificationClicked - Callback when user taps a push notification
 * @returns {Promise<{ success: boolean, token?: string, subscription?: any, error?: string }>}
 */
export async function registerForPushNotifications(options = {}) {
  const { onNotificationReceived, onNotificationClicked } = options;

  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications are not supported on this device/browser' };
  }

  // 1. Native Mobile Registration (Capacitor Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Request permission
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        return { success: false, error: 'Push notification permission was denied' };
      }

      return new Promise(async (resolve) => {
        let resolved = false;

        // Listen for token registration
        await PushNotifications.addListener('registration', async (token) => {
          console.log('[PushClient] Native FCM Token registered:', token.value);
          try {
            const res = await fetch('/api/notifications/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tokenType: 'fcm',
                platform: Capacitor.getPlatform(),
                token: token.value,
                deviceInfo: {
                  platform: Capacitor.getPlatform(),
                  isNative: true,
                  userAgent: navigator.userAgent
                }
              })
            });

            if (!res.ok) {
              const data = await res.json();
              console.warn('[PushClient] Server registration warning:', data.error);
            }

            if (!resolved) {
              resolved = true;
              resolve({ success: true, token: token.value, platform: Capacitor.getPlatform() });
            }
          } catch (err) {
            console.error('[PushClient] Failed to save native token to server:', err);
            if (!resolved) {
              resolved = true;
              resolve({ success: true, token: token.value, platform: Capacitor.getPlatform() });
            }
          }
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (err) => {
          console.error('[PushClient] Native registration error:', err);
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: err.error || 'Native push registration failed' });
          }
        });

        // Foreground notification handler
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('[PushClient] Foreground notification received:', notification);
          if (onNotificationReceived) {
            onNotificationReceived(notification);
          }
        });

        // Notification tap action handler
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('[PushClient] Notification action performed:', action);
          const notificationData = action.notification.data || {};
          if (onNotificationClicked) {
            onNotificationClicked(notificationData);
          } else if (notificationData.url) {
            window.location.href = notificationData.url;
          }
        });

        // Trigger native registration
        await PushNotifications.register();

        // Safety timeout in case callback doesn't fire immediately
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({ success: true, pending: true });
          }
        }, 5000);
      });
    } catch (err) {
      console.error('[PushClient] Native push error:', err);
      return { success: false, error: err.message };
    }
  }

  // 2. Web Browser Push Registration (VAPID + Service Worker)
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Push notification permission was denied' };
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BIFIsOmpTRnvrHcyRMzFEgN2fTfwq7PynLJu32MvNcEnFL80j8622OL7ucNB8_9G6_VKt4T19OOWXhDCSvArKQM';
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
    }

    // Register with backend
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenType: 'web',
        platform: 'web',
        subscription: subscription.toJSON(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform || 'web'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save subscription to server');
    }

    return { success: true, subscription, platform: 'web' };
  } catch (err) {
    console.error('[PushClient] Web push registration error:', err);
    return { success: false, error: err.message || 'Web push subscription failed' };
  }
}

/**
 * Unregister device from push notifications
 */
export async function unregisterFromPushNotifications() {
  if (!isPushSupported()) return { success: true };

  if (Capacitor.isNativePlatform()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.removeAllListeners();
      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: Capacitor.getPlatform(), removeAllForDevice: true })
      });
      return { success: true };
    } catch (err) {
      console.error('[PushClient] Unregister native push error:', err);
      return { success: false, error: err.message };
    }
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      await subscription.unsubscribe();
    }
    return { success: true };
  } catch (err) {
    console.error('[PushClient] Unregister web push error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Check if the current device is currently subscribed
 */
export async function checkDevicePushSubscription() {
  if (!isPushSupported()) return false;

  if (Capacitor.isNativePlatform()) {
    const status = await getPushPermissionStatus();
    return status === 'granted';
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (err) {
    return false;
  }
}
