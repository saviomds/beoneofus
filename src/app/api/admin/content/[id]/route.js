import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireRole } from '../../../../../lib/rbac';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// DELETE /api/admin/content/[id]
export async function DELETE(request, { params }) {
  // Authorize via verified Bearer token, not a spoofable x-user-id header.
  const { error: authError, status: authStatus } = await requireRole(request, 'admin');
  if (authError) return NextResponse.json({ error: authError }, { status: authStatus });

  const { id } = await params;
  const { error } = await getSupabaseAdmin()
    .from('learn_content')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH /api/admin/content/[id]  — admin edit
export async function PATCH(request, { params }) {
  const { error: authError, status: authStatus } = await requireRole(request, 'admin');
  if (authError) return NextResponse.json({ error: authError }, { status: authStatus });

  const { id } = await params;
  const body = await request.json();
  const allowed = ['title', 'description', 'topic', 'level', 'tags', 'featured'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('learn_content')
    .update(updates)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
