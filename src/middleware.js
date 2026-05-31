import { createServerClient } from '@supabase/ssr';
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

// Local JWT decode for bearer-token API calls (no network round-trip).
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

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Create Supabase server client that reads/writes session cookies.
  // IMPORTANT: `response` is reassigned inside setAll() — always return it,
  // never replace it with a plain NextResponse.next() afterwards.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  // ── Protected page routes ────────────────────────────────────────────────
  if (PROTECTED_PAGES.some((p) => pathname.startsWith(p))) {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      // Transient Supabase error — let the page load; client-side will verify.
      return addSecurityHeaders(response);
    }

    if (!session) {
      const loginUrl = new URL('/auth', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Admin-only pages: check role via service-role DB call
    if (ADMIN_PAGES.some((p) => pathname.startsWith(p))) {
      try {
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        );
        const { data: profile } = await adminClient
          .from('profiles')
          .select('role, is_admin')
          .eq('id', session.user.id)
          .single();

        if (!profile?.is_admin && !['admin', 'founder'].includes(profile?.role)) {
          return NextResponse.redirect(new URL('/dash/home', request.url));
        }
      } catch {
        return NextResponse.redirect(new URL('/dash/home', request.url));
      }
    }

    return addSecurityHeaders(response);
  }

  // ── Non-API, non-protected routes ────────────────────────────────────────
  if (!pathname.startsWith('/api/')) {
    return addSecurityHeaders(response);
  }

  // ── Public API routes ────────────────────────────────────────────────────
  if (PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))) {
    return addSecurityHeaders(response);
  }

  // ── Protected API routes ─────────────────────────────────────────────────
  // Many API callers send an Authorization: Bearer <token> header.
  // Verify that token locally first (fast path). Fall back to cookies.
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  let userId = null;
  let userEmail = '';

  if (bearerToken) {
    const { valid, payload } = isValidJwt(bearerToken);
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = payload.sub;
    userEmail = payload.email ?? '';
  } else {
    const { data: { session: apiSession } } = await supabase.auth.getSession();
    if (!apiSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = apiSession.user.id;
    userEmail = apiSession.user.email ?? '';
  }

  // Admin-only API routes
  if (pathname.startsWith('/api/admin/')) {
    try {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
      const { data: profile } = await adminClient
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
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
  requestHeaders.set('x-user-id',    userId);
  requestHeaders.set('x-user-email', userEmail);

  const apiResponse = NextResponse.next({ request: { headers: requestHeaders } });
  // Copy any refreshed-session cookies from the Supabase response
  response.cookies.getAll().forEach((c) => apiResponse.cookies.set(c.name, c.value));
  return addSecurityHeaders(apiResponse);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
