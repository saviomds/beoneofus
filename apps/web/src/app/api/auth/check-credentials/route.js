import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../../../../lib/rateLimit';

export async function POST(request) {
  // Stricter rate limit on credential checks to slow brute-force
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(ip, '/api/auth/check-credentials', { max: 10, windowMs: 5 * 60_000 });
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const { email, password } = body ?? {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // persistSession:false — no cookie is written, no session state leaks into the server
    const supabase = createClient(
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed')) {
        return NextResponse.json({ error: 'email_not_confirmed' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[check-credentials]', err.message);
    return NextResponse.json({ error: 'Authentication check failed. Please try again.' }, { status: 500 });
  }
}
