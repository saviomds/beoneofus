import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { createClient } from '@supabase/supabase-js';
import { escapeHtml } from '../../../../lib/escapeHtml';

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
    const candidateName = escapeHtml(
      userResponse.user.user_metadata?.full_name ||
      userResponse.user.user_metadata?.name ||
      'there'
    );
    const safeJobTitle       = escapeHtml(jobTitle);
    const safeStatus         = escapeHtml(status === 'accepted' ? 'Accepted' : 'Declined');
    const safeCustomMessage  = escapeHtml(customMessage);

    const personalNoteHtml = safeCustomMessage
      ? `<div style="padding: 12px; border-left: 4px solid #2563eb; background: #f3f4f6; margin: 16px 0;">
           <p style="margin: 0; font-style: italic;"><strong>Note from the team:</strong> "${safeCustomMessage}"</p>
         </div>`
      : '';

    const emailResponse = await fetchWithTimeout('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
        to: applicantEmail,
        subject: `Update on your application for ${safeJobTitle}`,
        html: `
          <div style="font-family: sans-serif; color: #111827; max-width: 600px; margin: 0 auto;">
            <h2>Application Update</h2>
            <p>Hi ${candidateName},</p>
            <p>Your job application for <strong>${safeJobTitle}</strong> has been <strong>${safeStatus}</strong>.</p>
            
            ${personalNoteHtml}
  
            <p>Log in to BeOneOfUs to see more details.</p>
            <br/>
            <p style="color: #6b7280; font-size: 12px;">The BeOneOfUs Team</p>
          </div>
        `
      })
    });
    
    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Resend API Error:', errorData);
      throw new Error('Failed to send email via Resend');
    }
    

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
