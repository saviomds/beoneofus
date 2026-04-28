import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { applicantId, status, jobTitle, customMessage } = await request.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: userResponse, error } = await supabaseAdmin.auth.admin.getUserById(applicantId);
    
    if (error || !userResponse?.user) {
      throw new Error('Applicant not found');
    }
    
    const applicantEmail = userResponse.user.email;
    // Extract name from user_metadata (or default to "there")
    const candidateName = userResponse.user.user_metadata?.full_name || userResponse.user.user_metadata?.name || 'there';
    const formattedStatus = status === 'accepted' ? 'Accepted' : 'Declined';
    
    // Check if the admin wrote a custom message
    const personalNoteHtml = customMessage 
      ? `<div style="padding: 12px; border-left: 4px solid #2563eb; background: #f3f4f6; margin: 16px 0;">
           <p style="margin: 0; font-style: italic;"><strong>Note from the team:</strong> "${customMessage}"</p>
         </div>` 
      : '';

    // --- SEND YOUR EMAIL HERE ---
    console.log(`Sending email to ${applicantEmail}: Application for ${jobTitle} was ${formattedStatus}. Message: ${customMessage}`);
    
    // Example using Resend:
    
    await resend.emails.send({
      from: 'BeOneOfUs notifications@beoneofus.com',
      to: applicantEmail,
      subject: `Update on your application for ${jobTitle}`,
      html: `
        <div style="font-family: sans-serif; color: #111827; max-width: 600px; margin: 0 auto;">
          <h2>Application Update</h2>
          <p>Hi ${candidateName},</p>
          <p>Your job application for <strong>${jobTitle}</strong> has been <strong>${formattedStatus}</strong>.</p>
          
          ${personalNoteHtml}

          <p>Log in to BeOneOfUs to see more details.</p>
          <br/>
          <p style="color: #6b7280; font-size: 12px;">The BeOneOfUs Team</p>
        </div>
      `
    });
    

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
