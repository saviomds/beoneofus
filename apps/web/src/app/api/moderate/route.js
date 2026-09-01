import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { moderateText } from '../../../lib/moderate';

export const maxDuration = 20;

// POST /api/moderate — reusable AI moderation hook. Body: { text, kind }.
export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text, kind } = await req.json().catch(() => ({}));
  if (!text || !text.trim()) return NextResponse.json({ error: 'text is required' }, { status: 400 });

  const verdict = await moderateText(text, kind || 'content');
  return NextResponse.json(verdict);
}
