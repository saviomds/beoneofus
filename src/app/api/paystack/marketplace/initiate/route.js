import { NextResponse } from 'next/server';

async function getKesRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
    const data = await res.json();
    return data.result === 'success' && data.rates?.KES ? data.rates.KES : 130;
  } catch {
    return 130;
  }
}

export async function POST(req) {
  try {
    const { userId, email, listingId, priceUsd } = await req.json();

    if (!userId || !email || !listingId || priceUsd === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (priceUsd <= 0) {
      return NextResponse.json({ error: 'Use free flow for zero-price items' }, { status: 400 });
    }

    const kesRate = await getKesRate();
    const kesAmount = Math.round(priceUsd * kesRate * 100);
    const reference = `bou_mkt_${listingId.slice(0, 8)}_${userId.slice(0, 8)}_${Date.now()}`;

    return NextResponse.json({
      reference,
      amount: kesAmount,
      currency: 'KES',
      email,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    });
  } catch (err) {
    console.error('Marketplace initiate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
