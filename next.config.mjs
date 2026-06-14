import withSerwist from "@serwist/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // /dashboard was a renamed route that only exists in the deployed branch;
      // the local codebase still uses /dash. Forward all /dashboard/* hits so
      // bookmarks and auth ?next= params from the old code still resolve.
      {
        source: '/dashboard/:path*',
        destination: '/dash/:path*',
        permanent: false,
      },
    ];
  },

  async headers() {
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' required: Next.js injects inline hydration scripts.
      // 'unsafe-eval' required in dev: Turbopack + React DevTools use eval() for source maps.
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} https://js.paystack.co https://static.cloudflareinsights.com`,
      // Tailwind inlines styles at runtime — tighten once you move to static CSS
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.groq.com https://api.resend.com https://api.paystack.co https://open.er-api.com https://api.github.com https://ghchart.rshah.org https://cloudflareinsights.com",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.tiktok.com https://player.vimeo.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy',           value: csp },
          { key: 'X-Content-Type-Options',            value: 'nosniff' },
          { key: 'X-Frame-Options',                   value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection',                  value: '1; mode=block' },
          { key: 'Referrer-Policy',                   value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',                value: 'camera=(self), microphone=(self), geolocation=()' },
          // HSTS: enforce HTTPS for 1 year, include subdomains
          { key: 'Strict-Transport-Security',         value: 'max-age=31536000; includeSubDomains; preload' },
        ],
      },
    ];
  },

  // Fix "multiple lockfiles" workspace root warning — pin tracing to this package
  outputFileTracingRoot: new URL('.', import.meta.url).pathname.replace(/\/$/, ''),

  turbopack: {},

  experimental: {
    optimizePackageImports: ['lucide-react', 'react-markdown', 'react-syntax-highlighter'],
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'jwjrogchwfzofpaczaah.supabase.co' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'randomuser.me' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default withSerwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
})(nextConfig);
