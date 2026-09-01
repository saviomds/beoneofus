import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { escapeHtml } from '../../../../lib/escapeHtml';
import { randomInt } from 'crypto';

const OTP_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_SECS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function otpEmailHtml(email, code) {
  const safe = escapeHtml(email);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td align="center" style="padding-bottom:24px;">
        <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;">beone<span style="color:#2563eb;">of</span>us</span>
      </td></tr>
      <tr><td style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">Your sign-in code</h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">Enter this code to complete sign-in</p>
          </td></tr>
          <tr><td style="background:linear-gradient(90deg,#2563eb,#3b82f6);height:3px;font-size:0;">&nbsp;</td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">Hi there,</p>
            <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
              Use the code below to sign in to <strong style="color:#111827;">beoneofus</strong>.
              This code expires in <strong style="color:#111827;">10 minutes</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <table cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #2563eb;border-radius:16px;">
                  <tr><td style="padding:24px 56px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.12em;text-transform:uppercase;">Verification code</p>
                    <p style="margin:0;font-size:44px;font-weight:900;color:#0f172a;letter-spacing:0.3em;font-family:'Courier New',monospace;">${code}</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                  If you didn't try to sign in to <strong>${safe}</strong>, you can safely ignore this email.
                </p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 0 0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">beoneofus — Developer Network &amp; Collaboration</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

async function deliverEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) throw new Error('Email service not configured');
  const res = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let msg = `Email delivery failed (${res.status})`;
    try { msg = JSON.parse(raw).message || msg; } catch {}
    throw new Error(msg);
  }
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(ip, '/api/auth/send-otp', { max: 3, windowMs: 5 * 60_000 });
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before requesting another code.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const email = body?.email;

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
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

    // Enforce 60-second per-email cooldown to prevent OTP flooding
    const { data: recent } = await supabase
      .from('auth_otp')
      .select('created_at')
      .eq('email', addr)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (recent) {
      const elapsedSecs = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
      if (elapsedSecs < COOLDOWN_SECS) {
        return NextResponse.json(
          { error: 'Too many requests', waitSeconds: Math.ceil(COOLDOWN_SECS - elapsedSecs) },
          { status: 429 },
        );
      }
    }

    const code = String(randomInt(100_000, 1_000_000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    const { error: dbErr } = await supabase
      .from('auth_otp')
      .upsert({ email: addr, code, expires_at: expiresAt, used: false }, { onConflict: 'email' });
    if (dbErr) throw dbErr;

    await deliverEmail(addr, 'Your beoneofus sign-in code', otpEmailHtml(addr, code));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[send-otp]', err.message);
    return NextResponse.json({ error: 'Failed to send verification code. Please try again.' }, { status: 500 });
  }
}
