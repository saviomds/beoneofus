import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Applicant-facing write path for the Study/Work Abroad portal. The portal's
// service layer (src/app/_study-work/services/db.ts) keeps localStorage as
// the fast, synchronous source of truth so none of the already-built UI needs
// to become async — after every local write it also fires a best-effort call
// here so the same data lands in real Supabase storage, where the admin
// dashboard (see /api/study-work/admin) can see it.
//
// This uses the service role key because a portal visitor without a real
// beoneofus account has no Supabase session/JWT at all (that's the point of
// the "keep using your account if you have one, otherwise a quick local
// identity" design) — there's nothing for RLS to check for them. When a
// bearer token IS supplied (a real signed-in beoneofus user), we verify it
// and refuse to let the batch write rows claiming a different user_id, so a
// real account can never be spoofed through this endpoint.

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const TABLES = {
  users: {
    table: 'study_work_applicant_profiles',
    onConflict: 'user_id',
    map: (r) => ({
      user_id: r.id,
      email: r.email,
      first_name: r.firstName,
      middle_name: r.middleName,
      last_name: r.lastName,
      phone: r.phone,
      nationality: r.nationality,
      country_of_residence: r.countryOfResidence,
      date_of_birth: r.dateOfBirth,
      created_at: r.createdAt,
    }),
    userIdField: 'user_id',
  },
  applications: {
    table: 'study_work_applications',
    onConflict: 'id',
    map: (r) => ({
      id: r.id,
      application_number: r.applicationNumber,
      user_id: r.userId,
      type: r.type,
      destination: r.destination,
      status: r.status,
      progress: r.progress,
      created_at: r.createdAt,
      submitted_at: r.submittedAt,
      confirmed_at: r.confirmedAt,
      personal: r.personal,
      study: r.study,
      work: r.work,
      travel: r.travel,
      draft_step: r.draftStep,
      updated_at: new Date().toISOString(),
    }),
    userIdField: 'user_id',
  },
  requirements: {
    table: 'study_work_requirements',
    onConflict: 'id',
    ownedByApplication: true,
    map: (r) => ({
      id: r.id,
      application_id: r.applicationId,
      name: r.name,
      description: r.description,
      required: r.required,
      status: r.status,
      deadline: r.deadline,
      instructions: r.instructions,
    }),
  },
  documents: {
    table: 'study_work_documents',
    onConflict: 'id',
    ownedByApplication: true,
    map: (r) => ({
      id: r.id,
      application_id: r.applicationId,
      requirement_id: r.requirementId,
      name: r.name,
      description: r.description,
      required: r.required,
      status: r.status,
      file_name: r.fileName,
      uploaded_at: r.uploadedAt,
      reviewer_comment: r.reviewerComment,
      accepted_formats: r.acceptedFormats,
      max_size_mb: r.maxSizeMb,
    }),
  },
  // Final documents are intentionally NOT syncable from here — the client
  // never legitimately writes them (only /api/study-work/admin does, gated
  // to real admins). Accepting them here would let anyone forge themselves
  // an admission letter.
  conversations: {
    table: 'study_work_conversations',
    onConflict: 'id',
    ownedByApplication: true,
    map: (r) => ({
      id: r.id,
      application_id: r.applicationId,
      advisor_name: r.advisorName,
      advisor_role: r.advisorRole,
      last_message_at: r.lastMessageAt,
      unread: r.unread,
    }),
  },
  messages: {
    table: 'study_work_messages',
    onConflict: 'id',
    ownedByConversation: true,
    map: (r) => ({
      id: r.id,
      conversation_id: r.conversationId,
      sender: r.sender,
      sender_name: r.senderName,
      body: r.body,
      attachments: r.attachments,
      created_at: r.createdAt,
    }),
  },
  notifications: {
    table: 'study_work_notifications',
    onConflict: 'id',
    ownedByApplication: true,
    map: (r) => ({
      id: r.id,
      application_id: r.applicationId,
      type: r.type,
      title: r.title,
      body: r.body,
      read: r.read,
      created_at: r.createdAt,
    }),
    // No userId on the local NotificationItem shape — resolved server-side
    // below from the application it belongs to.
    needsUserLookup: true,
  },
  timeline: {
    table: 'study_work_timeline',
    onConflict: 'id',
    ownedByApplication: true,
    map: (r) => ({
      id: r.id,
      application_id: r.applicationId,
      label: r.label,
      description: r.description,
      status: r.status,
      date: r.date,
    }),
  },
};

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { collection, rows } = body || {};
  const spec = TABLES[collection];
  if (!spec || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'collection (known name) and a non-empty rows array are required.' }, { status: 400 });
  }

  const supa = adminClient();

  // A real, signed-in beoneofus user can only ever sync their own rows. A
  // mock (non-beoneofus) applicant carries no token at all — nothing to
  // verify — same trust level as the editable-in-devtools localStorage this
  // replaces.
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  let verifiedUserId = null;
  if (token) {
    const { data: { user }, error } = await supa.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    verifiedUserId = user.id;
    if (spec.userIdField) {
      const claimedIds = new Set(rows.map((r) => (spec.userIdField === 'user_id' ? r.userId ?? r.id : r.userId)));
      if ([...claimedIds].some((id) => id !== verifiedUserId)) {
        return NextResponse.json({ error: 'Cannot sync rows for another user.' }, { status: 403 });
      }
    }
  }

  try {
    const mapped = rows.map(spec.map);

    if (spec.ownedByApplication || spec.ownedByConversation) {
      let appIds;
      if (spec.ownedByConversation) {
        const convIds = [...new Set(mapped.map((r) => r.conversation_id).filter(Boolean))];
        const { data: convs } = await supa
          .from('study_work_conversations').select('id, application_id')
          .in('id', convIds.length ? convIds : ['__none__']);
        const appIdByConv = new Map((convs ?? []).map((c) => [c.id, c.application_id]));
        for (const row of mapped) row.__appId = appIdByConv.get(row.conversation_id) ?? null;
        appIds = [...new Set(mapped.map((r) => r.__appId).filter(Boolean))];
      } else {
        appIds = [...new Set(mapped.map((r) => r.application_id).filter(Boolean))];
      }

      const { data: apps } = await supa
        .from('study_work_applications').select('id, user_id')
        .in('id', appIds.length ? appIds : ['__none__']);
      const ownerByApp = new Map((apps ?? []).map((a) => [a.id, a.user_id]));

      if (spec.needsUserLookup) {
        for (const row of mapped) row.user_id = ownerByApp.get(row.application_id) ?? null;
      }

      // Real accounts only: a mock applicant's own application isn't owned
      // by any real auth.uid(), so this check is naturally skipped for them
      // (verifiedUserId is null) — they're never blocked from syncing their
      // own local data, but they also can't be checked, which is why mock
      // identities never get RLS-level trust either.
      if (verifiedUserId) {
        const appIdOf = (row) => (spec.ownedByConversation ? row.__appId : row.application_id);
        const foreign = mapped.some((row) => ownerByApp.get(appIdOf(row)) !== verifiedUserId);
        if (foreign) return NextResponse.json({ error: 'Cannot sync rows for an application you do not own.' }, { status: 403 });
      }

      for (const row of mapped) delete row.__appId;
    }

    const { error } = await supa.from(spec.table).upsert(mapped, { onConflict: spec.onConflict });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: mapped.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
