// Imperium Nürnberg · Service Worker
// 1) Startseite und version.json immer frisch laden (kein veralteter Zwischenspeicher auf dem iPhone)
// 2) Push-Mitteilungen anzeigen
const CACHE = 'imperium-shell-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  const fresh = r.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html') || u.pathname.endsWith('version.json');
  if (!fresh) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(r, { cache: 'no-store' });
      if (r.mode === 'navigate' && res.ok) { const c = await caches.open(CACHE); c.put(r, res.clone()); }
      return res;
    } catch (err) {
      const hit = await caches.match(r);
      if (hit) return hit;
      throw err;
    }
  })());
});
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Imperium Nürnberg', {
    body: d.body || '', tag: d.tag, icon: 'apple-touch-icon.png', badge: 'apple-touch-icon.png'
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
