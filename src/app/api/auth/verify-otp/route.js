import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  try {
    const { email, code } = await request.json();

    if (!email || !code || !/^\d{6}$/.test(String(code))) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('auth_otp')
      .select('*')
      .eq('email', email)
      .eq('code', String(code))
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    await supabaseAdmin.from('auth_otp').update({ used: true }).eq('email', email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('verify-otp error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
