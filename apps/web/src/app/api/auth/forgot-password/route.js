import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { escapeHtml } from '../../../../lib/escapeHtml';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://beoneofus.work';

function resetEmailHtml(safeEmail, resetLink) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td align="center" style="padding-bottom:24px;">
        <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;">
          beone<span style="color:#2563eb;">of</span>us
        </span>
      </td></tr>
      <tr><td style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">Reset your password</h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">Click the button below to set a new password</p>
          </td></tr>
          <tr><td style="background:linear-gradient(90deg,#2563eb,#3b82f6);height:3px;font-size:0;">&nbsp;</td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">Hi there,</p>
            <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
              We received a request to reset the password for your
              <strong style="color:#111827;">beoneofus</strong> account.
              This link expires in <strong style="color:#111827;">1 hour</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <a href="${resetLink}"
                   style="display:inline-block;padding:16px 40px;background:#2563eb;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:-0.2px;">
                  Reset password →
                </a>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                  If you didn't request a password reset for <strong>${safeEmail}</strong>,
                  you can safely ignore this email. Your password will not be changed.
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

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(ip, '/api/auth/forgot-password', { max: 3, windowMs: 15 * 60_000 });
  if (rl.limited) {
    // Return success — don't reveal rate limit on this endpoint (anti-enumeration)
    return NextResponse.json({ success: true });
  }

  try {
    const body = await request.json().catch(() => null);
    const email = body?.email;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const addr = email.trim();

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // generateLink returns an error if user doesn't exist — suppress to prevent enumeration
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: addr,
      options: {
        redirectTo: `${SITE_URL}/auth/callback?next=%2Fauth%3Frecovery%3D1`,
      },
    });

    if (error) {
      console.warn('[forgot-password] generateLink:', error.message);
      return NextResponse.json({ success: true });
    }

    const resetLink = data?.properties?.action_link;
    if (!resetLink) {
      console.warn('[forgot-password] no action_link returned');
      return NextResponse.json({ success: true });
    }

    if (!process.env.RESEND_API_KEY) throw new Error('Email service not configured');

    const safeEmail = escapeHtml(addr);
    const res = await fetchWithTimeout('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
        to: addr,
        subject: 'Reset your beoneofus password',
        html: resetEmailHtml(safeEmail, resetLink),
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
    console.error('[forgot-password]', err.message);
    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true });
  }
}
