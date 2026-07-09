import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/requireAuth';
import { validate } from '../../../lib/validate';

export async function POST(request) {
  try {
    // Only signed-in members may send branded invite emails. This prevents
    // anonymous abuse of our sending domain (spam / deliverability damage).
    const { error: authError, status } = await requireAuth(request);
    if (authError) return NextResponse.json({ error: authError }, { status });

    const { email, referralCode } = await request.json();

    if (!validate.email(email)) {
      return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
    }

    // SECURITY: the invite link is built server-side and always points at our
    // own auth page. We never accept a caller-supplied link — doing so turned
    // this branded email into an open phishing relay. Only a short alphanumeric
    // referral code is honoured from the client.
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beoneofus.work';
    const safeRef = typeof referralCode === 'string' && /^[A-Za-z0-9]{1,12}$/.test(referralCode.trim())
      ? referralCode.trim().toUpperCase()
      : null;
    const finalLink = safeRef ? `${base}/auth?ref=${encodeURIComponent(safeRef)}` : `${base}/auth`;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    const fromAddress = `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: fromAddress,
        to: email,
        subject: "You're invited to join beoneofus!",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
          <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

                <!-- Logo row -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td><img src="https://beoneofus.work/logo.png" alt="beoneofus logo" width="48" height="48" style="display:inline-block;border-radius:12px;vertical-align:middle;"/></td>
                      <td style="padding-left:10px;vertical-align:middle;"><span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;">beone<span style="color:#2563eb;">of</span>us</span></td>
                    </tr></table>
                  </td>
                </tr>

                <!-- Card -->
                <tr>
                  <td style="background-color:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
                    <!-- Dark header -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%);padding:36px 40px 32px;text-align:center;">
                          <img src="https://beoneofus.work/logo.png" alt="beoneofus" width="72" height="72" style="display:block;margin:0 auto 16px;border-radius:18px;"/>
                          <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.3px;">You've been invited!</h1>
                          <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">Someone thinks you belong here</p>
                        </td>
                      </tr>
                    </table>
                    <!-- Blue accent bar -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="background:linear-gradient(90deg,#2563eb,#3b82f6);height:3px;font-size:0;">&nbsp;</td></tr>
                    </table>
                    <!-- Body -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:36px 40px;">
                          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">Hi there,</p>
                          <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                            You've been invited to join <strong style="color:#111827;">beoneofus</strong> — Africa's developer network for engineers to connect, collaborate, and grow together.
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                            <tr>
                              <td align="center">
                                <a href="${finalLink}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:15px 40px;border-radius:12px;letter-spacing:0.2px;box-shadow:0 4px 14px rgba(37,99,235,0.40);">Join the Network &rarr;</a>
                              </td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                            <tr><td style="border-top:1px solid #f1f5f9;font-size:0;">&nbsp;</td></tr>
                          </table>
                          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7;">If you weren't expecting this, you can safely ignore this email.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:28px 0 0;text-align:center;">
                    <img src="https://beoneofus.work/logo.png" alt="" width="28" height="28" style="display:inline-block;border-radius:6px;margin-bottom:8px;opacity:0.6;"/>
                    <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;font-weight:700;">beoneofus</p>
                    <p style="margin:0;font-size:11px;color:#cbd5e1;">Developer Network &amp; Collaboration</p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
          </body>
          </html>
        `
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API Error:', data);
      const msg = data?.message || data?.name || 'Failed to send invite';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Invite API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
