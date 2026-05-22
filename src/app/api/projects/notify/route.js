import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNotificationEmail } from '../../../../lib/sendNotificationEmail';

const ALLOWED_TYPES = [
  'project_invite',
  'project_join_request',
  'project_join_approved',
  'project_join_rejected',
  'project_task_assigned',
  'project_role_changed',
];

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    // Verify caller is authenticated
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, target_user_id, extra = {} } = await request.json();

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }
    if (!target_user_id) {
      return NextResponse.json({ error: 'target_user_id required' }, { status: 400 });
    }

    // Look up target user's email from auth.users (admin only)
    const { data: { user: targetUser }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(target_user_id);
    if (userErr || !targetUser?.email) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Look up target user's display name from profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, full_name')
      .eq('id', target_user_id)
      .single();

    const name = profile?.full_name || profile?.username || targetUser.email.split('@')[0];

    // Look up caller's display name (for "senderName", "ownerName", "assignerName")
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('username, full_name')
      .eq('id', caller.id)
      .single();

    const callerName = callerProfile?.full_name || callerProfile?.username || caller.email?.split('@')[0] || 'A teammate';

    // Merge caller name into extra fields if not already provided
    const enrichedExtra = {
      senderName:   callerName,
      ownerName:    callerName,
      assignerName: callerName,
      requesterName:   callerName,
      requesterUsername: callerProfile?.username || '',
      ...extra,
    };

    await sendNotificationEmail({ type, email: targetUser.email, name, extra: enrichedExtra });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('projects/notify error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
