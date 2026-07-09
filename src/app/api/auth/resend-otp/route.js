import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { escapeHtml } from '../../../../lib/escapeHtml';
import { randomInt } from 'crypto';

const OTP_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_SECS = 60;

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(ip, '/api/auth/resend-otp', { max: 3, windowMs: 10 * 60_000 });
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before requesting another code.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const email = body?.email;

    if (!email || typeof email !== 'string') {
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

    // Require an active OTP — proves the user already passed password verification (step 2)
    const { data: active } = await supabase
      .from('auth_otp')
      .select('created_at')
      .eq('email', addr)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!active) {
      return NextResponse.json({ error: 'No active session. Please sign in again.' }, { status: 400 });
    }

    const elapsedSecs = (Date.now() - new Date(active.created_at).getTime()) / 1000;
    if (elapsedSecs < COOLDOWN_SECS) {
      return NextResponse.json(
        { error: 'Too many requests', waitSeconds: Math.ceil(COOLDOWN_SECS - elapsedSecs) },
        { status: 429 },
      );
    }

    const code = String(randomInt(100_000, 1_000_000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    await supabase
      .from('auth_otp')
      .upsert({ email: addr, code, expires_at: expiresAt, used: false }, { onConflict: 'email' });

    const safeEmail = escapeHtml(addr);
    if (!process.env.RESEND_API_KEY) throw new Error('Email service not configured');

    const res = await fetchWithTimeout('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
        to: addr,
        subject: 'Your new beoneofus sign-in code',
        html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td align="center" style="padding-bottom:24px;">
        <span style="font-size:22px;font-weight:900;color:#0f172a;">beone<span style="color:#2563eb;">of</span>us</span>
      </td></tr>
      <tr><td style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">Your new sign-in code</h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">This replaces your previous code</p>
          </td></tr>
          <tr><td style="background:linear-gradient(90deg,#2563eb,#3b82f6);height:3px;font-size:0;">&nbsp;</td></tr>
          <tr><td style="padding:36px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td align="center">
                <table cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #2563eb;border-radius:16px;">
                  <tr><td style="padding:24px 56px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.12em;text-transform:uppercase;">Verification code</p>
                    <p style="margin:0;font-size:44px;font-weight:900;color:#0f172a;letter-spacing:0.3em;font-family:'Courier New',monospace;">${code}</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
            <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
              Code expires in 10 minutes. If you didn't request this, ignore this email.
              Sent to <strong>${safeEmail}</strong>.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
      }),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      let msg = `Email delivery failed (${res.status})`;
      try { msg = JSON.parse(raw).message || msg; } catch {}
      throw new Error(msg);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[resend-otp]', err.message);
    return NextResponse.json({ error: 'Failed to resend verification code. Please try again.' }, { status: 500 });
  }
}
