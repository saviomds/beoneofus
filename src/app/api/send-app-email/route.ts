export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { escapeHtml } from '../../../lib/escapeHtml';
// @ts-ignore — plain-JS auth helper
import { requireAuth } from '../../../lib/requireAuth';

export async function POST(req: Request) {
  try {
    // Safely check env vars so missing keys return JSON instead of a crashing HTML page
    if (!process.env.RESEND_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration missing API keys.' }, { status: 500 });
    }

    // ── AuthN: caller must present a valid access token ──────────────────────
    const { user: caller, error: authError, status: authStatus } = await requireAuth(req);
    if (authError || !caller) {
      return NextResponse.json({ error: authError }, { status: authStatus });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { applicationId, status, jobTitle, customMessage } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });
    }

    // ── AuthZ: the application must belong to a job owned by the caller (or the
    // caller must be a platform admin). The applicant is derived from the
    // application row — never trusted from the request body — so this route can
    // only ever email the real applicant of a job the caller controls. ───────
    const { data: appRow } = await supabase
      .from('job_applications')
      .select('id, job_id, user_id')
      .eq('id', applicationId)
      .maybeSingle();
    if (!appRow) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const [{ data: jobRow }, { data: callerProfile }] = await Promise.all([
      supabase.from('jobs').select('user_id').eq('id', appRow.job_id).maybeSingle(),
      supabase.from('profiles').select('is_admin').eq('id', caller.id).maybeSingle(),
    ]);
    const ownsJob = jobRow?.user_id && jobRow.user_id === caller.id;
    if (!ownsJob && !callerProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Run DB update and user lookup in parallel to cut latency
    const [updateResult, userResult] = await Promise.all([
      supabase.from('job_applications').update({ status }).eq('id', applicationId),
      supabase.auth.admin.getUserById(appRow.user_id),
    ]);

    if (updateResult.error) {
      console.error('Supabase update error:', updateResult.error);
    }

    const { data: { user }, error: userError } = userResult;
    if (userError || !user?.email) {
      console.error('Failed to fetch applicant from Supabase:', userError);
      return NextResponse.json({ error: 'Applicant email not found' }, { status: 404 });
    }

    const applicantEmail = user.email;

    // Use your site URL or default to localhost for development
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://beoneofus.vercel.app';
    
    // Build a beautiful HTML email template
    let htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">Application Update</h2>
        <p>Hello,</p>
        <p>Your job application for <strong>${escapeHtml(jobTitle)}</strong> was <strong>${escapeHtml(status)}</strong>.</p>
    `;

    if (status === 'accepted') {
      htmlContent += `<p>🎉 Congratulations! We would love to move forward with you.</p>`;
      htmlContent += `<p style="margin: 30px 0;">
        <a href="${siteUrl}/dash" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Go to your Dashboard
        </a>
      </p>`;
    }

    if (customMessage) {
      htmlContent += `
        <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; border-radius: 4px;">
          <p style="margin-top: 0; font-weight: bold; font-size: 14px;">Note from the team:</p>
          <p style="margin-bottom: 0;">${escapeHtml(customMessage).replace(/\n/g, '<br/>')}</p>
        </div>
      `;
    }

    htmlContent += `
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Best regards,<br/>The BeOneOfUs Team</p>
      </div>
    `;

    // Send the email
    const { data, error } = await resend.emails.send({
      from: `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: [applicantEmail],
      subject: `Update on your Job Application for ${jobTitle}`,
      html: htmlContent,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}