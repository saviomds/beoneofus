import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/* USD prices — displayed to users; charged in KES at live rate */
const PLANS = {
  monthly: { usdCents: 999,  label: 'Premium Monthly' },
  annual:  { usdCents: 9900, label: 'Premium Annual'  },
};

async function getKesRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return data.result === 'success' && data.rates?.KES ? data.rates.KES : 130;
  } catch {
    return 130; // fallback rate
  }
}

export async function POST(req) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { plan, userId, email } = await req.json();

    if (!plan || !userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const planData = PLANS[plan];
    if (!planData) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    /* Convert USD → KES at live rate (Paystack expects smallest unit: 1 KES = 100 cents) */
    const kesRate = await getKesRate();
    const kesAmount = Math.round((planData.usdCents / 100) * kesRate * 100);

    /* Cancel any previous pending_payment subscriptions for this user */
    await supabase
      .from('premium_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'pending_payment');

    const reference = `bou_${plan}_${userId.slice(0, 8)}_${Date.now()}`;

    const { data: sub, error } = await supabase
      .from('premium_subscriptions')
      .insert({
        user_id:           userId,
        plan,
        amount:            kesAmount,
        currency:          'KES',
        status:            'pending_payment',
        payment_reference: reference,
        payment_provider:  'paystack',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      reference,
      amount:         kesAmount,
      currency:       'KES',
      email,
      subscriptionId: sub.id,
      publicKey:      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    });
  } catch (err) {
    console.error('Paystack initiate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
