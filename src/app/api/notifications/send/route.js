import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNotificationEmail } from '../../../../lib/sendNotificationEmail';

const ALLOWED_TYPES = [
  'verification_approved',
  'verification_rejected',
  'premium_accepted',
  'premium_declined',
  'connection_accepted',
  'role_changed',
  'partnership_accepted',
  'partnership_declined',
  'chat_task_assigned',
];

export async function POST(request) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, email, name, extra } = await request.json();

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Recipient name required' }, { status: 400 });
    }

    try {
      await sendNotificationEmail({ type, email, name, extra: extra || {} });
    } catch (emailErr) {
      // Log the failure to error_logs so it appears in the admin System Logs panel
      await supabaseAdmin.from('error_logs').insert({
        level: 'error',
        category: 'notifications',
        message: `sendNotificationEmail failed [${type}]: ${emailErr.message}`,
        component: 'api/notifications/send',
        url: '/api/notifications/send',
        user_id: user.id,
        metadata: { type, email, error: emailErr.message },
        resolved: false,
      }).catch(() => {});
      console.error('sendNotificationEmail error:', emailErr);
      return NextResponse.json({ error: emailErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
    } catch (error) {
      console.error('notifications/send error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } catch (outerError) {
    console.error('notifications/send outer error:', outerError);
    return NextResponse.json({ error: outerError.message || 'Server error' }, { status: 500 });
  }
}
