import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// VAPID is configured lazily so that importing this module at build time
// (when env vars are not injected by Vercel) doesn't throw.
let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  const subject   = process.env.VAPID_EMAIL;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error('VAPID environment variables are not set');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
}

let supabaseAdmin = null;
function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars are not set');
  supabaseAdmin = createClient(url, key);
  return supabaseAdmin;
}

/**
 * POST /api/push/send
 * Body: { user_id, title, body, url?, icon?, tag? }
 * Called from server-side triggers (e.g., notifications, messages).
 * Protected: only the service role key (passed as Bearer) may call this.
 */
export async function POST(request) {
  // Require internal service key to prevent abuse
  const auth = request.headers.get('authorization') ?? '';
  if (auth.replace('Bearer ', '') !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    ensureVapid();
    const { user_id, title, body, url, icon, tag } = await request.json();
    if (!user_id || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch all subscriptions for this user
    const admin = getSupabaseAdmin();
    const { data: subs, error } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (error) throw error;
    if (!subs?.length) return NextResponse.json({ sent: 0 });

    const payload = JSON.stringify({ title, body, url: url ?? '/', icon, tag });

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ).catch(async err => {
          // 410 Gone / 404 = subscription expired, remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            await admin
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
          throw err;
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return NextResponse.json({ sent, total: subs.length });
  } catch (err) {
    console.error('[push/send]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
