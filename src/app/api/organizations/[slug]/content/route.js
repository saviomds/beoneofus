import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function authManager(req, supabase, slug) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return { error: 'Unauthorized', status: 401 };
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return { error: 'Unauthorized', status: 401 };
  const { data: org } = await supabase
    .from('organizations').select('id, name, owner_id').eq('slug', slug).maybeSingle();
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

const TABLE = { post: 'org_posts', event: 'org_events', product: 'org_products' };

function buildRow(kind, org, userId, body) {
  if (kind === 'post') {
    const content = String(body.content || '').trim();
    if (!content) return { error: 'Write something to post.' };
    return { row: { organization_id: org.id, author_id: userId, content: content.slice(0, 4000), image_url: body.image_url || null } };
  }
  if (kind === 'event') {
    const title = String(body.title || '').trim();
    if (!title) return { error: 'Event needs a title.' };
    return { row: {
      organization_id: org.id,
      title: title.slice(0, 160),
      description: (body.description || '').slice(0, 2000) || null,
      location: (body.location || '').slice(0, 160) || null,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
    } };
  }
  if (kind === 'product') {
    const name = String(body.name || '').trim();
    if (!name) return { error: 'Product needs a name.' };
    return { row: {
      organization_id: org.id,
      name: name.slice(0, 160),
      description: (body.description || '').slice(0, 2000) || null,
      price: (body.price || '').slice(0, 60) || null,
      url: (body.url || '').slice(0, 300) || null,
      image_url: body.image_url || null,
    } };
  }
  return { error: 'Unknown content type.' };
}

// POST /api/organizations/[slug]/content — create an update / event / product.
export async function POST(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org, user } = gate;

  const body = await req.json().catch(() => ({}));
  const kind = body.kind;
  if (!TABLE[kind]) return NextResponse.json({ error: 'Unknown content type.' }, { status: 400 });

  const built = buildRow(kind, org, user.id, body);
  if (built.error) return NextResponse.json({ error: built.error }, { status: 400 });

  const { data, error } = await supabase.from(TABLE[kind]).insert(built.row).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // A new update reaches followers via their notification bell.
  if (kind === 'post') {
    const { data: followers } = await supabase
      .from('org_followers').select('user_id').eq('organization_id', org.id);
    const recipients = (followers || []).map((f) => f.user_id).filter((id) => id !== user.id);
    if (recipients.length) {
      await supabase.from('notifications').insert(
        recipients.map((rid) => ({
          receiver_id: rid,
          actor_id: user.id,
          type: 'org_update',
          content: `${org.name} posted an update: "${built.row.content.slice(0, 80)}${built.row.content.length > 80 ? '…' : ''}"`,
          unread: true,
        }))
      ).then(() => {}, () => {}); // best-effort
    }
  }

  return NextResponse.json({ item: data });
}

// DELETE /api/organizations/[slug]/content — remove an item { kind, id }.
export async function DELETE(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;

  const body = await req.json().catch(() => ({}));
  const { kind, id } = body;
  if (!TABLE[kind] || !id) return NextResponse.json({ error: 'kind and id are required.' }, { status: 400 });

  const { error } = await supabase
    .from(TABLE[kind]).delete().eq('id', id).eq('organization_id', org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
