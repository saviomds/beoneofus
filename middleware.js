import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Paths that are always allowed through, even during maintenance
const ALWAYS_ALLOW = [
  '/maintenance',
  '/api/public-settings',
  '/api/auth/',
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
  const { pathname } = request.nextUrl;

  // Static assets and always-allowed paths skip all checks
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|woff|woff2|ttf|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // ── Create Supabase server client to read the user's session from cookies ──
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Refresh session (keeps auth cookies in sync)
  const { data: { user } } = await supabase.auth.getUser();

  // ── Fetch public platform status (cached 60s at CDN level) ────────────────
  let maintenanceMode = false;
  let maintenanceMessage = "We're doing a quick upgrade. Be back shortly!";
  let registrationOpen = true;

  // Only fetch if we're not already on an always-allowed path
  if (!isAlwaysAllowed(pathname)) {
    try {
      const origin = request.nextUrl.origin;
      const statusRes = await fetch(`${origin}/api/public-settings`, {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(2000),
      });
      if (statusRes.ok) {
        const data = await statusRes.json();
        maintenanceMode    = data.maintenanceMode    ?? false;
        maintenanceMessage = data.maintenanceMessage ?? maintenanceMessage;
        registrationOpen   = data.registrationOpen   ?? true;
      }
    } catch {
      // On any failure (timeout, network) let the request through
    }
  }

  // ── Maintenance mode ──────────────────────────────────────────────────────
  if (maintenanceMode && !isAlwaysAllowed(pathname)) {
    // Check if user is admin — admins bypass maintenance
    let isAdmin = false;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      isAdmin = !!profile?.is_admin;
    }

    if (!isAdmin && pathname !== '/maintenance') {
      const url = request.nextUrl.clone();
      url.pathname = '/maintenance';
      return NextResponse.redirect(url);
    }
  }

  // ── Registration guard — attach flag in request header ───────────────────
  // API routes read this header to block new signups when registration is closed
  if (!registrationOpen) {
    response.headers.set('x-registration-closed', '1');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
