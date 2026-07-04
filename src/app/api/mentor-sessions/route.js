import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { mentor_id, topic, goals, scheduled_at, duration_mins } = await req.json();
  if (!mentor_id || !topic) return NextResponse.json({ error: 'mentor_id and topic required' }, { status: 400 });

  const { data, error } = await supabase
    .from('mentor_sessions')
    .insert({ mentor_id, mentee_id: user.id, topic, goals, scheduled_at, duration_mins: duration_mins || 60 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data }, { status: 201 });
}

export async function GET(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myMentor } = await supabase.from('mentors').select('id').eq('user_id', user.id).single();

  let sessions = [];

  const { data: asMentee } = await supabase
    .from('mentor_sessions')
    .select(`*, mentors(id, user_id, headline, profiles!mentors_user_id_fkey(username, full_name, avatar_url))`)
    .eq('mentee_id', user.id)
    .order('created_at', { ascending: false });

  if (asMentee) sessions = [...sessions, ...asMentee.map(s => ({ ...s, my_role: 'mentee' }))];

  if (myMentor) {
    const { data: asMentor } = await supabase
      .from('mentor_sessions')
      .select(`*, profiles!mentor_sessions_mentee_id_fkey(username, full_name, avatar_url)`)
      .eq('mentor_id', myMentor.id)
      .order('created_at', { ascending: false });
    if (asMentor) sessions = [...sessions, ...asMentor.map(s => ({ ...s, my_role: 'mentor' }))];
  }

  return NextResponse.json({ sessions });
}

export async function PATCH(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status, notes, rating } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Ownership: the caller must be a participant (mentee, or the mentor) of
  // this session — otherwise anyone could edit any session's status/rating.
  const { data: sess } = await supabase
    .from('mentor_sessions')
    .select('mentee_id, mentors!mentor_sessions_mentor_id_fkey(user_id)')
    .eq('id', id)
    .single();
  if (!sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  const mentorUserId = sess.mentors?.user_id;
  if (sess.mentee_id !== user.id && mentorUserId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates = {};
  if (status) updates.status = status;
  if (notes) updates.notes = notes;
  if (rating) updates.rating = rating;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('mentor_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}
