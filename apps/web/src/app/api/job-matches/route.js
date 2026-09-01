import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('skills, headline, field, experience, education')
    .eq('id', user.id)
    .single();

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, company, tags, requirements, description, type, experience_level')
    .eq('status', 'active')
    .limit(20);

  if (!jobs?.length) return NextResponse.json({ matches: [] });

  const userSkills = profile?.skills || [];

  if (!anthropic || !userSkills.length) {
    const simpleMatches = jobs.map(j => {
      const jobTags = [...(j.tags || []), ...(j.requirements || [])].map(s => s.toLowerCase());
      const matched = userSkills.filter(s => jobTags.some(t => t.includes(s.toLowerCase())));
      const score = Math.min(95, Math.round((matched.length / Math.max(jobTags.length, 1)) * 100) + 20);
      return { ...j, score, matched_skills: matched, missing_skills: [], explanation: `${matched.length} of your skills match this role` };
    });
    simpleMatches.sort((a, b) => b.score - a.score);

    const toSave = simpleMatches.map(m => ({
      user_id: user.id, job_id: m.id, score: m.score, matched_skills: m.matched_skills, missing_skills: m.missing_skills, explanation: m.explanation,
    }));
    await supabase.from('job_matches').upsert(toSave, { onConflict: 'user_id,job_id' });

    return NextResponse.json({ matches: simpleMatches.slice(0, 10) });
  }

  const jobList = jobs.map((j, i) =>
    `${i + 1}. ${j.title} at ${j.company} — tags: ${[...(j.tags || []), ...(j.requirements || [])].join(', ')}`
  ).join('\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      system: `You are a job matching AI. Score each job 0-100 for the user. Return ONLY JSON:
{"matches": [{"index": 1, "score": 85, "matched": ["skill1"], "missing": ["skill2"], "reason": "max 15 words"}]}
Only include jobs with score >= 40. Sort by score desc.`,
      messages: [{
        role: 'user',
        content: `User skills: ${userSkills.join(', ')}\nHeadline: ${profile?.headline || 'Developer'}\n\nJobs:\n${jobList}\n\nReturn matches JSON.`
      }],
    });

    const raw = response.content[0].text;
    const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
    const { matches } = JSON.parse(jsonStr);

    const result = matches.map(m => {
      const job = jobs[m.index - 1];
      return job ? { ...job, score: m.score, matched_skills: m.matched || [], missing_skills: m.missing || [], explanation: m.reason } : null;
    }).filter(Boolean);

    const toSave = result.map(m => ({
      user_id: user.id, job_id: m.id, score: m.score, matched_skills: m.matched_skills, missing_skills: m.missing_skills, explanation: m.explanation,
    }));
    if (toSave.length) await supabase.from('job_matches').upsert(toSave, { onConflict: 'user_id,job_id' });

    return NextResponse.json({ matches: result.slice(0, 10) });
  } catch {
    return NextResponse.json({ matches: [] });
  }
}

export async function GET(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('job_matches')
    .select(`*, jobs(id, title, company, location, type, salary, tags, image_url, external_url, status)`)
    .eq('user_id', user.id)
    .order('score', { ascending: false })
    .limit(20);

  const active = (data || []).filter(m => m.jobs?.status === 'active');
  return NextResponse.json({ matches: active });
}
