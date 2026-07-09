import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSettingOr } from '../../../../lib/platformSettings';

// Secured lifecycle trigger. Runs run_subscription_lifecycle() (auto-downgrade
// of lapsed paid plans). Primary scheduling is pg_cron; this endpoint lets an
// external scheduler (e.g. Vercel Cron) drive it too, or run it on demand.
export const dynamic = 'force-dynamic';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function run(req) {
  const secret = process.env.CRON_SECRET || (await getSettingOr('cron_secret', null));
  if (!secret) {
    return NextResponse.json({ error: 'Cron not configured — set CRON_SECRET.' }, { status: 503 });
  }
  const provided =
    req.headers.get('x-cron-secret') ||
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    new URL(req.url).searchParams.get('key');
  if (provided !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await admin().rpc('run_subscription_lifecycle');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, downgraded: data ?? 0, ranAt: new Date().toISOString() });
}

export async function POST(req) { return run(req); }
export async function GET(req)  { return run(req); }
