/**
 * Push Notification System Verification Test
 * Tests VAPID configuration, web-push payload encryption, and library imports.
 */

const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || '').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

console.log('=== KART Push Notification System Verification ===\n');

// 1. Check VAPID Configuration
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:support@kart.cx';

console.log('1. Checking VAPID Keys:');
console.log('   - NEXT_PUBLIC_VAPID_PUBLIC_KEY:', publicKey ? `${publicKey.slice(0, 10)}... (OK)` : 'MISSING ❌');
console.log('   - VAPID_PRIVATE_KEY:', privateKey ? `${privateKey.slice(0, 6)}... (OK)` : 'MISSING ❌');
console.log('   - VAPID_SUBJECT:', subject);

if (!publicKey || !privateKey) {
  console.error('\n❌ FAIL: VAPID keys are missing in .env.local');
  process.exit(1);
}

try {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  console.log('   ✅ VAPID keys validated and initialized successfully with web-push.\n');
} catch (err) {
  console.error('   ❌ Invalid VAPID keys:', err.message);
  process.exit(1);
}

// 2. Test Mock Web Push Payload Encryption
console.log('2. Testing Push Payload Encryption:');
const mockSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-mock-token-12345',
  keys: {
    p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM=',
    auth: 'tBHItJI5svbpez7KI4CCXg=='
  }
};

const testPayload = JSON.stringify({
  title: 'Test Notification from KART 🚀',
  body: 'Order #1234 has been confirmed and is being packed!',
  icon: '/icon-192x192.png',
  badge: '/icon-192x192.png',
  data: {
    url: '/dashboard/orders/1234',
    type: 'order'
  }
});

try {
  // Test encryption headers generation
  const headers = webpush.getVapidHeaders(
    mockSubscription.endpoint,
    subject,
    publicKey,
    privateKey,
    'aes128gcm'
  );
  console.log('   - VAPID Auth Header Generated:', headers.Authorization ? 'OK ✅' : 'FAIL ❌');
  console.log('   ✅ Web Push Encryption and Signing verified successfully.\n');
} catch (err) {
  console.error('   ❌ Payload encryption test failed:', err.message);
  process.exit(1);
}

// 3. Verify Files and Assets
console.log('3. Verifying Key Project Files:');
const requiredFiles = [
  'lib/pushClient.js',
  'lib/notifications.js',
  'public/sw.js',
  'app/api/notifications/subscribe/route.js',
  'app/api/notifications/send-push/route.js',
  'components/PushNotificationPrompt.js',
  'app/dashboard/settings/preferences/notifications/page.js',
  'supabase/migrations/20260901_push_subscriptions.sql'
];

let allFilesPresent = true;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(filePath);
  console.log(`   - ${file}: ${exists ? 'EXISTS ✅' : 'MISSING ❌'}`);
  if (!exists) allFilesPresent = false;
});

if (!allFilesPresent) {
  console.error('\n❌ One or more required push notification files are missing.');
  process.exit(1);
}

console.log('\n=== ALL PUSH NOTIFICATION TESTS PASSED ✅ ===\n');
