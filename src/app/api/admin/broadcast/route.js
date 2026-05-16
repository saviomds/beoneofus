import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { escapeHtml } from '../../../../lib/escapeHtml';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://beoneofus.work';
const FROM     = `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'noreply@beoneofus.work'}>`;

const AUDIENCE_LABELS = {
  all:      'All Users',
  verified: 'Verified Users',
  premium:  'Premium Members',
  member:   'Members',
  admin:    'Admins & Founders',
};

function buildHtml(subject, message, audienceLabel) {
  const safeSubject  = escapeHtml(subject);
  const safeAudience = escapeHtml(audienceLabel);
  // Convert newlines to <br> and escape everything else
  const safeMessage  = escapeHtml(message).replace(/\n/g, '<br>');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

      <!-- Logo -->
      <tr><td align="center" style="padding-bottom:24px;">
        <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;">beone<span style="color:#2563eb;">of</span>us</span>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <table width="100%" cellpadding="0" cellspacing="0">

          <!-- Header -->
          <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">${safeSubject}</h1>
            <p style="margin:10px 0 0;font-size:12px;color:rgba(255,255,255,0.45);font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Platform Update · ${safeAudience}</p>
          </td></tr>

          <!-- Blue accent bar -->
          <tr><td style="background:linear-gradient(90deg,#2563eb,#3b82f6);height:3px;font-size:0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.8;">${safeMessage}</p>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <a href="${SITE_URL}/dash"
                   style="display:inline-block;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                  Open Dashboard
                </a>
              </td></tr>
            </table>

            <!-- Footer note -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
              <tr><td style="padding:12px 16px;">
                <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                  You received this because you are a member of <strong>beoneofus.work</strong>. This message was sent to: <em>${safeAudience}</em>.
                </p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:24px 0 0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">beoneofus.work · Developer Community</p>
        <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">
          You received this because you are a member of beoneofus.work.<br>
          <a href="${SITE_URL}/dash?section=settings" style="color:#94a3b8;text-decoration:underline;">Manage email preferences</a>
          &nbsp;&middot;&nbsp;
          <a href="${SITE_URL}" style="color:#94a3b8;text-decoration:underline;">beoneofus.work</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function buildText(subject, message) {
  return `${subject}\n${'─'.repeat(subject.length)}\n\n${message}\n\nOpen your dashboard: ${SITE_URL}/dash\n\n─\nYou received this because you are a member of beoneofus.work.\nManage preferences: ${SITE_URL}/dash?section=settings`;
}

async function sendBatch(emails, subject, html, text) {
  const CHUNK = 50; // Resend batch limit per request
  let sent = 0, failed = 0;
  const unsubscribeUrl = `${SITE_URL}/dash?section=settings`;

  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK);
    const payload = chunk.map(email => ({
      from: FROM,
      to:   email,
      subject,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'Precedence': 'bulk',
        'X-Mailer': 'BeOneOfUs Platform',
      },
    }));

    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        sent += chunk.length;
      } else {
        // Fallback: send one-by-one for this chunk
        for (const email of chunk) {
          try {
            const r = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
              body: JSON.stringify({ from: FROM, to: email, subject, html, text, headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'Precedence': 'bulk' } }),
            });
            if (r.ok) sent++; else failed++;
          } catch { failed++; }
        }
      }
    } catch {
      failed += chunk.length;
    }
  }

  return { sent, failed };
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    // Auth check
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', caller.id).single();
    if (!['admin', 'founder'].includes(callerProfile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { subject, message, audience } = await request.json();

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }
    if (!AUDIENCE_LABELS[audience]) {
      return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    // Build query based on audience
    let query = supabaseAdmin.from('profiles').select('email').not('email', 'is', null);

    if (audience === 'verified')  query = query.eq('is_verified', true);
    if (audience === 'premium')   query = query.eq('is_premium', true);
    if (audience === 'member')    query = query.eq('role', 'member');
    if (audience === 'admin')     query = query.in('role', ['admin', 'founder']);

    const { data: profiles, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    const emails = (profiles || []).map(p => p.email).filter(Boolean);
    if (emails.length === 0) {
      return NextResponse.json({ error: 'No recipients found for this audience' }, { status: 400 });
    }

    const html = buildHtml(subject, message, AUDIENCE_LABELS[audience]);
    const text = buildText(subject, message);
    const { sent, failed } = await sendBatch(emails, subject.trim(), html, text);

    return NextResponse.json({ success: true, sent, failed, total: emails.length });
  } catch (error) {
    console.error('broadcast error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Lightweight count endpoint (GET ?audience=...)
export async function GET(request) {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: cp } = await supabaseAdmin.from('profiles').select('role').eq('id', caller.id).single();
    if (!['admin', 'founder'].includes(cp?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const audience = new URL(request.url).searchParams.get('audience') || 'all';

    let query = supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).not('email', 'is', null);
    if (audience === 'verified') query = query.eq('is_verified', true);
    if (audience === 'premium')  query = query.eq('is_premium', true);
    if (audience === 'member')   query = query.eq('role', 'member');
    if (audience === 'admin')    query = query.in('role', ['admin', 'founder']);

    const { count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ count: count ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
