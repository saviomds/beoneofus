import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL,
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

async function disableTrial(supa) {
  await supa.from('profiles')
    .update({ is_premium: false, is_trial_premium: false })
    .eq('is_trial_premium', true);

  await supa.from('platform_settings').upsert({
    key: 'premium_trial',
    value: { active: false, expires_at: null },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supa } = auth;

  try {
    const [{ data: setting }, { count: trialCount }] = await Promise.all([
      supa.from('platform_settings').select('value').eq('key', 'premium_trial').single(),
      supa.from('profiles').select('id', { count: 'exact', head: true }).eq('is_trial_premium', true),
    ]);

    const val = setting?.value;

    // Auto-expire: if trial is marked active but the expiry date has passed, revert all trial users
    if (val?.active && val?.expires_at && new Date(val.expires_at) <= new Date()) {
      await disableTrial(supa);
      return NextResponse.json({
        trialMode: { active: false, expires_at: null, user_count: 0, autoExpired: true },
      });
    }

    return NextResponse.json({
      trialMode: val
        ? { ...val, user_count: trialCount ?? 0 }
        : { active: false, expires_at: null, user_count: 0 },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supa, user: caller } = auth;

  try {
    const { action } = await request.json();

    if (action === 'enable') {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const startedAt = new Date().toISOString();

      // Grant trial premium to all users who don't already have paid premium
      await supa.from('profiles')
        .update({ is_premium: true, is_trial_premium: true })
        .or('is_premium.eq.false,is_premium.is.null');

      await supa.from('platform_settings').upsert({
        key: 'premium_trial',
        value: {
          active: true,
          expires_at: expiresAt,
          started_at: startedAt,
          enabled_by: caller.id,
        },
        updated_at: startedAt,
      }, { onConflict: 'key' });

      const { count } = await supa
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_trial_premium', true);

      return NextResponse.json({
        trialMode: { active: true, expires_at: expiresAt, started_at: startedAt, user_count: count ?? 0 },
      });
    }

    if (action === 'disable') {
      await disableTrial(supa);
      return NextResponse.json({
        trialMode: { active: false, expires_at: null, user_count: 0 },
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use enable or disable.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
