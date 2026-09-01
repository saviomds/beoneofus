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
  const category = searchParams.get('category');
  const search = searchParams.get('q');
  const mine = searchParams.get('mine');

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  let userId = null;
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    userId = user?.id;
  }

  let query = supabase
    .from('projects')
    .select(`
      *,
      profiles!projects_created_by_fkey(id, username, full_name, avatar_url, is_verified),
      project_members(count)
    `)
    .order('created_at', { ascending: false })
    .limit(40);

  if (mine && userId) {
    query = query.or(`created_by.eq.${userId}`);
  } else {
    query = query.eq('is_public', true);
  }

  if (category && category !== 'all') query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let projects = data || [];
  if (search) {
    const q = search.toLowerCase();
    projects = projects.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q)) ||
      p.tech_stack?.some(t => t.toLowerCase().includes(q))
    );
  }

  return NextResponse.json({ projects });
}

export async function POST(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, roles_needed, tech_stack, category, github_url, website_url, max_members, tags } = body;
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      title,
      description,
      roles_needed: roles_needed || [],
      tech_stack: tech_stack || [],
      category: category || 'general',
      github_url,
      website_url,
      max_members: max_members || 5,
      tags: tags || [],
      created_by: user.id,
      is_public: true,
      status: 'active',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: user.id,
    role: 'Owner',
    status: 'active',
  });

  return NextResponse.json({ project }, { status: 201 });
}

export async function PATCH(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .eq('created_by', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}
