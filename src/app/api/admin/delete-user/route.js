import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Delete from auth (cascades to profiles via FK if set up, otherwise delete profile first)
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to delete user' }, { status: 500 });
  }
}
