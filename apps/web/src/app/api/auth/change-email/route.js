import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Validate the caller's access token
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const { email, code } = body ?? {};

    if (!email || typeof email !== 'string' || !code || !/^\d{6}$/.test(String(code))) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const newEmail = email.trim().toLowerCase();

    if (newEmail === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'New email must be different from your current email.' }, { status: 400 });
    }

    // Verify the OTP that was sent to the new email address
    const { data: otp, error: otpErr } = await supabase
      .from('auth_otp')
      .select('id')
      .eq('email', newEmail)
      .eq('code', String(code))
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (otpErr || !otp) {
      return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 });
    }

    // Update email in Supabase Auth (email_confirm skips the confirmation email loop)
    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true,
    });
    if (updateErr) throw updateErr;

    // Mark this specific OTP row used
    await supabase.from('auth_otp').update({ used: true }).eq('id', otp.id);

    // Keep the profiles table in sync
    await supabase.from('profiles').update({ email: newEmail }).eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[change-email]', err.message);
    return NextResponse.json({ error: 'Failed to update email. Please try again.' }, { status: 500 });
  }
}
