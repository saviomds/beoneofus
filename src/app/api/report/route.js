import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

let _admin;
function getSupabaseAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }
  return _admin;
}

export async function POST(request) {
  try {
    const { content_type, content_id, reason, details } = await request.json();

    if (!content_type || !content_id || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const VALID_REASONS = ['spam', 'harassment', 'misinformation', 'inappropriate', 'violence', 'other'];
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    // Get the session from Authorization header or cookie
    const authHeader = request.headers.get('authorization');
    let reporterId = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user } } = await getSupabaseAdmin().auth.getUser(token);
      reporterId = user?.id ?? null;
    }

    if (!reporterId) {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('sb-access-token')?.value
        ?? cookieStore.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`)?.value;
      if (accessToken) {
        try {
          const parsed = JSON.parse(accessToken);
          const token = Array.isArray(parsed) ? parsed[0] : parsed;
          const { data: { user } } = await getSupabaseAdmin().auth.getUser(token);
          reporterId = user?.id ?? null;
        } catch (_) {}
      }
    }

    if (!reporterId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prevent duplicate reports from the same user on the same content
    const { data: existing } = await getSupabaseAdmin()
      .from('reports')
      .select('id')
      .eq('reporter_id', reporterId)
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: 'Already reported' }, { status: 200 });
    }

    const { error } = await getSupabaseAdmin().from('reports').insert({
      reporter_id: reporterId,
      content_type,
      content_id,
      reason,
      details: details || null,
      status: 'pending',
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[report]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
