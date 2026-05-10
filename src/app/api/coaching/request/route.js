import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { sessionId, userId, topic } = await req.json();

    const { data: profile } = await supabase
      .from('profiles').select('username').eq('id', userId).single();

    const { data: admins } = await supabase
      .from('profiles').select('id').eq('is_admin', true).neq('id', userId);

    if (admins?.length) {
      await supabase.from('notifications').insert(
        admins.map(a => ({
          receiver_id: a.id,
          actor_id:    userId,
          type:        'coaching_request',
          content:     `@${profile?.username || 'A member'} requested a 1-on-1 coaching session: "${topic}"`,
          unread:      true,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
