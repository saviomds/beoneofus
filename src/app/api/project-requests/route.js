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

  const { project_id, role, message } = await req.json();
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 });

  const { data: existing } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', project_id)
    .eq('user_id', user.id)
    .single();

  if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 });

  const { data, error } = await supabase
    .from('project_requests')
    .upsert({ project_id, user_id: user.id, role, message, status: 'pending' }, { onConflict: 'project_id,user_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data }, { status: 201 });
}

export async function PATCH(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status, project_id } = await req.json();
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

  const { data: project } = await supabase
    .from('projects')
    .select('created_by')
    .eq('id', project_id)
    .single();

  if (project?.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: request, error } = await supabase
    .from('project_requests')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === 'accepted') {
    await supabase.from('project_members').upsert({
      project_id,
      user_id: request.user_id,
      role: request.role || 'Member',
      status: 'active',
    }, { onConflict: 'project_id,user_id' });
  }

  return NextResponse.json({ request });
}

export async function GET(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const project_id = searchParams.get('project_id');

  const { data } = await supabase
    .from('project_requests')
    .select(`*, profiles!project_requests_user_id_fkey(username, full_name, avatar_url, headline)`)
    .eq('project_id', project_id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ requests: data || [] });
}
