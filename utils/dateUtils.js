/**
 * Shared date utility functions
 */

/**
 * Safely parses any date string (including Postgres UTC timestamps without 'Z') into a valid Date object.
 * @param {string | Date | null | undefined} date
 * @returns {Date | null}
 */
export const parseSafeDate = (date) => {
    if (!date) return null;
    if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
    
    let str = String(date).trim();
    if (!str) return null;

    // Convert space separator to ISO 'T'
    str = str.replace(' ', 'T');

    // If string has no timezone indicator (no 'Z' and no +/- offset), treat as UTC
    if (!str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
        str += 'Z';
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;

    // Fallback to native parser
    const fallback = new Date(date);
    return isNaN(fallback.getTime()) ? null : fallback;
};

/**
 * Returns a short human-readable string for chat conversation lists (e.g. "Just now", "5m", "2h", "3d", "1w", "2mo", "1y")
 * @param {string | Date} date
 * @returns {string}
 */
export const formatChatTimeAgo = (date) => {
    const parsed = parseSafeDate(date);
    if (!parsed) return '';

    const now = new Date();
    const diffMs = now.getTime() - parsed.getTime();
    const seconds = Math.floor(diffMs / 1000);

    if (seconds < 45) return 'Just now';
    if (seconds < 90) return '1m';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;

    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo`;

    const years = Math.floor(days / 365);
    return `${years}y`;
};

/**
 * Returns a human-readable string for how long ago a date was (e.g., "2 hours ago", "5 days ago")
 * @param {string | Date} date - The date to compare
 * @returns {string}
 */
export const timeAgo = (date) => {
    const parsed = parseSafeDate(date);
    if (!parsed) return 'some time ago';

    const now = new Date();
    const seconds = Math.floor((now.getTime() - parsed.getTime()) / 1000);

    if (seconds < 45) return 'just now';

    let interval = seconds / 31536000;
    if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " year ago" : " years ago");

    interval = seconds / 2592000;
    if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " month ago" : " months ago");

    interval = seconds / 86400;
    if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " day ago" : " days ago");

    interval = seconds / 3600;
    if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " hour ago" : " hours ago");

    interval = seconds / 60;
    if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " minute ago" : " minutes ago");

    return Math.floor(seconds) + (Math.floor(seconds) === 1 ? " second ago" : " seconds ago");
};
