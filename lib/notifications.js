import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Set VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BN_Can8H6Pp8fuaw3F26G3argkqh6ytLU2ShaHb65onYYeWkUoB2gFoq3ow0IlfCEp1g4ZrRbdfg-PvYDyB6hfY';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'erFASHS0b3zL_EcmeCU652OriqlHvamH2LtRQwddMVk';

try {
  webpush.setVapidDetails(
    'mailto:support@kart.com',
    vapidPublicKey,
    vapidPrivateKey
  );
} catch (e) {
  console.error('Error setting VAPID details:', e.message);
}

/**
 * Trigger web push notification for a user
 */
export async function triggerPushNotification(userId, title, message, relatedOrderId = null) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[Push] Missing credentials, skipping push delivery');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('notification_prefs')
      .eq('id', userId)
      .maybeSingle();

    if (error || !profile) {
      console.error('[Push] Error fetching profile:', error?.message);
      return;
    }

    const prefs = profile.notification_prefs || {};
    const subscriptions = prefs.web_push_subscriptions || [];

    if (subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/icon.png',
      badge: '/icon.png',
      data: {
        url: relatedOrderId ? `/dashboard/orders/${relatedOrderId}` : '/dashboard/notifications',
      }
    });

    const validSubscriptions = [];
    let updated = false;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub, payload);
        validSubscriptions.push(sub);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          updated = true;
          console.log('[Push] Removed expired subscription:', sub.endpoint);
        } else {
          validSubscriptions.push(sub);
          console.error('[Push] Error delivering push notification:', err.message);
        }
      }
    }

    if (updated) {
      await supabase
        .from('profiles')
        .update({
          notification_prefs: {
            ...prefs,
            web_push_subscriptions: validSubscriptions
          }
        })
        .eq('id', userId);
    }
  } catch (err) {
    console.error('[Push] triggerPushNotification error:', err.message);
  }
}

/**
 * Notification helper functions
 */

/**
 * Create a notification for a user
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID to notify
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} relatedOrderId - Optional related order ID
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
    console.error('Error creating notification:', error);
    throw error;
  }

  // Fire push notification asynchronously
  triggerPushNotification(userId, title, message, relatedOrderId).catch(err => {
    console.error('Failed to trigger push notification:', err.message);
  });

  return data;
}

/**
 * Create multiple notifications at once
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
    console.error('Error creating notifications:', error);
    throw error;
  }

  // Trigger push for each
  notifications.forEach(n => {
    triggerPushNotification(n.userId, n.title, n.message, n.relatedOrderId).catch(err => {
      console.error('Failed to trigger push notification:', err.message);
    });
  });

  return data;
}

/**
 * Mark notification as read
 * @param {Object} supabase - Supabase client instance
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for security check)
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
    console.error('Error marking notification as read:', error);
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
    console.error('Error marking all notifications as read:', error);
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
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}
