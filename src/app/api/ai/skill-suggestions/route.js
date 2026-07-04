import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiClient } from '../../../../lib/aiClient';
import OpenAI from 'openai';


const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const CACHE_TTL_HOURS = 24;

const SYSTEM_PROMPT = `You are a career advisor for a global professional network called BeOneOfUs.
Your job is to recommend the next skills a professional should learn based on their current profile.
Return ONLY valid JSON — no markdown, no explanation, no extra text.
The JSON must be an array of exactly 6 objects with this shape:
[{ "skill": "string", "reason": "string (max 12 words)", "priority": "high"|"medium"|"low", "category": "string" }]`;

async function callAI(prompt) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];

  // Prefer the shared client (Groq → Anthropic) when a provider is configured;
  // fall back to OpenAI on absence OR failure.
  if (aiClient.available) {
    try {
      const res = await aiClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages, temperature: 0.6, max_tokens: 600,
      });
      const content = res.choices[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      if (!openai) throw err; // no fallback → surface the error
    }
  }

  if (openai) {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages, temperature: 0.6, max_tokens: 600,
    });
    return res.choices[0]?.message?.content;
  }

  return null;
}

function buildPrompt(profile) {
  const skills   = (profile.skills || []).join(', ') || 'not specified';
  const role     = profile.role        || 'professional';
  const field    = profile.field       || 'general';
  const status   = profile.work_status || 'employed';
  const username = profile.username    || 'user';

  return `Professional profile for ${username}:
- Role / title: ${role}
- Industry / field: ${field}
- Current skills: ${skills}
- Work status: ${status}

Based on their current skills and role, suggest 6 specific skills they should learn next to advance their career.
Prioritize skills that are in high demand globally and complement what they already know.
Return JSON only.`;
}

export async function POST(request) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check cache first
    const { data: cached } = await supabase
      .from('skill_suggestions')
      .select('suggestions, generated_at')
      .eq('user_id', user.id)
      .single();

    if (cached?.generated_at) {
      const ageHours = (Date.now() - new Date(cached.generated_at).getTime()) / 3600000;
      if (ageHours < CACHE_TTL_HOURS && Array.isArray(cached.suggestions) && cached.suggestions.length > 0) {
        return NextResponse.json({ suggestions: cached.suggestions, cached: true });
      }
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, role, field, skills, work_status')
      .eq('id', user.id)
      .single();

    if (!aiClient.available && !openai) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const prompt = buildPrompt(profile || {});
    const raw    = await callAI(prompt);

    if (!raw) return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });

    let suggestions;
    try {
      const jsonStr = raw.match(/\[[\s\S]*\]/)?.[0] || raw;
      suggestions = JSON.parse(jsonStr);
      if (!Array.isArray(suggestions)) throw new Error('not an array');
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Upsert cache
    await supabase.from('skill_suggestions').upsert({
      user_id:      user.id,
      suggestions,
      generated_at: new Date().toISOString(),
    });

    return NextResponse.json({ suggestions, cached: false });
  } catch (err) {
    console.error('skill-suggestions error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Force refresh
export async function DELETE(request) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('skill_suggestions').delete().eq('user_id', user.id);
  return NextResponse.json({ cleared: true });
}
