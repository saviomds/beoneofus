import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Self-serve account deletion. Authenticates the caller from their token and
// deletes THEIR OWN auth user via the service role, so the erasure is complete
// (auth user + cascaded rows), unlike the old client `rpc('delete_user')` which
// referenced a function that was never defined and silently orphaned the auth user.
export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const uid = user.id;

    // Delete the auth user first. In Supabase this cascades to profiles and any
    // table whose FK to auth.users / profiles is ON DELETE CASCADE.
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (deleteErr) {
      // Fallback: at minimum remove the profile so the account is unusable,
      // and report a partial deletion so the user can contact support.
      await supabaseAdmin.from('profiles').delete().eq('id', uid);
      console.error('account/delete: auth deletion failed:', deleteErr.message);
      return NextResponse.json(
        { error: 'Your account could not be fully deleted. Please contact support.' },
        { status: 500 },
      );
    }

    // Best-effort profile cleanup (may already be cascaded on the DB side).
    await supabaseAdmin.from('profiles').delete().eq('id', uid);

    // Audit trail (best-effort — never block deletion on the log).
    await supabaseAdmin.from('admin_audit_log').insert({
      actor_id: uid,
      action: 'self_delete_account',
      target_user_id: uid,
      created_at: new Date().toISOString(),
    }).then(() => {}, (e) => console.warn('audit log insert failed:', e?.message));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('account/delete error:', err);
    return NextResponse.json({ error: 'Failed to delete account. Please try again.' }, { status: 500 });
  }
}
