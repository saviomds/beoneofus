import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireRole } from '../../../../lib/rbac';

// Admin moderation for company profiles and job posts.
// Middleware does NOT gate /api/admin/* — auth is enforced here.

// GET /api/admin/hiring?status=pending|approved|all  → { companies, jobs }
export async function GET(request) {
  const { error: authError, status: authStatus } = await requireRole(request, 'admin');
  if (authError) return NextResponse.json({ error: authError }, { status: authStatus });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';

  let companyQ = supabaseAdmin
    .from('companies')
    .select('id, name, slug, description, industry, location, website, logo_url, hiring, tech_stack, approved, created_at, owner_id, profiles!companies_owner_id_fkey(username, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(200);

  let jobQ = supabaseAdmin
    .from('jobs')
    .select('id, title, company, location, type, status, tags, description, approved, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(200);

  if (status === 'pending')  { companyQ = companyQ.eq('approved', false); jobQ = jobQ.eq('approved', false); }
  if (status === 'approved') { companyQ = companyQ.eq('approved', true);  jobQ = jobQ.eq('approved', true); }

  const [{ data: companies, error: cErr }, { data: jobs, error: jErr }] = await Promise.all([companyQ, jobQ]);
  if (cErr || jErr) {
    console.error('admin/hiring GET:', cErr || jErr);
    return NextResponse.json({ error: 'Failed to load hiring queue' }, { status: 500 });
  }

  return NextResponse.json({ companies: companies || [], jobs: jobs || [] });
}

// PATCH /api/admin/hiring  body: { kind: 'company'|'job', id, approved: boolean }
export async function PATCH(request) {
  const { error: authError, status: authStatus } = await requireRole(request, 'admin');
  if (authError) return NextResponse.json({ error: authError }, { status: authStatus });

  const { kind, id, approved } = await request.json();
  if (!id || (kind !== 'company' && kind !== 'job') || typeof approved !== 'boolean') {
    return NextResponse.json({ error: 'kind, id and approved are required' }, { status: 400 });
  }

  const table = kind === 'company' ? 'companies' : 'jobs';
  const { error } = await supabaseAdmin.from(table).update({ approved }).eq('id', id);
  if (error) {
    console.error('admin/hiring PATCH:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/hiring?kind=company|job&id=x  → reject / remove
export async function DELETE(request) {
  const { error: authError, status: authStatus } = await requireRole(request, 'admin');
  if (authError) return NextResponse.json({ error: authError }, { status: authStatus });

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind');
  const id   = searchParams.get('id');
  if (!id || (kind !== 'company' && kind !== 'job')) {
    return NextResponse.json({ error: 'kind and id are required' }, { status: 400 });
  }

  const table = kind === 'company' ? 'companies' : 'jobs';
  const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
  if (error) {
    console.error('admin/hiring DELETE:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
