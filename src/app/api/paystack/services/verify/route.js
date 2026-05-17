import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { reference, orderId, userId } = await req.json();
    if (!reference || !orderId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const psRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
    );
    const psData = await psRes.json();

    if (!psData.status || psData.data?.status !== 'success') {
      return NextResponse.json(
        { error: 'Payment not verified', detail: psData.message },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('service_orders')
      .update({ payment_reference: reference })
      .eq('id', orderId)
      .eq('buyer_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Services payment verify error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
