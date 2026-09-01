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

    const { listingId, email } = await req.json();
    if (!listingId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // Price is read server-side from the listing, never from the client.
    const { data: listing, error: listingErr } = await supabase
      .from('marketplace_listings')
      .select('id, price, is_active')
      .eq('id', listingId)
      .single();

    if (listingErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    if (listing.is_active === false) {
      return NextResponse.json({ error: 'Listing is not available' }, { status: 409 });
    }

    const priceUsd = Number(listing.price);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      return NextResponse.json({ error: 'Use the free flow for zero-price items' }, { status: 400 });
    }

    const kesRate = await getKesRate();
    const kesAmount = Math.round(priceUsd * kesRate * 100);
    const reference = `bou_mkt_${String(listingId).slice(0, 8)}_${user.id.slice(0, 8)}_${Date.now()}`;

    return NextResponse.json({
      reference,
      amount: kesAmount,
      currency: 'KES',
      email,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    });
  } catch (err) {
    console.error('Marketplace initiate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
