import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAuth } from '../../../lib/requireAuth';
import { checkRateLimit } from '../../../lib/rateLimit';
import { escapeHtml } from '../../../lib/escapeHtml';

// POST /api/notify-admin  body: { type: 'new_founder_app' }
// Alerts platform admins that the caller just submitted a founder/member
// application. The applicant and role are read from the caller's own pending
// application row — never from the request body — so this can't be used to
// send arbitrary content to admins.
export async function POST(request) {
  const { user, error: authError, status: authStatus } = await requireAuth(request);
  if (authError) return NextResponse.json({ error: authError }, { status: authStatus });

  const rl = checkRateLimit(user.id, '/api/notify-admin', { max: 3, windowMs: 10 * 60_000 });
  if (rl.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { type } = await request.json().catch(() => ({}));
  if (type !== 'new_founder_app') {
    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
  }

  const { data: app } = await supabaseAdmin
    .from('founder_applications')
    .select('id, name, intended_role')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!app) return NextResponse.json({ error: 'No pending application found' }, { status: 404 });

  const roleLabel = app.intended_role === 'cofounder' ? 'co-founder' : 'member';
  const name = app.name || 'A user';

  const { data: admins } = await supabaseAdmin.from('profiles').select('id').eq('is_admin', true);
  if (admins?.length) {
    await supabaseAdmin.from('notifications').insert(
      admins
        .filter((a) => a.id !== user.id)
        .map((a) => ({
          receiver_id: a.id,
          actor_id: user.id,
          type: 'message',
          content: `New ${roleLabel} application from ${name}. Review it in the Admin Console.`,
        }))
    );
  }

  // Optional email alert — only when both Resend and a destination are configured.
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (process.env.RESEND_API_KEY && to) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
        to: to.split(',').map((s) => s.trim()).filter(Boolean),
        subject: `New ${roleLabel} application: ${name}`,
        html: `<p>A new <strong>${escapeHtml(roleLabel)}</strong> application was submitted by <strong>${escapeHtml(name)}</strong>.</p><p>Review it in the Admin Console.</p>`,
      });
    } catch (err) {
      console.error('[notify-admin] email failed:', err?.message);
    }
  }

  return NextResponse.json({ success: true });
}
