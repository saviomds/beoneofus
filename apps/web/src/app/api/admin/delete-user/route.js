import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAdminAction } from '../../../../lib/auditLog';

export async function DELETE(request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('delete-user error: Supabase admin credentials are not configured');
      return NextResponse.json({ error: 'User deletion is not configured on the server.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 });
    }
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // Prevent self-deletion
    if (userId === caller.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const { data: authData, error: authLookupError } = await supabaseAdmin.auth.admin.getUserById(userId);
    const authUserMissing = authLookupError && (
      authLookupError.status === 404 || /user not found/i.test(authLookupError.message || '')
    );
    if (authLookupError && !authUserMissing) {
      console.error('delete-user auth lookup failed:', authLookupError);
      return NextResponse.json({ error: authLookupError.message || 'Unable to verify this account.' }, { status: 500 });
    }

    if (authData?.user) {
      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteErr) {
        console.error('delete-user auth deletion failed:', deleteErr);
        return NextResponse.json({ error: deleteErr.message || 'Unable to delete this account.' }, { status: 500 });
      }
    }

    // Auth deletion may cascade the profile; retry cleanup handles accounts
    // whose Auth record was removed by an earlier partial attempt.
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileDeleteError) {
      console.error('delete-user profile deletion failed:', profileDeleteError);
      return NextResponse.json({
        error: `The Auth account is removed, but profile cleanup failed: ${profileDeleteError.message}`,
        partialDeletion: true,
      }, { status: 500 });
    }

    const { data: remainingProfile, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (verifyError || remainingProfile) {
      console.error('delete-user profile verification failed:', verifyError || 'Profile row remains');
      return NextResponse.json({
        error: verifyError?.message || 'The profile row still exists after deletion.',
        partialDeletion: true,
      }, { status: 500 });
    }

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
    return NextResponse.json({ error: err?.message || 'Failed to delete user. Please try again.' }, { status: 500 });
  }
}
