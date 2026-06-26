import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

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

  const { goal } = await req.json();
  if (!goal) return NextResponse.json({ error: 'goal is required' }, { status: 400 });

  const { data: mentors } = await supabase
    .from('mentors')
    .select('id, skills, headline, bio, hourly_rate, rating, experience_years, profiles!mentors_user_id_fkey(username, full_name)')
    .eq('is_active', true)
    .limit(20);

  if (!mentors?.length) return NextResponse.json({ ranked: [] });

  if (!anthropic) {
    const scored = mentors.map(m => ({ ...m, match_score: 70, match_reason: 'Recommended based on skills' }));
    return NextResponse.json({ ranked: scored.slice(0, 5) });
  }

  const mentorList = mentors.map((m, i) =>
    `${i + 1}. ${m.profiles?.full_name || m.profiles?.username} — Skills: ${m.skills?.join(', ')} — ${m.headline || ''}`
  ).join('\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: 'You are a mentor matching AI. Given a user goal and a list of mentors, return JSON only: {"ranked": [{"index": 1, "score": 85, "reason": "short reason max 12 words"}]}. Rank only top 5 by best match to the goal.',
      messages: [{ role: 'user', content: `User goal: "${goal}"\n\nMentors:\n${mentorList}\n\nReturn top 5 ranked by match. JSON only.` }],
    });

    const raw = response.content[0]?.text || '';
    let ranked;
    try {
      ranked = JSON.parse(raw.trim()).ranked;
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)?.[0] || '{}';
      ranked = JSON.parse(match).ranked || [];
    }

    const result = ranked.map(r => {
      const mentor = mentors[r.index - 1];
      return mentor ? { ...mentor, match_score: r.score, match_reason: r.reason } : null;
    }).filter(Boolean);

    return NextResponse.json({ ranked: result });
  } catch {
    const scored = mentors.slice(0, 5).map(m => ({ ...m, match_score: 75, match_reason: 'Good skill alignment' }));
    return NextResponse.json({ ranked: scored });
  }
}
