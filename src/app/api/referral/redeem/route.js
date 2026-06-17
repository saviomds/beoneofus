import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

let _admin;
function getSupabaseAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }
  return _admin;
}

export async function POST(request) {
  try {
    const { code } = await request.json();
    if (!code?.trim()) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

    // Resolve caller from Bearer token (sent by client after sign-up)
    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authErr } = await getSupabaseAdmin().auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const normalizedCode = code.trim().toUpperCase();

    // Find referrer
    const { data: referrer } = await getSupabaseAdmin()
      .from('profiles')
      .select('id')
      .eq('referral_code', normalizedCode)
      .maybeSingle();

    if (!referrer) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    if (referrer.id === user.id) return NextResponse.json({ error: 'Cannot use your own code' }, { status: 400 });

    // Idempotent — each user can only be referred once
    const { data: existing } = await getSupabaseAdmin()
      .from('referrals')
      .select('id')
      .eq('referred_id', user.id)
      .maybeSingle();

    if (existing) return NextResponse.json({ ok: true, already: true });

    const { error: insertErr } = await getSupabaseAdmin().from('referrals').insert({
      referrer_id: referrer.id,
      referred_id: user.id,
      code: normalizedCode,
    });

    if (insertErr) throw insertErr;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[referral/redeem]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
