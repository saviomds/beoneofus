import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { invalidatePlatformSettingsCache } from '../../../../../lib/platformSettings';

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireAdmin(request) {
  const supa = adminClient();
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supa.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supa.from('profiles').select('is_admin').eq('id', user.id).single();
  return data?.is_admin ? { supa, user } : null;
}

// POST — validate a Paystack secret key by hitting their /bank endpoint, then save all keys
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supa, user } = auth;

  try {
    const body = await request.json();
    const {
      public_key,
      secret_key,
      webhook_secret,
      plan_monthly_id,
      plan_annual_id,
      plan_monthly_price_usd,
      plan_annual_price_usd,
    } = body;

    // Validate secret key against Paystack API (if provided and not masked)
    if (secret_key && !secret_key.includes('•')) {
      const testRes = await fetch('https://api.paystack.co/bank', {
        headers: { Authorization: `Bearer ${secret_key}` },
      });
      if (!testRes.ok) {
        return NextResponse.json({ error: 'Invalid Paystack secret key — API validation failed.' }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const rows = [];

    const add = (key, value) => {
      if (value === undefined || value === null) return;
      if (typeof value === 'string' && value.includes('•')) return;
      rows.push({ key, value, updated_at: now });
    };

    add('paystack_public_key', public_key);
    add('paystack_secret_key', secret_key);
    add('paystack_webhook_secret', webhook_secret);
    add('paystack_plan_monthly_id', plan_monthly_id);
    add('paystack_plan_annual_id', plan_annual_id);

    if (plan_monthly_price_usd !== undefined) {
      add('premium_monthly_price_usd', Number(plan_monthly_price_usd));
    }
    if (plan_annual_price_usd !== undefined) {
      add('premium_annual_price_usd', Number(plan_annual_price_usd));
    }

    if (rows.length) {
      const { error } = await supa
        .from('platform_settings')
        .upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      invalidatePlatformSettingsCache();
    }

    return NextResponse.json({ success: true, saved: rows.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
