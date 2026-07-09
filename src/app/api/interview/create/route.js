import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNotificationEmail } from '../../../../lib/sendNotificationEmail';
import { requireAuth } from '../../../../lib/requireAuth';

export async function POST(req) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration missing.' }, { status: 500 });
    }

    // ── AuthN: the interviewer (host) is the authenticated caller. The body's
    // `adminId` is ignored — the host id is taken from the verified token so a
    // caller can never open an interview room "as" another admin. ────────────
    const { user: caller, error: authError, status: authStatus } = await requireAuth(req);
    if (authError || !caller) {
      return NextResponse.json({ error: authError }, { status: authStatus });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const body = await req.json();
    const { applicantId, jobId, applicationId, jobTitle, company, questions } = body;

    if (!applicantId || !jobTitle || !questions?.length) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // ── AuthZ: the caller must own the job being interviewed for, or be a
    // platform admin. This blocks arbitrary interview-room creation. ─────────
    const { data: callerProfile } = await supabase
      .from('profiles').select('is_admin').eq('id', caller.id).maybeSingle();
    let authorized = !!callerProfile?.is_admin;
    if (!authorized && jobId) {
      const { data: jobRow } = await supabase
        .from('jobs').select('user_id').eq('id', Number(jobId)).maybeSingle();
      authorized = jobRow?.user_id === caller.id;
    }
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminId = caller.id;

    // Create the room
    const { data: room, error } = await supabase
      .from('interview_rooms')
      .insert({
        job_id: jobId ? Number(jobId) : null,
        application_id: applicationId ? Number(applicationId) : null,
        applicant_id: applicantId,
        admin_id: adminId,
        job_title: jobTitle,
        company: company || null,
        questions,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    // In-app notification
    await supabase.from('notifications').insert({
      receiver_id: applicantId,
      actor_id: adminId,
      type: 'interview_invited',
      content: `You have been invited to an interview for "${jobTitle}"${company ? ` at ${company}` : ''}. Go to the Interview section to begin.`,
      unread: true,
    });

    // Fetch applicant email + username for the email
    const { data: { user } } = await supabase.auth.admin.getUserById(applicantId);
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', applicantId)
      .single();

    await sendNotificationEmail({
      type: 'interview_invited',
      email: user?.email,
      name: profile?.username || 'there',
      extra: {
        jobTitle,
        company: company || '',
        questionCount: questions.length,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      },
    });

    return NextResponse.json({ success: true, roomId: room.id });
  } catch (err) {
    console.error('Interview create error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
