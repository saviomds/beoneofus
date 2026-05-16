/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  StaleWhileRevalidate,
  CacheFirst,
  NetworkFirst,
  ExpirationPlugin,
  RangeRequestsPlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // Static fonts
    {
      matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 7 * 24 * 60 * 60 })],
      }),
    },
    // Images
    {
      matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // Next.js image optimization
    {
      matcher: /\/_next\/image\?url=.+$/i,
      handler: new StaleWhileRevalidate({
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
          new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
    // JS chunks
    {
      matcher: /\.(?:js)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // CSS
    {
      matcher: /\.(?:css|less)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // Next.js data routes
    {
      matcher: /\/_next\/data\/.+\/.+\.json$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // API routes — network-first, short timeout
    {
      matcher: ({ url: { pathname } }: { url: URL }) =>
        pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // HTML navigation — no timeout so slow cold-start dev builds don't trip the SW
    {
      matcher: ({ request }: { request: Request }) =>
        request.destination === "document",
      handler: new NetworkFirst({
        cacheName: "documents",
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // Everything else
    {
      matcher: ({ request, url: { pathname } }: { request: Request; url: URL }) =>
        request.destination !== "document" || pathname.startsWith("/_next/"),
      handler: new NetworkFirst({
        cacheName: "others",
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }: { request: Request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
