// beoneofus Service Worker — caching + Web Push

const CACHE_VERSION = 'v3';
const STATIC_CACHE  = `bou-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `bou-runtime-${CACHE_VERSION}`;

const PRECACHE = ['/'];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clear old caches ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for hashed assets, network-first for HTML ─────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // HTML: network-first
  if (request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Hashed assets (_next/static): cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          caches.open(STATIC_CACHE).then(c => c.put(request, res.clone()));
          return res;
        });
      })
    );
    return;
  }
});

// ── Push: show notification ──────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data?.json() ?? {}; } catch (_) { data = { title: 'beoneofus', body: e.data?.text() ?? '' }; }

  const title   = data.title ?? 'beoneofus';
  const options = {
    body:    data.body   ?? '',
    icon:    data.icon   ?? '/android-chrome-192x192.png',
    badge:   '/favicon-32x32.png',
    tag:     data.tag    ?? 'bou-notification',
    data:    { url: data.url ?? '/' },
    vibrate: [100, 50, 100],
    renotify: true,
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click: open/focus the target URL ────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url ?? '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url.includes(target) && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});
