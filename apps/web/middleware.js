import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const ALWAYS_ALLOW = [
  '/maintenance',
  '/api/public-settings',
  '/api/auth/',
  '/auth',
  '/login',
  '/signup',
  '/onboarding',
  '/_next/',
  '/favicon',
  '/logo',
  '/icons',
  '/robots',
];

function isAlwaysAllowed(pathname) {
  return ALWAYS_ALLOW.some(p => pathname.startsWith(p));
}

// Rolling "last activity" marker used for idle-session timeout.
const ACTIVITY_COOKIE = 'boo_last_active';

// ── Timeout guard (AbortController-based) ──────────────────────────────────
// Plain Promise.race([promise, timeoutPromise]) stops YOUR CODE from waiting
// past the deadline, but it does NOT cancel the underlying network request —
// the fetch Supabase opened keeps running in the background even after your
// function has "moved on". Under a real cross-region gap (Vercel iad1 ↔
// Supabase eu-central-1, ~90-100ms one-way, ~150-200ms round trip) that
// zombie request can hold a connection-pool slot for its full duration,
// which compounds across requests and makes future requests queue for a
// slot that never frees — the opposite of what a timeout is supposed to buy
// you. An AbortController actually tears down the request.
//
// Supabase's PostgREST query builder supports cancellation natively via
// `.abortSignal(signal)`. The Auth client's `getUser()` does NOT expose an
// abort hook, so for that one call this still only protects your code path
// (the underlying fetch may finish after we've moved on) — flagging that
// honestly rather than pretending it's fully solved.
function withTimeout(fn, ms = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return Promise.resolve(fn(controller.signal)).finally(() => clearTimeout(timer));
}

// Separate helper for calls that can't take a signal (auth.getUser()) — still
// bounds how long *we* wait, just can't cancel the in-flight fetch itself.
function raceTimeout(promise, ms = 4000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('middleware timeout')), ms)),
  ]);
}

// ── Platform settings cache ─────────────────────────────────────────────────
// platform_settings barely ever changes, but was previously queried from
// Postgres on EVERY navigation to /dash/* or /u/* for every user (logged in
// or not). Cache it in module scope with a short TTL — module scope persists
// across invocations on a warm serverless instance, so this acts as a
// lightweight shared cache without an external store.
const SETTINGS_TTL_MS = 30_000;
let settingsCache = { data: null, expiresAt: 0 };

async function getPlatformSettings() {
  const now = Date.now();
  if (settingsCache.data && settingsCache.expiresAt > now) {
    return settingsCache.data;
  }

  const adminSupa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: rows } = await withTimeout((signal) =>
    adminSupa
      .from('platform_settings')
      .select('key, value')
      .in('key', [
        'maintenance_mode',
        'maintenance_message',
        'registration_open',
        'require_email_verification',
        'session_timeout_hours',
      ])
      .abortSignal(signal)
  );

  const m = Object.fromEntries((rows || []).map(r => [r.key, r.value]));
  const settings = {
    maintenanceMode: m.maintenance_mode ?? false,
    maintenanceMessage: m.maintenance_message ?? "We're doing a quick upgrade. Be back shortly!",
    registrationOpen: m.registration_open ?? true,
    requireEmailVerify: m.require_email_verification ?? true,
    sessionTimeoutHours: Number(m.session_timeout_hours ?? 24) || 24,
  };

  settingsCache = { data: settings, expiresAt: now + SETTINGS_TTL_MS };
  return settings;
}

// Delete Supabase auth cookies (incl. chunked `.0`/`.1` variants) from both the
// incoming request and the outgoing response so a dead session is fully cleared.
function clearAuthCookies(request, response) {
  try {
    for (const { name } of request.cookies.getAll()) {
      if (/^sb-.*-auth-token/.test(name)) {
        request.cookies.delete(name);
        response.cookies.set(name, '', { path: '/', maxAge: 0 });
      }
    }
  } catch {
    // Never let cookie cleanup crash the request
  }
}

export async function middleware(request) {
  try {
    // Redirect bare domain → www.
    // 308 (not 301) preserves the HTTP method so POST requests arrive at www intact.
    const host = request.headers.get('host') ?? '';
    if (host === 'beoneofus.work') {
      const url = request.nextUrl.clone();
      url.host = 'www.beoneofus.work';
      return NextResponse.redirect(url, 308);
    }

    const { pathname } = request.nextUrl;

    if (
      pathname.startsWith('/_next/static') ||
      pathname.startsWith('/_next/image') ||
      pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|woff|woff2|ttf|css|js|map)$/)
    ) {
      return NextResponse.next();
    }

    // ── MAINTENANCE OVERRIDE ──────────────────────────────────────────────
    // Set FORCE_MAINTENANCE = true and redeploy for hard maintenance.
    // /auth and /api/auth/ are always allowed so admins can sign in.
    const FORCE_MAINTENANCE = false;
    // ─────────────────────────────────────────────────────────────────────

    if (FORCE_MAINTENANCE && !isAlwaysAllowed(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/maintenance';
      return NextResponse.redirect(url);
    }

    let response = NextResponse.next({
      request: { headers: request.headers },
    });

    // Refresh session and keep auth cookies in sync
    let user = null;
    let supabase;
    try {
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (cookiesToSet) => {
              for (const { name, value, options } of cookiesToSet) {
                request.cookies.set(name, value, options);
                response.cookies.set(name, value, options);
              }
            },
          },
        }
      );
      // getUser() has no abortSignal hook — bounded with raceTimeout instead
      // of a true cancellation (see comment on raceTimeout above).
      const { data } = await raceTimeout(supabase.auth.getUser(), 4000);
      user = data?.user ?? null;
      // NOTE: do NOT clear auth cookies here. getUser() can throw a transient
      // "fetch failed" at the edge, and clearing cookies on that would destroy a
      // perfectly valid, freshly-created session — bouncing signed-in users from
      // /dash back to /auth. A stale/dead session is handled client-side instead.
    } catch {
      // Transient auth check failure (or timeout) — let the request through, keep cookies.
    }

    if (isAlwaysAllowed(pathname)) {
      return response;
    }

    // ── Dynamic maintenance check — query Supabase directly instead of
    // self-fetching /api/public-settings. A self-HTTP-fetch from middleware
    // to the same server doubles latency and causes recursive middleware runs.
    // Settings are cancellation-guarded and cached (see getPlatformSettings
    // above) so a slow/paused/cross-region Supabase project can't hang or
    // pool-starve every request.
    let maintenanceMode = false;
    let registrationOpen = true;
    let requireEmailVerify = true;
    let sessionTimeoutHours = 24;
    try {
      const settings = await getPlatformSettings();
      maintenanceMode = settings.maintenanceMode;
      registrationOpen = settings.registrationOpen;
      requireEmailVerify = settings.requireEmailVerify;
      sessionTimeoutHours = settings.sessionTimeoutHours;
    } catch {
      // On any failure (including timeout/abort) keep safe defaults and let the request through
    }

    if (maintenanceMode) {
      let isAdmin = false;
      if (user) {
        try {
          const { data } = await withTimeout((signal) =>
            supabase.from('profiles').select('is_admin').eq('id', user.id).abortSignal(signal).single()
          );
          isAdmin = !!data?.is_admin;
        } catch {
          // Can't verify admin (or timed out/aborted) — treat as non-admin
        }
      }

      if (!isAdmin && pathname !== '/maintenance') {
        const url = request.nextUrl.clone();
        url.pathname = '/maintenance';
        return NextResponse.redirect(url);
      }
    }

    if (!registrationOpen) {
      response.headers.set('x-registration-closed', '1');
    }

    // ── Rolling idle-session timeout ──────────────────────────────────────────
    // NOTE: `user.last_sign_in_at` only changes on an actual sign-in — Supabase
    // does NOT advance it when the access token is silently refreshed. Using it
    // as a session clock force-logs-out *active* users the moment their token is
    // N hours older than their last login. Instead we track a rolling
    // "last activity" cookie that we bump on every authenticated request, so the
    // window only elapses after genuine inactivity.
    if (user && sessionTimeoutHours > 0) {
      const now = Date.now();
      const raw = request.cookies.get(ACTIVITY_COOKIE)?.value;
      const lastActive = raw ? Number(raw) : NaN;
      const timeoutMs = sessionTimeoutHours * 3_600_000;

      if (Number.isFinite(lastActive) && now - lastActive > timeoutMs) {
        // Genuinely idle past the limit → expire the session.
        clearAuthCookies(request, response);

        // For API routes, just end the request with 401. For page loads,
        // redirect to the login page. This prevents background fetches from
        // breaking the app by trying to parse an HTML redirect response as JSON.
        if (pathname.startsWith('/api/')) {
          return new Response(JSON.stringify({ error: 'session_expired' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const url = request.nextUrl.clone();
        url.pathname = '/auth';
        url.searchParams.set('error', 'session_expired');
        return NextResponse.redirect(url);
      }
      else {
        // Fresh activity → bump the rolling window.
        response.cookies.set(ACTIVITY_COOKIE, String(now), {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: Math.ceil(timeoutMs / 1000),
        });
      }
    }

    // ── Per-user auth enforcement ─────────────────────────────────────────────
    // Only applies to protected routes where a logged-in user is expected.
    if (user && (pathname.startsWith('/dash') || pathname.startsWith('/u/'))) {
      // Email verification gate
      if (requireEmailVerify && !user.email_confirmed_at) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth';
        url.searchParams.set('error', 'email_not_verified');
        return NextResponse.redirect(url);
      }
    }

    return response;
  } catch {
    // Last-resort catch — never let middleware crash a request
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};