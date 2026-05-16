/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

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
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-font-assets",
        expiration: { maxEntries: 8, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    // Images
    {
      matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // Next.js image optimization
    {
      matcher: /\/_next\/image\?url=.+$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // Audio/video — range requests required
    {
      matcher: /\.(?:mp3|wav|ogg)$/i,
      handler: "CacheFirst",
      options: {
        rangeRequests: true,
        cacheName: "static-audio-assets",
        expiration: { maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // JS chunks
    {
      matcher: /\.(?:js)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-js-assets",
        expiration: { maxEntries: 48, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // CSS
    {
      matcher: /\.(?:css|less)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-style-assets",
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // Next.js data routes
    {
      matcher: /\/_next\/data\/.+\/.+\.json$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-data",
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // API routes — always network-first, short timeout
    {
      matcher: ({ url: { pathname } }: { url: URL }) =>
        pathname.startsWith("/api/"),
      handler: "NetworkFirst",
      options: {
        cacheName: "apis",
        expiration: { maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
    // HTML navigation — network first with offline fallback, no timeout so slow
    // cold-start dev builds don't trip the SW and serve /offline prematurely.
    {
      matcher: ({ request }: { request: Request }) =>
        request.destination === "document",
      handler: "NetworkFirst",
      options: {
        cacheName: "documents",
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // Everything else
    {
      matcher: ({ request, url: { pathname } }: { request: Request; url: URL }) =>
        request.destination !== "document" || pathname.startsWith("/_next/"),
      handler: "NetworkFirst",
      options: {
        cacheName: "others",
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
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
