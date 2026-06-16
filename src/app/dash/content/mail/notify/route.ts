export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
// @ts-ignore - Ensure 'resend' is installed via npm install resend
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // Initialize Resend with your API key
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Initialize Supabase with the Service Role Key to securely access auth admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { applicationId, applicantId, status, role, customMessage, dashboardLink } = body;

    if (!applicantId) {
      return NextResponse.json({ error: 'Missing applicantId' }, { status: 400 });
    }

    // Fetch the actual applicant's email from Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(applicantId);

    if (userError || !user?.email) {
      console.error('Failed to fetch applicant from Supabase:', userError);
      return NextResponse.json({ error: 'Applicant email not found' }, { status: 404 });
    }

    const applicantEmail = user.email;

    let emailText = `Your application to join as a ${role} was ${status}.\n\n`;
    if (status === 'accepted') emailText += `Welcome aboard!\n\n`;
    if (customMessage) emailText += `Note from the team:\n"${customMessage}"\n\n`;
    if (dashboardLink) emailText += `Please log in to access your dashboard.\n\n`;

    // Send the email
    const { data, error } = await resend.emails.send({
      from: 'BeOneOfUs <onboarding@resend.dev>', // Replace with your verified sender domain when ready
      to: [applicantEmail],
      subject: `Update on your Founder Application for ${role}`,
      text: emailText,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}