import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// API routes that do NOT require authentication
const PUBLIC_API_ROUTES = [
  '/api/invite',
  '/api/auth/',
  '/api/otp-email',
];

// Page routes that require a valid session (redirect to /auth if missing)
const PROTECTED_PAGES = [
  '/dash',
  '/dashboard',
  '/member-dashboard',
  '/founder-dashboard',
];

// Page routes that additionally require admin/founder role
const ADMIN_PAGES = [
  '/founder-dashboard',
];

const SECURITY_HEADERS = [
  ['X-Content-Type-Options',  'nosniff'],
  ['X-Frame-Options',         'SAMEORIGIN'],
  ['X-XSS-Protection',        '1; mode=block'],
  ['Referrer-Policy',         'strict-origin-when-cross-origin'],
  ['Permissions-Policy',      'camera=(), microphone=(), geolocation=()'],
];

function addSecurityHeaders(response) {
  for (const [key, value] of SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  return response;
}

// Extract the Supabase access_token from the SSR session cookie.
// Supabase SSR stores the session in sb-[project]-auth-token.0 as
// base64-encoded JSON: { access_token, refresh_token, expires_at, ... }
function getSupabaseToken(request) {
  const sessionCookie = request.cookies.getAll()
    .find(c => /^sb-.+-auth-token\.0$/.test(c.name));
  if (!sessionCookie) return null;
  try {
    const raw = sessionCookie.value.startsWith('base64-')
      ? sessionCookie.value.slice(7)
      : sessionCookie.value;
    const data = JSON.parse(
      Buffer.from(raw, 'base64').toString('utf-8')
    );
    return data?.access_token ?? null;
  } catch {
    return null;
  }
}

// Decode JWT payload locally — no network call, no transient-failure risk.
// Returns null if the token is malformed or expired.
function decodeJwt(token) {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isValidJwt(token) {
  const payload = decodeJwt(token);
  if (!payload?.sub) return { valid: false, payload: null };
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return { valid: false, payload: null };
  return { valid: true, payload };
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // ── Protected page routes: require a valid session ───────────────────────
  if (PROTECTED_PAGES.some((p) => pathname.startsWith(p))) {
    const token = getSupabaseToken(request);

    if (!token) {
      const loginUrl = new URL('/auth', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { valid, payload } = isValidJwt(token);

    if (!valid) {
      // Token is missing or expired — redirect to login but NEVER delete the
      // cookie here. The client-side Supabase SDK will refresh the token and
      // update the cookie on its own. Deleting it would break that recovery.
      const loginUrl = new URL('/auth', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Admin-only pages: check role via service-role DB call
    if (ADMIN_PAGES.some((p) => pathname.startsWith(p))) {
      try {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        );
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role, is_admin')
          .eq('id', payload.sub)
          .single();

        if (!profile?.is_admin && !['admin', 'founder'].includes(profile?.role)) {
          return NextResponse.redirect(new URL('/dash/home', request.url));
        }
      } catch {
        // On DB error, deny access to admin page but don't log out
        return NextResponse.redirect(new URL('/dash/home', request.url));
      }
    }

    return addSecurityHeaders(NextResponse.next());
  }

  // ── Non-API, non-protected routes: just add security headers ─────────────
  if (!pathname.startsWith('/api/')) {
    return addSecurityHeaders(NextResponse.next());
  }

  // ── Public API routes: no auth required ─────────────────────────────────
  if (PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // ── Protected API routes: verify token (Bearer header or cookie) ─────────
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const cookieToken = getSupabaseToken(request);
  const rawToken = bearerToken ?? cookieToken;

  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { valid, payload } = isValidJwt(rawToken);

  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin-only API routes: additionally require is_admin
  if (pathname.startsWith('/api/admin/')) {
    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', payload.sub)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Forward verified identity to the API route via request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id',    payload.sub);
  requestHeaders.set('x-user-email', payload.email ?? '');

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    // Match everything except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
