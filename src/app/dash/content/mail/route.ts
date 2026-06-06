import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY || '');
  try {
    const body = await req.json();
    const { type, name, role } = body;

    if (type === 'new_founder_app') {
      // TO-DO: Replace this console.log with your actual email provider logic
      console.log(`[Admin Notification] New ${role} application received from ${name}!`);

      await resend.emails.send({
        from: 'System <notifications@beoneofus.com>',
        to: ['dominiquesavio2003@gmail.com'], // The email where you want to receive alerts
        subject: `New ${role} Application: ${name}`,
        text: `A new ${role} application was just submitted by ${name}. Log into the Admin Panel to review it!`,
      });
      

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
