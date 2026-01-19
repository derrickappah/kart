This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Environment Variables

Create a `.env.local` file in the root directory and add the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Paystack Configuration (Required for payments)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key_here
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key_here

# Paystack Currency (Optional - NOT SET BY DEFAULT)
# By default, the system does NOT send currency and lets Paystack use your account's default currency
# Only set these if you need to explicitly specify a currency:
# PAYSTACK_CURRENCY=NGN
# PAYSTACK_USE_CURRENCY=true
# Options: NGN (Nigeria), GHS (Ghana), ZAR (South Africa), etc.

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** 
- Get your Paystack keys from [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer)
- Use test keys (pk_test_...) for development
- Use live keys (pk_live_...) for production
- **ALWAYS restart your development server after changing environment variables:**
  ```bash
  # Stop the server (Ctrl+C), then restart:
  npm run dev
  ```
- **Activate your Paystack account:**
  - Go to [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer)
  - Complete business verification
  - Activate at least one payment channel (Card, Bank Transfer, Mobile Money, etc.)
  - If you see "No active channel" error, you need to activate payment channels first

### Troubleshooting Paystack Errors

#### "Currency not supported by merchant" Error

**Solution 1 (Recommended):** Remove currency configuration entirely
- The system does NOT send currency by default (this is correct)
- Remove or comment out `PAYSTACK_CURRENCY` and `PAYSTACK_USE_CURRENCY` from `.env.local`
- Restart your development server
- Paystack will use your account's default currency automatically

**Solution 2:** If you must specify currency
- Only set these if your Paystack account requires it:
  ```env
  PAYSTACK_CURRENCY=NGN  # Use your account's supported currency
  PAYSTACK_USE_CURRENCY=true  # Must be exactly "true" (string)
  ```
- Check your Paystack dashboard to see which currencies are supported
- Restart your development server after changes

**Debugging Steps:**
1. Check server console logs - you'll see `[Paystack]` prefixed messages showing what's being sent
2. Verify currency is NOT in the request body (should show "NOT PRESENT (correct)")
3. Check your Paystack dashboard → Settings → Account to see your account's default currency
4. Ensure your Paystack account is fully activated and verified

#### "No active channel" Error

This means your Paystack account doesn't have payment channels activated:
1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to Settings → Payment Channels
3. Activate at least one channel:
   - Card payments
   - Bank transfer
   - Mobile Money (MTN, Vodafone, AirtelTigo, etc.)
4. Complete business verification if required
5. Try the payment again

#### "400 Bad Request" or Other Errors

1. **Check server logs** - Detailed error information is logged with `[Paystack]` and `[Subscription API]` prefixes
2. **Verify environment variables:**
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is set correctly
   - `PAYSTACK_SECRET_KEY` is set correctly
   - Keys match your environment (test vs live)
3. **Restart the server** after any `.env.local` changes
4. **Check Paystack dashboard** for account status and any restrictions

### Paystack Webhook Setup

**IMPORTANT:** Webhooks are required for automatic subscription activation after payment. Without webhooks, subscriptions will remain in "Pending" status.

#### Setting Up Webhooks

1. **Get your webhook URL:**
   - For local development: Use a service like [ngrok](https://ngrok.com/) to expose your local server
   - For production: Use your production domain
   - Webhook URL format: `https://yourdomain.com/api/paystack/webhook`

2. **Configure in Paystack Dashboard:**
   - Go to [Paystack Dashboard](https://dashboard.paystack.com)
   - Navigate to **Settings → Webhooks**
   - Click **Add Webhook**
   - Enter your webhook URL: `https://yourdomain.com/api/paystack/webhook`
   - Select events to listen for:
     - ✅ `charge.success` (Required for subscription activation)
   - Click **Save**

3. **Test Webhook:**
   - Paystack will send a test event to verify your webhook
   - Check your server logs for `[Webhook]` messages
   - If you see "Invalid signature" errors, verify your `PAYSTACK_SECRET_KEY` matches your Paystack account

4. **For Local Development:**
   ```bash
   # Install ngrok
   npm install -g ngrok
   
   # Start your Next.js server
   npm run dev
   
   # In another terminal, expose localhost:3000
   ngrok http 3000
   
   # Use the ngrok URL in Paystack webhook settings
   # Example: https://abc123.ngrok.io/api/paystack/webhook
   ```

#### Webhook Troubleshooting

**Subscriptions not activating after payment?**

1. **Check webhook is configured:**
   - Go to Paystack Dashboard → Settings → Webhooks
   - Verify webhook URL is correct and active
   - Check webhook logs in Paystack dashboard for delivery status

2. **Check server logs:**
   - Look for `[Webhook]` prefixed messages
   - Verify webhook is being received
   - Check for signature verification errors

3. **Manual Activation:**
   - If webhook fails, use the "Manually Activate" button in Seller Dashboard
   - This verifies payment and activates subscription immediately
   - Useful for testing and recovery

4. **Verify Payment Reference:**
   - Check server logs for payment reference matching
   - Webhook logs show if subscription is found by reference
   - If reference doesn't match, manual activation will fix it

#### Webhook Events Handled

- `charge.success` - Automatically activates subscriptions and updates orders
- Other events are logged but not processed (can be added as needed)

### Troubleshooting Paystack Errors

#### "Currency not supported by merchant" Error

**By default, the system does NOT send currency to Paystack** - it uses your account's default currency. If you're getting this error:

1. **Check your Paystack account currency:**
   - Go to [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer)
   - Check Settings → General → Currency
   - Note which currency your account is configured for (e.g., NGN, GHS, ZAR)

2. **Verify environment variables:**
   - Open `.env.local` and check if `PAYSTACK_CURRENCY` or `PAYSTACK_USE_CURRENCY` are set
   - **Recommended:** Remove or comment out these lines to use account default:
     ```env
     # PAYSTACK_CURRENCY=GHS  # Comment out or remove
     # PAYSTACK_USE_CURRENCY=true  # Comment out or remove
     ```

3. **Restart your development server:**
   ```bash
   # Stop the server (Ctrl+C), then:
   npm run dev
   ```

4. **Check server logs:**
   - Look for `[Paystack]` log messages in your terminal
   - Verify that `currency: (not sent - using account default)` appears in logs
   - If currency is being sent, check the environment variable warnings

5. **If you need to explicitly set currency:**
   - Only set these if your Paystack account supports multiple currencies:
     ```env
     PAYSTACK_CURRENCY=NGN  # Use your account's supported currency
     PAYSTACK_USE_CURRENCY=true  # Must be exactly "true"
     ```
   - Restart the server after setting these

#### "No active channel" Error

This means your Paystack account doesn't have payment channels activated:

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to Settings → Payment Channels
3. Activate at least one channel:
   - Card payments
   - Bank transfer
   - Mobile Money (MTN, Vodafone, AirtelTigo, etc.)
4. Complete business verification if required
5. For test mode, ensure test mode is enabled in dashboard

#### Debug Logging

The system includes detailed logging to help diagnose issues:

- **Server logs:** Check your terminal/console for `[Paystack]` and `[Subscription API]` messages
- **Request details:** Logs show exactly what's being sent to Paystack (without sensitive data)
- **Error details:** Full error information is logged for debugging

#### Paystack Account Configuration Checklist

Before using payments, ensure:

- [ ] Paystack account is activated
- [ ] Business verification is complete (for live mode)
- [ ] At least one payment channel is activated
- [ ] Test mode is enabled (for development)
- [ ] API keys are correct (test keys for dev, live keys for production)
- [ ] Account currency matches your expectations (check in dashboard)
- [ ] Environment variables are set correctly in `.env.local`
- [ ] Development server has been restarted after environment changes

### 2. Database Setup

Run the following SQL files in your Supabase SQL Editor (in order):
1. `supabase_setup.sql` - Base tables
2. `subscription_schema.sql` - Subscription system
3. `advertising_schema.sql` - Advertising system
4. `wishlist_schema.sql` - Wishlist
5. `reviews_schema.sql` - Reviews
6. `verification_schema.sql` - Verification
7. `campus_schema.sql` - Campus fields
8. `reports_schema.sql` - Reports
9. `admin_schema.sql` - Admin features
10. `messaging_schema.sql` - Messaging

### 3. Run the Development Server

**Important:** Always restart the server after changing environment variables!

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

**Note:** If you change any environment variables in `.env.local`, you must:
1. Stop the server (press `Ctrl+C`)
2. Restart it with the command above
3. Environment variables are only loaded when the server starts

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
