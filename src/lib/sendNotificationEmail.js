import { escapeHtml } from './escapeHtml';

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
