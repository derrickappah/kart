/**
 * Utility functions for sending SMS via Moolre SMS API
 * API Docs: https://docs.moolre.com
 */

/**
 * Normalizes phone numbers to standard format accepted by Moolre SMS API.
 * Cleans spaces, dashes, parentheses and formats Ghanaian numbers to 233 format.
 *
 * @param {string} phone
 * @returns {string} Clean formatted phone number digits
 */
export function normalizePhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters except leading +
    let cleaned = phone.trim().replace(/[^\d+]/g, '');

    if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('0') && cleaned.length === 10) {
        // Standard 10-digit Ghana local format (024..., 050..., 055..., etc.)
        cleaned = '233' + cleaned.substring(1);
    }

    return cleaned;
}

/**
 * Sends an SMS message using the Moolre SMS Gateway.
 *
 * @param {Object} options
 * @param {string} options.recipient - Target phone number
 * @param {string} options.message - SMS content
 * @param {string} [options.senderId] - Optional custom sender ID (default 'Kart', max 11 chars)
 * @returns {Promise<{success: boolean, data?: any, simulated?: boolean}>}
 */
export async function sendMoolreSMS({ recipient, message, senderId }) {
    const apiKey = process.env.MOOLRE_VAS_KEY || process.env.MOOLRE_API_KEY;
    const defaultSender = process.env.MOOLRE_SENDER_ID || 'Kart';
    const sender = (senderId || defaultSender).slice(0, 11);
    const cleanedRecipient = normalizePhoneNumber(recipient);

    if (!cleanedRecipient) {
        throw new Error('Invalid or missing recipient phone number');
    }

    if (!message) {
        throw new Error('Message body is required');
    }

    if (!apiKey) {
        console.warn('[Moolre SMS] MOOLRE_VAS_KEY is not set.');
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Moolre SMS Mock] To: ${cleanedRecipient} | Sender: ${sender} | Message: "${message}"`);
            return {
                success: true,
                simulated: true,
                message: 'SMS simulated in development mode (API key not configured)'
            };
        }
        throw new Error('Moolre SMS service is not configured (missing MOOLRE_VAS_KEY)');
    }

    try {
        const url = new URL('https://api.moolre.com/open/sms/send');
        url.searchParams.set('type', '1');
        url.searchParams.set('senderid', sender);
        url.searchParams.set('recipient', cleanedRecipient);
        url.searchParams.set('message', message);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'X-API-VASKEY': apiKey,
            },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            console.error('[Moolre SMS] HTTP error:', response.status, data);
            throw new Error(data?.message || `Moolre API returned status ${response.status}`);
        }

        // Moolre returns { status: 1, code: 'SMS01', message: 'Success', ... } on success
        // or { status: 0, code: '...', message: '...' } on error
        if (data && data.status !== 1) {
            console.error('[Moolre SMS] API returned error status:', data);
            throw new Error(data.message || `Failed to send SMS (code: ${data.code || 'UNKNOWN'})`);
        }

        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error('[Moolre SMS] Send error:', error);
        throw error;
    }
}
