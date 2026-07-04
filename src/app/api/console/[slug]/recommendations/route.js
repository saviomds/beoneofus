import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiClient } from '../../../../../lib/aiClient';
import { computeSnapshot, computeRegionStats, buildAllowedNumbers, numbersVerified } from '../../../../../lib/insightAnalytics';
import { generateRecommendations, vocabFor } from '../../../../../lib/recommendationEngine';

export const maxDuration = 30;

// AI Recommendations Engine — prescriptive layer for institution consoles.
//   GET   → current recommendation cards (suggested + accepted), instant, no AI.
//   POST  → (re)generate: deterministic rule engine detects evidence-backed
//           actions, optional AI polish sharpens the wording (numeric-guarded),
//           then persists — preserving prior accept/dismiss decisions.
//   PATCH → move a card through its lifecycle (accept / dismiss / done).

const AI_TIMEOUT_MS = 22_000;
const MAX_ACTIVE = 8;

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
    .from('organizations').select('id, owner_id, type, name').eq('slug', slug).maybeSingle();
  if (!org) return { error: 'Organization not found', status: 404 };
  let ok = org.owner_id === user.id;
  if (!ok) {
    const { data: m } = await supabase
      .from('organization_members').select('role')
      .eq('organization_id', org.id).eq('user_id', user.id).maybeSingle();
    ok = m && ['owner', 'admin', 'recruiter', 'program_manager'].includes(m.role);
  }
  if (!ok) return { error: 'Forbidden', status: 403 };
  return { org };
}

function serialize(row) {
  return {
    id: row.id,
    type: row.type,
    priority: row.priority,
    title: row.title,
    rationale: row.rationale,
    evidence: row.evidence || {},
    suggestedKind: row.suggested_kind,
    targetProgramId: row.target_program_id,
    status: row.status,
    source: row.source,
  };
}

const PRIORITY_SCORE = { high: 3, medium: 2, low: 1 };
function sortCards(rows) {
  // Suggested (new) before accepted (in-progress); then by priority.
  const statusRank = { suggested: 0, accepted: 1 };
  return rows.sort((a, b) =>
    (statusRank[a.status] - statusRank[b.status]) ||
    ((PRIORITY_SCORE[b.priority] || 0) - (PRIORITY_SCORE[a.priority] || 0))
  );
}

// GET — current cards + tally.
export async function GET(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;

  const { data: rows } = await supabase
    .from('org_recommendations').select('*').eq('organization_id', org.id);
  const all = rows || [];
  const active = sortCards(all.filter((r) => ['suggested', 'accepted'].includes(r.status)));
  const counts = all.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const lastGen = all.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), '');
  return NextResponse.json({ recommendations: active.map(serialize), counts, generatedAt: lastGen || null });
}

// Optional AI polish — sharpen rationales, strictly guarded to the real numbers.
async function aiPolish(orgType, candidates) {
  if (!aiClient.available || candidates.length === 0) return candidates;
  const ctx = vocabFor(orgType);
  const allowed = buildAllowedNumbers(candidates.map((c) => c.evidence));
  const compact = candidates.map((c, i) => ({ i, title: c.title, rationale: c.rationale, evidence: c.evidence }));
  const SYSTEM = `You are an institutional operations advisor. For each recommendation, rewrite ONLY the "rationale" to be sharper and more motivating for a ${ctx.people}-serving organization. `
    + `CRITICAL: use ONLY numbers already present in that item's evidence/rationale — never invent a figure. Keep each under 30 words. `
    + `Return ONLY valid JSON: {"items":[{"i":<index>,"rationale":"<text>"}]}. No markdown.`;
  try {
    const completion = await Promise.race([
      aiClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile', max_tokens: 700, temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify({ items: compact }) }],
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), AI_TIMEOUT_MS)),
    ]);
    const parsed = JSON.parse(completion?.choices?.[0]?.message?.content || '{}');
    const byIdx = new Map((Array.isArray(parsed.items) ? parsed.items : []).map((x) => [x.i, String(x.rationale || '')]));
    return candidates.map((c, i) => {
      const rewrite = byIdx.get(i);
      if (rewrite && rewrite.length > 10 && numbersVerified(rewrite, allowed)) {
        return { ...c, rationale: rewrite.slice(0, 280), source: 'ai' };
      }
      return c;
    });
  } catch {
    return candidates; // AI down/slow/invalid → deterministic wording stands.
  }
}

// POST — regenerate and persist, preserving prior decisions.
export async function POST(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;

  const [{ data: programs }, { data: participants }, { data: existing }] = await Promise.all([
    supabase.from('org_programs').select('id, kind, status, title, location, capacity, starts_at, created_at').eq('organization_id', org.id),
    supabase.from('program_participants').select('program_id, role, status, joined_at').eq('organization_id', org.id),
    supabase.from('org_recommendations').select('*').eq('organization_id', org.id),
  ]);
  const progList = programs || [];
  const partList = participants || [];
  if (progList.length === 0) {
    return NextResponse.json({ error: 'Not enough activity yet. Add programs and participants first.' }, { status: 422 });
  }

  const snapshot = computeSnapshot(progList, partList);
  const regionStats = computeRegionStats(progList, partList);
  let candidates = generateRecommendations(org.type, { programs: progList, participants: partList, snapshot, regionStats }).slice(0, MAX_ACTIVE);
  candidates = await aiPolish(org.type, candidates.map((c) => ({ ...c, source: 'rules' })));

  const bySig = Object.fromEntries((existing || []).map((r) => [r.signature, r]));
  const candSigs = new Set(candidates.map((c) => c.signature));
  const inserts = [];
  const nowIso = new Date().toISOString();

  for (const c of candidates) {
    const prev = bySig[c.signature];
    // Respect a manager's prior decision — never resurface a dismissed/done card.
    if (prev && ['dismissed', 'done'].includes(prev.status)) continue;
    const rowVals = {
      organization_id: org.id,
      signature: c.signature,
      type: c.type,
      priority: c.priority,
      title: c.title,
      rationale: c.rationale,
      evidence: c.evidence,
      suggested_kind: c.suggestedKind || null,
      target_program_id: c.targetProgramId || null,
      source: c.source || 'rules',
    };
    if (prev) {
      // Refresh content, keep status (suggested/accepted).
      await supabase.from('org_recommendations').update(rowVals).eq('id', prev.id);
    } else {
      inserts.push({ ...rowVals, status: 'suggested' });
    }
  }
  if (inserts.length) await supabase.from('org_recommendations').insert(inserts);

  // Suggested cards no longer detected → expire (silently drop off the board).
  const toExpire = (existing || []).filter((r) => r.status === 'suggested' && !candSigs.has(r.signature)).map((r) => r.id);
  if (toExpire.length) await supabase.from('org_recommendations').update({ status: 'expired' }).in('id', toExpire);

  const { data: fresh } = await supabase.from('org_recommendations').select('*').eq('organization_id', org.id);
  const active = sortCards((fresh || []).filter((r) => ['suggested', 'accepted'].includes(r.status)));
  const counts = (fresh || []).reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  return NextResponse.json({ recommendations: active.map(serialize), counts, generatedAt: nowIso });
}

// PATCH — lifecycle: accept / dismiss / done / reopen.
export async function PATCH(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;

  const body = await req.json().catch(() => ({}));
  const { id, status } = body;
  const ALLOWED = ['suggested', 'accepted', 'dismissed', 'done'];
  if (!id || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: 'A recommendation id and valid status are required.' }, { status: 400 });
  }
  const { data: row } = await supabase.from('org_recommendations').select('id, organization_id').eq('id', id).maybeSingle();
  if (!row || row.organization_id !== org.id) return NextResponse.json({ error: 'Recommendation not found.' }, { status: 404 });

  const patch = { status, acted_at: status === 'suggested' ? null : new Date().toISOString() };
  const { error } = await supabase.from('org_recommendations').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
