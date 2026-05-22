import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Allowlist prevents arbitrary strings from polluting the activity log
// and stops enumeration of internal event types.
const ALLOWED_TYPES = new Set([
  'post_created', 'post_liked', 'comment_added',
  'connection_sent', 'connection_accepted',
  'course_started', 'course_completed', 'certificate_earned',
  'lesson_generated', 'exam_taken', 'exam_passed',
  'mentor_booked', 'coaching_session',
  'marketplace_listing', 'service_created',
  'profile_updated', 'login',
  'project_created', 'project_joined',
  'project_task_created', 'project_task_completed', 'project_task_updated',
]);

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // Verify the caller is who they claim to be.
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, content, metadata } = await req.json();

    if (!type || !ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
    }

    const { error } = await supabase.from('user_activity').insert({
      user_id:  user.id,           // always derived from the verified token, never from the body
      type,
      content:  content  ?? '',
      metadata: metadata ?? {},
    });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[activity] POST error:', err.message);
    return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 });
  }
}
