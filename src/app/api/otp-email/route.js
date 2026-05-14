import { NextResponse } from 'next/server';
import { escapeHtml } from '../../../lib/escapeHtml';

// Supabase signs hook requests with HMAC-SHA256 of the raw body.
// Authorization: Bearer <base64url(hmac-sha256(rawBody, secret))>
// Secret may be prefixed "whsec_<base64-key>" (Supabase's format).
async function verifySignature(rawBody, authHeader) {
  const secret = process.env.SUPABASE_HOOK_SECRET;
  if (!secret) return true; // no secret configured — allow through

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
    'raw', keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return bearer === expected;
}

async function sendOtpEmail(to, code) {
  const safeEmail = escapeHtml(to);
  const from = `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject: 'Your beoneofus sign-in code',
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

      <tr>
        <td align="center" style="padding-bottom:24px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td><img src="https://beoneofus.work/logo.png" alt="beoneofus logo" width="48" height="48" style="display:inline-block;border-radius:12px;vertical-align:middle;"/></td>
            <td style="padding-left:10px;vertical-align:middle;"><span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;">beone<span style="color:#2563eb;">of</span>us</span></td>
          </tr></table>
        </td>
      </tr>

      <tr>
        <td style="background-color:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%);padding:36px 40px 32px;text-align:center;">
                <img src="https://beoneofus.work/logo.png" alt="beoneofus" width="72" height="72" style="display:block;margin:0 auto 16px;border-radius:18px;"/>
                <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.3px;">Your sign-in code</h1>
                <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">Enter this code to complete sign-in</p>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:linear-gradient(90deg,#2563eb,#3b82f6);height:3px;font-size:0;">&nbsp;</td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">Hi there,</p>
                <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                  Use the code below to complete sign-in to <strong style="color:#111827;">beoneofus</strong>.
                  This code expires in <strong style="color:#111827;">10 minutes</strong>.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                  <tr>
                    <td align="center">
                      <table cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:2px solid #2563eb;border-radius:16px;">
                        <tr>
                          <td style="padding:24px 56px;text-align:center;">
                            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.12em;text-transform:uppercase;">Verification code</p>
                            <p style="margin:0;font-size:44px;font-weight:900;color:#0f172a;letter-spacing:0.3em;font-family:'Courier New',Courier,monospace;">${code}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                  <tr><td style="border-top:1px solid #f1f5f9;font-size:0;">&nbsp;</td></tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                        If you didn't try to sign in to <strong>${safeEmail}</strong>, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:28px 0 0;text-align:center;">
          <img src="https://beoneofus.work/logo.png" alt="" width="28" height="28" style="display:inline-block;border-radius:6px;margin-bottom:8px;opacity:0.6;"/>
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;font-weight:700;">beoneofus</p>
          <p style="margin:0 0 4px;font-size:11px;color:#cbd5e1;">Developer Network &amp; Collaboration</p>
          <p style="margin:0;font-size:11px;color:#e2e8f0;">All systems operational.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Resend error:', res.status, JSON.stringify(data));
    throw new Error(data.message || data.name || 'Failed to send email');
  }
  return data;
}

export async function POST(request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    // Read raw body text first so we can verify the HMAC signature
    const rawBody = await request.text();
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Supabase Send Email Hook: { user, email_data }
    if (body?.user && body?.email_data) {
      const email = body.user?.email;
      const { token } = body.email_data ?? {};

      if (!email || !token) {
        console.error('Hook payload missing email or token:', { email: !!email, token: !!token });
        return NextResponse.json({ error: 'Missing email or token' }, { status: 400 });
      }

      // Verify HMAC signature if secret is configured
      const authHeader = request.headers.get('authorization') ?? '';
      const valid = await verifySignature(rawBody, authHeader);
      if (!valid) {
        console.error('Hook signature verification failed');
        return NextResponse.json({ error: 'Invalid hook signature' }, { status: 401 });
      }

      await sendOtpEmail(email, token);
      return NextResponse.json({ success: true });
    }

    // Direct call: { email, code }
    const { email, code } = body ?? {};
    if (!email || !code || !/^\d{6}$/.test(String(code))) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    await sendOtpEmail(email, String(code));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OTP email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
