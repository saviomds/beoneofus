import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '../../../../../lib/fetchWithTimeout';
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
    // Authenticate the caller — never trust a body userId/price.
    const { user, error: authError, status: authStatus } = await requireAuth(req);
    if (authError) return NextResponse.json({ error: authError }, { status: authStatus });

    const { orderId, email } = await req.json();
    if (!orderId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // Source of truth for price is the persisted order, scoped to the buyer.
    const { data: order, error: orderErr } = await supabase
      .from('service_orders')
      .select('id, amount_usd, buyer_id, payment_reference')
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.payment_reference) {
      return NextResponse.json({ error: 'Order already paid' }, { status: 409 });
    }

    const priceUsd = Number(order.amount_usd);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      return NextResponse.json({ error: 'Order has no payable amount' }, { status: 400 });
    }

    const kesRate = await getKesRate();
    const kesAmount = Math.round(priceUsd * kesRate * 100);
    const reference = `bou_svc_${orderId.slice(0, 8)}_${user.id.slice(0, 8)}_${Date.now()}`;

    return NextResponse.json({
      reference,
      amount: kesAmount,
      currency: 'KES',
      email,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    });
  } catch (err) {
    console.error('Services payment initiate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
