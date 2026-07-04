import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiClient } from '../../../../../lib/aiClient';
import { computeSnapshot, computeRegionStats, buildAllowedNumbers, numbersVerified } from '../../../../../lib/insightAnalytics';
import { generateRecommendations, vocabFor, deriveRecStatus, programImpact, recommendationMetrics, evaluateResolution } from '../../../../../lib/recommendationEngine';

export const maxDuration = 30;

// AI Recommendations Engine — prescriptive layer with a full lifecycle.
//   New (suggested) → Accepted → In Progress (linked program active)
//     → Completed (linked program finished) ; plus Dismissed / Archived.
//   GET   → the board (active + completed cards, with outcomes) + AI-impact metrics.
//   POST  → (re)generate the deterministic rule set, optional AI polish, persist
//           preserving prior decisions.
//   PATCH → lifecycle transitions + link a recommendation to a created program.

const AI_TIMEOUT_MS = 22_000;
const MAX_ACTIVE = 8;
const DONE_STATUS = new Set(['completed', 'placed', 'graduated']);

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

const PRIORITY_SCORE = { high: 3, medium: 2, low: 1 };
const STATUS_RANK = { suggested: 0, accepted: 1, in_progress: 2 };

function serialize(row, linkedProgram) {
  return {
    id: row.id,
    type: row.type,
    priority: row.priority,
    title: row.title,
    rationale: row.rationale,
    evidence: row.evidence || {},
    suggestedKind: row.suggested_kind,
    status: row.status,
    source: row.source,
    createdProgramId: row.created_program_id || null,
    linkedProgram: linkedProgram || null,
    resolutionNote: row.resolution_note || null,
  };
}

// Load the full board:
//   1. derive lifecycle status from each rec's linked program (In Progress/Completed)
//   2. RE-EVALUATE still-open recs — auto-resolve any whose problem is now solved
//   3. write through every transition, attach outcomes, roll up AI-impact metrics
async function buildBoard(supabase, orgId, orgType) {
  const [{ data: recRows }, { data: programs }, { data: participants }] = await Promise.all([
    supabase.from('org_recommendations').select('*').eq('organization_id', orgId),
    supabase.from('org_programs').select('id, kind, status, title, location, capacity, starts_at, created_at').eq('organization_id', orgId),
    supabase.from('program_participants').select('program_id, role, status, joined_at').eq('organization_id', orgId),
  ]);
  const recs = recRows || [];
  const progList = programs || [];
  const partList = participants || [];
  const programsById = Object.fromEntries(progList.map((p) => [p.id, p]));

  // Current-state context for re-evaluation + linked-program outcomes.
  const snapshot = computeSnapshot(progList, partList);
  const regionStats = computeRegionStats(progList, partList);
  const agg = {};
  for (const pt of partList) {
    const a = agg[pt.program_id] || (agg[pt.program_id] = { total: 0, done: 0 });
    a.total += 1;
    if (DONE_STATUS.has((pt.status || '').toLowerCase())) a.done += 1;
  }
  const outcomeOf = (id) => {
    const a = agg[id] || { total: 0, done: 0 };
    const completionPct = a.total ? Math.round((a.done / a.total) * 100) : 0;
    return { participants: a.total, completionPct, impact: programImpact({ participants: a.total, completionPct }) };
  };

  const enriched = [];
  const writes = [];
  for (const r of recs) {
    const prog = r.created_program_id ? programsById[r.created_program_id] : null;
    let status = deriveRecStatus(r, prog);
    let note = r.resolution_note || null;

    // Re-evaluate OPEN recommendations — did the underlying problem get solved?
    if (['suggested', 'accepted', 'in_progress'].includes(status)) {
      const resu = evaluateResolution(r, { type: orgType, programs: progList, participants: partList, snapshot, regionStats });
      if (resu.resolved) { status = 'resolved'; note = resu.note; }
    }

    if (status !== r.status || note !== (r.resolution_note || null)) {
      const patch = { status };
      if (status === 'resolved') { patch.resolution_note = note; patch.resolved_at = new Date().toISOString(); }
      if (status === 'completed') patch.acted_at = new Date().toISOString();
      writes.push({ id: r.id, patch });
    }
    const linked = prog ? { id: prog.id, title: prog.title, status: prog.status, ...outcomeOf(prog.id) } : null;
    enriched.push({ row: { ...r, status, resolution_note: note }, linked });
  }
  for (const w of writes) await supabase.from('org_recommendations').update(w.patch).eq('id', w.id);

  const metrics = recommendationMetrics(enriched.map((e) => ({ status: e.row.status, created_program_id: e.row.created_program_id, acted_at: e.row.acted_at })));

  const bucket = (statuses) => enriched
    .filter((e) => statuses.includes(e.row.status))
    .sort((a, b) =>
      ((STATUS_RANK[a.row.status] ?? 9) - (STATUS_RANK[b.row.status] ?? 9)) ||
      ((PRIORITY_SCORE[b.row.priority] || 0) - (PRIORITY_SCORE[a.row.priority] || 0))
    )
    .map((e) => serialize(e.row, e.linked));

  const lastGen = recs.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), '');
  return {
    recommendations: bucket(['suggested', 'accepted', 'in_progress']),
    completed: bucket(['completed']),
    resolved: bucket(['resolved']),
    metrics,
    generatedAt: lastGen || null,
  };
}

// GET — board + metrics (instant, no AI).
export async function GET(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  return NextResponse.json(await buildBoard(supabase, gate.org.id, gate.org.type));
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
      if (rewrite && rewrite.length > 10 && numbersVerified(rewrite, allowed)) return { ...c, rationale: rewrite.slice(0, 280), source: 'ai' };
      return c;
    });
  } catch {
    return candidates;
  }
}

// POST — regenerate and persist, preserving prior decisions and program links.
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
  const inserts = [];
  // Never re-touch a card the manager has already moved down the funnel.
  const LOCKED = new Set(['dismissed', 'archived', 'in_progress', 'completed']);

  for (const c of candidates) {
    const prev = bySig[c.signature];
    if (prev && LOCKED.has(prev.status)) continue;
    const rowVals = {
      organization_id: org.id, signature: c.signature, type: c.type, priority: c.priority,
      title: c.title, rationale: c.rationale, evidence: c.evidence,
      suggested_kind: c.suggestedKind || null, target_program_id: c.targetProgramId || null,
      source: c.source || 'rules',
    };
    if (prev) await supabase.from('org_recommendations').update(rowVals).eq('id', prev.id);
    else inserts.push({ ...rowVals, status: 'suggested' });
  }
  if (inserts.length) await supabase.from('org_recommendations').insert(inserts);

  // (Vanished-problem cleanup is handled by re-evaluation in buildBoard, which
  // resolves solved recs with an explanatory note rather than silently archiving.)
  return NextResponse.json(await buildBoard(supabase, org.id, org.type));
}

// PATCH — lifecycle transitions + link to a created program.
export async function PATCH(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;
  const body = await req.json().catch(() => ({}));

  const { data: row } = await supabase.from('org_recommendations').select('id, organization_id').eq('id', body.id).maybeSingle();
  if (!row || row.organization_id !== org.id) return NextResponse.json({ error: 'Recommendation not found.' }, { status: 404 });

  // Link: attach the program this recommendation produced → In Progress.
  if (body.action === 'link') {
    const { data: prog } = await supabase.from('org_programs').select('id, organization_id').eq('id', body.programId).maybeSingle();
    if (!prog || prog.organization_id !== org.id) return NextResponse.json({ error: 'Program not found.' }, { status: 404 });
    const { error } = await supabase.from('org_recommendations')
      .update({ created_program_id: prog.id, status: 'in_progress', acted_at: new Date().toISOString() })
      .eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(await buildBoard(supabase, org.id, org.type));
  }

  // Status transition.
  const ALLOWED = ['suggested', 'accepted', 'in_progress', 'completed', 'dismissed', 'archived'];
  if (!ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: 'A valid status is required.' }, { status: 400 });
  }
  const { error } = await supabase.from('org_recommendations')
    .update({ status: body.status, acted_at: body.status === 'suggested' ? null : new Date().toISOString() })
    .eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(await buildBoard(supabase, org.id));
}
