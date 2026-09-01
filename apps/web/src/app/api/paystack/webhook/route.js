import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getSettingOr } from '../../../../lib/platformSettings';

// Node runtime required — we use node:crypto for HMAC signature verification and
// need the raw request body (Route Handlers don't pre-parse it).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Paystack webhook — the SOURCE OF TRUTH for payment outcomes. We never trust a
 * client-reported success; a payment is only "real" once a signed webhook (or a
 * server-side verify against Paystack) confirms it.
 *
 * Guarantees:
 *  • Signature validation  — HMAC-SHA512(rawBody, secret) === x-paystack-signature
 *  • Idempotency           — a reference already marked 'success' is a no-op
 *  • Durable ledger        — every event is upserted into payment_transactions
 *  • Always 200 on accepted events so Paystack doesn't storm retries
 */
export async function POST(req) {
  const secret = await getSettingOr('paystack_secret_key', process.env.PAYSTACK_SECRET_KEY);
  const raw = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  if (!secret) {
    // Can't validate without the secret — refuse rather than trust blindly.
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
  }
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Malformed payload' }, { status: 400 }); }

  const type = event?.event || '';
  const data = event?.data || {};
  const reference = data.reference;
  if (!reference) return NextResponse.json({ received: true }); // nothing to reconcile

  const supabase = admin();

  // ── Idempotency: already reconciled as success? stop. ──
  const { data: existingTx } = await supabase
    .from('payment_transactions').select('id, status').eq('reference', reference).maybeSingle();
  if (existingTx?.status === 'success') {
    return NextResponse.json({ received: true, idempotent: true });
  }

  const isSuccess = type === 'charge.success' && data.status === 'success';
  const status = isSuccess ? 'success'
    : type === 'charge.failed' ? 'failed'
    : (data.status || 'pending');

  const purpose = reference.startsWith('org_') ? 'org_subscription'
    : reference.startsWith('bou_') ? 'premium'
    : 'other';

  // ── Durable ledger (idempotent on the unique reference). ──
  await supabase.from('payment_transactions').upsert({
    reference,
    provider: 'paystack',
    purpose,
    amount: data.amount ?? null,
    currency: data.currency ?? null,
    status,
    raw: event,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'reference' });

  if (!isSuccess) return NextResponse.json({ received: true });

  // ── Activate the matching entitlement (source of truth). ──
  try {
    if (purpose === 'org_subscription') {
      const { data: sub } = await supabase
        .from('org_subscriptions').select('id, plan, status, organization_id')
        .eq('payment_reference', reference).maybeSingle();
      if (sub && sub.status !== 'active') {
        const periodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
        await supabase.from('org_subscriptions')
          .update({ status: 'active', current_period_end: periodEnd, updated_at: new Date().toISOString() })
          .eq('id', sub.id);
        await supabase.from('organizations')
          .update({ plan: sub.plan, plan_expires_at: periodEnd })
          .eq('id', sub.organization_id);
        await supabase.from('payment_transactions')
          .update({ organization_id: sub.organization_id, plan_id: sub.plan })
          .eq('reference', reference);
      }
    } else if (purpose === 'premium') {
      const { data: sub } = await supabase
        .from('premium_subscriptions').select('id, plan, status, user_id')
        .eq('payment_reference', reference).maybeSingle();
      if (sub && sub.status !== 'active') {
        const expiresAt = new Date(Date.now() + (sub.plan === 'annual' ? 365 : 30) * 86400000).toISOString();
        await supabase.from('premium_subscriptions')
          .update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', sub.id);
        await supabase.from('profiles')
          .update({ is_premium: true, premium_expires_at: expiresAt }).eq('id', sub.user_id);
        await supabase.from('payment_transactions')
          .update({ user_id: sub.user_id, plan_id: sub.plan }).eq('reference', reference);
      }
    }
  } catch (e) {
    // Ledger row is saved; return 200 so Paystack won't hammer retries. A later
    // reconciliation / manual verify can complete activation if this threw.
    console.error('[paystack/webhook] activation error:', e.message);
  }

  return NextResponse.json({ received: true });
}
