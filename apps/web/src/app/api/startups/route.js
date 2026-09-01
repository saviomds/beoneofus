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
  const stage = searchParams.get('stage');
  const search = searchParams.get('q');

  let query = supabase
    .from('startup_ideas')
    .select(`
      *,
      profiles!startup_ideas_founder_id_fkey(id, username, full_name, avatar_url, is_verified, headline),
      startup_team_requests(count)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(40);

  if (stage && stage !== 'all') query = query.eq('stage', stage);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let startups = data || [];
  if (search) {
    const q = search.toLowerCase();
    startups = startups.filter(s =>
      s.title?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.industry?.toLowerCase().includes(q) ||
      s.tags?.some(t => t.toLowerCase().includes(q)) ||
      s.roles_needed?.some(r => r.toLowerCase().includes(q))
    );
  }

  return NextResponse.json({ startups });
}

export async function POST(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, problem, solution, stage, industry, roles_needed, equity_offered, paid_roles, tags } = body;
  if (!title || !description) return NextResponse.json({ error: 'title and description required' }, { status: 400 });

  const { data, error } = await supabase
    .from('startup_ideas')
    .insert({
      founder_id: user.id,
      title,
      description,
      problem,
      solution,
      stage: stage || 'idea',
      industry,
      roles_needed: roles_needed || [],
      equity_offered: equity_offered || false,
      paid_roles: paid_roles || false,
      tags: tags || [],
      is_public: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ startup: data }, { status: 201 });
}

export async function PATCH(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('startup_ideas')
    .update(updates)
    .eq('id', id)
    .eq('founder_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ startup: data });
}
