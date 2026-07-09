import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { escapeHtml } from '../../../lib/escapeHtml';

// Supabase signs hook requests with HMAC-SHA256 of the raw body.
// Authorization header: "Bearer <base64url(hmac-sha256(rawBody, secret))>"
// Secret may be prefixed "whsec_<base64-key>" or "v1,whsec_<base64-key>".
async function verifyHmacSignature(rawBody, authHeader) {
  const secret = process.env.SUPABASE_HOOK_SECRET;
  if (!secret) return true; // no secret configured — allow (dev environments)

  const bearer = (authHeader ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return false;

  // Strip optional versioned prefix: "v1,whsec_<base64>" → "<base64>"
  const raw = secret.replace(/^v\d+,/, '').replace(/^whsec_/, '');
  let keyBytes;
  try {
    keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  } catch {
    keyBytes = new TextEncoder().encode(secret);
  }

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return bearer === expected;
}

function buildOtpHtml(toEmail, code) {
  const safe = escapeHtml(toEmail);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr>
        <td align="center" style="padding-bottom:24px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td><img src="https://beoneofus.work/logo.png" alt="beoneofus logo" width="48" height="48"
                 style="display:inline-block;border-radius:12px;vertical-align:middle;"/></td>
            <td style="padding-left:10px;vertical-align:middle;">
              <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;">
                beone<span style="color:#2563eb;">of</span>us
              </span>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:36px 40px;text-align:center;">
                <img src="https://beoneofus.work/logo.png" alt="beoneofus" width="72" height="72"
                     style="display:block;margin:0 auto 16px;border-radius:18px;"/>
                <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">Your sign-in code</h1>
                <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">Enter this code to complete sign-in</p>
              </td>
            </tr>
            <tr><td style="background:linear-gradient(90deg,#2563eb,#3b82f6);height:3px;font-size:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">Hi there,</p>
                <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                  Use the code below to complete sign-in to
                  <strong style="color:#111827;">beoneofus</strong>.
                  This code expires in <strong style="color:#111827;">10 minutes</strong>.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                  <tr><td align="center">
                    <table cellpadding="0" cellspacing="0"
                           style="background:#f8fafc;border:2px solid #2563eb;border-radius:16px;">
                      <tr><td style="padding:24px 56px;text-align:center;">
                        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.12em;text-transform:uppercase;">Verification code</p>
                        <p style="margin:0;font-size:44px;font-weight:900;color:#0f172a;letter-spacing:0.3em;font-family:'Courier New',monospace;">${code}</p>
                      </td></tr>
                    </table>
                  </td></tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0"
                       style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                  <tr><td style="padding:16px 20px;">
                    <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                      If you didn't try to sign in to <strong>${safe}</strong>,
                      you can safely ignore this email.
                    </p>
                  </td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 0 0;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;font-weight:700;">beoneofus</p>
          <p style="margin:0;font-size:11px;color:#cbd5e1;">Developer Network &amp; Collaboration</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

async function sendOtpEmail(to, code) {
  const from = `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;
  const res = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject: 'Your beoneofus sign-in code',
      html: buildOtpHtml(to, code),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error('[otp-email] Resend error:', res.status, JSON.stringify(data));
    throw new Error(data.message || data.name || 'Failed to send email');
  }
}

export async function POST(request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[otp-email] RESEND_API_KEY is not set');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    // Read raw body text first — needed for HMAC signature verification
    const rawBody = await request.text();
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // ── Supabase Send Email Hook format: { user, email_data } ──────────────
    if (body?.user && body?.email_data) {
      const email = body.user?.email;
      const { token } = body.email_data ?? {};

      if (!email || !token) {
        console.error('[otp-email] Hook payload missing email or token');
        return NextResponse.json({ error: 'Missing email or token' }, { status: 400 });
      }

      const authHeader = request.headers.get('authorization') ?? '';
      const valid = await verifyHmacSignature(rawBody, authHeader);
      if (!valid) {
        console.error('[otp-email] Hook signature verification failed');
        return NextResponse.json({ error: 'Invalid hook signature' }, { status: 401 });
      }

      await sendOtpEmail(email, token);
      return NextResponse.json({ success: true });
    }

    // ── Only the signed Supabase "Send Email" hook format is accepted. ───────
    // The former unauthenticated direct { email, code } path was removed: it let
    // anyone send a BeOneOfUs-branded "your sign-in code is …" email to any
    // address (a phishing / spam relay), and no part of the app ever called it.
    // OTP delivery for our own login flow goes through /api/auth/send-otp.
    return NextResponse.json({ error: 'Unsupported request' }, { status: 400 });
  } catch (err) {
    console.error('[otp-email]', err.message);
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 });
  }
}
