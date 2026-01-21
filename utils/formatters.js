/**
 * Formats a string to sentence case (first letter capitalized, rest lowercase).
 * @param {string} str - The string to format.
 * @returns {string} The formatted string.
 */
export const toSentenceCase = (str) => {
    if (!str) return '';
    const clean = str.trim();
    if (clean.length === 0) return '';
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
};
