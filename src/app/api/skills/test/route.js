import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const PASS_THRESHOLD = 75;

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

  const body = await req.json();
  const { action, skill, answers, test_id, time_taken } = body;

  if (action === 'generate') {
    if (!anthropic) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    if (!skill) return NextResponse.json({ error: 'skill required' }, { status: 400 });

    const recentTest = await supabase
      .from('skill_tests')
      .select('created_at, passed')
      .eq('user_id', user.id)
      .eq('skill', skill)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentTest.data && recentTest.data.passed) {
      const daysSince = (Date.now() - new Date(recentTest.data.created_at)) / 86400000;
      if (daysSince < 30) return NextResponse.json({ error: 'Already certified in this skill. Re-test available in 30 days.' }, { status: 429 });
    }

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1500,
        system: `Generate exactly 10 multiple-choice questions testing ${skill} knowledge at intermediate to advanced level.
Return ONLY valid JSON:
{"questions": [{"id": 1, "question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": "A", "explanation": "brief explanation"}]}
Mix difficulty: 3 easy, 4 medium, 3 hard. Focus on practical knowledge.`,
        messages: [{ role: 'user', content: `Generate 10 ${skill} assessment questions. JSON only.` }],
      });

      const raw = response.content[0].text;
      const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
      const { questions } = JSON.parse(jsonStr);

      const { data: test } = await supabase
        .from('skill_tests')
        .insert({ user_id: user.id, skill, questions })
        .select()
        .single();

      return NextResponse.json({ test_id: test.id, questions });
    } catch (err) {
      return NextResponse.json({ error: 'Failed to generate test' }, { status: 500 });
    }
  }

  if (action === 'submit') {
    if (!test_id || !answers) return NextResponse.json({ error: 'test_id and answers required' }, { status: 400 });

    const { data: test } = await supabase
      .from('skill_tests')
      .select('*')
      .eq('id', test_id)
      .eq('user_id', user.id)
      .single();

    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    if (test.score !== null) return NextResponse.json({ error: 'Test already submitted' }, { status: 409 });

    const questions = test.questions || [];
    let correct = 0;
    const results = questions.map(q => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer?.charAt(0) === q.correct;
      if (isCorrect) correct++;
      return { id: q.id, correct: isCorrect, user_answer: userAnswer, correct_answer: q.correct, explanation: q.explanation };
    });

    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= PASS_THRESHOLD;

    await supabase
      .from('skill_tests')
      .update({ answers, score, passed, badge_earned: passed, time_taken })
      .eq('id', test_id);

    if (passed) {
      await supabase
        .from('skill_certifications')
        .upsert({
          user_id: user.id,
          skill: test.skill,
          score,
          test_id,
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
        }, { onConflict: 'user_id,skill' });
    }

    return NextResponse.json({ score, passed, correct, total: questions.length, results });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function GET(req) {
  const supabase = makeSupabase();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [testsRes, certsRes] = await Promise.all([
    supabase.from('skill_tests').select('id, skill, score, passed, created_at, time_taken').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('skill_certifications').select('*').eq('user_id', user.id).order('issued_at', { ascending: false }),
  ]);

  return NextResponse.json({ tests: testsRes.data || [], certifications: certsRes.data || [] });
}
