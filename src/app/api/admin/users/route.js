import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

// GET /api/admin/users — fetch all platform users (service role bypasses RLS)
// Middleware already enforces is_admin check before this handler runs.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const limit  = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

  let query = supabaseAdmin
    .from('profiles')
    .select('id, username, email, avatar_url, status, is_verified, is_admin, is_premium, role, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('admin/users GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  return NextResponse.json({ users: data || [] });
}
