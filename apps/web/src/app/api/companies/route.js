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
  const hiring = searchParams.get('hiring');
  const search = searchParams.get('q');
  const mine   = searchParams.get('mine') === 'true';

  // Resolve the caller (optional) so owners can see their own unapproved
  // companies while everyone else only sees approved ones.
  let callerId = null;
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    callerId = user?.id || null;
  }

  let query = supabase
    .from('companies')
    .select(`*, profiles!companies_owner_id_fkey(username, full_name, avatar_url)`)
    .order('verified', { ascending: false })
    .order('hiring', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(60);

  if (mine && callerId) {
    query = query.eq('owner_id', callerId);
  } else if (callerId) {
    // approved OR owned by the caller
    query = query.or(`approved.eq.true,owner_id.eq.${callerId}`);
  } else {
    query = query.eq('approved', true);
  }

  if (hiring === 'true') query = query.eq('hiring', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let companies = data || [];
  if (search) {
    const q = search.toLowerCase();
    companies = companies.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.industry?.toLowerCase().includes(q) ||
      c.tech_stack?.some(t => t.toLowerCase().includes(q)) ||
      c.location?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ companies });
}

export async function POST(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, description, industry, location, size, website, tech_stack, culture, remote_policy, hiring, founded_year } = body;
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

  const { data, error } = await supabase
    .from('companies')
    // `approved` is always false on create — an admin reviews it before it
    // becomes visible in the public directory.
    .insert({ owner_id: user.id, name, slug: `${slug}-${Date.now()}`, description, industry, location, size, website, tech_stack: tech_stack || [], culture, remote_policy: remote_policy || 'Hybrid', hiring: hiring || false, founded_year, approved: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ company: data }, { status: 201 });
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
    .from('companies')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ company: data });
}
