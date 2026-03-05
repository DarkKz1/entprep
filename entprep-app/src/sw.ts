/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// ── Workbox precaching (injected by vite-plugin-pwa) ─────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Navigation fallback (SPA) ────────────────────────────────────────────
const navigationRoute = new NavigationRoute(
  new NetworkFirst({ cacheName: 'navigation', networkTimeoutSeconds: 3 }),
  { denylist: [/^\/api\//] }
);
registerRoute(navigationRoute);

// ── Runtime caching ──────────────────────────────────────────────────────
registerRoute(
  /^https:\/\/.*\.supabase\.co\/rest\/v1\//,
  new StaleWhileRevalidate({
    cacheName: 'supabase-data',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 })],
  })
);

registerRoute(
  /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 31536000 })],
  })
);

// ── Push notification handler ────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const { title, body, icon, tag, url, badge } = payload;
    event.waitUntil(
      self.registration.showNotification(title || 'ENTprep', {
        body: body || '',
        icon: icon || '/icon-192.png',
        badge: badge || '/icon-96.png',
        tag: tag || 'entprep-general',
        data: { url: url || '/' },
        vibrate: [100, 50, 100],
      } as NotificationOptions)
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification('ENTprep', {
        body: event.data.text(),
        icon: '/icon-192.png',
      })
    );
  }
});

// ── Notification click handler ───────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          return (client as WindowClient).focus().then((c) => c.navigate(url));
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
