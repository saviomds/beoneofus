import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// POST /api/match — unified cross-module matching.
// Body: { goal }. Returns ranked matches across jobs, mentors, and courses.
export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { goal } = await req.json().catch(() => ({}));
  if (!goal || !goal.trim()) return NextResponse.json({ error: 'goal is required' }, { status: 400 });

  // The user's own graph — skills/context feed the ranking.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, skills, role, location, work_status, status')
    .eq('id', user.id)
    .maybeSingle();

  // Pull candidates from every module in parallel.
  const [jobsRes, mentorsRes, coursesRes] = await Promise.all([
    supabase.from('jobs').select('id, title, company, location, type, tags, experience_level').eq('status', 'active').order('created_at', { ascending: false }).limit(15),
    supabase.from('mentors').select('id, skills, headline, hourly_rate, rating, profiles!mentors_user_id_fkey(username, full_name)').eq('is_active', true).limit(15),
    supabase.from('courses').select('id, title, category, level, description, topics').order('created_at', { ascending: false }).limit(15),
  ]);

  // Flatten into one candidate pool with a global index + a normalized shape.
  const candidates = [];
  const pushCandidate = (module, id, label, meta) => candidates.push({ module, id, label, meta });

  for (const j of jobsRes.data || []) {
    pushCandidate('job', j.id,
      `${j.title}${j.company ? ` @ ${j.company}` : ''} — ${[j.type, j.location, j.experience_level].filter(Boolean).join(', ')}${j.tags?.length ? ` [${j.tags.slice(0, 4).join(', ')}]` : ''}`,
      { title: j.title, subtitle: [j.company, j.location].filter(Boolean).join(' · '), href: '/dash/jobs' });
  }
  for (const m of mentorsRes.data || []) {
    const name = m.profiles?.full_name || m.profiles?.username || 'Mentor';
    pushCandidate('mentor', m.id,
      `Mentor ${name} — ${m.headline || ''} — Skills: ${(m.skills || []).slice(0, 6).join(', ')}`,
      { title: name, subtitle: m.headline || 'Mentor', href: '/dash/mentors' });
  }
  for (const c of coursesRes.data || []) {
    pushCandidate('course', c.id,
      `Course "${c.title}" — ${[c.category, c.level].filter(Boolean).join(', ')} — ${(c.topics || []).slice(0, 5).join(', ')}`,
      { title: c.title, subtitle: [c.category, c.level].filter(Boolean).join(' · '), href: '/dash/learn' });
  }

  if (candidates.length === 0) return NextResponse.json({ goal, matches: [] });

  const skills = (profile?.skills || []).join(', ') || 'not specified';

  // Heuristic fallback (no LLM key): keyword overlap between goal and label.
  const heuristic = () => {
    const terms = goal.toLowerCase().split(/[^a-z0-9+]+/).filter((t) => t.length > 2);
    const scored = candidates.map((c) => {
      const hay = c.label.toLowerCase();
      const hits = terms.filter((t) => hay.includes(t)).length;
      return { ...c, score: Math.min(95, 55 + hits * 12), reason: hits ? 'Matches your goal keywords' : 'Related opportunity' };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 8);
  };

  if (!anthropic) {
    return NextResponse.json({ goal, matches: heuristic(), engine: 'heuristic' });
  }

  const list = candidates.map((c, i) => `${i + 1}. [${c.module}] ${c.label}`).join('\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 900,
      system:
        'You are the beoneofus unified matching engine. Rank candidates across ALL modules (jobs, mentors, courses) by genuine fit to the user\'s goal and profile — not keywords alone. Favor a useful MIX of module types when relevant. Return JSON only: {"matches":[{"index":<n>,"score":<0-100>,"reason":"<max 14 words, specific>"}]}. Return the best 8 max, highest score first.',
      messages: [{
        role: 'user',
        content: `User goal: "${goal}"\nUser skills: ${skills}\nUser role/context: ${profile?.role || 'member'}, ${profile?.location || 'unknown location'}\n\nCandidates:\n${list}\n\nReturn the top matches across modules. JSON only.`,
      }],
    });

    const raw = response.content[0]?.text || '';
    let ranked;
    try { ranked = JSON.parse(raw.trim()).matches; }
    catch { ranked = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0]).matches || []; }

    const matches = (ranked || [])
      .map((r) => {
        const c = candidates[r.index - 1];
        return c ? { module: c.module, id: c.id, ...c.meta, score: r.score, reason: r.reason } : null;
      })
      .filter(Boolean);

    return NextResponse.json({ goal, matches, engine: 'ai' });
  } catch {
    return NextResponse.json({ goal, matches: heuristic(), engine: 'heuristic' });
  }
}
