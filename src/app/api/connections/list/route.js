import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ users: [] });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: connections, error } = await supabaseAdmin
      .from('connections')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const userIds = connections.map(c => c.sender_id === userId ? c.receiver_id : c.sender_id);

    const { data: users, error: userErr } = await supabaseAdmin
      .from('profiles')
      .select('id, username, avatar_url, status, is_verified')
      .in('id', userIds);

    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 500 });
    }

    return NextResponse.json({ users: users ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
