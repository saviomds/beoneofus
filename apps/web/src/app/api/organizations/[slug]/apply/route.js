import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// POST /api/organizations/[slug]/apply — a signed-in user applies to one of the
// org's open roles. Writes job_applications.user_id (the column the console
// pipeline reads), so applicants land in the org's Pipeline immediately.
export async function POST(req, { params }) {
  const { slug } = await params;
  const supabase = admin();

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Sign in to apply.' }, { status: 401 });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Sign in to apply.' }, { status: 401 });

  const { jobId } = await req.json().catch(() => ({}));
  if (!jobId) return NextResponse.json({ error: 'jobId is required.' }, { status: 400 });

  // The job must belong to this organization (jobs are owned by the org owner).
  const { data: org } = await supabase
    .from('organizations').select('id, name, owner_id').eq('slug', slug).maybeSingle();
  if (!org) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });

  const { data: job } = await supabase
    .from('jobs').select('id, title, user_id, status').eq('id', jobId).maybeSingle();
  if (!job || job.user_id !== org.owner_id) {
    return NextResponse.json({ error: 'That role is not open at this organization.' }, { status: 403 });
  }
  if ((job.status || 'active') === 'closed') {
    return NextResponse.json({ error: 'This role is closed.' }, { status: 400 });
  }
  if (job.user_id === user.id) {
    return NextResponse.json({ error: "You can't apply to your own posting." }, { status: 400 });
  }

  // Already applied?
  const { data: existing } = await supabase
    .from('job_applications').select('id')
    .eq('job_id', jobId).eq('user_id', user.id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, alreadyApplied: true });

  const { error: insErr } = await supabase
    .from('job_applications').insert({ job_id: jobId, user_id: user.id, status: 'new' });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // Let the owner know a new candidate came in.
  const { data: applicant } = await supabase
    .from('profiles').select('username').eq('id', user.id).maybeSingle();
  await supabase.from('notifications').insert({
    receiver_id: org.owner_id,
    actor_id: user.id,
    type: 'job_application',
    content: `@${applicant?.username || 'Someone'} applied to "${job.title}" at ${org.name}.`,
    unread: true,
  }).then(() => {}, () => {});

  return NextResponse.json({ ok: true });
}

// GET /api/organizations/[slug]/apply — which of this org's jobs the caller has
// already applied to (so the UI can show "Applied").
export async function GET(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ applied: [] });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ applied: [] });

  const { data: org } = await supabase
    .from('organizations').select('owner_id').eq('slug', slug).maybeSingle();
  if (!org) return NextResponse.json({ applied: [] });

  const { data: jobs } = await supabase.from('jobs').select('id').eq('user_id', org.owner_id);
  const jobIds = (jobs || []).map((j) => j.id);
  if (!jobIds.length) return NextResponse.json({ applied: [] });

  const { data: apps } = await supabase
    .from('job_applications').select('job_id')
    .eq('user_id', user.id).in('job_id', jobIds);
  return NextResponse.json({ applied: (apps || []).map((a) => a.job_id) });
}
