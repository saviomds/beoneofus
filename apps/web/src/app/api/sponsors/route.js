import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VALID_TIERS    = new Set(['bronze', 'silver', 'gold']);
const VALID_STATUSES = new Set(['pending', 'active', 'rejected']);

// Use service role so RLS does not block admin reads/writes.
// Public GET paths return only what is explicitly filtered below.
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Verify caller is authenticated and is an admin.
async function requireAdmin(req, sb) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return { error: 'Unauthorized', status: 401 };
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return { error: 'Unauthorized', status: 401 };
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: 'Forbidden — admin only', status: 403 };
  return { user };
}

// GET /api/sponsors                → active sponsors (public, no auth needed)
// GET /api/sponsors?all=true       → all sponsors   (admin)
// GET /api/sponsors?email=x        → own record     (self-serve — matched by email, not by auth token)
// GET /api/sponsors?sponsorId=x    → impression stats
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const all       = searchParams.get('all') === 'true';
  const email     = searchParams.get('email');
  const sponsorId = searchParams.get('sponsorId');
  const sb        = getSupabase();

  try {
    if (sponsorId) {
      const [{ data: sponsor, error }, { data: impressions }] = await Promise.all([
        sb.from('sponsors').select('*').eq('id', sponsorId).single(),
        sb.from('sponsor_impressions')
          .select('viewed_at, certificate_id')
          .eq('sponsor_id', sponsorId)
          .order('viewed_at', { ascending: false })
          .limit(500),
      ]);
      if (error) return NextResponse.json({ error: 'Sponsor not found' }, { status: 404 });
      return NextResponse.json({ sponsor, impressions: impressions || [] });
    }

    if (email) {
      // Expose only own record — client must pass the exact email they authenticated with.
      const { data } = await sb.from('sponsors').select('*').eq('contact_email', email).single();
      return NextResponse.json({ sponsor: data ?? null });
    }

    // Restrict ?all=true to admins only.
    if (all) {
      const adminCheck = await requireAdmin(req, sb);
      if (adminCheck.error) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { data, error } = await sb
      .from('sponsors')
      .select('*')
      .order('created_at', { ascending: false })
      .eq('status', all ? undefined : 'active')  // undefined skips the filter when all=true
      .then(q => all ? sb.from('sponsors').select('*').order('created_at', { ascending: false }) : q);

    // Re-do cleanly without the chained undefined trick:
    const query = all
      ? sb.from('sponsors').select('*').order('created_at', { ascending: false })
      : sb.from('sponsors').select('*').eq('status', 'active').order('created_at', { ascending: false });

    const { data: rows, error: qErr } = await query;
    if (qErr) throw qErr;
    return NextResponse.json({ sponsors: rows || [] });
  } catch (err) {
    console.error('[sponsors] GET error:', err.message);
    return NextResponse.json({ error: 'Failed to load sponsors' }, { status: 500 });
  }
}

// POST /api/sponsors — public application form, no auth required
export async function POST(req) {
  try {
    const body = await req.json();
    const { company_name, contact_email, website, description, tagline, tier = 'bronze' } = body;

    if (!company_name?.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }
    if (!contact_email?.trim() || !contact_email.includes('@')) {
      return NextResponse.json({ error: 'Valid contact email is required' }, { status: 400 });
    }

    // Clamp tier to allowed values; default to bronze rather than rejecting.
    const safeTier = VALID_TIERS.has(tier) ? tier : 'bronze';
    const sb = getSupabase();

    const { data, error } = await sb
      .from('sponsors')
      .insert({
        company_name:  company_name.trim().slice(0, 120),
        contact_email: contact_email.trim().toLowerCase().slice(0, 200),
        website:       website?.trim().slice(0, 500) || null,
        description:   description?.trim().slice(0, 2000) || null,
        tagline:       tagline?.trim().slice(0, 160) || null,
        tier:          safeTier,
        status:        'pending',
      })
      .select('id')
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id, success: true });
  } catch (err) {
    console.error('[sponsors] POST error:', err.message);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}

// PATCH /api/sponsors — admin only
export async function PATCH(req) {
  const sb = getSupabase();
  const adminCheck = await requireAdmin(req, sb);
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  try {
    const body = await req.json();
    const { id, status, tier, logo_url, tagline } = body;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    if (status !== undefined && !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}` }, { status: 400 });
    }
    if (tier !== undefined && !VALID_TIERS.has(tier)) {
      return NextResponse.json({ error: `Invalid tier. Must be one of: ${[...VALID_TIERS].join(', ')}` }, { status: 400 });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (status   !== undefined) updates.status   = status;
    if (tier     !== undefined) updates.tier     = tier;
    if (logo_url !== undefined) updates.logo_url = logo_url?.trim().slice(0, 500) || null;
    if (tagline  !== undefined) updates.tagline  = tagline?.trim().slice(0, 160) || null;
    // user_id reassignment intentionally excluded — prevents privilege escalation.

    const { error } = await sb.from('sponsors').update(updates).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[sponsors] PATCH error:', err.message);
    return NextResponse.json({ error: 'Failed to update sponsor' }, { status: 500 });
  }
}

// DELETE /api/sponsors?id=x — admin only
export async function DELETE(req) {
  const sb = getSupabase();
  const adminCheck = await requireAdmin(req, sb);
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await sb.from('sponsors').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[sponsors] DELETE error:', err.message);
    return NextResponse.json({ error: 'Failed to delete sponsor' }, { status: 500 });
  }
}
