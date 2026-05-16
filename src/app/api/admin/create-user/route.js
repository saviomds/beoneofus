import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { escapeHtml } from '../../../../lib/escapeHtml';

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || !['admin', 'founder'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    const { email, username, role, password, sendInvite } = await request.json();

    if (!email || typeof email !== 'string' || !username || typeof username !== 'string' || !password) {
      return NextResponse.json({ error: 'Email, username and password are required' }, { status: 400 });
    }
    if (!['member', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Create auth user — email pre-confirmed so they can sign in immediately
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw createErr;

    const userId = created.user.id;

    // Upsert profile — auto-verified, role set, marked as admin-invited
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      username: username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      email,
      role,
      is_verified: true,
      verification_status: 'approved',
    }, { onConflict: 'id' });

    if (profileErr) {
      // Roll back the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      throw profileErr;
    }

    // Send invitation email if requested
    if (sendInvite && process.env.RESEND_API_KEY) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beoneofus.work';
      const safeUsername = escapeHtml(username);
      const safeEmail = escapeHtml(email);
      const safeRole = escapeHtml(role);

      const roleLabel = role === 'admin' ? 'Administrator' : 'Member';
      const roleBadgeColor = role === 'admin' ? '#f59e0b' : '#3b82f6';

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `BeOneOfUs <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
          to: email,
          subject: `You've been invited to beoneofus`,
          html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td align="center" style="padding-bottom:24px;">
        <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;">beone<span style="color:#2563eb;">of</span>us</span>
      </td></tr>
      <tr><td style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">You're invited!</h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">An administrator has created an account for you</p>
          </td></tr>
          <tr><td style="background:linear-gradient(90deg,#2563eb,#3b82f6);height:3px;font-size:0;">&nbsp;</td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">Hi <strong>${safeUsername}</strong>,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
              Your <strong style="color:#111827;">beoneofus</strong> account has been set up by an administrator.
              Sign in with the credentials below to get started.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:10px;">
                      <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Email</p>
                      <p style="margin:4px 0 0;font-size:14px;color:#0f172a;font-weight:600;">${safeEmail}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:10px;border-top:1px solid #e2e8f0;padding-top:10px;">
                      <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Temporary Password</p>
                      <p style="margin:4px 0 0;font-size:14px;color:#0f172a;font-family:'Courier New',monospace;font-weight:700;letter-spacing:0.05em;">${password}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid #e2e8f0;padding-top:10px;">
                      <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Role</p>
                      <p style="margin:4px 0 0;">
                        <span style="display:inline-block;background:${roleBadgeColor}20;color:${roleBadgeColor};font-size:12px;font-weight:800;padding:3px 10px;border-radius:8px;border:1px solid ${roleBadgeColor}40;">${roleLabel}</span>
                      </p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td align="center">
                <a href="${siteUrl}/auth" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;">Sign In to Your Account</a>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;">
              <tr><td style="padding:14px 18px;">
                <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6;">
                  <strong>Important:</strong> Please change your password after your first sign-in for security purposes.
                </p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
        }),
      }).catch(() => {}); // Don't fail user creation if email fails
    }

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error('create-user error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
