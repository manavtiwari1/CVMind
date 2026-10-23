// CVMind Team service worker: shows push notifications and opens the right page when one is tapped.
// It only handles push; pages and files always load from the network.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// The app lives at the scope root (team.cvmind.in/) or at /team where there is no host split
const appUrl = (hash) => new URL(self.registration.scope).href.replace(/\/?$/, '/') + (hash || '#/home');

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'CVMind Team', body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'CVMind Team', {
    body: data.body || '',
    icon: '/team-icon-192.png',
    badge: '/team-icon-192.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: appUrl(data.url) }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || appUrl();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find((w) => w.url.startsWith(appUrl('').replace(/#.*$/, '')));
    if (open) {
      await open.focus();
      // Same page, new hash: the app's router picks it up
      return open.navigate ? open.navigate(url).catch(() => open.postMessage({ type: 'open', url })) : open.postMessage({ type: 'open', url });
    }
    return self.clients.openWindow(url);
  })());
});
