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

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // ── Protected page routes: require a valid session ───────────────────────
  if (PROTECTED_PAGES.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get('sb-at')?.value;

    if (!token) {
      const loginUrl = new URL('/auth', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } },
      );
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        const resp = NextResponse.redirect(new URL('/auth', request.url));
        resp.cookies.delete('sb-at');
        return resp;
      }

      // Admin-only pages: check role
      if (ADMIN_PAGES.some((p) => pathname.startsWith(p))) {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        );
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role, is_admin')
          .eq('id', user.id)
          .single();

        if (!profile?.is_admin && !['admin', 'founder'].includes(profile?.role)) {
          return NextResponse.redirect(new URL('/dash/home', request.url));
        }
      }

      return addSecurityHeaders(NextResponse.next());
    } catch {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  }

  // ── Non-API, non-protected routes: just add security headers ─────────────
  if (!pathname.startsWith('/api/')) {
    return addSecurityHeaders(NextResponse.next());
  }

  // ── Public API routes: no auth required ─────────────────────────────────
  if (PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // ── Read token from the cookie set by supabaseClient.js ─────────────────
  const token = request.cookies.get('sb-at')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Verify the token against Supabase ───────────────────────────────────
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Admin-only API routes: additionally require is_admin ───────────────
    if (pathname.startsWith('/api/admin/')) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Forward verified identity to the API route via request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id',    user.id);
    requestHeaders.set('x-user-email', user.email ?? '');

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return addSecurityHeaders(response);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const config = {
  matcher: [
    // Match everything except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
