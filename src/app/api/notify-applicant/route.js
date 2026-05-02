import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client using the Service Role Key to bypass RLS
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    const { applicationId, applicantId, status, role, customMessage, dashboardLink } = body;

    // Look up the user's actual email address from Supabase Auth
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(applicantId);
    if (userError || !user?.email) {
      return NextResponse.json({ error: "Could not find user email" }, { status: 404 });
    }
    const userEmail = user.email;

    const emailSubject = `Update on your ${role === 'cofounder' ? 'Co-founder' : 'Member'} application`;
    const emailHtml = `
      <h2>Application Status: ${status.toUpperCase()}</h2>
      <p>Your application to join the network as a <strong>${role}</strong> has been updated.</p>
      ${customMessage ? `<blockquote><strong>Admin Note:</strong> "${customMessage}"</blockquote>` : ''}
      ${dashboardLink ? `<p>You can access your workspace here: <a href="https://beoneofus.vercel.app${dashboardLink}">Dashboard</a></p>` : ''}
    `;

    // Send the email
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Resend's testing email
      to: [userEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Email API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}