/**
 * Utility functions for standardizing, formatting, and validating phone numbers.
 * Standardizes local and international phone numbers into E.164 international format (+233XXXXXXXXX).
 */

/**
 * Standardizes a given phone number to international E.164 format (+XXXXXXXXXXX).
 * Defaults to Ghana (+233) country code for local numbers.
 *
 * Examples:
 * - '0243953094' -> '+233243953094'
 * - '0599342940' -> '+233599342940'
 * - '233599342940' -> '+233599342940'
 * - '+233 24 395 3094' -> '+233243953094'
 * - '00233243953094' -> '+233243953094'
 * - '+1 (555) 234-5678' -> '+15552345678'
 *
 * @param {string|number} phone - The phone number string or number to standardize.
 * @param {string} [defaultCountryCode='233'] - The default country dialing code without + (default: '233').
 * @returns {string} E.164 formatted phone number with leading '+', or empty string if input is invalid/empty.
 */
export function formatToInternationalPhone(phone, defaultCountryCode = '233') {
    if (!phone && phone !== 0) return '';

    let str = String(phone).trim();
    if (!str) return '';

    // Remove common separator characters (spaces, dashes, parentheses, dots)
    str = str.replace(/[\s\-\(\)\.]/g, '');

    // Check if already starts with +
    if (str.startsWith('+')) {
        const digits = str.substring(1).replace(/\D/g, '');
        return digits ? `+${digits}` : '';
    }

    // Check if starts with international call prefix 00
    if (str.startsWith('00')) {
        const digits = str.substring(2).replace(/\D/g, '');
        return digits ? `+${digits}` : '';
    }

    // Clean all non-digit characters
    const digitsOnly = str.replace(/\D/g, '');
    if (!digitsOnly) return '';

    // Local 10-digit Ghana number starting with 0 (e.g. 024XXXXXXX, 050XXXXXXX, 059XXXXXXX)
    if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
        return `+${defaultCountryCode}${digitsOnly.substring(1)}`;
    }

    // 9-digit Ghana number missing leading 0 (e.g. 24XXXXXXX, 59XXXXXXX, 50XXXXXXX)
    if (digitsOnly.length === 9 && (digitsOnly.startsWith('2') || digitsOnly.startsWith('5') || digitsOnly.startsWith('3'))) {
        return `+${defaultCountryCode}${digitsOnly}`;
    }

    // Already includes country code without + (e.g. 233243953094)
    if (digitsOnly.startsWith(defaultCountryCode) && digitsOnly.length === defaultCountryCode.length + 9) {
        return `+${digitsOnly}`;
    }

    // If starts with 0 and other length, strip leading 0 and attach default country code
    if (digitsOnly.startsWith('0')) {
        return `+${defaultCountryCode}${digitsOnly.substring(1)}`;
    }

    // Default fallback: prepend +
    return `+${digitsOnly}`;
}

// Alias for formatToInternationalPhone
export const standardizePhoneNumber = formatToInternationalPhone;

/**
 * Returns raw digits with country code, suitable for SMS gateways (e.g. Moolre) and WhatsApp URLs.
 * Example: '+233243953094' -> '233243953094'
 *
 * @param {string|number} phone
 * @returns {string} Pure digits string without leading '+'
 */
export function getPhoneDigits(phone) {
    const international = formatToInternationalPhone(phone);
    return international.replace(/^\+/, '');
}

/**
 * Formats a phone number for user-friendly display.
 * E.g. '+233243953094' -> '+233 24 395 3094'
 *
 * @param {string|number} phone
 * @returns {string}
 */
export function formatPhoneDisplay(phone) {
    const standardized = formatToInternationalPhone(phone);
    if (!standardized) return '';

    // If Ghana format (+233XXXXXXXXX - 13 characters total)
    if (standardized.startsWith('+233') && standardized.length === 13) {
        const country = standardized.slice(0, 4); // +233
        const network = standardized.slice(4, 6); // 24 / 59 / 50
        const part1 = standardized.slice(6, 9);   // 395 / 934
        const part2 = standardized.slice(9);      // 3094 / 2940
        return `${country} ${network} ${part1} ${part2}`;
    }

    return standardized;
}

/**
 * Generates a valid WhatsApp direct click-to-chat URL.
 * Automatically standardizes the phone number so wa.me links never break.
 *
 * @param {string|number} phone - Target phone number
 * @param {string} [message] - Optional prefilled message
 * @returns {string} wa.me URL
 */
export function getWhatsAppUrl(phone, message = '') {
    const digits = getPhoneDigits(phone);
    if (!digits) return '';

    const baseUrl = `https://wa.me/${digits}`;
    if (message) {
        return `${baseUrl}?text=${encodeURIComponent(message)}`;
    }
    return baseUrl;
}

/**
 * Validates whether the provided phone string is a plausible international phone number.
 *
 * @param {string|number} phone
 * @returns {boolean}
 */
export function isValidInternationalPhone(phone) {
    if (!phone) return false;
    const formatted = formatToInternationalPhone(phone);
    // E.164: + followed by 7 to 15 digits
    const e164Regex = /^\+[1-9]\d{7,14}$/;
    return e164Regex.test(formatted);
}
