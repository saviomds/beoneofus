import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { project_id, text, attachment_type, attachment_url, attachment_name, attachment_size, reply_to_id, reply_preview } = body;
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('project_messages')
    .insert({
      project_id,
      user_id: user.id,
      text: text || '',
      attachment_type: attachment_type || null,
      attachment_url: attachment_url || null,
      attachment_name: attachment_name || null,
      attachment_size: attachment_size || null,
      reply_to_id: reply_to_id || null,
      reply_preview: reply_preview || null,
    })
    .select('id, project_id, user_id, text, attachment_url, attachment_type, attachment_name, attachment_size, reply_to_id, reply_preview, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
