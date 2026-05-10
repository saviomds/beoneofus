import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

async function verifyAdmin(adminId) {
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', adminId)
    .single();
  return data?.is_admin === true;
}

export async function POST(req) {
  try {
    const { subscriptionId, action, adminId, note } = await req.json();

    if (!(await verifyAdmin(adminId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    /* Fetch full subscription + user profile */
    const { data: sub, error: fetchErr } = await supabase
      .from('premium_subscriptions')
      .select('*, profiles!premium_subscriptions_user_id_fkey(*)')
      .eq('id', subscriptionId)
      .single();

    if (fetchErr || !sub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    /* ── AI Review ─────────────────────────────────────────────────────────── */
    if (action === 'ai_review') {
      if (!groq) {
        return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
      }

      const p = sub.profiles;
      const ageDays = Math.floor(
        (Date.now() - new Date(p?.created_at || Date.now()).getTime()) / 86400000
      );

      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: `You are a fraud-prevention and account reviewer for beoneofus, a developer community platform.

Review this premium subscription request:
- Username: @${p?.username || 'unknown'}
- Account age: ${ageDays} days
- Verified account: ${p?.is_verified ? 'Yes' : 'No'}
- Profile bio/status: ${p?.status || 'Not set'}
- Location: ${p?.location || 'Not provided'}
- Work status: ${p?.work_status || 'Not set'}
- GitHub linked: ${p?.github ? 'Yes' : 'No'}
- Plan: ${sub.plan} — ${sub.plan === 'monthly' ? '$9.99/mo' : '$99/yr'} (charged in KES)
- Payment provider: ${sub.payment_provider} (payment verified)

Write 2-3 sentences assessing legitimacy (account age, profile completeness, any red flags). Then on a new line write exactly: RECOMMENDATION: APPROVE or RECOMMENDATION: FLAG`,
        }],
        max_tokens: 220,
        temperature: 0.3,
      });

      const text = completion.choices[0]?.message?.content?.trim() || 'AI review unavailable.';
      const recommendation = text.includes('RECOMMENDATION: APPROVE') ? 'approve' : 'flag';

      await supabase
        .from('premium_subscriptions')
        .update({
          ai_review: { text, recommendation, reviewed_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      return NextResponse.json({ aiReview: { text, recommendation } });
    }

    /* ── Accept ────────────────────────────────────────────────────────────── */
    if (action === 'accept') {
      const expiresAt = new Date(
        Date.now() + (sub.plan === 'annual' ? 365 : 30) * 86400000
      ).toISOString();

      await supabase
        .from('profiles')
        .update({ is_premium: true, premium_expires_at: expiresAt })
        .eq('id', sub.user_id);

      await supabase
        .from('premium_subscriptions')
        .update({
          status:      'active',
          reviewed_by: adminId,
          review_note: note || null,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      await supabase.from('notifications').insert({
        receiver_id: sub.user_id,
        actor_id:    adminId,
        type:        'premium_activated',
        content:     note
          ? `Your premium subscription is now active! Note from admin: "${note}"`
          : 'Your premium subscription is now active! Enjoy full access to all premium features.',
        unread: true,
      });

      return NextResponse.json({ success: true, status: 'active' });
    }

    /* ── Decline ───────────────────────────────────────────────────────────── */
    if (action === 'decline') {
      await supabase
        .from('premium_subscriptions')
        .update({
          status:      'declined',
          reviewed_by: adminId,
          review_note: note || null,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      await supabase.from('notifications').insert({
        receiver_id: sub.user_id,
        actor_id:    adminId,
        type:        'premium_declined',
        content:     note
          ? `Your premium request was declined. Reason: "${note}". Contact support if you believe this is an error.`
          : 'Your premium request was declined. Please contact support for assistance.',
        unread: true,
      });

      return NextResponse.json({ success: true, status: 'declined' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Premium review error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
