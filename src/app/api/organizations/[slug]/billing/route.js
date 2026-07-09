import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { createClient } from '@supabase/supabase-js';
import { getSettingOr } from '../../../../../lib/platformSettings';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function authManager(req, supabase, slug) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return { error: 'Unauthorized', status: 401 };
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return { error: 'Unauthorized', status: 401 };
  const { data: org } = await supabase
    .from('organizations').select('id, name, owner_id, plan, plan_expires_at').eq('slug', slug).maybeSingle();
  if (!org) return { error: 'Organization not found', status: 404 };
  let ok = org.owner_id === user.id;
  if (!ok) {
    const { data: m } = await supabase
      .from('organization_members').select('role')
      .eq('organization_id', org.id).eq('user_id', user.id).maybeSingle();
    ok = m && ['owner', 'admin'].includes(m.role); // only owner/admin manage billing
  }
  if (!ok) return { error: 'Forbidden', status: 403 };
  return { user, org };
}

const PLAN_DEFS = {
  growth: { name: 'Growth', priceKey: 'org_plan_growth_usd', defaultUsd: 49 },
  scale:  { name: 'Scale',  priceKey: 'org_plan_scale_usd',  defaultUsd: 199 },
};

async function priceUsd(plan) {
  const def = PLAN_DEFS[plan];
  if (!def) return null;
  return Number(await getSettingOr(def.priceKey, def.defaultUsd));
}

async function getKesRate() {
  try {
    const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
    const data = await res.json();
    return data.result === 'success' && data.rates?.KES ? data.rates.KES : 130;
  } catch { return 130; }
}

// GET — current plan + prices (manager only).
export async function GET(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;

  const [growth, scale] = await Promise.all([priceUsd('growth'), priceUsd('scale')]);
  const { data: sub } = await supabase
    .from('org_subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end, created_at')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    plan: org.plan || 'free',
    planExpiresAt: org.plan_expires_at,
    prices: { growth, scale },
    subscription: sub || null,
  });
}

// POST { action: 'initiate' | 'verify', ... }
export async function POST(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org, user } = gate;
  const body = await req.json().catch(() => ({}));

  const paystackKey = await getSettingOr('paystack_secret_key', process.env.PAYSTACK_SECRET_KEY);

  /* ── Initiate checkout ── */
  if (body.action === 'initiate') {
    const { plan, callbackUrl } = body;
    if (!PLAN_DEFS[plan]) return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
    if (!paystackKey) return NextResponse.json({ error: 'Payments not configured. Add a Paystack key in admin settings.' }, { status: 503 });

    const usd = await priceUsd(plan);
    const kesRate = await getKesRate();
    const kesAmount = Math.round(usd * kesRate * 100); // Paystack smallest unit
    const reference = `org_${plan}_${org.id.slice(0, 8)}_${Date.now()}`;

    // Cancel any stale pending rows, then record this attempt.
    await supabase.from('org_subscriptions').update({ status: 'cancelled' })
      .eq('organization_id', org.id).eq('status', 'pending_payment');
    const { error: insErr } = await supabase.from('org_subscriptions').insert({
      organization_id: org.id, plan, amount: kesAmount, currency: 'KES',
      status: 'pending_payment', payment_reference: reference, payment_provider: 'paystack',
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    // Ledger: record the pending intent (best-effort; idempotent on reference).
    await supabase.from('payment_transactions').insert({
      organization_id: org.id, user_id: user.id, reference, provider: 'paystack',
      purpose: 'org_subscription', plan_id: plan, amount: kesAmount, currency: 'KES', status: 'pending',
    }).then(() => {}, () => {});

    const psRes = await fetchWithTimeout('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${paystackKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, amount: kesAmount, currency: 'KES', reference, callback_url: callbackUrl }),
    });
    const psData = await psRes.json();
    if (!psData.status) return NextResponse.json({ error: psData.message || 'Paystack init failed' }, { status: 502 });
    return NextResponse.json({ authorization_url: psData.data.authorization_url, reference });
  }

  /* ── Verify & grant ── */
  if (body.action === 'verify') {
    const { reference } = body;
    if (!reference) return NextResponse.json({ error: 'Missing reference.' }, { status: 400 });

    const { data: sub } = await supabase
      .from('org_subscriptions').select('id, plan, status, organization_id, amount, currency')
      .eq('payment_reference', reference).maybeSingle();
    if (!sub || sub.organization_id !== org.id) {
      return NextResponse.json({ error: 'Payment reference not found for this organization.' }, { status: 403 });
    }
    if (sub.status === 'active') {
      return NextResponse.json({ ok: true, plan: sub.plan, alreadyActive: true });
    }

    const psRes = await fetchWithTimeout(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackKey}` },
    });
    const psData = await psRes.json();
    if (!psData.status || psData.data?.status !== 'success') {
      return NextResponse.json({ error: 'Payment could not be verified.' }, { status: 400 });
    }

    const periodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
    await supabase.from('org_subscriptions')
      .update({ status: 'active', current_period_end: periodEnd, updated_at: new Date().toISOString() })
      .eq('id', sub.id);
    await supabase.from('organizations')
      .update({ plan: sub.plan, plan_expires_at: periodEnd })
      .eq('id', org.id);

    // Ledger: mark the transaction successful (idempotent on reference).
    await supabase.from('payment_transactions').upsert({
      reference, organization_id: org.id, user_id: user.id, provider: 'paystack',
      purpose: 'org_subscription', plan_id: sub.plan, amount: sub.amount ?? null,
      currency: sub.currency ?? null, status: 'success', updated_at: new Date().toISOString(),
    }, { onConflict: 'reference' }).then(() => {}, () => {});

    // History: record the plan change (upgrade / switch / renewal).
    await supabase.from('subscription_history').insert({
      organization_id: org.id,
      from_plan: org.plan || 'free',
      to_plan: sub.plan,
      action: org.plan === sub.plan ? 'renewed' : 'upgrade',
      actor_id: user.id,
    }).then(() => {}, () => {});

    await supabase.from('notifications').insert({
      receiver_id: org.owner_id,
      actor_id: user.id,
      type: 'org_plan_activated',
      content: `${org.name} is now on the ${PLAN_DEFS[sub.plan].name} plan. Thanks for upgrading!`,
      unread: true,
    }).then(() => {}, () => {});

    return NextResponse.json({ ok: true, plan: sub.plan, periodEnd });
  }

  /* ── Cancel — keep access until period end, then the lifecycle downgrades ── */
  if (body.action === 'cancel') {
    const { data: sub } = await supabase.from('org_subscriptions')
      .select('id, plan').eq('organization_id', org.id).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!sub) return NextResponse.json({ error: 'No active plan to cancel.' }, { status: 400 });
    await supabase.from('org_subscriptions')
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq('id', sub.id);
    await supabase.from('subscription_history').insert({
      organization_id: org.id, from_plan: sub.plan, to_plan: sub.plan,
      action: 'cancelled', note: 'Cancelled — reverts to Free at period end', actor_id: user.id,
    }).then(() => {}, () => {});
    return NextResponse.json({ ok: true, cancel_at_period_end: true });
  }

  /* ── Reactivate — clear the cancellation ── */
  if (body.action === 'reactivate') {
    const { data: sub } = await supabase.from('org_subscriptions')
      .select('id, plan').eq('organization_id', org.id).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!sub) return NextResponse.json({ error: 'No active plan to reactivate.' }, { status: 400 });
    await supabase.from('org_subscriptions')
      .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() }).eq('id', sub.id);
    await supabase.from('subscription_history').insert({
      organization_id: org.id, from_plan: sub.plan, to_plan: sub.plan,
      action: 'reactivated', actor_id: user.id,
    }).then(() => {}, () => {});
    return NextResponse.json({ ok: true, cancel_at_period_end: false });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
