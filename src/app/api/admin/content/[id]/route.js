import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getCallerProfile(request) {
  const supabaseAdmin = getSupabaseAdmin();
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, role')
    .eq('id', userId)
    .single();
  return data;
}

// DELETE /api/admin/content/[id]
export async function DELETE(request, { params }) {
  const profile = await getCallerProfile(request);
  if (!profile?.is_admin && !['admin', 'founder'].includes(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
  const profile = await getCallerProfile(request);
  if (!profile?.is_admin && !['admin', 'founder'].includes(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const allowed = ['title', 'description', 'topic', 'level', 'tags', 'featured'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const { error } = await getSupabaseAdmin()
    .from('learn_content')
    .update(updates)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
