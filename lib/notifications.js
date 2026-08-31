import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// VAPID setup for Web Push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@kart.cx';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (e) {
    console.error('[Push] Error configuring VAPID details:', e.message);
  }
} else {
  console.warn('[Push] VAPID keys not configured in environment variables.');
}

// Lazy-loaded Firebase Admin for Native Mobile FCM Push
let firebaseAdmin = null;
let firebaseMessaging = null;

async function getFirebaseMessaging() {
  if (firebaseMessaging) return firebaseMessaging;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  try {
    const admin = await import('firebase-admin');
    firebaseAdmin = admin.default || admin;

    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (!firebaseAdmin.apps.length) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    firebaseMessaging = firebaseAdmin.messaging();
    return firebaseMessaging;
  } catch (err) {
    console.warn('[Push] Firebase Admin initialization failed:', err.message);
    return null;
  }
}

/**
 * Trigger web push and mobile native push notifications for a user
 * @param {string} userId - Target user ID
 * @param {string} title - Notification title
 * @param {string} message - Notification body/message
 * @param {string|null} relatedOrderId - Optional associated order ID
 * @param {Object} [options] - Additional options (e.g. type, tag, url, data)
 * @returns {Promise<{ success: boolean, delivered: number, failed: number, total: number, message: string, errors: string[] }>}
 */
export async function triggerPushNotification(userId, title, message, relatedOrderId = null, options = {}) {
  const result = {
    success: false,
    delivered: 0,
    failed: 0,
    total: 0,
    message: '',
    errors: []
  };

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      result.message = 'Missing Supabase credentials on server';
      result.errors.push(result.message);
      console.warn('[Push]', result.message);
      return result;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch user profile and preferences
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('notification_prefs')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      console.error('[Push] Error fetching user profile:', profileErr.message);
    }

    const prefs = profile?.notification_prefs || {};
    const notificationType = options.type || 'order';

    // Respect user category preferences unless explicit force / test mode
    if (!options.force) {
      if (notificationType === 'order' && prefs.push_orders === false) {
        result.message = `User has disabled order push notifications in settings`;
        return result;
      }
      if (notificationType === 'message' && prefs.push_messages === false) {
        result.message = `User has disabled message push notifications in settings`;
        return result;
      }
      if (notificationType === 'promotion' && prefs.push_promotions === false) {
        result.message = `User has disabled promotional push notifications in settings`;
        return result;
      }
    }

    // 2. Fetch subscriptions from push_subscriptions table
    const { data: dbSubscriptions, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    let webSubscriptions = [];
    let fcmTokens = [];

    if (dbSubscriptions && dbSubscriptions.length > 0) {
      for (const row of dbSubscriptions) {
        if (row.token_type === 'fcm' && row.token) {
          fcmTokens.push({ id: row.id, token: row.token, platform: row.platform });
        } else if (row.token_type === 'web' && row.subscription_data) {
          const subData = typeof row.subscription_data === 'string' 
            ? JSON.parse(row.subscription_data) 
            : row.subscription_data;
          if (subData?.endpoint) {
            webSubscriptions.push({ id: row.id, sub: subData });
          }
        }
      }
    }

    // Backward compatibility: Also check profile JSON if push_subscriptions returned empty
    if (webSubscriptions.length === 0 && Array.isArray(prefs.web_push_subscriptions)) {
      prefs.web_push_subscriptions.forEach((sub, idx) => {
        const subData = typeof sub === 'string' ? JSON.parse(sub) : sub;
        if (subData && subData.endpoint) {
          webSubscriptions.push({ id: `legacy-${idx}`, sub: subData });
        }
      });
    }

    result.total = webSubscriptions.length + fcmTokens.length;

    if (result.total === 0) {
      result.message = 'No active push notification devices or subscriptions registered for this user. Please click "Enable Device Push Notifications" first.';
      console.log(`[Push] User ${userId} has 0 registered subscriptions.`);
      return result;
    }

    const targetUrl = options.url || (relatedOrderId ? `/dashboard/orders/${relatedOrderId}` : '/dashboard/notifications');

    // 3. Dispatch Web Push Notifications
    if (webSubscriptions.length > 0) {
      if (!vapidPublicKey || !vapidPrivateKey) {
        const errStr = 'VAPID keys not configured on server (.env.local)';
        result.errors.push(errStr);
        result.failed += webSubscriptions.length;
        console.error('[Push]', errStr);
      } else {
        const payload = JSON.stringify({
          title,
          body: message,
          icon: '/icon.png',
          badge: '/icon.png',
          data: {
            url: targetUrl,
            type: notificationType,
            relatedOrderId: relatedOrderId || null,
            ...(options.data || {})
          }
        });

        const invalidSubIds = [];
        const validLegacySubs = [];

        for (const item of webSubscriptions) {
          try {
            await webpush.sendNotification(item.sub, payload);
            result.delivered += 1;
            console.log(`[Push] Successfully sent web push to endpoint: ${item.sub.endpoint.slice(0, 40)}...`);
            if (typeof item.id === 'string' && item.id.startsWith('legacy-')) {
              validLegacySubs.push(item.sub);
            }
          } catch (err) {
            result.failed += 1;
            result.errors.push(`WebPush Error (${err.statusCode || 'unknown'}): ${err.message}`);
            console.error('[Push] Web push delivery failed:', err.statusCode, err.message);

            if (err.statusCode === 404 || err.statusCode === 410) {
              console.log('[Push] Removing expired/unregistered subscription:', item.sub.endpoint);
              if (typeof item.id === 'string' && !item.id.startsWith('legacy-')) {
                invalidSubIds.push(item.id);
              }
            } else if (typeof item.id === 'string' && item.id.startsWith('legacy-')) {
              validLegacySubs.push(item.sub);
            }
          }
        }

        // Cleanup invalid DB subscriptions
        if (invalidSubIds.length > 0) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .in('id', invalidSubIds);
        }

        // Cleanup legacy profile field if needed
        if (Array.isArray(prefs.web_push_subscriptions) && validLegacySubs.length !== prefs.web_push_subscriptions.length) {
          await supabase
            .from('profiles')
            .update({
              notification_prefs: {
                ...prefs,
                web_push_subscriptions: validLegacySubs
              }
            })
            .eq('id', userId);
        }
      }
    }

    // 4. Dispatch Native Mobile FCM Push Notifications
    if (fcmTokens.length > 0) {
      const messaging = await getFirebaseMessaging();
      if (messaging) {
        const invalidTokenIds = [];

        for (const item of fcmTokens) {
          try {
            await messaging.send({
              token: item.token,
              notification: {
                title,
                body: message,
              },
              data: {
                url: targetUrl,
                type: notificationType,
                relatedOrderId: relatedOrderId ? String(relatedOrderId) : '',
              },
              android: {
                priority: 'high',
                notification: {
                  channelId: 'kart_default_channel',
                  icon: 'ic_stat_name',
                  color: '#00C805',
                }
              },
              apns: {
                payload: {
                  aps: {
                    sound: 'default',
                    badge: 1,
                  }
                }
              }
            });
            result.delivered += 1;
            console.log(`[Push] Successfully sent FCM push to ${item.platform} token`);
          } catch (err) {
            result.failed += 1;
            result.errors.push(`FCM Error: ${err.message}`);
            console.error('[Push] FCM delivery error:', err.message);
            if (
              err.code === 'messaging/registration-token-not-registered' ||
              err.code === 'messaging/invalid-registration-token' ||
              err.code === 'messaging/invalid-argument'
            ) {
              invalidTokenIds.push(item.id);
            }
          }
        }

        // Deactivate dead FCM tokens
        if (invalidTokenIds.length > 0) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .in('id', invalidTokenIds);
        }
      } else {
        result.errors.push('Firebase Admin credentials not configured for mobile push delivery');
        console.log('[Push] Mobile FCM tokens present but Firebase Admin is not configured in environment.');
      }
    }

    result.success = result.delivered > 0;
    result.message = result.delivered > 0
      ? `Notification delivered to ${result.delivered} device(s)`
      : `Failed to deliver notification. ${result.errors.join('; ')}`;

    return result;
  } catch (err) {
    result.errors.push(`Internal error: ${err.message}`);
    result.message = `Push dispatch exception: ${err.message}`;
    console.error('[Push] triggerPushNotification error:', err.message);
    return result;
  }
}

/**
 * Create an in-app notification and trigger push notification
 * @param {Object} supabase - Supabase client instance
 * @param {Object} params - { userId, type, title, message, relatedOrderId }
 * @returns {Promise<Object>} Created notification
 */
export async function createNotification(supabase, { userId, type, title, message, relatedOrderId = null }) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      related_order_id: relatedOrderId,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[Notifications] Error creating notification:', error);
    throw error;
  }

  // Fire push notification asynchronously
  triggerPushNotification(userId, title, message, relatedOrderId, { type }).catch(err => {
    console.error('[Notifications] Failed to trigger push notification:', err.message);
  });

  return data;
}

/**
 * Create multiple in-app notifications and trigger push notifications
 * @param {Object} supabase - Supabase client instance
 * @param {Array} notifications - Array of notification objects
 * @returns {Promise<Array>} Created notifications
 */
export async function createNotifications(supabase, notifications) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notifications.map(n => ({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      related_order_id: n.relatedOrderId || null,
      is_read: false,
    })))
    .select();

  if (error) {
    console.error('[Notifications] Error creating notifications:', error);
    throw error;
  }

  // Trigger push for each asynchronously
  notifications.forEach(n => {
    triggerPushNotification(n.userId, n.title, n.message, n.relatedOrderId, { type: n.type }).catch(err => {
      console.error('[Notifications] Failed to trigger push notification:', err.message);
    });
  });

  return data;
}

/**
 * Mark notification as read
 * @param {Object} supabase - Supabase client instance
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated notification
 */
export async function markNotificationAsRead(supabase, notificationId, userId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('[Notifications] Error marking notification as read:', error);
    throw error;
  }

  return data;
}

/**
 * Mark all notifications as read for a user
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Update result
 */
export async function markAllNotificationsAsRead(supabase, userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('[Notifications] Error marking all notifications as read:', error);
    throw error;
  }

  return { success: true };
}

/**
 * Get unread notification count for a user
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread count
 */
export async function getUnreadCount(supabase, userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('[Notifications] Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}
