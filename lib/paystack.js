/**
 * Paystack API Client
 * Handles payment initialization, verification, and transfers
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * Initialize a payment transaction
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Amount in pesewas (GHS * 100)
 * @param {string} params.email - Customer email
 * @param {string} params.reference - Unique transaction reference
 * @param {string} params.callback_url - Callback URL after payment
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Payment initialization response
 */
export async function initializePayment({ amount, email, reference, callback_url, metadata = {}, currency }) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  // Convert amount to smallest currency unit (pesewas for GHS, kobo for NGN)
  const amountInSmallestUnit = Math.round(amount * 100);

  const requestBody = {
    amount: amountInSmallestUnit,
    email,
    reference,
    callback_url,
    metadata,
  };

  // IMPORTANT: Do NOT send currency parameter by default
  // Paystack will automatically use your account's default currency
  // Only add currency if explicitly enabled via environment variable
  // This prevents "Currency not supported" errors
  
  // Environment variable validation and warnings
  const useCurrency = process.env.PAYSTACK_USE_CURRENCY === 'true';
  const paymentCurrency = currency || process.env.PAYSTACK_CURRENCY;
  
  // Warn if PAYSTACK_USE_CURRENCY is set but not exactly 'true'
  if (process.env.PAYSTACK_USE_CURRENCY && process.env.PAYSTACK_USE_CURRENCY !== 'true') {
    console.warn(`[Paystack] PAYSTACK_USE_CURRENCY is set to "${process.env.PAYSTACK_USE_CURRENCY}" but should be "true" to enable currency. Currency will not be sent.`);
  }
  
  // Warn if PAYSTACK_CURRENCY is set but PAYSTACK_USE_CURRENCY is not 'true'
  if (process.env.PAYSTACK_CURRENCY && !useCurrency) {
    console.warn(`[Paystack] PAYSTACK_CURRENCY is set to "${process.env.PAYSTACK_CURRENCY}" but PAYSTACK_USE_CURRENCY is not "true". Currency will not be sent.`);
  }
  
  // Only add currency to request if explicitly enabled AND a currency is provided
  // Default behavior: Don't send currency parameter at all
  if (useCurrency === true && paymentCurrency) {
    requestBody.currency = paymentCurrency;
    console.log(`[Paystack] Currency explicitly enabled: ${paymentCurrency}`);
  }
  
  // SAFEGUARD: Explicitly remove currency property if it exists and shouldn't be sent
  // This ensures currency is never accidentally sent
  if (!useCurrency || !paymentCurrency) {
    delete requestBody.currency;
  }
  
  // Debug logging: Log what we're sending to Paystack (without sensitive data)
  const debugBody = { ...requestBody };
  console.log('[Paystack] Initializing payment with request body:', {
    amount: debugBody.amount,
    email: debugBody.email,
    reference: debugBody.reference,
    callback_url: debugBody.callback_url,
    has_currency: 'currency' in debugBody,
    currency: debugBody.currency || '(not sent - using account default)',
    metadata_keys: Object.keys(debugBody.metadata || {}),
  });

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Paystack] Payment initialization failed:', {
      status: response.status,
      statusText: response.statusText,
      error: error,
      requestBody: {
        amount: requestBody.amount,
        email: requestBody.email,
        reference: requestBody.reference,
        has_currency: 'currency' in requestBody,
        currency: requestBody.currency || '(not sent)',
      },
    });
    throw new Error(error.message || 'Failed to initialize payment');
  }

  return await response.json();
}

/**
 * Verify a payment transaction
 * @param {string} reference - Transaction reference
 * @returns {Promise<Object>} Transaction verification response
 */
export async function verifyTransaction(reference) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to verify transaction');
  }

  return await response.json();
}

/**
 * Get list of banks from Paystack (for getting correct bank codes)
 * @param {string} currency - Currency code (default: GHS)
 * @returns {Promise<Object>} Bank list response
 */
export async function getBanks(currency = 'GHS') {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/bank?currency=${currency}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch banks');
  }

  return await response.json();
}

/**
 * Create a transfer recipient (for seller payouts)
 * @param {Object} params - Recipient parameters
 * @param {string} params.type - Recipient type (nuban, mobile_money, etc.)
 * @param {string} params.name - Recipient name
 * @param {string} params.account_number - Account number
 * @param {string} params.bank_code - Bank code
 * @param {string} params.currency - Currency (GHS)
 * @returns {Promise<Object>} Recipient creation response
 */
export async function createTransferRecipient({ type, name, account_number, bank_code, currency = 'GHS' }) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  // Build request body - for mobile_money, bank_code might not be required or needs special handling
  const requestBody = {
    type,
    name,
    account_number,
    currency,
  };

  // Only include bank_code if provided (required for nuban, optional for mobile_money)
  if (bank_code) {
    requestBody.bank_code = bank_code;
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage = error.message || 'Failed to create transfer recipient';
    // Include more context in error message
    throw new Error(`${errorMessage} (type: ${type}, bank_code: ${bank_code || 'not provided'})`);
  }

  return await response.json();
}

/**
 * Initiate a transfer to a recipient
 * @param {Object} params - Transfer parameters
 * @param {string} params.recipient - Recipient code
 * @param {number} params.amount - Amount in pesewas (GHS * 100)
 * @param {string} params.reference - Transfer reference
 * @param {string} params.reason - Transfer reason
 * @returns {Promise<Object>} Transfer response
 */
export async function initiateTransfer({ recipient, amount, reference, reason }) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(amount * 100), // Convert GHS to pesewas
      recipient,
      reference,
      reason,
      currency: 'GHS',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to initiate transfer');
  }

  return await response.json();
}

/**
 * Verify a transfer
 * @param {string} reference - Transfer reference
 * @returns {Promise<Object>} Transfer verification response
 */
export async function verifyTransfer(reference) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transfer/verify/${reference}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to verify transfer');
  }

  return await response.json();
}
