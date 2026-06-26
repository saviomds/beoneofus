import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(req) {
  const supabase = makeSupabase();
  const { searchParams } = new URL(req.url);
  const skill = searchParams.get('skill');
  const search = searchParams.get('q');

  let query = supabase
    .from('mentors')
    .select(`
      *,
      profiles!mentors_user_id_fkey(id, username, full_name, avatar_url, headline, location, is_verified, is_premium)
    `)
    .eq('is_active', true)
    .order('rating', { ascending: false, nullsFirst: false })
    .order('session_count', { ascending: false })
    .limit(40);

  if (skill) query = query.contains('skills', [skill]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let mentors = data || [];
  if (search) {
    const q = search.toLowerCase();
    mentors = mentors.filter(m =>
      m.headline?.toLowerCase().includes(q) ||
      m.bio?.toLowerCase().includes(q) ||
      m.skills?.some(s => s.toLowerCase().includes(q)) ||
      m.profiles?.full_name?.toLowerCase().includes(q) ||
      m.profiles?.username?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ mentors });
}

export async function POST(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { headline, bio, skills, availability, hourly_rate, experience_years, portfolio_url, languages } = body;

  if (!skills?.length) return NextResponse.json({ error: 'At least one skill is required' }, { status: 400 });

  const existing = await supabase.from('mentors').select('id').eq('user_id', user.id).single();

  if (existing.data) {
    const { data, error } = await supabase
      .from('mentors')
      .update({ headline, bio, skills, availability, hourly_rate, experience_years, portfolio_url, languages, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ mentor: data });
  }

  const { data, error } = await supabase
    .from('mentors')
    .insert({ user_id: user.id, headline, bio, skills, availability, hourly_rate, experience_years, portfolio_url, languages, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mentor: data }, { status: 201 });
}
