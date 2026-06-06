import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
  try {
    const { pathname } = request.nextUrl;

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

    // Refresh session and keep auth cookies in sync
    let user = null;
    try {
      const supabase = createServerClient(
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

    // Fetch platform settings (maintenance mode, registration status)
    let maintenanceMode = false;
    let maintenanceMessage = "We're doing a quick upgrade. Be back shortly!";
    let registrationOpen = true;

    try {
      const origin = request.nextUrl.origin;
      const statusRes = await fetch(`${origin}/api/public-settings`, {
        signal: AbortSignal.timeout(2000),
      });
      if (statusRes.ok) {
        const data = await statusRes.json();
        maintenanceMode    = data.maintenanceMode    ?? false;
        maintenanceMessage = data.maintenanceMessage ?? maintenanceMessage;
        registrationOpen   = data.registrationOpen   ?? true;
      }
    } catch {
      // On any failure let the request through
    }

    if (maintenanceMode) {
      let isAdmin = false;
      if (user) {
        try {
          const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
              cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: () => {},
              },
            }
          );
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
