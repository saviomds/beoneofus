import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireAdmin(req, supabase) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return { error: 'Unauthorized', status: 401 };
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return { error: 'Unauthorized', status: 401 };
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!prof?.is_admin) return { error: 'Forbidden', status: 403 };
  return { user };
}

// GET /api/admin/verification?status=pending — review queue
export async function GET(req) {
  const supabase = admin();
  const gate = await requireAdmin(req, supabase);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const status = new URL(req.url).searchParams.get('status') || 'pending';
  const { data, error } = await supabase
    .from('verification_requests')
    .select('id, registration_number, document_url, note, status, review_note, created_at, organizations(id, name, slug, type, is_verified), profiles!verification_requests_requester_id_fkey(username, full_name, avatar_url)')
    .eq('status', status)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Signed URLs for private documents so admins can view them
  const requests = await Promise.all((data || []).map(async (r) => {
    let signed = null;
    if (r.document_url) {
      const { data: s } = await supabase.storage.from('org-verification').createSignedUrl(r.document_url, 600);
      signed = s?.signedUrl || null;
    }
    return { ...r, document_signed_url: signed };
  }));

  return NextResponse.json({ requests });
}

// POST /api/admin/verification — { id, action: 'approve'|'reject', note }
export async function POST(req) {
  const supabase = admin();
  const gate = await requireAdmin(req, supabase);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id, action, note } = await req.json().catch(() => ({}));
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'id and a valid action are required' }, { status: 400 });
  }

  const { data: reqRow } = await supabase
    .from('verification_requests').select('id, organization_id, status').eq('id', id).maybeSingle();
  if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

  const nextStatus = action === 'approve' ? 'approved' : 'rejected';
  const { error: upErr } = await supabase
    .from('verification_requests')
    .update({ status: nextStatus, review_note: note || null, reviewer_id: gate.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Reflect the decision onto the organization's trust state
  if (reqRow.organization_id) {
    await supabase
      .from('organizations')
      .update(action === 'approve'
        ? { is_verified: true, verification_status: 'verified' }
        : { is_verified: false, verification_status: 'rejected' })
      .eq('id', reqRow.organization_id);
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
