import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/dash';

  const cookieStore = await cookies();

  // Capture all cookies written during exchangeCodeForSession / verifyOtp so we
  // can copy them onto the redirect response.  NextResponse.redirect() creates a
  // brand-new Response object; cookies written to the next/headers store are NOT
  // automatically merged into it in Next.js 16.
  const pendingCookies = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          pendingCookies.push(...cookiesToSet);
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  const dest = (path) =>
    path.startsWith('/') ? `${origin}${path}` : `${origin}/dash`;

  let redirectTo = `${origin}/auth?error=auth_callback_failed`;

  // PKCE code exchange — OAuth, magic link, email confirmation, password recovery
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirectTo = dest(next);
  }

  // token_hash exchange — fallback for magic link / email confirmation (implicit flow)
  if (!code && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) redirectTo = dest(next);
  }

  const response = NextResponse.redirect(redirectTo);

  // Apply session cookies directly onto the redirect response so the browser
  // receives them even though we're returning a new Response object.
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }

  return response;
}
