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

    const { reference, listingId } = await req.json();
    if (!reference || !listingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Bind the reference to this caller + listing. initiate mints it as
    // `bou_mkt_<listingId8>_<userId8>_<ts>`, so a reference minted for another
    // user or listing (replay) fails this check before we ever touch Paystack.
    const expectedPrefix = `bou_mkt_${String(listingId).slice(0, 8)}_${user.id.slice(0, 8)}_`;
    if (!String(reference).startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'Reference does not match order' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { data: listing, error: listingErr } = await supabase
      .from('marketplace_listings')
      .select('id, price, purchases')
      .eq('id', listingId)
      .single();
    if (listingErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Already owned → idempotent success (also our per-user replay guard, since
    // user_library is unique on (user_id, listing_id)).
    const { data: owned } = await supabase
      .from('user_library')
      .select('listing_id')
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
      .maybeSingle();
    if (owned) {
      return NextResponse.json({ success: true });
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

    // Amount check against the server-side listing price.
    const kesRate = await getKesRate();
    const expected = Math.round(Number(listing.price) * kesRate * 100);
    const paid = Number(psData.data?.amount);
    const currency = psData.data?.currency;
    if (currency !== 'KES' || !Number.isFinite(paid) || paid < Math.floor(expected * 0.98)) {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
    }

    // Grant access (idempotent on the unique constraint).
    const { error: libErr } = await supabase
      .from('user_library')
      .upsert({ user_id: user.id, listing_id: listingId }, { onConflict: 'user_id,listing_id' });
    if (libErr) throw libErr;

    await supabase
      .from('marketplace_listings')
      .update({ purchases: (listing.purchases || 0) + 1 })
      .eq('id', listingId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Marketplace verify error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
