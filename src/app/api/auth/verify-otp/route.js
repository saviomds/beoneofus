import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { getSettingOr } from '../../../../lib/platformSettings';

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const maxAttempts = Number(await getSettingOr('max_otp_attempts', 5)) || 5;
  const rl = checkRateLimit(ip, '/api/auth/verify-otp', { max: maxAttempts, windowMs: 10 * 60_000 });
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const { email, code } = body ?? {};

    if (!email || typeof email !== 'string' || !code || !/^\d{6}$/.test(String(code))) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const addr = email.trim().toLowerCase();

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Server configuration error');
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // auth_otp is keyed by email (its primary key) — there is no `id` column.
    const { data, error } = await supabase
      .from('auth_otp')
      .select('email')
      .eq('email', addr)
      .eq('code', String(code))
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 });
    }

    // Mark the code used (one row per email, so match on email)
    await supabase.from('auth_otp').update({ used: true }).eq('email', addr);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[verify-otp]', err.message);
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
