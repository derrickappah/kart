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
