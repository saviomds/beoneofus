import { NextResponse } from 'next/server';
import { escapeHtml } from '../../../../lib/escapeHtml';

export async function POST(request) {
  try {
    const { email, name, isNewUser } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    const safeName = escapeHtml(name || 'there');
    const safeEmail = escapeHtml(email);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beoneofus.work';

    const subject = isNewUser
      ? 'Welcome to beoneofus!'
      : 'New sign-in to your beoneofus account';

    const headerTitle = isNewUser ? 'Welcome aboard!' : 'New sign-in detected';
    const headerSub = isNewUser
      ? 'Your account is ready to go'
      : 'A sign-in to your account just happened';

    const bodyHtml = isNewUser
      ? `<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">Hi ${safeName},</p>
         <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
           Your <strong style="color:#111827;">beoneofus</strong> account has been created. You're all set to explore developer opportunities, connect with teams, and grow your career.
         </p>
         <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
           <tr><td align="center">
             <a href="${siteUrl}/dash" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;">Go to your dashboard</a>
           </td></tr>
         </table>
         <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">If you didn't create this account, please <a href="${siteUrl}/auth" style="color:#2563eb;">contact us</a> immediately.</p>`
      : `<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">Hi ${safeName},</p>
         <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
           We noticed a new sign-in to your <strong style="color:#111827;">beoneofus</strong> account associated with <strong>${safeEmail}</strong>.
         </p>
         <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
           <tr><td style="padding:16px 20px;">
             <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
               <strong>Time:</strong> ${new Date().toUTCString()}<br/>
               If this was you, no action is needed.
             </p>
           </td></tr>
         </table>
         <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
           <tr><td align="center">
             <a href="${siteUrl}/dash" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;">Go to dashboard</a>
           </td></tr>
         </table>
         <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">If you didn't sign in, <a href="${siteUrl}/auth" style="color:#2563eb;">secure your account</a> immediately.</p>`;

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td align="center" style="padding-bottom:24px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td><img src="${siteUrl}/logo.png" alt="beoneofus" width="48" height="48" style="display:inline-block;border-radius:12px;vertical-align:middle;"/></td>
          <td style="padding-left:10px;vertical-align:middle;"><span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;">beone<span style="color:#2563eb;">of</span>us</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">${headerTitle}</h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">${headerSub}</p>
          </td></tr>
          <tr><td style="background:linear-gradient(90deg,#2563eb,#3b82f6);height:3px;font-size:0;">&nbsp;</td></tr>
          <tr><td style="padding:36px 40px;">${bodyHtml}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 0 0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">beoneofus &mdash; Developer Network &amp; Collaboration</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
        to: email,
        subject,
        html,
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      console.warn('send-welcome: Resend rejected email —', resData.message || resData.name || res.status);
      return NextResponse.json({ success: false, reason: 'email_skipped' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.warn('send-welcome: email skipped —', error?.message);
    return NextResponse.json({ success: false, reason: 'email_skipped' });
  }
}
