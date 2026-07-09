import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAdminsOfVerification } from '../../../../lib/notifyAdmins';

// Institution console API — powers the dedicated government / education /
// healthcare / NGO / community dashboards. Same manager-gating as the business
// console; the data model is org_programs + program_participants.

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
      .from('organization_members').select('role')
      .eq('organization_id', org.id).eq('user_id', user.id).maybeSingle();
    if (m && ['owner', 'admin', 'recruiter', 'program_manager'].includes(m.role)) role = m.role;
  }
  if (!role) return { error: 'Forbidden', status: 403 };
  return { user, org, role };
}

const PROGRAM_KINDS = ['program', 'cohort', 'course', 'campaign', 'event', 'space', 'service', 'scheme', 'scholarship', 'drive', 'clinic'];
const PROGRAM_STATUS = ['draft', 'active', 'completed', 'archived'];
const PARTICIPANT_STATUS = ['enrolled', 'active', 'completed', 'placed', 'graduated', 'dropped'];
const PARTICIPANT_ROLES = ['participant', 'beneficiary', 'volunteer', 'graduate', 'member', 'attendee', 'provider'];

const DONE = new Set(['completed', 'placed', 'graduated']);

function buildKpis(programs, participants) {
  const active = programs.filter((p) => p.status === 'active');
  const now = Date.now();
  const total = participants.length;
  const completed = participants.filter((p) => DONE.has((p.status || '').toLowerCase())).length;
  const placed = participants.filter((p) => (p.status || '').toLowerCase() === 'placed').length;
  const graduated = participants.filter((p) => ['graduated', 'completed', 'placed'].includes((p.status || '').toLowerCase())).length;
  const volunteers = participants.filter((p) => (p.role || '').toLowerCase() === 'volunteer').length;
  const members = participants.filter((p) => (p.role || '').toLowerCase() === 'member').length;
  const beneficiaries = participants.filter((p) => ['beneficiary', 'participant'].includes((p.role || '').toLowerCase())).length;
  const newParticipants = participants.filter((p) => p.joined_at && now - new Date(p.joined_at).getTime() < 7 * 864e5).length;
  const regions = new Set(programs.map((p) => (p.location || '').trim().toLowerCase()).filter(Boolean)).size;
  const upcomingEvents = programs.filter((p) => p.kind === 'event' && p.starts_at && new Date(p.starts_at).getTime() > now).length;

  const byKind = {};
  for (const p of programs) byKind[p.kind] = (byKind[p.kind] || 0) + 1;
  const byStatus = {};
  for (const p of participants) { const s = (p.status || 'enrolled').toLowerCase(); byStatus[s] = (byStatus[s] || 0) + 1; }

  return {
    activePrograms: active.length,
    totalPrograms: programs.length,
    participants: total,
    newParticipants,
    completed,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    graduated,
    placed,
    placementRate: total ? Math.round((placed / total) * 100) : 0,
    beneficiaries,
    volunteers,
    members,
    regions,
    upcomingEvents,
    byKind,
    byStatus,
  };
}

// GET /api/console/[slug] — vertical dashboard data. Managers only.
export async function GET(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org, role } = gate;

  const { data: programs } = await supabase
    .from('org_programs')
    .select('id, kind, status, title, summary, location, capacity, starts_at, ends_at, tags, metrics, created_at')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false });
  const progList = programs || [];

  const { data: participants } = await supabase
    .from('program_participants')
    .select('id, program_id, user_id, external_name, role, status, joined_at, profiles!program_participants_user_id_fkey(username, full_name, avatar_url, headline)')
    .eq('organization_id', org.id)
    .order('joined_at', { ascending: false });
  const partList = participants || [];

  const { data: members } = await supabase
    .from('organization_members')
    .select('role, title, created_at, profiles!organization_members_user_id_fkey(username, full_name, avatar_url)')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: true });

  const titleById = Object.fromEntries(progList.map((p) => [p.id, p.title]));
  const directory = partList.map((p) => ({
    id: p.id,
    programId: p.program_id,
    programTitle: titleById[p.program_id] || 'Program',
    role: p.role,
    status: p.status,
    joinedAt: p.joined_at,
    name: p.profiles?.full_name || p.profiles?.username || p.external_name || 'Participant',
    username: p.profiles?.username || null,
    avatar: p.profiles?.avatar_url || null,
    headline: p.profiles?.headline || null,
    external: !p.user_id,
  }));

  const counts = Object.fromEntries(progList.map((p) => [p.id, 0]));
  for (const p of partList) if (p.program_id in counts) counts[p.program_id] += 1;
  const programsOut = progList.map((p) => ({ ...p, participantCount: counts[p.id] || 0 }));

  return NextResponse.json({
    org, role,
    vertical: org.type,
    kpis: buildKpis(progList, partList),
    programs: programsOut,
    directory,
    members: members || [],
  });
}

// POST /api/console/[slug] — create a program or add a participant.
export async function POST(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { user, org } = gate;
  const body = await req.json().catch(() => ({}));

  if (body.action === 'create_program') {
    const title = (body.title || '').trim();
    if (!title) return NextResponse.json({ error: 'A title is required.' }, { status: 400 });
    const kind = PROGRAM_KINDS.includes(body.kind) ? body.kind : 'program';
    const status = PROGRAM_STATUS.includes(body.status) ? body.status : 'active';
    const { data, error } = await supabase.from('org_programs').insert({
      organization_id: org.id,
      created_by: user.id,
      kind, status, title,
      summary: body.summary?.trim() || null,
      description: body.description?.trim() || null,
      location: body.location?.trim() || null,
      capacity: body.capacity ? Number(body.capacity) || null : null,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      tags: Array.isArray(body.tags) ? body.tags.filter(Boolean).slice(0, 10) : [],
    }).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ program: data }, { status: 201 });
  }

  if (body.action === 'add_participant') {
    const { programId } = body;
    if (!programId) return NextResponse.json({ error: 'A program is required.' }, { status: 400 });
    // program must belong to this org
    const { data: prog } = await supabase.from('org_programs').select('id, organization_id').eq('id', programId).maybeSingle();
    if (!prog || prog.organization_id !== org.id) return NextResponse.json({ error: 'Program not found.' }, { status: 404 });
    const role = PARTICIPANT_ROLES.includes(body.role) ? body.role : 'participant';
    const status = PARTICIPANT_STATUS.includes(body.status) ? body.status : 'enrolled';
    const name = (body.external_name || '').trim();
    if (!body.user_id && !name) return NextResponse.json({ error: 'Provide a member or a name.' }, { status: 400 });
    const { error } = await supabase.from('program_participants').insert({
      program_id: programId,
      organization_id: org.id,
      user_id: body.user_id || null,
      external_name: body.user_id ? null : name,
      role, status,
    });
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'That person is already on this program.' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}

// PATCH /api/console/[slug] — mutate programs / participants / org, verification.
export async function PATCH(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;
  const body = await req.json().catch(() => ({}));

  if (body.action === 'update_program') {
    const { programId } = body;
    const { data: prog } = await supabase.from('org_programs').select('id, organization_id').eq('id', programId).maybeSingle();
    if (!prog || prog.organization_id !== org.id) return NextResponse.json({ error: 'Program not found.' }, { status: 404 });
    const patch = {};
    for (const k of ['title', 'summary', 'description', 'location', 'starts_at', 'ends_at']) if (k in body) patch[k] = body[k] || null;
    if ('capacity' in body) patch.capacity = body.capacity ? Number(body.capacity) || null : null;
    if (PROGRAM_STATUS.includes(body.status)) patch.status = body.status;
    if (PROGRAM_KINDS.includes(body.kind)) patch.kind = body.kind;
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    const { error } = await supabase.from('org_programs').update(patch).eq('id', programId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'update_participant') {
    const { participantId } = body;
    if (!PARTICIPANT_STATUS.includes(body.status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    const { data: row } = await supabase.from('program_participants').select('id, organization_id').eq('id', participantId).maybeSingle();
    if (!row || row.organization_id !== org.id) return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
    const { error } = await supabase.from('program_participants').update({ status: body.status }).eq('id', participantId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'request_verification') {
    if (org.is_verified) return NextResponse.json({ error: 'Already verified.' }, { status: 400 });
    const { error } = await supabase.from('organizations').update({ verification_status: 'pending' }).eq('id', org.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Surface the request to admins immediately (bell notification → review queue).
    await notifyAdminsOfVerification(supabase, org, gate.user.id);
    return NextResponse.json({ ok: true });
  }

  // Edit a safe subset of public org fields (Public Page tab).
  const EDITABLE = ['name', 'tagline', 'description', 'website', 'location', 'country', 'sector', 'size', 'contact_email', 'focus_areas', 'logo_url', 'banner_url', 'founded_year'];
  const patch = {};
  for (const k of EDITABLE) if (k in body) patch[k] = body[k];
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const { data, error } = await supabase.from('organizations').update(patch).eq('id', org.id).select('id, slug').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organization: data });
}

// DELETE /api/console/[slug]?programId= | ?participantId=
export async function DELETE(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;
  const { searchParams } = new URL(req.url);
  const programId = searchParams.get('programId');
  const participantId = searchParams.get('participantId');

  if (programId) {
    const { data: prog } = await supabase.from('org_programs').select('id, organization_id').eq('id', programId).maybeSingle();
    if (!prog || prog.organization_id !== org.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    const { error } = await supabase.from('org_programs').delete().eq('id', programId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (participantId) {
    const { data: row } = await supabase.from('program_participants').select('id, organization_id').eq('id', participantId).maybeSingle();
    if (!row || row.organization_id !== org.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    const { error } = await supabase.from('program_participants').delete().eq('id', participantId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Nothing to delete.' }, { status: 400 });
}
