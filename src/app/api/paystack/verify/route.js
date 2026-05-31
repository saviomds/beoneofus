import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { createClient } from '@supabase/supabase-js';

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

    /* Verify with Paystack */
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data?.status !== 'success') {
      console.error('[paystack/verify] Payment not confirmed:', paystackData.message);
      return NextResponse.json(
        { error: 'Payment could not be verified. Please try again or contact support.' },
        { status: 400 }
      );
    }

    /* Update subscription — must belong to the authenticated caller (ownership check) */
    const { data: sub, error: subErr } = await supabase
      .from('premium_subscriptions')
      .update({ status: 'pending_review', updated_at: new Date().toISOString() })
      .eq('payment_reference', reference)
      .eq('user_id', caller.id)          // ownership enforced here
      .select('id, user_id, plan, amount, currency')
      .single();

    if (subErr) throw subErr;
    if (!sub) {
      return NextResponse.json({ error: 'Payment reference not found or does not belong to your account.' }, { status: 403 });
    }

    /* Fetch username for notification message */
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', sub.user_id)
      .single();

    /* Notify all admins */
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .neq('id', sub.user_id);

    if (admins?.length) {
      const amount = sub.plan === 'monthly' ? '$9.99/mo' : '$99/yr';
      await supabase.from('notifications').insert(
        admins.map(a => ({
          receiver_id: a.id,
          actor_id:    sub.user_id,
          type:        'premium_request',
          content:     `@${profile?.username || 'A user'} paid ${amount} for ${sub.plan} premium. Review their request.`,
          unread:      true,
        }))
      );
    }

    return NextResponse.json({ success: true, subscriptionId: sub.id });
  } catch (err) {
    console.error('Paystack verify error:', err);
    return NextResponse.json({ error: 'Payment verification failed. Please contact support.' }, { status: 500 });
  }
}
