import { NextResponse } from 'next/server';
// @ts-ignore
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // Safely check env vars so missing keys return JSON instead of a crashing HTML page
    if (!process.env.RESEND_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration missing API keys.' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { applicationId, applicantId, status, role, customMessage, dashboardLink } = body;

    if (!applicantId) {
      return NextResponse.json({ error: 'Missing applicantId' }, { status: 400 });
    }

    // Securely update the founder application status in the database (Bypasses RLS)
    if (applicationId) {
      const { error: updateError } = await supabase
        .from('founder_applications')
        .update({ status: status })
        .eq('id', applicationId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
      }
    }

    // Fetch the actual applicant's email from Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(applicantId);

    if (userError || !user?.email) {
      console.error('Failed to fetch applicant from Supabase:', userError);
      return NextResponse.json({ error: 'Applicant email not found' }, { status: 404 });
    }

    const applicantEmail = user.email;

    // Use your site URL (from env) or default to localhost for development
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://beoneofus.vercel.app';
    const fullDashboardLink = dashboardLink ? `${siteUrl}${dashboardLink}` : null;

    // Build a beautiful HTML email template
    let htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">Application Update</h2>
        <p>Hello,</p>
        <p>Your application to join as a <strong style="text-transform: uppercase;">${role}</strong> was <strong>${status}</strong>.</p>
    `;

    if (status === 'accepted') {
      htmlContent += `<p>🎉 Welcome aboard! We are thrilled to have you join the team.</p>`;
      if (fullDashboardLink) {
        htmlContent += `<p style="margin: 30px 0;">
          <a href="${fullDashboardLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Go to your Dashboard
          </a>
        </p>`;
      }
    }

    if (customMessage) {
      htmlContent += `
        <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; border-radius: 4px;">
          <p style="margin-top: 0; font-weight: bold; font-size: 14px;">Note from the team:</p>
          <p style="margin-bottom: 0;">${customMessage.replace(/\n/g, '<br/>')}</p>
        </div>
      `;
    }

    htmlContent += `
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Best regards,<br/>The BeOneOfUs Team</p>
      </div>
    `;

    // Send the email
    const { data, error } = await resend.emails.send({
      from: 'BeOneOfUs <onboarding@resend.dev>', // Replace with your verified sender domain when ready
      to: [applicantEmail],
      subject: `Update on your Founder Application for ${role}`,
      html: htmlContent,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
