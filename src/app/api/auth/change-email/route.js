import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, code } = await request.json();

    if (!email || typeof email !== 'string' || !code || !/^\d{6}$/.test(String(code))) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'New email must differ from current email' }, { status: 400 });
    }

    // Enforce purpose='email_change' so sign-in OTPs cannot be reused here
    const { data: otp, error: otpErr } = await supabaseAdmin
      .from('auth_otp')
      .select('*')
      .eq('email', email)
      .eq('code', String(code))
      .eq('used', false)
      .eq('purpose', 'email_change')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (otpErr || !otp) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true,  // explicitly confirm new email to avoid limbo state
    });
    if (updateErr) throw updateErr;

    // Mark only this specific OTP row as used
    await supabaseAdmin.from('auth_otp').update({ used: true }).eq('id', otp.id);
    await supabaseAdmin.from('profiles').update({ email }).eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('change-email error:', error);
    return NextResponse.json({ error: 'Failed to update email. Please try again.' }, { status: 500 });
  }
}
