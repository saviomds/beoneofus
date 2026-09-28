import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAuth } from '../../../lib/requireAuth';

const VALID_REASONS = ['spam', 'harassment', 'misinformation', 'inappropriate', 'violence', 'other'];
const VALID_TYPES   = ['post', 'comment', 'user', 'service'];

// POST /api/report  body: { content_type, content_id, reason, details? }
export async function POST(request) {
  const { user, error: authError, status: authStatus } = await requireAuth(request);
  if (authError) return NextResponse.json({ error: authError }, { status: authStatus });
  const reporterId = user.id;

  try {
    const { content_type, content_id, reason, details } = await request.json();

    if (!content_type || !content_id || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(content_type)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    // Prevent duplicate reports from the same user on the same content
    const { data: existing } = await supabaseAdmin
      .from('reports')
      .select('id')
      .eq('reporter_id', reporterId)
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: 'Already reported' }, { status: 200 });
    }

    const { error } = await supabaseAdmin.from('reports').insert({
      reporter_id: reporterId,
      content_type,
      content_id,
      reason,
      details: typeof details === 'string' ? details.slice(0, 2000) : null,
      status: 'pending',
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[report]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
