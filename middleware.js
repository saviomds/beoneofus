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
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch {
      // Auth check failure — allow request through, don't block
    }

    if (isAlwaysAllowed(pathname)) {
      return response;
    }

    // ── Dynamic maintenance check — query Supabase directly instead of
    // self-fetching /api/public-settings. A self-HTTP-fetch from middleware
    // to the same server doubles latency and causes recursive middleware runs.
    let maintenanceMode = false;
    let maintenanceMessage = "We're doing a quick upgrade. Be back shortly!";
    let registrationOpen = true;

    let requireEmailVerify = true;
    let sessionTimeoutHours = 24;
    try {
      const adminSupa = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: rows } = await adminSupa
        .from('platform_settings')
        .select('key, value')
        .in('key', ['maintenance_mode', 'maintenance_message', 'registration_open', 'require_email_verification', 'session_timeout_hours']);
      const m = Object.fromEntries((rows || []).map(r => [r.key, r.value]));
      maintenanceMode      = m.maintenance_mode          ?? false;
      maintenanceMessage   = m.maintenance_message       ?? maintenanceMessage;
      registrationOpen     = m.registration_open         ?? true;
      requireEmailVerify   = m.require_email_verification ?? true;
      sessionTimeoutHours  = Number(m.session_timeout_hours ?? 24) || 24;
    } catch {
      // On any failure keep safe defaults and let the request through
    }

    if (maintenanceMode) {
      let isAdmin = false;
      if (user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
          isAdmin = !!data?.is_admin;
        } catch {
          // Can't verify admin — treat as non-admin
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

      // Session age timeout — kick out sessions older than the configured limit
      if (sessionTimeoutHours > 0 && user.last_sign_in_at) {
        const ageMs = Date.now() - new Date(user.last_sign_in_at).getTime();
        if (ageMs > sessionTimeoutHours * 3_600_000) {
          const url = request.nextUrl.clone();
          url.pathname = '/auth';
          url.searchParams.set('error', 'session_expired');
          return NextResponse.redirect(url);
        }
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
