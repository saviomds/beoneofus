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
  const type = searchParams.get('type');
  const search = searchParams.get('q');

  let query = supabase
    .from('freelance_jobs')
    .select(`*, profiles!freelance_jobs_poster_id_fkey(username, full_name, avatar_url)`)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50);

  if (category && category !== 'all') query = query.eq('category', category);
  if (type && type !== 'all') query = query.eq('job_type', type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let jobs = data || [];
  if (search) {
    const q = search.toLowerCase();
    jobs = jobs.filter(j =>
      j.title?.toLowerCase().includes(q) ||
      j.description?.toLowerCase().includes(q) ||
      j.skills?.some(s => s.toLowerCase().includes(q)) ||
      j.company?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ jobs });
}

export async function POST(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, category, job_type, budget, duration, skills, apply_url, company } = body;
  if (!title || !description) return NextResponse.json({ error: 'title and description required' }, { status: 400 });

  const { data, error } = await supabase
    .from('freelance_jobs')
    .insert({ poster_id: user.id, title, description, category: category || 'Worldwide', job_type: job_type || 'remote', budget, duration, skills: skills || [], apply_url, company })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { status: 201 });
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
    .from('freelance_jobs')
    .update(updates)
    .eq('id', id)
    .eq('poster_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data });
}
