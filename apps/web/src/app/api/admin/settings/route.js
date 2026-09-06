import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { invalidatePlatformSettingsCache } from '../../../../lib/platformSettings';
import { logAdminAction } from '../../../../lib/auditLog';

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

// Keys that hold sensitive values — returned masked
const SENSITIVE_KEYS = ['paystack_secret_key', 'paystack_webhook_secret'];

function maskValue(key, value) {
  if (!value || typeof value !== 'string') return value;
  if (SENSITIVE_KEYS.includes(key)) {
    return value.length > 8 ? value.slice(0, 4) + '•'.repeat(value.length - 8) + value.slice(-4) : '••••••••';
  }
  return value;
}

// GET — fetch all platform settings
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supa } = auth;

  try {
    const { data, error } = await supa
      .from('platform_settings')
      .select('key, value, updated_at')
      .order('key');

    if (error) throw error;

    // Flatten into a settings map; mask sensitive keys
    const settings = {};
    for (const row of data || []) {
      settings[row.key] = {
        value: SENSITIVE_KEYS.includes(row.key) ? maskValue(row.key, row.value) : row.value,
        updated_at: row.updated_at,
        is_set: !!row.value,
      };
    }

    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — upsert one or more platform settings
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supa, user } = auth;

  try {
    const body = await request.json();
    const { key, value, batch } = body;

    const now = new Date().toISOString();
    const rows = [];

    if (batch && typeof batch === 'object') {
      for (const [k, v] of Object.entries(batch)) {
        if (typeof k !== 'string' || k.length > 128) continue;
        rows.push({ key: k, value: v, updated_at: now });
      }
    } else if (key) {
      if (typeof key !== 'string' || key.length > 128) {
        return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
      }
      rows.push({ key, value, updated_at: now });
    } else {
      return NextResponse.json({ error: 'Provide key+value or batch object' }, { status: 400 });
    }

    if (!rows.length) return NextResponse.json({ error: 'Nothing to save' }, { status: 400 });

    const { error } = await supa
      .from('platform_settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) throw error;

    invalidatePlatformSettingsCache();

    await logAdminAction(supa, {
      actorId: user.id,
      action: 'update_platform_settings',
      targetType: 'platform_settings',
      details: { keys: rows.map(r => r.key) },
    });

    return NextResponse.json({ success: true, saved: rows.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove a setting key
export async function DELETE(request) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supa, user } = auth;

  try {
    const { key } = await request.json();
    if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

    const { error } = await supa.from('platform_settings').delete().eq('key', key);
    if (error) throw error;

    await logAdminAction(supa, {
      actorId: user.id,
      action: 'delete_platform_setting',
      targetType: 'platform_settings',
      details: { key },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
