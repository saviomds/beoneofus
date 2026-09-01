import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'chat-attachments';

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

  // Ensure bucket exists
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 52428800,
    allowedMimeTypes: null,
  });
  if (bucketErr && !bucketErr.message?.toLowerCase().includes('already exists')) {
    return NextResponse.json({ error: bucketErr.message }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const path = formData.get('path');

  if (!file || !path) return NextResponse.json({ error: 'file and path required' }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, cacheControl: '3600', upsert: false });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}
