/**
 * Shared date utility functions
 */

/**
 * Returns a human-readable string for how long ago a date was
 * @param {string | Date} date - The date to compare
 * @returns {string} - e.g., "2 hours ago", "5 days ago"
 */
export const timeAgo = (date) => {
    if (!date) return 'some time ago';

    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " year ago" : " years ago");

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " month ago" : " months ago");

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " day ago" : " days ago");

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " hour ago" : " hours ago");

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " minute ago" : " minutes ago");

    return Math.floor(seconds) + (Math.floor(seconds) === 1 ? " second ago" : " seconds ago");
};
