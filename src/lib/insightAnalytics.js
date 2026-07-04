// Pure analytics + validation for institution AI insights.
//
// Kept dependency-free and side-effect-free so it can be unit-tested in isolation
// and reused by the AI Recommendations Engine. The API route (api/console/[slug]/
// insights) owns the AI call and DB I/O; everything deterministic lives here.

export const DONE_STATUSES = new Set(['completed', 'placed', 'graduated']);

const DAY = 864e5;

// ── Metric snapshot — also the trend baseline stored per generation ──────────
export function computeSnapshot(programs, participants, now = Date.now()) {
  const total = participants.length;
  const completed = participants.filter((p) => DONE_STATUSES.has((p.status || '').toLowerCase())).length;
  const volunteers = participants.filter((p) => (p.role || '').toLowerCase() === 'volunteer').length;
  const members = participants.filter((p) => (p.role || '').toLowerCase() === 'member').length;
  const active = programs.filter((p) => p.status === 'active').length;
  const regions = new Set(programs.map((p) => (p.location || '').trim().toLowerCase()).filter(Boolean)).size;
  const joinedLast30 = participants.filter((p) => p.joined_at && now - new Date(p.joined_at).getTime() < 30 * DAY).length;
  const byStatus = {};
  for (const p of participants) { const s = (p.status || 'enrolled').toLowerCase(); byStatus[s] = (byStatus[s] || 0) + 1; }
  return {
    participants: total,
    completed,
    completionPct: total ? Math.round((completed / total) * 100) : 0,
    volunteers,
    members,
    activePrograms: active,
    totalPrograms: programs.length,
    regions,
    joinedLast30,
    byStatus,
    takenAt: new Date(now).toISOString(),
  };
}

// Per-location completion — powers explainable, location-specific recommendations.
export function computeRegionStats(programs, participants) {
  const locOf = Object.fromEntries(programs.map((p) => [p.id, (p.location || 'Unspecified').trim() || 'Unspecified']));
  const agg = {};
  for (const p of participants) {
    const loc = locOf[p.program_id] || 'Unspecified';
    const a = agg[loc] || (agg[loc] = { location: loc, participants: 0, completed: 0 });
    a.participants += 1;
    if (DONE_STATUSES.has((p.status || '').toLowerCase())) a.completed += 1;
  }
  return Object.values(agg)
    .map((a) => ({ ...a, completionPct: a.participants ? Math.round((a.completed / a.participants) * 100) : 0 }))
    .sort((x, y) => y.participants - x.participants)
    .slice(0, 8);
}

function windowCount(rows, field, loMs, hiMs, now) {
  return rows.filter((r) => {
    if (!r[field]) return false;
    const age = now - new Date(r[field]).getTime();
    return age >= loMs && age < hiMs;
  }).length;
}

// Real, server-computed trends. `prior` is the previous snapshot (or null).
export function computeTrends(cur, prior, programs, participants, now = Date.now()) {
  const trends = [];

  const last30 = windowCount(participants, 'joined_at', 0, 30 * DAY, now);
  const prev30 = windowCount(participants, 'joined_at', 30 * DAY, 60 * DAY, now);
  if (last30 || prev30) {
    const pct = prev30 ? Math.round(((last30 - prev30) / prev30) * 100) : (last30 ? 100 : 0);
    trends.push({
      label: 'Participation',
      direction: pct > 2 ? 'up' : pct < -2 ? 'down' : 'flat',
      delta: `${pct > 0 ? '+' : ''}${pct}%`,
      text: `${last30} joined in the last 30 days vs ${prev30} the month before (${pct > 0 ? '+' : ''}${pct}%).`,
    });
  }

  const progLast30 = windowCount(programs, 'created_at', 0, 30 * DAY, now);
  const progPrev30 = windowCount(programs, 'created_at', 30 * DAY, 60 * DAY, now);
  if (progLast30 || progPrev30) {
    trends.push({
      label: 'New programs',
      direction: progLast30 > progPrev30 ? 'up' : progLast30 < progPrev30 ? 'down' : 'flat',
      delta: `${progLast30} vs ${progPrev30}`,
      text: `${progLast30} launched this month vs ${progPrev30} last month.`,
    });
  }

  if (prior && typeof prior.completionPct === 'number') {
    const days = prior.takenAt ? Math.max(1, Math.round((now - new Date(prior.takenAt).getTime()) / DAY)) : null;
    const since = days ? `since last analysis ${days} day${days === 1 ? '' : 's'} ago` : 'since last analysis';
    const cd = cur.completionPct - prior.completionPct;
    if (cd !== 0) {
      trends.push({
        label: 'Completion rate',
        direction: cd > 0 ? 'up' : 'down',
        delta: `${cd > 0 ? '+' : ''}${cd} pts`,
        text: `Completion rate ${cd > 0 ? 'rose' : 'fell'} from ${prior.completionPct}% to ${cur.completionPct}% ${since}.`,
      });
    }
    const vd = cur.volunteers - (prior.volunteers || 0);
    if (vd !== 0 && (cur.volunteers || prior.volunteers)) {
      trends.push({
        label: 'Volunteers',
        direction: vd > 0 ? 'up' : 'down',
        delta: `${vd > 0 ? '+' : ''}${vd}`,
        text: `Volunteers ${vd > 0 ? 'grew' : 'declined'} from ${prior.volunteers || 0} to ${cur.volunteers} ${since}.`,
      });
    }
  }

  return trends;
}

// ── Numeric guard — reject any AI sentence citing a number not in the data ───
export function buildAllowedNumbers(...objs) {
  const set = new Set();
  const walk = (val) => {
    if (val == null) return;
    if (typeof val === 'number') { set.add(Math.round(val)); set.add(Math.abs(Math.round(val))); return; }
    if (typeof val === 'string') { for (const m of val.match(/-?\d+(\.\d+)?/g) || []) set.add(Math.round(Number(m))); return; }
    if (Array.isArray(val)) { val.forEach(walk); return; }
    if (typeof val === 'object') { Object.values(val).forEach(walk); }
  };
  objs.forEach(walk);
  return set;
}

// Calendar/context numbers that legitimately appear without being metrics.
export const CONTEXT_NUMBERS = new Set([0, 1, 7, 12, 14, 24, 30, 52, 60, 90, 180, 365]);

export function numbersVerified(text, allowed) {
  const nums = (String(text).match(/\d+(\.\d+)?/g) || []).map((n) => Math.round(Number(n)));
  return nums.every((n) => allowed.has(n) || CONTEXT_NUMBERS.has(n));
}

// ── Cache staleness ──────────────────────────────────────────────────────────
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export function stalenessOf(row, liveParticipants, livePrograms, now = Date.now()) {
  const age = now - new Date(row.generated_at).getTime();
  if (age > STALE_AFTER_MS) return { stale: true, reason: 'Over 24 hours old' };
  // Significant = 5+ new participants (absolute floor) OR a 20% shift (relative).
  // A higher relative threshold avoids nagging small orgs on every single signup.
  const base = row.participant_count || 0;
  const diff = Math.abs(liveParticipants - base);
  if (diff >= 5 || (base > 0 && diff / base >= 0.20)) return { stale: true, reason: 'Participant data has changed' };
  if (livePrograms !== (row.program_count || 0)) return { stale: true, reason: 'Programs have changed' };
  return { stale: false, reason: null };
}

// ── AI output sanitizers (schema + numeric guard) ────────────────────────────
const INSIGHT_KINDS = new Set(['positive', 'watch', 'neutral']);

export function sanitizeInsights(list, allowed) {
  let dropped = 0;
  const insights = (Array.isArray(list) ? list : [])
    .map((i) => ({ text: String(i?.text || '').slice(0, 240), kind: INSIGHT_KINDS.has(i?.kind) ? i.kind : 'neutral' }))
    .filter((i) => i.text)
    .filter((i) => { const ok = numbersVerified(i.text, allowed); if (!ok) dropped += 1; return ok; })
    .slice(0, 4);
  return { insights, dropped };
}

export function sanitizeRecommendations(list, allowed) {
  let dropped = 0;
  const recommendations = (Array.isArray(list) ? list : [])
    .map((r) => ({ action: String(r?.action || '').slice(0, 160), rationale: String(r?.rationale || '').slice(0, 280) }))
    .filter((r) => r.action)
    .filter((r) => { const ok = numbersVerified(`${r.action} ${r.rationale}`, allowed); if (!ok) dropped += 1; return ok; })
    .slice(0, 2);
  return { recommendations, dropped };
}
