// Development placeholder — overwritten by `next build` (Serwist).
// Unregisters any stale production SW so dev mode runs clean.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.registration.unregister().then(() =>
      self.clients.matchAll({ type: "window" }).then((clients) =>
        clients.forEach((c) => c.navigate(c.url))
      )
    )
  );
});
