import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const SYSTEM = `You are a career advisor for BeOneOfUs (Mauritius tech platform).
Return ONLY compact valid JSON, no markdown:
{"current_level":"string","level_stars":1-5,"have":["up to 6 skills"],"weak":[{"skill":"x","reason":"<10 words"}],"missing":[{"skill":"x","reason":"<10 words","priority":"high|medium|low"}],"score":0-100,"summary":"<20 words","roadmap":{"month_1":{"focus":"string","learn":["a","b"],"build":"<15 words"},"month_2":{"focus":"string","learn":["a","b"],"build":"<15 words"},"month_3":{"focus":"string","learn":["a","b"],"build":"<15 words"}},"job_titles":["Junior","Mid","Senior"]}
Rules: have≤6, weak≤3, missing≤5. Be concise. JSON only, no extra text.`;

export async function POST(req) {
  if (!anthropic) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { targetRole, cvText, experience, existingSkills } = body;
  if (!targetRole) return NextResponse.json({ error: 'targetRole is required' }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, headline, field, skills, work_status, experience, education')
    .eq('id', user.id)
    .single();

  const profileSkills = profile?.skills || [];
  const inputSkills = existingSkills || [];
  const allSkills = [...new Set([...profileSkills, ...inputSkills])];

  const userPrompt = `Target Role: ${targetRole}

Profile:
- Current headline: ${profile?.headline || 'Not set'}
- Field: ${profile?.field || 'Not set'}
- Work status: ${profile?.work_status || 'Not set'}
- Known skills: ${allSkills.join(', ') || 'None listed'}
${experience ? `- Additional experience: ${experience.slice(0, 1000)}` : ''}
${cvText ? `\nCV/Resume text:\n${cvText.slice(0, 2000)}` : ''}

Analyze the career gap and generate a 3-month roadmap. Return JSON only.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1100,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = response.content[0]?.text || '';
    let result;
    try {
      // Try full parse first, then extract largest JSON object if that fails
      try {
        result = JSON.parse(raw.trim());
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('no JSON found');
        // Handle truncated JSON by attempting repair: close unclosed braces/brackets
        let jsonStr = match[0];
        let opens = (jsonStr.match(/\{/g) || []).length - (jsonStr.match(/\}/g) || []).length;
        let aopens = (jsonStr.match(/\[/g) || []).length - (jsonStr.match(/\]/g) || []).length;
        jsonStr += ']'.repeat(Math.max(0, aopens)) + '}'.repeat(Math.max(0, opens));
        result = JSON.parse(jsonStr);
      }
    } catch {
      // Return a minimal valid structure so the UI doesn't crash
      result = {
        current_level: 'Assessment incomplete',
        level_stars: 2,
        have: allSkills.slice(0, 5),
        weak: [],
        missing: [],
        score: 50,
        summary: 'Could not fully analyze — try with more details in your profile.',
        roadmap: { month_1: { focus: 'Review basics', learn: [], build: '' }, month_2: { focus: 'Build projects', learn: [], build: '' }, month_3: { focus: 'Apply & iterate', learn: [], build: '' } },
        job_titles: [targetRole],
      };
    }

    const { data: saved } = await supabase
      .from('career_analysis')
      .insert({
        user_id: user.id,
        target_role: targetRole,
        skills_found: result.have || [],
        weak_skills: result.weak || [],
        missing_skills: result.missing || [],
        score: result.score || 0,
        summary: result.summary || '',
        roadmap: result.roadmap || {},
        raw_input: cvText?.slice(0, 500) || experience?.slice(0, 500) || '',
      })
      .select()
      .single();

    return NextResponse.json({ analysis: result, id: saved?.id });
  } catch (err) {
    if (err.status === 429) return NextResponse.json({ error: 'AI busy, try again shortly.' }, { status: 503 });
    return NextResponse.json({ error: 'Analysis failed. Try again.' }, { status: 500 });
  }
}

export async function GET(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('career_analysis')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ analyses: data || [] });
}
