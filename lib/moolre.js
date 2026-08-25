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
    const apiKey = process.env.MOOLRE_VAS_KEY || 
                   process.env.MOOLRE_API_KEY || 
                   process.env.MOOLRE_VASKEY || 
                   process.env.MOOLRE_KEY;

    const defaultSender = process.env.MOOLRE_SENDER_ID || 
                          process.env.MOOLRE_SENDER || 
                          'Kart';

    const sender = (senderId || defaultSender).slice(0, 11);
    const cleanedRecipient = normalizePhoneNumber(recipient);

    if (!cleanedRecipient) {
        throw new Error('Invalid or missing recipient phone number');
    }

    if (!message) {
        throw new Error('Message body is required');
    }

    if (!apiKey) {
        console.warn('[Moolre SMS] MOOLRE_VAS_KEY environment variable is not configured.');
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Moolre SMS Mock] To: ${cleanedRecipient} | Sender: ${sender} | Message: "${message}"`);
            return {
                success: true,
                simulated: true,
                message: 'SMS simulated in development mode (MOOLRE_VAS_KEY not configured)'
            };
        }
        throw new Error('Moolre SMS is not configured on the server. Please set MOOLRE_VAS_KEY in environment variables.');
    }

    console.log(`[Moolre SMS] Dispatching to ${cleanedRecipient} with sender "${sender}"`);

    try {
        const url = new URL('https://api.moolre.com/open/sms/send');
        url.searchParams.set('type', '1');
        url.searchParams.set('senderid', sender);
        url.searchParams.set('recipient', cleanedRecipient);
        url.searchParams.set('message', message);

        let response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'X-API-VASKEY': apiKey.trim(),
            },
        });

        let data = await response.json().catch(() => null);

        // If GET was rejected or returned 405/404, fallback to POST
        if (!response.ok && (response.status === 405 || response.status === 404)) {
            console.log('[Moolre SMS] GET returned ' + response.status + ', retrying with POST...');
            response = await fetch('https://api.moolre.com/open/sms/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-VASKEY': apiKey.trim(),
                },
                body: JSON.stringify({
                    type: 1,
                    senderid: sender,
                    recipient: cleanedRecipient,
                    message: message,
                }),
            });
            data = await response.json().catch(() => null);
        }

        console.log('[Moolre SMS Response]', { status: response.status, data });

        if (!response.ok) {
            const errorMsg = data?.message || `Moolre API error (HTTP ${response.status})`;
            throw new Error(errorMsg);
        }

        // Moolre returns { status: 1, code: 'SMS01', message: 'Success' } on success
        // or { status: 0, code: '...', message: '...' } on failure
        if (data && data.status !== 1) {
            const errorDesc = data.message || `Moolre error code: ${data.code || 'UNKNOWN'}`;
            throw new Error(errorDesc);
        }

        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error('[Moolre SMS] Send failure:', error.message);
        throw error;
    }
}
