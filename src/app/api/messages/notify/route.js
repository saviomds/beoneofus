import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNotificationEmail } from '../../../../lib/sendNotificationEmail.js';

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const { receiver_id } = body;
  if (!receiver_id) return NextResponse.json({ ok: true });

  // Get last 2 messages between these two users
  const { data: msgs } = await supabase
    .from('messages')
    .select('created_at, sender_id')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: false })
    .limit(2);

  if (!msgs || msgs.length === 0) return NextResponse.json({ ok: true });

  const isFirst = msgs.length === 1;
  let isStale = false;
  if (!isFirst && msgs[1]) {
    const msSinceLast = Date.now() - new Date(msgs[1].created_at).getTime();
    isStale = msSinceLast >= 2 * 24 * 60 * 60 * 1000;
  }

  if (!isFirst && !isStale) return NextResponse.json({ ok: true });

  // Get sender display name
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single();
  const senderName = senderProfile?.full_name || senderProfile?.username || 'Someone';

  // Get receiver email
  const { data: { user: receiver } } = await supabase.auth.admin.getUserById(receiver_id);
  if (!receiver?.email) return NextResponse.json({ ok: true });

  const { data: receiverProfile } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', receiver_id)
    .single();
  const receiverName = receiverProfile?.full_name || receiverProfile?.username || 'there';

  await sendNotificationEmail({
    type: 'new_dm_message',
    email: receiver.email,
    name: receiverName,
    extra: { senderName, isFirst },
  });

  return NextResponse.json({ ok: true });
}
