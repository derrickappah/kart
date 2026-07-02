/**
 * Formats a string to sentence case (first letter capitalized, rest lowercase).
 * @param {string} str - The string to format.
 * @returns {string} The formatted string.
 */
export const toSentenceCase = (str) => {
    if (!str) return '';
    const clean = str.trim();
    if (clean.length === 0) return '';
    return clean.charAt(0).toUpperCase() + clean.slice(1);
};

/**
 * Formats a number with thousands separators and optional decimals.
 * @param {number|string} price - The price to format.
 * @returns {string} The formatted price.
 */
export const formatPrice = (price) => {
    const num = parseFloat(price);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
};

/**
 * Shuffles an array deterministically using a seed.
 * This is a pure function and does not violate React purity rules.
 * @param {Array} array - The array to shuffle.
 * @param {number} seed - The seed for the pseudo-random generator.
 * @returns {Array} The shuffled array.
 */
export const seededShuffle = (array, seed = 42) => {
    if (!array) return [];
    const arr = [...array];
    let currentSeed = seed;
    for (let i = arr.length - 1; i > 0; i--) {
        const r = Math.sin(currentSeed++) * 10000;
        const randomValue = r - Math.floor(r);
        const j = Math.floor(randomValue * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
};
