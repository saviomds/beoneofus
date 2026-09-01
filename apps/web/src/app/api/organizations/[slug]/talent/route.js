import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiClient } from '../../../../../lib/aiClient';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Only a manager of THIS org may see its talent matches.
async function authManager(req, supabase, slug) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return { error: 'Unauthorized', status: 401 };
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return { error: 'Unauthorized', status: 401 };

  const { data: org } = await supabase
    .from('organizations')
    .select('id, owner_id, name, sector, description, focus_areas, type')
    .eq('slug', slug)
    .maybeSingle();
  if (!org) return { error: 'Organization not found', status: 404 };

  let ok = org.owner_id === user.id;
  if (!ok) {
    const { data: m } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', org.id)
      .eq('user_id', user.id)
      .maybeSingle();
    ok = m && ['owner', 'admin', 'recruiter', 'program_manager'].includes(m.role);
  }
  if (!ok) return { error: 'Forbidden', status: 403 };
  return { user, org };
}

const OPEN_STATUSES = ['open to work', 'freelancing', 'student', 'building'];

// Words too generic to count as a real requirement signal on their own.
const STOP = new Set(['and', 'the', 'for', 'with', 'job', 'role', 'remote', 'hybrid',
  'onsite', 'senior', 'junior', 'mid', 'intern', 'manager', 'lead', 'staff', 'engineer',
  'developer', 'specialist', 'officer', 'of', 'in', 'to', 'a', 'an', 'at', 'on',
  'experience', 'years', 'team', 'work']);

/* Normalise a skills value (array | comma string | null) to a clean lowercase array. */
function toSkillArray(skills) {
  if (Array.isArray(skills)) return skills.map((s) => String(s).toLowerCase().trim()).filter(Boolean);
  if (typeof skills === 'string') return skills.split(',').map((s) => s.toLowerCase().trim()).filter(Boolean);
  return [];
}

/* Split a role title into meaningful requirement words (drops stop-words). */
function titleWords(title) {
  return String(title || '')
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/* Does a candidate actually MEET the org's requirements? Returns the matched
   need-tokens + a fit score, or null when there is NO overlap (i.e. not a match,
   so it must not be shown). Being "open to work" is only a small booster — it can
   never make a non-matching person appear. */
function matchCandidate(p, needTokens) {
  const skills = toSkillArray(p.skills);
  const haystack = `${skills.join(' ')} ${(p.status || '').toLowerCase()}`;
  const matched = needTokens.filter((t) => skills.includes(t) || haystack.includes(t));
  if (!matched.length) return null; // meets no requirement → excluded
  const coverage = matched.length / needTokens.length;                 // 0..1
  const openBoost = OPEN_STATUSES.includes((p.work_status || '').toLowerCase()) ? 8 : 0;
  const score = Math.round(Math.min(100, 42 + coverage * 46 + Math.min(matched.length, 4) * 3 + openBoost));
  return { matched, score };
}

// GET /api/organizations/[slug]/talent — AI-ranked candidates that fit the org.
export async function GET(req, { params }) {
  const { slug } = await params;
  const supabase = admin();
  const gate = await authManager(req, supabase, slug);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { org } = gate;

  // 1. What the org REQUIRES: focus areas + the skills/titles of its open roles.
  const { data: jobs } = await supabase
    .from('jobs')
    .select('title, tags, status')
    .eq('user_id', org.owner_id)
    .order('created_at', { ascending: false })
    .limit(20);
  const openRoles = (jobs || []).filter((j) => (j.status || 'active') !== 'closed');
  const roleTitles = openRoles.map((j) => j.title).filter(Boolean);
  const needTokens = [...new Set([
    ...toSkillArray(org.focus_areas),
    ...openRoles.flatMap((j) => toSkillArray(j.tags)),
    ...roleTitles.flatMap(titleWords),
  ])];

  // No requirements defined → we cannot match on need. Ask the owner to add some
  // rather than dumping every "open to work" user on them.
  if (!needTokens.length) {
    return NextResponse.json({ engine: 'none', reason: 'no_requirements', need: [], candidates: [] });
  }

  // 2. Candidate pool → keep ONLY those who actually meet a requirement.
  const { data: pool } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, status, skills, work_status, location, is_verified')
    .neq('id', org.owner_id)
    .limit(300);

  const matched = (pool || [])
    .map((p) => { const m = matchCandidate(p, needTokens); return m ? { profile: p, ...m } : null; })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  // Requirements exist, but nobody in the pool meets them yet.
  if (!matched.length) {
    return NextResponse.json({ engine: 'requirements', reason: 'no_match', need: needTokens, candidates: [] });
  }

  // 3. AI re-ranks the ALREADY-QUALIFIED shortlist — it can only order/trim what
  //    already matches; it can never re-introduce a non-matching person.
  let ranked = null;
  if (aiClient.available) {
    try {
      const prompt = `You are a talent-matching engine for "${org.name}"${org.sector ? ` (${org.sector})` : ''}.
The organization REQUIRES people for: ${[...new Set([...needTokens, ...roleTitles])].join(', ')}.
${org.description ? `About the org: ${org.description.slice(0, 300)}` : ''}

These candidates each meet at least one requirement. Rank ONLY those who genuinely fit
(drop weak fits — do NOT pad the list):
${matched.map((s) => `${s.profile.id} — skills: ${toSkillArray(s.profile.skills).join(', ') || 'none listed'} — meets: ${s.matched.join(', ')}`).join('\n')}

Return ONLY a JSON array (max 8), most-fit first:
[{"id":"<id>","score":<0-100 integer>,"reason":"<max 14 words: which requirements they meet>"}]`;

      const res = await aiClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 700,
      });
      const raw = res.choices?.[0]?.message?.content || '';
      const json = raw.match(/\[[\s\S]*\]/)?.[0];
      if (json) {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) ranked = parsed;
      }
    } catch {
      ranked = null; // fall through to requirement-match ranking
    }
  }

  const byId = Object.fromEntries(matched.map((s) => [s.profile.id, s]));
  let candidates;
  if (ranked) {
    candidates = ranked
      .map((r) => {
        const hit = byId[r.id]; // only ids from the qualified shortlist survive
        if (!hit) return null;
        return {
          ...hit.profile,
          score: Math.max(0, Math.min(100, Math.round(r.score ?? hit.score))),
          reason: (r.reason || hit.matched.slice(0, 3).join(', ')).slice(0, 120),
        };
      })
      .filter(Boolean)
      .slice(0, 8);
  } else {
    candidates = matched.slice(0, 8).map((s) => ({
      ...s.profile,
      score: s.score,
      reason: s.matched.slice(0, 3).join(', '),
    }));
  }

  return NextResponse.json({
    engine: ranked ? 'ai' : 'requirements',
    need: needTokens,
    candidates,
  });
}
