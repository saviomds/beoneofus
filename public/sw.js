// dev mode — clears all caches and unregisters this SW
self.addEventListener('install', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(
    clients.matchAll({ type: 'all', includeUncontrolled: true })
      .then(cs => { cs.forEach(c => c.navigate(c.url)); })
      .then(() => self.registration.unregister())
  );
});
