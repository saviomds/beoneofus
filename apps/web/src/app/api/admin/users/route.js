import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireRole } from '../../../../lib/rbac';

// GET /api/admin/users — fetch all platform users (service role bypasses RLS)
// Auth is enforced here (middleware does NOT gate /api/admin/*).
export async function GET(request) {
  const { error: authError, status: authStatus } = await requireRole(request, 'admin');
  if (authError) return NextResponse.json({ error: authError }, { status: authStatus });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const limit  = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

  let query = supabaseAdmin
    .from('profiles')
    .select('id, username, email, avatar_url, status, is_verified, is_admin, is_premium, role, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    // Strip PostgREST filter metacharacters to prevent .or() filter injection.
    const safe = search.replace(/[,()*\\]/g, '').trim();
    if (safe) query = query.or(`username.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('admin/users GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  return NextResponse.json({ users: data || [] });
}
