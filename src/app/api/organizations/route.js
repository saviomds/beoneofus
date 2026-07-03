import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const ORG_TYPES = ['business', 'government', 'education', 'healthcare', 'ngo', 'community', 'other'];

// GET /api/organizations — public directory. Filters: ?type= &q= &hiring=true
export async function GET(req) {
  const supabase = makeSupabase();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const search = searchParams.get('q');
  const hiring = searchParams.get('hiring');

  let query = supabase
    .from('organizations')
    .select('id, type, name, slug, tagline, description, logo_url, banner_url, website, location, country, sector, focus_areas, hiring, is_verified, created_at, profiles!organizations_owner_id_fkey(username, full_name, avatar_url)')
    .order('is_verified', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(60);

  if (type && ORG_TYPES.includes(type)) query = query.eq('type', type);
  if (hiring === 'true') query = query.eq('hiring', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let organizations = data || [];
  if (search) {
    const q = search.toLowerCase();
    organizations = organizations.filter((o) =>
      o.name?.toLowerCase().includes(q) ||
      o.sector?.toLowerCase().includes(q) ||
      o.location?.toLowerCase().includes(q) ||
      o.focus_areas?.some((f) => f.toLowerCase().includes(q))
    );
  }

  return NextResponse.json({ organizations });
}

// POST /api/organizations — create an organization (owner = authenticated user)
export async function POST(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    name, type, tagline, description, website, location, country,
    size, founded_year, sector, focus_areas, remote_policy, hiring, contact_email,
  } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Organization name is required.' }, { status: 400 });
  }
  const orgType = ORG_TYPES.includes(type) ? type : 'business';

  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'org';
  const slug = `${base}-${Date.now().toString(36)}`;

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      owner_id: user.id,
      type: orgType,
      name: name.trim(),
      slug,
      tagline: tagline || null,
      description: description || null,
      website: website || null,
      location: location || null,
      country: country || null,
      size: size || null,
      founded_year: founded_year ? Number(founded_year) || null : null,
      sector: sector || null,
      focus_areas: Array.isArray(focus_areas) ? focus_areas.filter(Boolean).slice(0, 12) : [],
      remote_policy: remote_policy || null,
      hiring: !!hiring,
      contact_email: contact_email || null,
    })
    .select('id, slug, type, name')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organization: data }, { status: 201 });
}
