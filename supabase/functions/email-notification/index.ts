import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const RESEND_API_KEY   = Deno.env.get("RESEND_API_KEY")   ?? "";
const RESEND_FROM      = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";
const FROM_LABEL       = `BeOneOfUs <${RESEND_FROM}>`;

// ─── HTML helpers ──────────────────────────────────────────────────────────────

function escape(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${escape(preheader)}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td align="center" style="padding-bottom:24px;">
  <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;">
    beone<span style="color:#2563eb;">of</span>us
  </span>
</td></tr>
<tr><td style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
${body}
</td></tr>
<tr><td style="padding:24px 0 0;text-align:center;">
  <p style="margin:0;font-size:11px;color:#94a3b8;">beoneofus — Developer Network &amp; Collaboration</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function header(title: string, subtitle: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:36px 40px;text-align:center;">
  <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">${escape(title)}</h1>
  <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">${escape(subtitle)}</p>
</td></tr>
<tr><td style="background:linear-gradient(90deg,#2563eb,#3b82f6);height:3px;font-size:0;">&nbsp;</td></tr>`;
}

function codeBox(code: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
<tr><td align="center">
  <table cellpadding="0" cellspacing="0"
         style="background:#f8fafc;border:2px solid #2563eb;border-radius:16px;">
    <tr><td style="padding:24px 56px;text-align:center;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.12em;text-transform:uppercase;">Verification code</p>
      <p style="margin:0;font-size:44px;font-weight:900;color:#0f172a;letter-spacing:0.3em;font-family:'Courier New',monospace;">${escape(code)}</p>
    </td></tr>
  </table>
</td></tr>
</table>`;
}

function ctaButton(href: string, label: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
<tr><td align="center">
  <a href="${escape(href)}"
     style="display:inline-block;padding:16px 40px;background:#2563eb;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:-0.2px;">
    ${escape(label)} →
  </a>
</td></tr>
</table>`;
}

function disclaimer(msg: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
<tr><td style="padding:16px 20px;">
  <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">${msg}</p>
</td></tr>
</table>`;
}

function bodyPad(content: string): string {
  return `<tr><td style="padding:36px 40px;">${content}</td></tr></table>`;
}

// ─── Email builders ────────────────────────────────────────────────────────────

function buildOtpEmail(email: string, token: string): { subject: string; html: string } {
  const body =
    header("Your sign-in code", "Enter this code to complete sign-in") +
    bodyPad(
      `<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">Hi there,</p>
      <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
        Use the code below to sign in to <strong style="color:#111827;">beoneofus</strong>.
        It expires in <strong style="color:#111827;">10 minutes</strong>.
      </p>
      ${codeBox(token)}
      ${disclaimer(`If you didn't try to sign in to <strong>${escape(email)}</strong>, you can safely ignore this email.`)}`
    );
  return {
    subject: "Your beoneofus sign-in code",
    html: layout("Sign-in code", `Your beoneofus verification code`, body),
  };
}

function buildConfirmEmail(email: string, confirmationUrl: string): { subject: string; html: string } {
  const body =
    header("Confirm your email", "One click to activate your account") +
    bodyPad(
      `<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">Welcome to beoneofus!</p>
      <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
        Click the button below to confirm your email and activate your account. This link expires in <strong style="color:#111827;">24 hours</strong>.
      </p>
      ${ctaButton(confirmationUrl, "Confirm email")}
      ${disclaimer(`If you didn't create an account at <strong>beoneofus</strong>, you can safely ignore this email.`)}`
    );
  return {
    subject: "Confirm your beoneofus account",
    html: layout("Confirm your account", "Activate your beoneofus account", body),
  };
}

function buildRecoveryEmail(email: string, recoveryUrl: string): { subject: string; html: string } {
  const body =
    header("Reset your password", "Click the button below to set a new password") +
    bodyPad(
      `<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">Hi there,</p>
      <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
        We received a request to reset the password for your <strong style="color:#111827;">beoneofus</strong> account.
        This link expires in <strong style="color:#111827;">1 hour</strong>.
      </p>
      ${ctaButton(recoveryUrl, "Reset password")}
      ${disclaimer(`If you didn't request a password reset for <strong>${escape(email)}</strong>, you can safely ignore this email. Your password will not change.`)}`
    );
  return {
    subject: "Reset your beoneofus password",
    html: layout("Reset password", "Reset your beoneofus password", body),
  };
}

function buildMagicLinkEmail(email: string, magicLink: string): { subject: string; html: string } {
  const body =
    header("Your magic sign-in link", "No password needed — click to sign in") +
    bodyPad(
      `<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">Hi there,</p>
      <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
        Click the button below to securely sign in to <strong style="color:#111827;">beoneofus</strong>.
        This link expires in <strong style="color:#111827;">1 hour</strong> and can only be used once.
      </p>
      ${ctaButton(magicLink, "Sign in to beoneofus")}
      ${disclaimer(`If you didn't request this link, you can safely ignore this email.`)}`
    );
  return {
    subject: "Your beoneofus magic sign-in link",
    html: layout("Magic sign-in link", "Sign in to beoneofus", body),
  };
}

function buildEmailChangeEmail(email: string, token: string): { subject: string; html: string } {
  const body =
    header("Confirm your new email", "Enter this code to confirm the change") +
    bodyPad(
      `<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">Hi there,</p>
      <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
        Someone requested to change their <strong style="color:#111827;">beoneofus</strong> account email to this address.
        Use the code below to confirm. It expires in <strong style="color:#111827;">10 minutes</strong>.
      </p>
      ${codeBox(token)}
      ${disclaimer(`If you didn't request this change, you can safely ignore this email.`)}`
    );
  return {
    subject: "Confirm your new beoneofus email",
    html: layout("Confirm email change", "Confirm your new beoneofus email", body),
  };
}

// ─── Send via Resend ────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_LABEL, to, subject, html }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Resend error ${res.status}: ${JSON.stringify(data)}`);
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user       = body.user       as Record<string, string> | undefined;
  const email_data = body.email_data as Record<string, string> | undefined;

  if (!user?.email || !email_data) {
    return new Response(JSON.stringify({ error: "Missing user or email_data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const toEmail   = user.email;
  const emailType = email_data.email_action_type ?? "";
  const token     = email_data.token             ?? "";
  const tokenHash = email_data.token_hash        ?? "";
  const siteUrl   = email_data.site_url          ?? "https://beoneofus.work";
  const redirectTo = email_data.redirect_to      ?? `${siteUrl}/auth/callback`;

  try {
    let subject = "";
    let html    = "";

    if (emailType === "signup" || emailType === "email_confirmation") {
      const confirmUrl = `${siteUrl}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=signup&next=%2Fdash`;
      ({ subject, html } = buildConfirmEmail(toEmail, confirmUrl));

    } else if (emailType === "recovery") {
      const recoveryUrl = `${siteUrl}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=%2Fauth%3Frecovery%3D1`;
      ({ subject, html } = buildRecoveryEmail(toEmail, recoveryUrl));

    } else if (emailType === "magiclink" || emailType === "magic_link") {
      const magicUrl = `${siteUrl}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`;
      ({ subject, html } = buildMagicLinkEmail(toEmail, magicUrl));

    } else if (emailType === "email_change" || emailType === "email_change_new" || emailType === "email_change_current") {
      // For email_change, send OTP code to the new email address
      ({ subject, html } = buildEmailChangeEmail(toEmail, token || tokenHash));

    } else if (token && /^\d{6}$/.test(token)) {
      // Direct OTP code (sent from our /api/auth/send-otp route via this hook)
      ({ subject, html } = buildOtpEmail(toEmail, token));

    } else {
      // Unknown type — send a generic OTP/link email with whatever token we have
      console.warn(`[email-notification] Unknown email_action_type: ${emailType}`);
      ({ subject, html } = buildConfirmEmail(toEmail, redirectTo || `${siteUrl}/auth`));
    }

    await sendEmail(toEmail, subject, html);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-notification] Failed to send email:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
