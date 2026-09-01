import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiClient } from '../../../../../lib/aiClient';
import {
  computeSnapshot, computeRegionStats, computeTrends,
  buildAllowedNumbers, sanitizeInsights, sanitizeRecommendations, stalenessOf,
} from '../../../../../lib/insightAnalytics';

export const maxDuration = 30;

// AI impact insights for institution consoles (government / education /
// healthcare / NGO / community). Manager-gated.
//
//   GET  → cached analysis (instant), flagged `stale` when data has shifted or
//          24h has passed. Returns { cached:false } when nothing is cached yet.
//   POST → (re)generate: computes real trends server-side, has the AI narrate
//          them + produce explainable recommendations, validates every number
//          against the real data, then caches the result.

const AI_TIMEOUT_MS = 24_000;

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

const VERTICAL_CONTEXT = {
  government:  { role: 'public-sector program analyst', person: 'citizens', goal: 'civic reach, employment/training outcomes, and equitable regional coverage' },
  education:   { role: 'education outcomes analyst', person: 'learners', goal: 'enrolment, graduation, and job-placement rates connected to employer demand' },
  healthcare:  { role: 'population-health program analyst', person: 'people supported', goal: 'access delivered, wellbeing reach, and program completion' },
  ngo:         { role: 'NGO impact analyst', person: 'beneficiaries', goal: 'beneficiaries reached, volunteer mobilization, and program effectiveness' },
  community:   { role: 'community engagement analyst', person: 'members', goal: 'membership growth, event participation, and active engagement' },
  other:       { role: 'institutional program analyst', person: 'participants', goal: 'reach, engagement, and outcomes' },
};

function serializeRow(row, stale) {
  return {
    cached: true,
    headline: row.headline,
    insights: row.insights || [],
    trends: row.trends || [],
    recommendations: row.recommendations || [],
    provider: row.provider,
    generatedAt: row.generated_at,
    stale: stale.stale,
    staleReason: stale.reason,
  };
}

// GET — return the cached analysis (fast path).
export async function GET(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;

  const { data: row } = await supabase.from('org_insights').select('*').eq('organization_id', org.id).maybeSingle();
  if (!row) return NextResponse.json({ cached: false });

  const [{ count: liveParticipants }, { count: livePrograms }] = await Promise.all([
    supabase.from('program_participants').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
    supabase.from('org_programs').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
  ]);
  const stale = stalenessOf(row, liveParticipants || 0, livePrograms || 0);
  return NextResponse.json(serializeRow(row, stale));
}

// POST — (re)generate and cache.
export async function POST(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;

  if (!aiClient.available) return NextResponse.json({ error: 'AI is not configured.' }, { status: 503 });

  const [{ data: programs }, { data: participants }, { data: prior }] = await Promise.all([
    supabase.from('org_programs').select('id, kind, status, title, location, created_at').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(60),
    supabase.from('program_participants').select('program_id, role, status, joined_at').eq('organization_id', org.id),
    supabase.from('org_insights').select('snapshot').eq('organization_id', org.id).maybeSingle(),
  ]);
  const progList = programs || [];
  const partList = participants || [];
  if (progList.length === 0) {
    return NextResponse.json({ error: 'Not enough activity yet. Add programs and participants first.' }, { status: 422 });
  }

  const snapshot = computeSnapshot(progList, partList);
  const priorSnap = prior?.snapshot && Object.keys(prior.snapshot).length ? prior.snapshot : null;
  const trends = computeTrends(snapshot, priorSnap, progList, partList);
  const regionStats = computeRegionStats(progList, partList);

  const ctx = VERTICAL_CONTEXT[org.type] || VERTICAL_CONTEXT.other;
  const payload = {
    organization: org.name,
    type: org.type,
    metrics: {
      totalPrograms: snapshot.totalPrograms,
      activePrograms: snapshot.activePrograms,
      totalParticipants: snapshot.participants,
      completed: snapshot.completed,
      overallCompletionPct: snapshot.completionPct,
      volunteers: snapshot.volunteers,
      joinedLast30Days: snapshot.joinedLast30,
      regionsCovered: snapshot.regions,
    },
    trends,                 // real, pre-computed — the AI must narrate, not invent
    byRegion: regionStats,  // enables explainable, location-specific recommendations
  };

  const SYSTEM = `You are a ${ctx.role} for BeOneOfUs, a global opportunity ecosystem. `
    + `Analyze ONE institution's real program data and surface insight about ${ctx.goal}. `
    + `CRITICAL: Use ONLY numbers that appear in the provided JSON. Never invent, extrapolate, or estimate a figure that is not present in the data. `
    + `Reference actual program locations and percentages from the "byRegion" and "trends" fields. Refer to people served as "${ctx.person}". `
    + `Each recommendation MUST explain WHY using a specific number from the data (e.g. cite a low-performing region's completion %). `
    + `Return ONLY valid JSON matching exactly: `
    + `{"headline":"<8-12 words>","insights":[{"text":"<one specific sentence <22 words>","kind":"positive|watch|neutral"}],`
    + `"recommendations":[{"action":"<concrete next step <14 words>","rationale":"<why, citing a specific number from the data, <28 words>"}]}. `
    + `Provide 3 insights and 1-2 recommendations. No markdown, no commentary.`;

  let completion;
  try {
    completion = await Promise.race([
      aiClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 800,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Program data (JSON):\n${JSON.stringify(payload)}` },
        ],
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), AI_TIMEOUT_MS)),
    ]);
  } catch (err) {
    const timedOut = String(err?.message).includes('timeout');
    return NextResponse.json(
      { error: timedOut ? 'The AI took too long. Please try again.' : 'Could not generate insights right now.' },
      { status: timedOut ? 504 : 502 }
    );
  }

  const raw = completion?.choices?.[0]?.message?.content || '';
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return NextResponse.json({ error: 'AI returned an unreadable response. Try again.' }, { status: 502 }); }

  // Numeric guard: every AI number must exist in the real data (or be a calendar value).
  const allowed = buildAllowedNumbers(payload.metrics, payload.trends, payload.byRegion);
  const { insights, dropped: di } = sanitizeInsights(parsed.insights, allowed);
  const { recommendations, dropped: dr } = sanitizeRecommendations(parsed.recommendations, allowed);
  const unverified = di + dr;

  if (!insights.length && !trends.length) {
    return NextResponse.json({ error: 'AI produced no usable insights. Try again.' }, { status: 502 });
  }

  const headline = String(parsed.headline || 'Program insights').slice(0, 140);
  const provider = completion?._provider || 'groq';

  await supabase.from('org_insights').upsert({
    organization_id: org.id,
    headline,
    insights,
    trends,
    recommendations,
    snapshot,
    participant_count: snapshot.participants,
    program_count: snapshot.totalPrograms,
    provider,
    model: completion?.model || null,
    unverified_count: unverified,
    generated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id' });

  return NextResponse.json({
    cached: false,
    headline,
    insights,
    trends,
    recommendations,
    provider,
    generatedAt: new Date().toISOString(),
    stale: false,
    staleReason: null,
  });
}
