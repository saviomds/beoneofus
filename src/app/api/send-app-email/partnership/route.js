import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { escapeHtml } from '../../../../lib/escapeHtml';

export async function POST(request) {
  try {
    const { proposerId, status, companyName } = await request.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: userResponse, error } = await supabaseAdmin.auth.admin.getUserById(proposerId);
    if (error || !userResponse?.user) throw new Error('Proposer not found');

    const proposerEmail = userResponse.user.email;
    const candidateName = escapeHtml(
      userResponse.user.user_metadata?.full_name ||
      userResponse.user.user_metadata?.name ||
      'there'
    );
    const safeCompanyName = escapeHtml(companyName);

    const isAccepted = status === 'accepted';
    const statusLabel = isAccepted ? 'Accepted' : 'Declined';
    const statusColor = isAccepted ? '#059669' : '#dc2626';
    const statusBg = isAccepted ? '#ecfdf5' : '#fef2f2';

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BeOneOfUs <notifications@beoneofus.com>',
        to: proposerEmail,
        subject: `Partnership Update: "${safeCompanyName}" has been ${statusLabel}`,
        html: `
          <div style="font-family: sans-serif; color: #111827; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
            <div style="display: inline-block; padding: 6px 14px; background: ${statusBg}; color: ${statusColor}; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 24px;">
              ${statusLabel}
            </div>
            <h2 style="margin: 0 0 8px; font-size: 22px;">Partnership Proposal Update</h2>
            <p style="color: #4b5563; margin: 0 0 20px;">Hi ${candidateName},</p>
            <p style="color: #4b5563; margin: 0 0 20px;">
              Your partnership proposal for <strong style="color: #111827;">${safeCompanyName}</strong> has been
              <strong style="color: ${statusColor};">${statusLabel}</strong> by the BeOneOfUs team.
            </p>
            ${isAccepted ? `
            <p style="color: #4b5563; margin: 0 0 20px;">
              Our team will reach out to your contact email to discuss next steps. We're excited to work with you!
            </p>` : `
            <p style="color: #4b5563; margin: 0 0 20px;">
              We appreciate your interest. Feel free to submit a revised proposal or reach out for feedback.
            </p>`}
            <a href="https://beoneofus.com/dash/partnerships"
               style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;">
              View Partnership Status
            </a>
            <p style="margin-top: 40px; color: #9ca3af; font-size: 12px;">The BeOneOfUs Team</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errData = await emailResponse.json();
      throw new Error(errData.message || 'Failed to send email via Resend');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Partnership email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
