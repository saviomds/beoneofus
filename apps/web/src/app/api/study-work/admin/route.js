import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin-only management for the Study/Work Abroad portal — backs the
// "Study/Work Abroad" tab in AdminPanelTool.js. Gated the same way as the
// existing /api/admin/user-flags route: bearer token -> profiles.is_admin (or
// role in admin/founder) check, then the service role does the actual work so
// RLS never has to special-case admin access from the client.

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireAdmin(request) {
  const supa = adminClient();
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supa.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supa.from('profiles').select('is_admin, role').eq('id', user.id).single();
  return (data?.is_admin || ['admin', 'founder'].includes(data?.role)) ? { supa, user } : null;
}

// GET /api/study-work/admin — list every application with applicant + document summary.
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supa } = auth;

  const [{ data: applications, error: appErr }, { data: profiles }, { data: documents }] = await Promise.all([
    supa.from('study_work_applications').select('*').order('created_at', { ascending: false }),
    supa.from('study_work_applicant_profiles').select('*'),
    supa.from('study_work_documents').select('id, application_id, name, required, status'),
  ]);
  if (appErr) return NextResponse.json({ error: appErr.message }, { status: 500 });

  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const docsByApp = new Map();
  for (const d of documents ?? []) {
    if (!docsByApp.has(d.application_id)) docsByApp.set(d.application_id, []);
    docsByApp.get(d.application_id).push(d);
  }

  const rows = (applications ?? []).map((a) => {
    const docs = docsByApp.get(a.id) ?? [];
    const requiredDocs = docs.filter((d) => d.required);
    const missing = requiredDocs.filter((d) => d.status === 'MISSING').length;
    const needsCorrection = docs.filter((d) => d.status === 'NEEDS_CORRECTION' || d.status === 'REJECTED').length;
    const underReview = docs.filter((d) => d.status === 'UNDER_REVIEW').length;
    const flags = [];
    if (needsCorrection > 0) flags.push({ level: 'error', label: `${needsCorrection} document${needsCorrection > 1 ? 's' : ''} need correction` });
    if (a.status === 'ADDITIONAL_INFORMATION_REQUIRED') flags.push({ level: 'error', label: 'Additional information required' });
    if (missing > 0 && !['DRAFT', 'SUBMITTED'].includes(a.status)) flags.push({ level: 'warning', label: `${missing} required document${missing > 1 ? 's' : ''} missing` });
    if (underReview > 0) flags.push({ level: 'info', label: `${underReview} document${underReview > 1 ? 's' : ''} under review` });

    const profile = profileByUser.get(a.user_id);
    return {
      id: a.id,
      applicationNumber: a.application_number,
      type: a.type,
      destination: a.destination,
      status: a.status,
      progress: a.progress,
      createdAt: a.created_at,
      submittedAt: a.submitted_at,
      confirmedAt: a.confirmed_at,
      applicantName: profile ? `${profile.first_name} ${profile.last_name}`.trim() : (a.personal?.legalFirstName ? `${a.personal.legalFirstName} ${a.personal.lastName}`.trim() : '—'),
      applicantEmail: profile?.email ?? a.personal?.email ?? '—',
      documentSummary: { total: docs.length, missing, needsCorrection, underReview },
      flags,
    };
  });

  return NextResponse.json({ applications: rows });
}

// POST /api/study-work/admin — { op: 'detail'|'updateStatus'|'updateRequirement'|'updateDocument'|'addFinalDocument'|'sendMessage', ... }
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supa, user } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const { op } = body || {};

  try {
    if (op === 'detail') {
      const { applicationId } = body;
      const [{ data: application, error }, { data: requirements }, { data: documents }, { data: timeline }, { data: conversation }] = await Promise.all([
        supa.from('study_work_applications').select('*').eq('id', applicationId).single(),
        supa.from('study_work_requirements').select('*').eq('application_id', applicationId),
        supa.from('study_work_documents').select('*').eq('application_id', applicationId),
        supa.from('study_work_timeline').select('*').eq('application_id', applicationId),
        supa.from('study_work_conversations').select('*').eq('application_id', applicationId).maybeSingle(),
      ]);
      if (error) return NextResponse.json({ error: error.message }, { status: 404 });
      const { data: profile } = await supa.from('study_work_applicant_profiles').select('*').eq('user_id', application.user_id).maybeSingle();
      let messages = [];
      if (conversation) {
        const { data } = await supa.from('study_work_messages').select('*').eq('conversation_id', conversation.id).order('created_at', { ascending: true });
        messages = data ?? [];
      }
      return NextResponse.json({ application, profile, requirements: requirements ?? [], documents: documents ?? [], timeline: timeline ?? [], conversation, messages });
    }

    if (op === 'updateStatus') {
      const { applicationId, status } = body;
      const patch = { status, updated_at: new Date().toISOString() };
      if (status === 'CONFIRMED') patch.confirmed_at = new Date().toISOString();
      const { data, error } = await supa.from('study_work_applications').update(patch).eq('id', applicationId).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ application: data });
    }

    if (op === 'updateRequirement') {
      const { requirementId, status } = body;
      const { data, error } = await supa.from('study_work_requirements').update({ status }).eq('id', requirementId).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ requirement: data });
    }

    if (op === 'updateDocument') {
      const { documentId, status, reviewerComment } = body;
      const patch = { status };
      if (reviewerComment !== undefined) patch.reviewer_comment = reviewerComment;
      const { data, error } = await supa.from('study_work_documents').update(patch).eq('id', documentId).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (data.requirement_id) {
        const reqStatus = status === 'APPROVED' ? 'APPROVED' : status === 'NEEDS_CORRECTION' || status === 'REJECTED' ? 'NEEDS_CORRECTION' : status === 'UNDER_REVIEW' ? 'UNDER_REVIEW' : undefined;
        if (reqStatus) await supa.from('study_work_requirements').update({ status: reqStatus }).eq('id', data.requirement_id);
      }
      return NextResponse.json({ document: data });
    }

    if (op === 'addFinalDocument') {
      const { applicationId, name, category, fileName } = body;
      const id = `fdoc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { data, error } = await supa.from('study_work_final_documents')
        .insert({ id, application_id: applicationId, name, category, file_name: fileName, issued_at: new Date().toISOString() })
        .select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ finalDocument: data });
    }

    if (op === 'sendMessage') {
      const { conversationId, body: messageBody } = body;
      const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = new Date().toISOString();
      const { data, error } = await supa.from('study_work_messages')
        .insert({ id, conversation_id: conversationId, sender: 'advisor', sender_name: user.email ?? 'Advisor', body: messageBody, attachments: [], created_at: createdAt })
        .select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supa.from('study_work_conversations').update({ last_message_at: createdAt }).eq('id', conversationId);
      return NextResponse.json({ message: data });
    }

    return NextResponse.json({ error: `Unknown op "${op}".` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
