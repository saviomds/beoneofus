import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAdminAction } from '../../../../lib/auditLog';

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Privileged profile columns are protected by a DB trigger and can only be written
// by the service role. This endpoint is the single admin-gated path to change them.
const ALLOWED = [
  'is_verified', 'is_admin', 'is_premium', 'is_trial_premium',
  'is_suspended', 'verification_status', 'premium_requested',
];

async function requireAdmin(request) {
  const supa = adminClient();
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supa.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supa.from('profiles').select('is_admin').eq('id', user.id).single();
  return data?.is_admin ? { supa, user } : null;
}

// POST /api/admin/user-flags — admin-only privileged profile updates (service role).
// Body: { userId, flags: { is_verified?, is_admin?, is_premium?, is_trial_premium?,
//                          is_suspended?, verification_status?, premium_requested? } }
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supa, user: caller } = auth;

  try {
    const { userId, userIds, flags } = await request.json();
    const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : (userId ? [userId] : []);
    if (ids.length === 0 || !flags || typeof flags !== 'object') {
      return NextResponse.json({ error: 'userId (or userIds) and flags are required.' }, { status: 400 });
    }
    // Lockout guard: an admin can't strip their own admin access here.
    if (flags.is_admin === false && ids.includes(caller.id)) {
      return NextResponse.json({ error: 'You cannot remove your own admin access.' }, { status: 400 });
    }

    const patch = {};
    for (const k of ALLOWED) if (k in flags) patch[k] = flags[k];
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No permitted flags to update.' }, { status: 400 });
    }

    const { data, error } = await supa
      .from('profiles').update(patch).in('id', ids).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const action = 'is_admin' in patch ? (patch.is_admin ? 'grant_admin' : 'revoke_admin') : 'update_user_flags';
    for (const id of ids) {
      await logAdminAction(supa, { actorId: caller.id, action, targetType: 'user', targetUserId: id, details: { patch } });
    }

    return NextResponse.json({ ok: true, count: data.length, updated: Object.keys(patch) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
