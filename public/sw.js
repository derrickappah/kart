self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', function (event) {
  // Required for PWA installability criteria
});

self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    let data;
    try {
      data = event.data.json();
    } catch {
      data = { title: 'KART Notification', body: event.data.text() };
    }

    const title = data.title || 'KART Notification';
    const options = {
      body: data.body || '',
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/icon-192x192.png',
      tag: data.tag || data.data?.tag || 'kart-notification',
      renotify: true,
      vibrate: [100, 50, 100],
      data: {
        url: data.data?.url || data.url || '/dashboard/notifications',
        ...(data.data || {})
      }
    };

    if (data.actions && Array.isArray(data.actions)) {
      options.actions = data.actions;
    }

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error in service worker push handler:', err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const clickedAction = event.action;
  const targetUrl = event.notification.data?.url || '/dashboard/notifications';

  if (clickedAction === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // Check if there is already a window open with this app
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
          });
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
