export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextResponse } from 'next/server';
// @ts-ignore
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const resend = new (Resend as any)(process.env.RESEND_API_KEY || '');

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const body = await req.json();
    const { applicantId, status, role, customMessage, dashboardLink } = body;

    const { data, error: userError } = await supabaseAdmin.auth.admin.getUserById(applicantId);
    if (userError || !data.user) throw new Error('User not found');
    const applicantEmail = data.user.email;

    console.log(`[Applicant Notification] Sending email to applicant ${applicantId} regarding their ${role} application (Status: ${status})`);

    let emailBody = `Your application to join as a ${role} has been ${status}.\n\n`;
    if (customMessage) emailBody += `Note from admin: ${customMessage}\n\n`;
    if (dashboardLink) emailBody += `Access your new dashboard here: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://beoneofus.vercel.app/'}${dashboardLink}`;
    
    await resend.emails.send({
      from: 'BeOneOfUs <notifications@beoneofus.com>',
      to: [applicantEmail],
      subject: `Application Status: ${status.toUpperCase()}`,
      text: emailBody,
    });
    

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notify applicant API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}