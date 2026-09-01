import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Only a manager (owner / admin / recruiter / program_manager) of THIS org may edit it.
async function authManager(req, supabase, slug) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return { error: 'Unauthorized', status: 401 };
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return { error: 'Unauthorized', status: 401 };

  const { data: org } = await supabase
    .from('organizations').select('id, owner_id').eq('slug', slug).maybeSingle();
  if (!org) return { error: 'Organization not found', status: 404 };

  let ok = org.owner_id === user.id;
  if (!ok) {
    const { data: m } = await supabase
      .from('organization_members').select('role')
      .eq('organization_id', org.id).eq('user_id', user.id).maybeSingle();
    ok = m && ['owner', 'admin', 'recruiter', 'program_manager'].includes(m.role);
  }
  if (!ok) return { error: 'Forbidden', status: 403 };
  return { user, org };
}

// Fields an org manager may edit from the public company page. Works for every
// org type (business + institution verticals), so one editor covers them all.
const EDITABLE = [
  'name', 'tagline', 'description', 'website', 'location', 'country',
  'sector', 'size', 'contact_email', 'founded_year', 'hiring',
  'logo_url', 'banner_url', 'focus_areas',
];

// PATCH /api/organizations/[slug] — edit the organization (managers only).
export async function PATCH(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;

  const body = await req.json().catch(() => ({}));
  const patch = {};
  for (const k of EDITABLE) {
    if (!(k in body)) continue;
    if (k === 'focus_areas') {
      // Accept an array or a comma-separated string; store a clean array.
      const raw = body.focus_areas;
      const arr = Array.isArray(raw)
        ? raw
        : String(raw || '').split(',');
      patch.focus_areas = arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
    } else if (k === 'founded_year') {
      const y = parseInt(body.founded_year, 10);
      patch.founded_year = Number.isFinite(y) && y > 1800 && y <= new Date().getFullYear() ? y : null;
    } else if (k === 'name') {
      const name = String(body.name || '').trim();
      if (name) patch.name = name.slice(0, 120); // never allow blanking the name
    } else if (typeof body[k] === 'string') {
      patch[k] = body[k].slice(0, 4000);
    } else {
      patch[k] = body[k];
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('organizations')
    .update(patch)
    .eq('id', org.id)
    .select('*, profiles!organizations_owner_id_fkey(username, full_name, avatar_url)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organization: data });
}
