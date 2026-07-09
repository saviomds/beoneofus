import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../../lib/requireAuth';

async function getKesRate() {
  try {
    const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
    const data = await res.json();
    return data.result === 'success' && data.rates?.KES ? data.rates.KES : 130;
  } catch {
    return 130;
  }
}

export async function POST(req) {
  try {
    const { user, error: authError, status: authStatus } = await requireAuth(req);
    if (authError) return NextResponse.json({ error: authError }, { status: authStatus });

    const { reference, orderId } = await req.json();
    if (!reference || !orderId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // Ownership: the order must belong to the authenticated buyer.
    const { data: order, error: orderErr } = await supabase
      .from('service_orders')
      .select('id, amount_usd, buyer_id, payment_reference')
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Idempotency: this exact order+reference already recorded → succeed quietly.
    if (order.payment_reference === reference) {
      return NextResponse.json({ success: true });
    }
    // Order already paid with a different reference → reject.
    if (order.payment_reference) {
      return NextResponse.json({ error: 'Order already paid' }, { status: 409 });
    }
    // Replay: this reference must not already be consumed by another order.
    const { data: dup } = await supabase
      .from('service_orders')
      .select('id')
      .eq('payment_reference', reference)
      .maybeSingle();
    if (dup) {
      return NextResponse.json({ error: 'Payment reference already used' }, { status: 409 });
    }

    // Verify with Paystack.
    const psRes = await fetchWithTimeout(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
    );
    const psData = await psRes.json();

    if (!psData.status || psData.data?.status !== 'success') {
      return NextResponse.json({ error: 'Payment not verified' }, { status: 400 });
    }

    // Amount check: the charged amount must cover the server-side price.
    // getKesRate is cached (revalidate 3600) so initiate & verify agree; a
    // small tolerance absorbs any rate refresh across the hour boundary.
    const kesRate = await getKesRate();
    const expected = Math.round(Number(order.amount_usd) * kesRate * 100);
    const paid = Number(psData.data?.amount);
    const currency = psData.data?.currency;
    if (currency !== 'KES' || !Number.isFinite(paid) || paid < Math.floor(expected * 0.98)) {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
    }

    const { error } = await supabase
      .from('service_orders')
      .update({ payment_reference: reference })
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .is('payment_reference', null); // guard against a concurrent double-verify

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Services payment verify error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
