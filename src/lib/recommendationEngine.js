// Deterministic recommendation rules for institution consoles.
//
// Prescriptive layer: scans an org's real programs/participants/regions and emits
// concrete, evidence-backed actions — no AI required (AI only polishes the wording
// downstream). Pure and dependency-free so it is fully unit-testable and can never
// fabricate a number: every recommendation carries the real figures that triggered
// it. Each candidate has a stable `signature` for dedup + lifecycle persistence.

const DAY = 864e5;
const DONE = new Set(['completed', 'placed', 'graduated']);
const PRIORITY_SCORE = { high: 3, medium: 2, low: 1 };

// Minimal, lucide-free vocabulary (the manifest in orgVerticals.js carries the
// full version; kept separate here so this module stays pure for testing).
const VOCAB = {
  government: { person: 'citizen',     people: 'citizens',      unit: 'program',  units: 'programs',  kind: 'program' },
  education:  { person: 'learner',     people: 'learners',      unit: 'cohort',   units: 'cohorts',   kind: 'cohort' },
  healthcare: { person: 'person',      people: 'people',        unit: 'program',  units: 'programs',  kind: 'program' },
  ngo:        { person: 'beneficiary', people: 'beneficiaries', unit: 'campaign', units: 'campaigns', kind: 'campaign' },
  community:  { person: 'member',      people: 'members',       unit: 'space',    units: 'spaces',    kind: 'space' },
  other:      { person: 'participant', people: 'participants',  unit: 'program',  units: 'programs',  kind: 'program' },
};

export function vocabFor(type) { return VOCAB[type] || VOCAB.other; }

// Group participants by program → { total, done }.
function perProgram(programs, participants) {
  const map = new Map(programs.map((p) => [p.id, { total: 0, done: 0, program: p }]));
  for (const pt of participants) {
    const e = map.get(pt.program_id);
    if (!e) continue;
    e.total += 1;
    if (DONE.has((pt.status || '').toLowerCase())) e.done += 1;
  }
  return map;
}

/**
 * @returns {Array<{signature,type,priority,title,rationale,evidence,suggestedKind,targetProgramId}>}
 * Sorted by priority (high→low). Caller caps/persists.
 */
export function generateRecommendations(type, { programs = [], participants = [], snapshot = {}, regionStats = [], now = Date.now() } = {}) {
  const v = vocabFor(type);
  const recs = [];
  const push = (r) => recs.push({ suggestedKind: null, targetProgramId: null, rationale: '', ...r });

  const byProg = perProgram(programs, participants);
  const avg = typeof snapshot.completionPct === 'number' ? snapshot.completionPct : 0;
  const activePrograms = programs.filter((p) => p.status === 'active');

  // R1 — capacity gap: active program far below its target.
  for (const p of activePrograms) {
    const e = byProg.get(p.id);
    if (!p.capacity || p.capacity <= 0 || !e) continue;
    const fillPct = Math.round((e.total / p.capacity) * 100);
    if (fillPct < 50) {
      push({
        signature: `capacity_gap:${p.id}`, type: 'capacity_gap',
        priority: fillPct < 25 ? 'high' : 'medium',
        title: `Boost enrolment for "${p.title}"`,
        rationale: `Only ${e.total} of ${p.capacity} places filled (${fillPct}%). Promote it to reach more ${v.people}.`,
        evidence: { participants: e.total, capacity: p.capacity, fillPct },
        targetProgramId: p.id,
      });
    }
  }

  // R2 — empty program: live for a while with nobody enrolled.
  for (const p of activePrograms) {
    const e = byProg.get(p.id);
    const ageDays = p.created_at ? Math.floor((now - new Date(p.created_at).getTime()) / DAY) : 0;
    if (e && e.total === 0 && ageDays >= 14) {
      push({
        signature: `empty_program:${p.id}`, type: 'empty_program', priority: 'medium',
        title: `Fill or retire "${p.title}"`,
        rationale: `No ${v.people} enrolled since it launched ${ageDays} days ago.`,
        evidence: { participants: 0, ageDays },
        targetProgramId: p.id,
      });
    }
  }

  // R3 — declining completion: a program well below the org average.
  if (avg > 0) {
    for (const [id, e] of byProg) {
      if (e.total < 3) continue;
      const pct = Math.round((e.done / e.total) * 100);
      if (pct <= avg - 20) {
        push({
          signature: `declining_completion:${id}`, type: 'declining_completion', priority: 'high',
          title: `Review "${e.program.title}" — completion is lagging`,
          rationale: `${pct}% completion vs ${avg}% across your ${v.units}. Check what's blocking these ${v.people}.`,
          evidence: { completionPct: pct, orgAvgPct: avg, participants: e.total },
          targetProgramId: id,
        });
      }
    }
  }

  // R4 — regional coverage: the worst-performing area(s). (Spec: underserved districts.)
  const weakRegions = regionStats
    .filter((r) => r.participants >= 3 && r.location && r.location !== 'Unspecified' && r.completionPct < 30)
    .sort((a, b) => a.completionPct - b.completionPct)
    .slice(0, 2);
  const regionVerb = type === 'community' ? 'Grow engagement in' : type === 'education' ? 'Add support in' : 'Expand outreach in';
  for (const r of weakRegions) {
    push({
      signature: `regional_coverage:${r.location.toLowerCase()}`, type: 'regional_coverage',
      priority: r.completionPct < 20 ? 'high' : 'medium',
      title: `${regionVerb} ${r.location}`,
      rationale: `Only ${r.completionPct}% of ${v.people} in ${r.location} have completed — one of your lowest-performing areas.`,
      evidence: { location: r.location, completionPct: r.completionPct, participants: r.participants },
      suggestedKind: v.kind,
    });
  }

  // R5 — volunteer shortage (NGO). (Spec: identify volunteer shortages.)
  if (type === 'ngo') {
    const vols = snapshot.volunteers || 0;
    if (activePrograms.length > 0 && vols === 0) {
      push({
        signature: 'volunteer_shortage:org', type: 'volunteer_shortage', priority: 'high',
        title: 'Recruit volunteers',
        rationale: `You have ${activePrograms.length} active ${v.units} and no volunteers logged. Launch a volunteer call.`,
        evidence: { volunteers: 0, activePrograms: activePrograms.length },
        suggestedKind: 'drive',
      });
    } else if (vols > 0 && vols < activePrograms.length) {
      push({
        signature: 'volunteer_shortage:org', type: 'volunteer_shortage', priority: 'medium',
        title: 'Add volunteers to under-staffed campaigns',
        rationale: `${vols} volunteers across ${activePrograms.length} active ${v.units} — thinly spread.`,
        evidence: { volunteers: vols, activePrograms: activePrograms.length },
        suggestedKind: 'drive',
      });
    }
  }

  // R6 — placement gap (education). (Spec: connect courses/graduates to employer demand.)
  if (type === 'education') {
    const completed = participants.filter((p) => DONE.has((p.status || '').toLowerCase())).length;
    const placed = participants.filter((p) => (p.status || '').toLowerCase() === 'placed').length;
    if (completed >= 3 && Math.round((placed / completed) * 100) < 30) {
      const pct = Math.round((placed / completed) * 100);
      push({
        signature: 'placement_gap:org', type: 'placement_gap', priority: 'high',
        title: 'Connect graduates to employers',
        rationale: `Only ${placed} of ${completed} completed ${v.people} are marked placed (${pct}%). Link cohorts to hiring partners.`,
        evidence: { placed, completed, placementPct: pct },
      });
    }
  }

  // R7 — re-engagement: people stuck at 'enrolled' for over a month.
  const inactive = participants.filter((p) => (p.status || '').toLowerCase() === 'enrolled' && p.joined_at && now - new Date(p.joined_at).getTime() > 30 * DAY).length;
  if (inactive >= 3) {
    push({
      signature: 'reengagement:org', type: 'reengagement', priority: 'medium',
      title: `Re-engage ${inactive} inactive ${v.people}`,
      rationale: `${inactive} ${v.people} enrolled over 30 days ago but haven't progressed.${type === 'community' ? ' Schedule an event to bring them back.' : ''}`,
      evidence: { inactive },
      suggestedKind: type === 'community' ? 'event' : null,
    });
  }

  // R8 — event gap (community). (Spec: recommend events to re-engage members.)
  if (type === 'community') {
    const upcoming = programs.filter((p) => p.kind === 'event' && p.starts_at && new Date(p.starts_at).getTime() > now).length;
    if (upcoming === 0 && (snapshot.members || snapshot.participants)) {
      push({
        signature: 'event_gap:org', type: 'event_gap', priority: 'medium',
        title: 'Schedule an upcoming event',
        rationale: `No upcoming events on the calendar to bring ${v.people} together.`,
        evidence: { upcomingEvents: 0 },
        suggestedKind: 'event',
      });
    }
  }

  // R9 — no fresh activity: nothing launched recently.
  const recentProg = programs.filter((p) => p.created_at && now - new Date(p.created_at).getTime() < 60 * DAY).length;
  if (programs.length > 0 && recentProg === 0) {
    push({
      signature: 'stale_pipeline:org', type: 'new_program', priority: 'low',
      title: `Launch a new ${v.unit}`,
      rationale: `No new ${v.units} in the last 60 days — fresh ${v.units} keep ${v.people} engaged.`,
      evidence: { daysSinceLast: 60 },
      suggestedKind: v.kind,
    });
  }

  return recs.sort((a, b) => (PRIORITY_SCORE[b.priority] || 0) - (PRIORITY_SCORE[a.priority] || 0));
}

// ── Lifecycle helpers ────────────────────────────────────────────────────────

// Effective status of a recommendation given the live state of its linked program.
// Manual states (dismissed/archived/suggested) are authoritative; a linked
// program drives In Progress → Completed automatically.
export function deriveRecStatus(rec, program) {
  if (['dismissed', 'archived', 'suggested'].includes(rec.status)) return rec.status;
  if (rec.created_program_id) {
    if (!program) return 'accepted';            // linked program was deleted
    return program.status === 'completed' ? 'completed' : 'in_progress';
  }
  return rec.status;                            // accepted (no program yet) or manually completed
}

// Outcome grade for a completed/in-progress program a recommendation produced.
export function programImpact({ participants = 0, completionPct = 0 } = {}) {
  if (!participants) return null;               // no signal yet
  if (completionPct >= 70 && participants >= 8) return 'high';
  if (completionPct >= 40 || participants >= 8) return 'medium';
  return 'low';
}

// AI-impact rollup across all of an org's recommendations.
export function recommendationMetrics(rows) {
  const acted = new Set(['accepted', 'in_progress', 'completed']);
  const generated = rows.length;
  const accepted = rows.filter((r) => acted.has(r.status)).length;
  const programsCreated = rows.filter((r) => r.created_program_id).length;
  const completed = rows.filter((r) => r.status === 'completed').length;
  const dismissed = rows.filter((r) => r.status === 'dismissed').length;
  const successRate = programsCreated ? Math.round((completed / programsCreated) * 100) : 0;
  return { generated, accepted, programsCreated, completed, dismissed, successRate };
}
