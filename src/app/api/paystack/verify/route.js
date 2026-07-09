import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { createClient } from '@supabase/supabase-js';
import { getSettingOr } from '../../../../lib/platformSettings';

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const rl = checkRateLimit(ip, '/api/paystack/verify', { max: 10, windowMs: 60_000 });
  if (rl.limited) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Authenticate the caller — only the subscription owner can verify their payment
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: { user: caller }, error: callerErr } = await supabase.auth.getUser(token);
    if (callerErr || !caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { reference } = await req.json();
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const paystackKey = await getSettingOr('paystack_secret_key', process.env.PAYSTACK_SECRET_KEY);

    /* Verify with Paystack */
    const paystackRes = await fetchWithTimeout(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackKey}` } }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data?.status !== 'success') {
      console.error('[paystack/verify] Payment not confirmed:', paystackData.message);
      return NextResponse.json(
        { error: 'Payment could not be verified. Please try again or contact support.' },
        { status: 400 }
      );
    }

    /* Locate the subscription — must belong to the authenticated caller. */
    const { data: sub, error: subErr } = await supabase
      .from('premium_subscriptions')
      .select('id, user_id, plan, amount, currency, status')
      .eq('payment_reference', reference)
      .eq('user_id', caller.id)          // ownership enforced here
      .single();

    if (subErr) throw subErr;
    if (!sub) {
      return NextResponse.json({ error: 'Payment reference not found or does not belong to your account.' }, { status: 403 });
    }

    /* Idempotency: if we already granted this reference, don't double-grant/notify
       (verify can fire again on a page reload or a retried callback). */
    if (sub.status === 'active') {
      return NextResponse.json({ success: true, subscriptionId: sub.id, premium: true, alreadyActive: true });
    }

    /* Payment is confirmed by Paystack — payment IS the entitlement. Grant now. */
    const expiresAt = new Date(
      Date.now() + (sub.plan === 'annual' ? 365 : 30) * 86400000
    ).toISOString();

    await supabase
      .from('premium_subscriptions')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', sub.id);

    await supabase
      .from('profiles')
      .update({ is_premium: true, premium_expires_at: expiresAt })
      .eq('id', sub.user_id);

    /* Receipt to the user (their real-time channel also flips the UI to active). */
    await supabase.from('notifications').insert({
      receiver_id: sub.user_id,
      actor_id:    sub.user_id,
      type:        'premium_activated',
      content:     'Payment confirmed — your Premium is now active. Enjoy full access to every premium feature.',
      unread:      true,
    });

    return NextResponse.json({ success: true, subscriptionId: sub.id, premium: true, expiresAt });
  } catch (err) {
    console.error('Paystack verify error:', err);
    return NextResponse.json({ error: 'Payment verification failed. Please contact support.' }, { status: 500 });
  }
}
