import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAdminAction } from '../../../../lib/auditLog';

export async function DELETE(request) {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_admin')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || (!callerProfile.is_admin && !['admin', 'founder'].includes(callerProfile.role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // Prevent self-deletion
    if (userId === caller.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Delete auth user first — if this fails we stop before touching the profile,
    // keeping the data consistent. Profile deletion comes second (or is cascaded via FK).
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteErr) throw deleteErr;

    // Best-effort profile cleanup (may already be cascaded by FK on the DB side)
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Audit log: record which admin deleted which user
    await logAdminAction(supabaseAdmin, {
      actorId: caller.id,
      action: 'delete_user',
      targetType: 'user',
      targetUserId: userId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('delete-user error:', err);
    return NextResponse.json({ error: 'Failed to delete user. Please try again.' }, { status: 500 });
  }
}
