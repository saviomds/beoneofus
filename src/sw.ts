/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  RangeRequestsPlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// On activate: wipe ALL runtime caches so a new deployment never serves
// stale JS from a previous build. Precached assets are managed separately
// by Serwist and are safe to keep.
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== "serwist-precache-v2-https://www.beoneofus.work/" && !k.startsWith("workbox-precache"))
          .map((k) => caches.delete(k))
      )
    )
  );
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // Static fonts — safe to cache long-term (content-addressed)
    {
      matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
      handler: new CacheFirst({
        cacheName: "static-font-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    // App icons and logos — StaleWhileRevalidate so new deploys are
    // picked up on the next visit instead of being stuck for 24 h.
    {
      matcher: /\/(?:favicon\.ico|logo\.|appIcon\.|android-chrome|apple-touch-icon|cropped_circle|ai\.gif)/i,
      handler: new StaleWhileRevalidate({
        cacheName: "app-icons",
        plugins: [new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 7 * 24 * 60 * 60 })],
      }),
    },
    // Other images — CacheFirst is fine; user-uploaded content uses Supabase URLs
    {
      matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i,
      handler: new CacheFirst({
        cacheName: "static-image-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // Next.js image optimization
    {
      matcher: /\/_next\/image\?url=.+$/i,
      handler: new CacheFirst({
        cacheName: "next-image",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // Audio — range requests required
    {
      matcher: /\.(?:mp3|wav|ogg)$/i,
      handler: new CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new RangeRequestsPlugin(),
          new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 7 * 24 * 60 * 60 }),
        ],
      }),
    },
    // Next.js static chunks — content-hashed filenames, safe to cache forever
    // (new deployments generate new filenames so old cache entries are harmless)
    {
      matcher: /\/_next\/static\/.+\.(?:js|css)$/i,
      handler: new CacheFirst({
        cacheName: "next-static-chunks",
        plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 365 * 24 * 60 * 60 })],
      }),
    },
    // Next.js data routes
    {
      matcher: /\/_next\/data\/.+\/.+\.json$/i,
      handler: new NetworkFirst({
        cacheName: "next-data",
        networkTimeoutSeconds: 8,
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 })],
      }),
    },
    // API routes — always network-first, short cache for offline fallback only
    {
      matcher: ({ url: { pathname } }: { url: URL }) =>
        pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 5 * 60 })],
      }),
    },
    // HTML navigation — always network-first so users always get fresh HTML
    // with the correct chunk URLs. Auth routes excluded from interception.
    {
      matcher: ({ request, url: { pathname } }: { request: Request; url: URL }) =>
        request.destination === "document" && !pathname.startsWith("/auth"),
      handler: new NetworkFirst({
        cacheName: "documents",
        networkTimeoutSeconds: 4,
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 })],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher({ request }: { request: Request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// ── Web Push ─────────────────────────────────────────────────────────────────
// Serwist handles install/activate/fetch. Push notifications are a separate
// concern — added here so they survive Serwist's own listener registration.

self.addEventListener("push", (event: PushEvent) => {
  let data: { title?: string; body?: string; icon?: string; tag?: string; url?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() ?? "" };
  }

  const title = data.title ?? "beoneofus";
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body:     data.body  ?? "",
    icon:     data.icon  ?? "/android-chrome-192x192.png",
    badge:    "/favicon-32x32.png",
    tag:      data.tag   ?? "bou-notification",
    data:     { url: data.url ?? "/" },
    vibrate:  [100, 50, 100],
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const target = (event.notification.data?.url as string) ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((cs) => {
        const existing = cs.find((c) => c.url.includes(target) && "focus" in c);
        if (existing) return (existing as WindowClient).focus();
        return clients.openWindow(target);
      })
  );
});
