# Checklist

- [x] Install `web-push` dependency
- [x] Handle database migration via profiles table JSONB preferences (`profiles.notification_prefs.web_push_subscriptions`), bypassing direct DDL/TCP database port restrictions
- [x] Configure base VAPID keys and default developer fallbacks
- [x] Add missing icon mappings in `components/DynamicLucideIcon.js`
- [x] Implement push subscription route `/api/notifications/subscribe`
- [x] Implement push sending route `/api/notifications/send-push`
- [x] Implement skeleton loaders, null checks, toast feedback, and push enrollment in `app/dashboard/settings/preferences/notifications/page.js`
- [x] Create a service worker `public/sw.js` to receive background push notifications
- [x] Verify build and functionality
