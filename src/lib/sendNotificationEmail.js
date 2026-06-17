import { escapeHtml } from './escapeHtml.js';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://beoneofus.work';
const FROM     = `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;

function baseShell(body) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td align="center" style="padding-bottom:24px;">
        <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;">beone<span style="color:#2563eb;">of</span>us</span>
      </td></tr>
      <tr><td style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        ${body}
      </td></tr>
      <tr><td style="padding:24px 0 0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">You received this because your account is on beoneofus.work</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function header(accentColor, title, sub) {
  return `<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:36px 40px;text-align:center;">
    <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">${title}</h1>
    ${sub ? `<p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">${sub}</p>` : ''}
  </td></tr>
  <tr><td style="background:${accentColor};height:3px;font-size:0;">&nbsp;</td></tr>`;
}

function ctaButton(label, href, bg = '#2563eb') {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr><td align="center">
      <a href="${href}" style="display:inline-block;background:${bg};color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;">${label}</a>
    </td></tr>
  </table>`;
}

const templates = {
  /* ── Verification approved ─────────────────────────────────────── */
  verification_approved({ name }) {
    const n = escapeHtml(name);
    return {
      subject: 'Your account has been verified!',
      html: baseShell(
        header('linear-gradient(90deg,#10b981,#34d399)', 'You\'re Verified! ✓', 'Your identity has been confirmed')
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            Great news — your <strong style="color:#111827;">beoneofus</strong> account has been
            <strong style="color:#10b981;">verified</strong>! Your profile will now display a
            verified badge visible to the entire community.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:18px 24px;text-align:center;">
              <p style="margin:0;font-size:28px;">✓</p>
              <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:#15803d;">Verified Developer</p>
            </td></tr>
          </table>
          ${ctaButton('Visit Your Profile', SITE_URL + '/dash', '#10b981')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Verification rejected ─────────────────────────────────────── */
  verification_rejected({ name }) {
    const n = escapeHtml(name);
    return {
      subject: 'Verification request update',
      html: baseShell(
        header('linear-gradient(90deg,#f59e0b,#fbbf24)', 'Verification Update', 'Action required on your request')
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            Your verification request was reviewed and could not be approved at this time.
            This may be due to incomplete profile information or documentation issues.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:14px 18px;">
              <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                <strong>Next steps:</strong> Complete your profile (bio, GitHub link, work status) and re-submit your verification request from Settings.
              </p>
            </td></tr>
          </table>
          ${ctaButton('Update Profile & Re-apply', SITE_URL + '/dash', '#f59e0b')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Premium accepted ──────────────────────────────────────────── */
  premium_accepted({ name, plan, expiresAt, note }) {
    const n  = escapeHtml(name);
    const pl = escapeHtml(plan === 'annual' ? 'Annual' : 'Monthly');
    const ex = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '';
    const nt = note ? escapeHtml(note) : '';
    return {
      subject: 'Your Premium subscription is now active!',
      html: baseShell(
        header('linear-gradient(90deg,#f59e0b,#fbbf24)', 'Premium Activated! 🚀', 'Full access unlocked')
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            Your <strong style="color:#f59e0b;">Premium</strong> subscription has been approved and activated.
            You now have full access to all premium features.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding-bottom:10px;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Plan</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#0f172a;font-weight:700;">${pl}</p>
                </td></tr>
                ${ex ? `<tr><td style="border-top:1px solid #fde68a;padding-top:10px;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Active Until</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#0f172a;font-weight:700;">${ex}</p>
                </td></tr>` : ''}
                ${nt ? `<tr><td style="border-top:1px solid #fde68a;padding-top:10px;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Note from Admin</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#374151;">${nt}</p>
                </td></tr>` : ''}
              </table>
            </td></tr>
          </table>
          ${ctaButton('Explore Premium Features', SITE_URL + '/dash', '#f59e0b')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Premium declined ──────────────────────────────────────────── */
  premium_declined({ name, note }) {
    const n  = escapeHtml(name);
    const nt = note ? escapeHtml(note) : '';
    return {
      subject: 'Premium subscription update',
      html: baseShell(
        header('linear-gradient(90deg,#6b7280,#9ca3af)', 'Subscription Update', 'Regarding your premium request')
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            After review, your premium subscription request could not be approved at this time.
            ${nt ? `<br><br><strong>Reason:</strong> ${nt}` : ''}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:14px 18px;">
              <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">
                If you believe this is a mistake or would like to appeal, please contact our support team.
              </p>
            </td></tr>
          </table>
          ${ctaButton('Contact Support', SITE_URL + '/dash', '#3b82f6')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Connection accepted ───────────────────────────────────────── */
  connection_accepted({ name, acceptorName }) {
    const n  = escapeHtml(name);
    const ac = escapeHtml(acceptorName);
    return {
      subject: `@${ac} accepted your connection request`,
      html: baseShell(
        header('linear-gradient(90deg,#2563eb,#3b82f6)', 'New Connection! 🤝', 'Your request was accepted')
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            <strong>@${ac}</strong> accepted your connection request on beoneofus.
            You can now message each other and collaborate directly.
          </p>
          ${ctaButton('Open Messages', SITE_URL + '/dash', '#2563eb')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Partnership accepted ─────────────────────────────────────── */
  partnership_accepted({ name, companyName }) {
    const n = escapeHtml(name);
    const c = escapeHtml(companyName);
    return {
      subject: `Your partnership proposal has been accepted!`,
      html: baseShell(
        header('linear-gradient(90deg,#10b981,#34d399)', 'Partnership Accepted! 🤝', 'Welcome to the beoneofus partner network')
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            Great news — your partnership proposal for <strong>${c}</strong> has been
            <strong style="color:#10b981;">accepted</strong> by the beoneofus team!
            We'll reach out to your contact email to coordinate next steps.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;text-align:center;">
              <p style="margin:0;font-size:32px;">🤝</p>
              <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:#15803d;">Official Partner</p>
              <p style="margin:4px 0 0;font-size:12px;color:#166534;font-weight:600;">${c}</p>
            </td></tr>
          </table>
          ${ctaButton('View Your Dashboard', SITE_URL + '/dash', '#10b981')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Partnership declined ──────────────────────────────────────── */
  partnership_declined({ name, companyName }) {
    const n = escapeHtml(name);
    const c = escapeHtml(companyName);
    return {
      subject: `Update on your partnership proposal`,
      html: baseShell(
        header('linear-gradient(90deg,#6b7280,#9ca3af)', 'Partnership Update', `Regarding your proposal for ${c}`)
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            Thank you for submitting a partnership proposal for <strong>${c}</strong>.
            After careful review, we're unable to move forward with this proposal at this time.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:14px 18px;">
              <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">
                You're welcome to refine and resubmit your proposal in the future. If you have questions, reach out through the platform.
              </p>
            </td></tr>
          </table>
          ${ctaButton('Submit Another Proposal', SITE_URL + '/dash', '#3b82f6')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Interview invited ─────────────────────────────────────────── */
  interview_invited({ name, jobTitle, company, questionCount, siteUrl }) {
    const n  = escapeHtml(name);
    const jt = escapeHtml(jobTitle);
    const co = company ? escapeHtml(company) : null;
    const qc = Number(questionCount) || 0;
    const url = siteUrl || SITE_URL;
    return {
      subject: `Interview Invitation: ${jt}`,
      html: baseShell(
        header('linear-gradient(90deg,#2563eb,#6366f1)', "You're Invited to Interview", `${jt}${co ? ` · ${co}` : ''}`)
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            You have been invited to interview for <strong>${jt}</strong>${co ? ` at <strong>${co}</strong>` : ''}.
            Your interview has <strong>${qc} question${qc !== 1 ? 's' : ''}</strong> followed by a live coding challenge.
            AI evaluates each response and gives you instant feedback.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding-bottom:10px;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Step 1</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#1e40af;font-weight:700;">Answer ${qc} interview question${qc !== 1 ? 's' : ''}</p>
                </td></tr>
                <tr><td style="border-top:1px solid #bfdbfe;padding-top:10px;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Step 2</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#1e40af;font-weight:700;">Complete a live coding challenge</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
          ${ctaButton('Start Your Interview →', url + '/dash/interview', '#2563eb')}
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Take your time and answer thoughtfully. Good luck!</p>
        </td></tr></table>`
      ),
    };
  },

  /* ── Interview answers complete ─────────────────────────────────── */
  interview_answers_complete({ name, jobTitle, company, siteUrl }) {
    const n  = escapeHtml(name);
    const jt = escapeHtml(jobTitle);
    const co = company ? escapeHtml(company) : null;
    const url = siteUrl || SITE_URL;
    return {
      subject: `Next step: Coding challenge for ${jt}`,
      html: baseShell(
        header('linear-gradient(90deg,#8b5cf6,#6366f1)', 'Answers Submitted!', 'Time for the coding challenge')
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            Great work completing all interview questions for <strong>${jt}</strong>${co ? ` at <strong>${co}</strong>` : ''}.
            The next step is your <strong>live coding challenge</strong> — a medium-difficulty algorithm problem to solve in 20-30 minutes.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:18px 24px;text-align:center;">
              <p style="margin:0;font-size:28px;">💻</p>
              <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:#6d28d9;">Coding Challenge Unlocked</p>
              <p style="margin:4px 0 0;font-size:12px;color:#7c3aed;">Medium difficulty \xB7 20–30 minutes</p>
            </td></tr>
          </table>
          ${ctaButton('Start Coding Challenge →', url + '/dash/interview', '#7c3aed')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Interview completed ────────────────────────────────────────── */
  interview_completed({ name, jobTitle, company, overallScore, grade, siteUrl }) {
    const n  = escapeHtml(name);
    const jt = escapeHtml(jobTitle);
    const co = company ? escapeHtml(company) : null;
    const sc = Number(overallScore) || 0;
    const gr = escapeHtml(grade || 'Good');
    const url = siteUrl || SITE_URL;
    const scoreColor = sc >= 85 ? '#10b981' : sc >= 70 ? '#2563eb' : sc >= 55 ? '#f59e0b' : '#ef4444';
    const headerGrad = sc >= 85
      ? 'linear-gradient(90deg,#10b981,#34d399)'
      : sc >= 70 ? 'linear-gradient(90deg,#2563eb,#3b82f6)'
      : 'linear-gradient(90deg,#f59e0b,#fbbf24)';
    return {
      subject: `Interview Complete — Your results for ${jt}`,
      html: baseShell(
        header(headerGrad, 'Interview Complete!', `${jt}${co ? ` \xB7 ${co}` : ''}`)
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            You have completed your interview for <strong>${jt}</strong>${co ? ` at <strong>${co}</strong>` : ''}. Here is a summary of your performance:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:24px;text-align:center;">
              <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Overall Score</p>
              <p style="margin:8px 0 0;font-size:48px;font-weight:900;color:${scoreColor};">${sc}<span style="font-size:24px;color:#94a3b8;">%</span></p>
              <p style="margin:6px 0 0;display:inline-block;background:${scoreColor}20;color:${scoreColor};font-size:13px;font-weight:800;padding:4px 16px;border-radius:8px;border:1px solid ${scoreColor}40;">${gr}</p>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;text-align:center;">
            View your full breakdown — per-question scores, AI feedback, and coding results — in your dashboard.
          </p>
          ${ctaButton('View Full Results →', url + '/dash/interview', scoreColor)}
        </td></tr></table>`
      ),
    };
  },

  /* ── Project invite ───────────────────────────────────────────── */
  project_invite({ name, projectTitle, role, senderName }) {
    const n  = escapeHtml(name);
    const pt = escapeHtml(projectTitle);
    const r  = escapeHtml(role || 'contributor');
    const sn = escapeHtml(senderName || 'A project owner');
    return {
      subject: `You've been invited to join "${pt}"`,
      html: baseShell(
        header('linear-gradient(90deg,#2563eb,#6366f1)', "You're Invited! 🎉", `Join "${pt}" on beoneofus`)
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            <strong>${sn}</strong> has invited you to collaborate on <strong style="color:#2563eb;">${pt}</strong>
            as a <strong>${r}</strong>. You've been added directly — open the workspace to start collaborating.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding-bottom:10px;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Project</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#1e40af;font-weight:700;">${pt}</p>
                </td></tr>
                <tr><td style="border-top:1px solid #bfdbfe;padding-top:10px;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Your Role</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#1e40af;font-weight:700;text-transform:capitalize;">${r}</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            You now have access to the Live Code editor, team chat, video calls, and merge request tools.
          </p>
          ${ctaButton('Open Workspace →', SITE_URL + '/Explore_Projects', '#2563eb')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Project join request (to owner) ──────────────────────────── */
  project_join_request({ name, projectTitle, requesterName, requesterUsername }) {
    const n  = escapeHtml(name);
    const pt = escapeHtml(projectTitle);
    const rn = escapeHtml(requesterName || requesterUsername || 'Someone');
    const ru = escapeHtml(requesterUsername || '');
    return {
      subject: `New join request for "${pt}"`,
      html: baseShell(
        header('linear-gradient(90deg,#f59e0b,#fbbf24)', 'New Join Request', `For your project: ${pt}`)
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            <strong>${rn}</strong>${ru ? ` (@${ru})` : ''} has requested to join your project
            <strong style="color:#d97706;">${pt}</strong>. Review their request in the Team tab.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:18px 24px;text-align:center;">
              <div style="width:48px;height:48px;background:linear-gradient(135deg,#2563eb,#6366f1);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:8px;">
                <span style="color:#fff;font-size:20px;font-weight:900;">${rn[0].toUpperCase()}</span>
              </div>
              <p style="margin:0;font-size:14px;font-weight:700;color:#92400e;">${rn}</p>
              ${ru ? `<p style="margin:4px 0 0;font-size:12px;color:#b45309;">@${ru}</p>` : ''}
            </td></tr>
          </table>
          ${ctaButton('Review Request →', SITE_URL + '/Explore_Projects', '#f59e0b')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Join request approved ─────────────────────────────────────── */
  project_join_approved({ name, projectTitle, ownerName }) {
    const n  = escapeHtml(name);
    const pt = escapeHtml(projectTitle);
    const on = escapeHtml(ownerName || 'The project owner');
    return {
      subject: `You've been approved to join "${pt}"!`,
      html: baseShell(
        header('linear-gradient(90deg,#10b981,#34d399)', 'Request Approved! ✓', `Welcome to the team`)
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            <strong>${on}</strong> approved your request to join
            <strong style="color:#059669;">${pt}</strong>. You're now a contributor on this project!
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:18px 24px;text-align:center;">
              <p style="margin:0;font-size:28px;">🚀</p>
              <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:#15803d;">You're on the team!</p>
              <p style="margin:4px 0 0;font-size:12px;color:#166534;">${pt}</p>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            Open the workspace to start using Live Code, team chat, video calls, and more.
          </p>
          ${ctaButton('Open Workspace →', SITE_URL + '/Explore_Projects', '#10b981')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Join request rejected ─────────────────────────────────────── */
  project_join_rejected({ name, projectTitle }) {
    const n  = escapeHtml(name);
    const pt = escapeHtml(projectTitle);
    return {
      subject: `Update on your request to join "${pt}"`,
      html: baseShell(
        header('linear-gradient(90deg,#6b7280,#9ca3af)', 'Request Update', `Regarding your request for ${pt}`)
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            Your request to join <strong>${pt}</strong> was not approved at this time.
            The project owner may have a full team or specific collaboration requirements.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:14px 18px;">
              <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">
                Explore other open projects on the platform — there are many teams looking for collaborators.
              </p>
            </td></tr>
          </table>
          ${ctaButton('Explore Other Projects', SITE_URL + '/Explore_Projects', '#3b82f6')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Task assigned ─────────────────────────────────────────────── */
  project_task_assigned({ name, projectTitle, taskTitle, taskDescription, priority, dueDate, assignerName }) {
    const n   = escapeHtml(name);
    const pt  = escapeHtml(projectTitle);
    const tt  = escapeHtml(taskTitle);
    const td  = taskDescription ? escapeHtml(taskDescription) : null;
    const pr  = escapeHtml(priority || 'medium');
    const an  = escapeHtml(assignerName || 'The project owner');
    const dd  = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
    const prColor = priority === 'high' ? '#ef4444' : priority === 'low' ? '#6b7280' : '#f59e0b';
    return {
      subject: `New task assigned: "${tt}"`,
      html: baseShell(
        header('linear-gradient(90deg,#7c3aed,#8b5cf6)', 'Task Assigned', `On project: ${pt}`)
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            <strong>${an}</strong> has assigned you a task on <strong style="color:#7c3aed;">${pt}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#1e1b4b;">${tt}</p>
              ${td ? `<p style="margin:0 0 16px;font-size:13px;color:#374151;line-height:1.6;">${td}</p>` : ''}
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-top:12px;border-top:1px solid #ddd6fe;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Priority</p>
                    <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:${prColor};text-transform:capitalize;">${pr}</p>
                  </td>
                  ${dd ? `<td style="padding-top:12px;border-top:1px solid #ddd6fe;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Due Date</p>
                    <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:#374151;">${dd}</p>
                  </td>` : ''}
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            Click the status circle in the Team tab to update your progress (To Do → In Progress → Done).
          </p>
          ${ctaButton('View Task →', SITE_URL + '/Explore_Projects', '#7c3aed')}
        </td></tr></table>`
      ),
    };
  },

  /* ── Project role changed ──────────────────────────────────────── */
  project_role_changed({ name, projectTitle, newRole, ownerName }) {
    const n  = escapeHtml(name);
    const pt = escapeHtml(projectTitle);
    const nr = escapeHtml(newRole || 'contributor');
    const on = escapeHtml(ownerName || 'The project owner');
    const color = newRole === 'owner' ? '#f59e0b' : newRole === 'contributor' ? '#2563eb' : '#6b7280';
    return {
      subject: `Your role in "${pt}" has been updated`,
      html: baseShell(
        header(`linear-gradient(90deg,${color},${color}cc)`, 'Role Updated', `In project: ${pt}`)
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            <strong>${on}</strong> has updated your role in
            <strong style="color:${color};">${pt}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;text-align:center;">
              <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">New Role</p>
              <p style="margin:8px 0 0;">
                <span style="display:inline-block;background:${color}20;color:${color};font-size:14px;font-weight:800;padding:6px 18px;border-radius:10px;border:1px solid ${color}40;text-transform:capitalize;">${nr}</span>
              </p>
            </td></tr>
          </table>
          ${ctaButton('Open Workspace →', SITE_URL + '/Explore_Projects', color)}
        </td></tr></table>`
      ),
    };
  },

  /* ── Role changed ──────────────────────────────────────────────── */
  role_changed({ name, role }) {
    const n  = escapeHtml(name);
    const r  = escapeHtml(role);
    const rLabel = role === 'founder' ? 'Co-Founder' : role === 'admin' ? 'Administrator' : r.charAt(0).toUpperCase() + r.slice(1);
    const color  = role === 'founder' ? '#f59e0b' : role === 'admin' ? '#8b5cf6' : '#3b82f6';
    return {
      subject: `Your role has been updated to ${rLabel}`,
      html: baseShell(
        header(`linear-gradient(90deg,${color},${color}cc)`, 'Role Updated', 'Your permissions have changed')
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            An administrator has updated your role on <strong style="color:#111827;">beoneofus</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;text-align:center;">
              <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">New Role</p>
              <p style="margin:8px 0 0;">
                <span style="display:inline-block;background:${color}20;color:${color};font-size:14px;font-weight:800;padding:6px 18px;border-radius:10px;border:1px solid ${color}40;">${rLabel}</span>
              </p>
            </td></tr>
          </table>
          ${ctaButton('Visit Dashboard', SITE_URL + '/dash', color)}
        </td></tr></table>`
      ),
    };
  },

  /* ── Chat task assigned ────────────────────────────────────────── */
  chat_task_assigned({ name, taskTitle, assignerName, due, priority }) {
    const n   = escapeHtml(name);
    const tt  = escapeHtml(taskTitle);
    const an  = escapeHtml(assignerName || 'Someone');
    const pr  = escapeHtml(priority || 'medium');
    const prColor = priority === 'high' ? '#ef4444' : priority === 'low' ? '#6b7280' : '#f59e0b';
    return {
      subject: `${an} assigned you a task: "${tt}"`,
      html: baseShell(
        header('linear-gradient(90deg,#6366f1,#8b5cf6)', 'Task Assigned 📋', `From your conversation with ${an}`)
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
            <strong>${an}</strong> has assigned you a task from your direct conversation.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 10px;font-size:16px;font-weight:800;color:#1e1b4b;">${tt}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-top:10px;border-top:1px solid #c7d2fe;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Priority</p>
                    <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:${prColor};text-transform:capitalize;">${pr}</p>
                  </td>
                  ${due ? `<td style="padding-top:10px;border-top:1px solid #c7d2fe;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Due</p>
                    <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:#374151;">${escapeHtml(due)}</p>
                  </td>` : ''}
                </tr>
              </table>
            </td></tr>
          </table>
          ${ctaButton('Open Messages →', SITE_URL + '/dash', '#6366f1')}
        </td></tr></table>`
      ),
    };
  },

  /* ── New DM message ─────────────────────────────────────────────────────── */
  new_dm_message({ name, senderName, isFirst }) {
    const n  = escapeHtml(name);
    const sn = escapeHtml(senderName);
    const subtitle = isFirst ? `${sn} started the conversation` : `${sn} messaged you after a couple of days`;
    const body = isFirst
      ? `<strong>${sn}</strong> sent you their <strong>first message</strong> on beoneofus. Say hi back!`
      : `<strong>${sn}</strong> sent you a message after a few days away. Don't leave them hanging!`;
    return {
      subject: `${sn} sent you a message`,
      html: baseShell(
        header('linear-gradient(90deg,#7c3aed,#6366f1)', '💬 New Message', subtitle)
        + `<tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${n}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">${body}</p>
          ${ctaButton('Open Messages →', SITE_URL + '/dash/messages', '#7c3aed')}
        </td></tr></table>`
      ),
    };
  },
};

/**
 * Send a notification email for a platform event.
 * @param {{ type: string, email: string, name: string, extra?: object }} opts
 */
export async function sendNotificationEmail({ type, email, name, extra = {} }) {
  if (!process.env.RESEND_API_KEY || !email) return;

  const builder = templates[type];
  if (!builder) {
    console.warn('sendNotificationEmail: unknown type', type);
    return;
  }

  const { subject, html } = builder({ name, ...extra });

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM, to: email, subject, html }),
    });
  } catch (err) {
    console.error('sendNotificationEmail error:', err);
  }
}
