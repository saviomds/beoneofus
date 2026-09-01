import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAdminsOfVerification } from '../../../../lib/notifyAdmins';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function authManager(req, supabase, slug) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return { error: 'Unauthorized', status: 401 };
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return { error: 'Unauthorized', status: 401 };

  const { data: org } = await supabase
    .from('organizations')
    .select('*, profiles!organizations_owner_id_fkey(username, full_name, avatar_url)')
    .eq('slug', slug)
    .maybeSingle();
  if (!org) return { error: 'Organization not found', status: 404 };

  let role = null;
  if (org.owner_id === user.id) role = 'owner';
  else {
    const { data: m } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', org.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (m && ['owner', 'admin', 'recruiter', 'program_manager'].includes(m.role)) role = m.role;
  }
  // RBAC: only managers of this org may see the business console
  if (!role) return { error: 'Forbidden', status: 403 };

  return { user, org, role };
}

// GET /api/business/[slug] — console data (KPIs, pipeline, team). Managers only.
export async function GET(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org, role } = gate;

  // Postings = jobs owned by the org owner (jobs are per-user in the current schema).
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, status, views, created_at')
    .eq('user_id', org.owner_id)
    .order('created_at', { ascending: false });
  const jobList = jobs || [];
  const jobIds = jobList.map((j) => j.id);

  let applications = [];
  if (jobIds.length) {
    const { data: apps } = await supabase
      .from('job_applications')
      .select('id, job_id, user_id, status, created_at')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false });
    applications = apps || [];
  }

  // Pipeline stages (normalize whatever status strings exist onto canonical stages)
  const STAGES = ['new', 'shortlisted', 'interviewed', 'offer', 'hired'];
  const stageOf = (s) => {
    const v = (s || 'new').toLowerCase();
    if (v.includes('short')) return 'shortlisted';
    if (v.includes('interview')) return 'interviewed';
    if (v.includes('offer')) return 'offer';
    if (v.includes('hire') || v.includes('accepted')) return 'hired';
    if (v.includes('reject') || v.includes('declin')) return 'rejected';
    return 'new';
  };
  const pipeline = Object.fromEntries(STAGES.map((s) => [s, 0]));
  let rejected = 0;
  for (const a of applications) {
    const st = stageOf(a.status);
    if (st === 'rejected') rejected += 1;
    else pipeline[st] = (pipeline[st] || 0) + 1;
  }

  const now = Date.now();
  const newApplicants = applications.filter(
    (a) => a.created_at && now - new Date(a.created_at).getTime() < 7 * 864e5
  ).length;

  const { data: members } = await supabase
    .from('organization_members')
    .select('role, title, created_at, profiles!organization_members_user_id_fkey(username, full_name, avatar_url)')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: true });

  const kpis = {
    activePostings: jobList.filter((j) => (j.status || 'active') !== 'closed').length,
    totalPostings: jobList.length,
    applicants: applications.length,
    newApplicants,
    totalViews: jobList.reduce((s, j) => s + (j.views || 0), 0),
    teamSize: (members || []).length,
    pipeline,
    rejected,
  };

  // Per-candidate pipeline: attach applicant profile + posting title to each app.
  const applicantIds = [...new Set(applications.map((a) => a.user_id).filter(Boolean))];
  let profilesById = {};
  if (applicantIds.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, headline')
      .in('id', applicantIds);
    profilesById = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  }
  const jobTitleById = Object.fromEntries(jobList.map((j) => [j.id, j.title]));
  const applicants = applications.map((a) => ({
    id: a.id,
    jobId: a.job_id,
    jobTitle: jobTitleById[a.job_id] || 'Posting',
    status: a.status,
    stage: stageOf(a.status),
    createdAt: a.created_at,
    applicant: profilesById[a.user_id] || null,
  }));

  return NextResponse.json({
    org,
    role,
    kpis,
    postings: jobList.slice(0, 20),
    members: members || [],
    applicants,
  });
}

// PATCH /api/business/[slug] — manager actions: request verification, edit basics.
export async function PATCH(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;

  const body = await req.json().catch(() => ({}));

  // Move a candidate between pipeline stages (updates the application status).
  if (body.action === 'move_applicant') {
    const { applicationId, status } = body;
    const STAGES = ['new', 'shortlisted', 'interviewed', 'offer', 'hired', 'rejected'];
    if (!applicationId || !STAGES.includes(status)) {
      return NextResponse.json({ error: 'applicationId and a valid status are required.' }, { status: 400 });
    }
    // The application must belong to a job owned by THIS organization.
    const { data: appRow } = await supabase
      .from('job_applications').select('id, job_id').eq('id', applicationId).maybeSingle();
    if (!appRow) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    const { data: jobRow } = await supabase
      .from('jobs').select('id, user_id').eq('id', appRow.job_id).maybeSingle();
    if (!jobRow || jobRow.user_id !== org.owner_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { error } = await supabase.from('job_applications').update({ status }).eq('id', applicationId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const patch = {};

  if (body.action === 'request_verification') {
    if (org.is_verified) return NextResponse.json({ error: 'Already verified.' }, { status: 400 });
    patch.verification_status = 'pending';
    // Surface the request to admins immediately (bell notification → review queue).
    await notifyAdminsOfVerification(supabase, org, gate.user.id);
  }
  // Allow editing a safe subset of public fields
  const EDITABLE = ['name', 'tagline', 'description', 'website', 'location', 'country', 'sector', 'size', 'contact_email', 'remote_policy', 'hiring', 'logo_url', 'banner_url', 'founded_year'];
  for (const k of EDITABLE) if (k in body) patch[k] = body[k];

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('organizations')
    .update(patch)
    .eq('id', org.id)
    .select('id, slug, verification_status, is_verified')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organization: data });
}
