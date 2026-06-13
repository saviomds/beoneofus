import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function safeRedirect(origin, path) {
  const dest = path.startsWith('/') ? `${origin}${path}` : `${origin}/dash`;
  return NextResponse.redirect(dest);
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/dash';

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  // PKCE code exchange — OAuth, magic link, email confirmation, password recovery
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return safeRedirect(origin, next);
  }

  // token_hash exchange — fallback for magic link / email confirmation (implicit flow)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return safeRedirect(origin, next);
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}
