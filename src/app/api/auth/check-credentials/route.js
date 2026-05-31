import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Create a fresh client per request (avoids singleton session-state mutation).
    // persistSession:false means the SDK does not cache the session anywhere.
    const verifyClient = createClient(
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { error } = await verifyClient.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed')) {
        return NextResponse.json({ error: 'email_not_confirmed' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // NOTE: Do NOT call signOut here. The service-role client uses persistSession:false,
    // so no session cookie is written. Calling signOut({ scope:'global' }) would
    // invalidate ALL of the user's existing sessions on every other device — a critical bug.

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('check-credentials error:', err);
    return NextResponse.json({ error: 'Authentication check failed. Please try again.' }, { status: 500 });
  }
}
