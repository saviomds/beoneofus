import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// API routes that do NOT require authentication
const PUBLIC_API_ROUTES = [
  '/api/invite',
  '/api/auth/',
  '/api/otp-email',
  '/api/public-settings',
  '/api/organizations',   // public org directory (GET); POST checks its own token
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

// Extract the Supabase access_token from SSR session cookies.
// @supabase/ssr splits the session JSON into chunks stored as:
//   sb-[project]-auth-token.0, sb-[project]-auth-token.1, ...
// Each chunk value is prefixed "base64-" followed by a segment of the
// base64-encoded session JSON. Reading only .0 breaks for larger sessions
// (e.g. GitHub OAuth with full user metadata that spans multiple chunks).
function getSupabaseToken(request) {
  const all = request.cookies.getAll();

  // Session may be stored either CHUNKED (sb-<ref>-auth-token.0/.1 — large
  // sessions like OAuth) or as a SINGLE cookie (sb-<ref>-auth-token — small
  // sessions like email/password). Handle both, else small sessions look
  // logged-out to the proxy and get bounced from protected pages.
  const chunks = all
    .filter(c => /^sb-.+-auth-token\.\d+$/.test(c.name))
    .sort((a, b) => parseInt(a.name.split('.').pop(), 10) - parseInt(b.name.split('.').pop(), 10));

  let raw;
  if (chunks.length > 0) {
    raw = chunks.map(c => (c.value.startsWith('base64-') ? c.value.slice(7) : c.value)).join('');
  } else {
    const single = all.find(c => /^sb-.+-auth-token$/.test(c.name));
    if (!single) return null;
    raw = single.value.startsWith('base64-') ? single.value.slice(7) : single.value;
  }

  // Value is base64-encoded session JSON (possibly URL-safe); fall back to
  // treating it as raw JSON if it isn't base64.
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const data = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    return data?.access_token ?? null;
  } catch {
    try { return JSON.parse(raw)?.access_token ?? null; } catch { return null; }
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
