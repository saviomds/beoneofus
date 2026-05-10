import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
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
      return NextResponse.json(
        { error: 'Payment not verified', detail: paystackData.message },
        { status: 400 }
      );
    }

    /* Update subscription to pending_review */
    const { data: sub, error: subErr } = await supabase
      .from('premium_subscriptions')
      .update({ status: 'pending_review', updated_at: new Date().toISOString() })
      .eq('payment_reference', reference)
      .select('id, user_id, plan, amount, currency')
      .single();

    if (subErr) throw subErr;

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
