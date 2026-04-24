import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, inviteLink } = await request.json();

    // Make sure you have RESEND_API_KEY defined in your .env.local file
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Resend testing domain. You cannot use @gmail.com here.
        to: email,
        subject: "You're invited to join beoneofus!",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #f3f4f6;">
              <h2 style="color: #111827; margin-top: 0; font-size: 24px; font-weight: 800;">You've been invited!</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi there,</p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">I'd like to invite you to join the <span style="color: #2563eb; font-weight: bold;">beoneofus</span> developer network. It's an exclusive space to connect, discuss, and discover new nodes.</p>
              <div style="margin: 32px 0;">
                <a href="${inviteLink}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Accept Invitation</a>
              </div>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 0;">See you inside!</p>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
              © ${new Date().getFullYear()} beoneofus network. All systems operational.
            </p>
          </div>
        `
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API Error:", data);
      throw new Error(data.message || 'Failed to dispatch email');
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Email API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}