import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { getSettingOr } from '../../../../lib/platformSettings';

export async function POST(request) {
  const maxAttempts = Number(await getSettingOr('max_otp_attempts', 5)) || 5;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const rl = checkRateLimit(ip, '/api/auth/verify-otp', { max: maxAttempts, windowMs: 10 * 60_000 });
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  try {
    const { email, code, purpose } = await request.json();

    if (!email || !code || !/^\d{6}$/.test(String(code))) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('auth_otp')
      .select('*')
      .eq('email', email)
      .eq('code', String(code))
      .eq('used', false)
      .gt('expires_at', new Date().toISOString());

    if (purpose) query = query.eq('purpose', purpose);

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Mark only this specific OTP row as used (by id), not all OTPs for the email
    await supabaseAdmin.from('auth_otp').update({ used: true }).eq('id', data.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('verify-otp error:', err);
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
