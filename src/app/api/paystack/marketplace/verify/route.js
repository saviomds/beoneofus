import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { reference, userId, listingId } = await req.json();
    if (!reference || !userId || !listingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    /* Verify with Paystack */
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

    /* Add to user library (upsert — idempotent) */
    const { error: libErr } = await supabase
      .from('user_library')
      .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id' });
    if (libErr) throw libErr;

    /* Increment purchase counter */
    const { data: listing } = await supabase
      .from('marketplace_listings')
      .select('purchases')
      .eq('id', listingId)
      .single();
    if (listing) {
      await supabase
        .from('marketplace_listings')
        .update({ purchases: (listing.purchases || 0) + 1 })
        .eq('id', listingId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Marketplace verify error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
