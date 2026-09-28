import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { checkRateLimit } from '../../../lib/rateLimit';
import { escapeHtml } from '../../../lib/escapeHtml';

const TOPICS = ['Study Abroad', 'Work Abroad', 'An existing application', 'Something else'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Public inbox shown on /contact — used when ADMIN_NOTIFY_EMAIL isn't configured.
const DEFAULT_INBOX = 'dominiquesaviomds@gmail.com';

// POST /api/contact  body: { name, email, topic, message, website }
// Public contact form. Delivers each message to the team by email (reply-to is
// the sender) and as an in-app notification to admins, so nothing is lost if
// one channel is down. `website` is a honeypot field real users never fill.
export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(ip, '/api/contact', { max: 5, windowMs: 10 * 60_000 });
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Too many messages. Please try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  // Bots fill every field — pretend success so they don't retry.
  if (body.website) return NextResponse.json({ success: true });

  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().slice(0, 200);
  const topic = TOPICS.includes(body.topic) ? body.topic : 'Something else';
  const message = String(body.message || '').trim().slice(0, 5000);

  if (!name) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: 'Please write a little more (at least 10 characters).' }, { status: 400 });

  let delivered = false;

  if (process.env.RESEND_API_KEY) {
    try {
      const to = (process.env.ADMIN_NOTIFY_EMAIL || DEFAULT_INBOX).split(',').map((s) => s.trim()).filter(Boolean);
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: `beoneofus Contact <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
        to,
        replyTo: email,
        subject: `[Contact] ${topic} — ${name}`,
        html: `
          <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
          <p><strong>Topic:</strong> ${escapeHtml(topic)}</p>
          <hr />
          <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
          <hr />
          <p style="color:#6b7280;font-size:12px">Sent from the beoneofus contact form. Reply to this email to answer ${escapeHtml(name)} directly.</p>
        `,
      });
      if (error) console.error('[contact] email failed:', error.message);
      else delivered = true;
    } catch (err) {
      console.error('[contact] email failed:', err?.message);
    }
  }

  try {
    const { data: admins } = await supabaseAdmin.from('profiles').select('id').eq('is_admin', true);
    if (admins?.length) {
      const preview = message.length > 180 ? `${message.slice(0, 180)}…` : message;
      const { error } = await supabaseAdmin.from('notifications').insert(
        admins.map((a) => ({
          receiver_id: a.id,
          actor_id: null,
          type: 'message',
          content: `Contact form (${topic}) from ${name} <${email}>: ${preview}`,
        })),
      );
      if (error) console.error('[contact] notification failed:', error.message);
      else delivered = true;
    }
  } catch (err) {
    console.error('[contact] notification failed:', err?.message);
  }

  if (!delivered) {
    return NextResponse.json(
      { error: `We couldn't send your message right now. Please email us at ${DEFAULT_INBOX}.` },
      { status: 502 },
    );
  }
  return NextResponse.json({ success: true });
}
