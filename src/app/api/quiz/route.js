import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/rateLimit';
import { stripDangerousHtml } from '../../../lib/sanitize';
import OpenAI from 'openai';
import { aiClient } from '../../../lib/aiClient';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const groq = aiClient; // Groq when a real gsk_ key exists, else Anthropic fallback

let openaiSkipUntil = 0;

async function callAI(systemPrompt, userPrompt) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userPrompt  },
  ];
  if (openai && Date.now() > openaiSkipUntil) {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini', messages, temperature: 0.5, max_tokens: 4096,
      });
      return res.choices[0].message.content;
    } catch (err) {
      if (err.status === 429) {
        openaiSkipUntil = Date.now() + 5 * 60 * 1000;
        console.warn('OpenAI quota — switching to Groq for 5 min.');
      } else {
        console.warn('OpenAI failed, falling back to Groq:', err.message);
      }
    }
  }
  if (groq) {
    for (const model of ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']) {
      try {
        const res = await groq.chat.completions.create({
          model, messages, temperature: 0.5, max_tokens: 4096,
        });
        return res.choices[0].message.content;
      } catch (err) {
        const isQuota = err.status === 429 || err.status === 413;
        if (isQuota && model !== 'llama-3.1-8b-instant') { continue; }
        throw err;
      }
    }
  }
  throw new Error('No AI provider configured. Add OPENAI_API_KEY or GROQ_API_KEY.');
}

function buildSystem(count) {
  return `You are an expert quiz designer. Generate exactly ${count} multiple-choice quiz questions.
Return ONLY a valid JSON array — no markdown, no code fences, no text outside the JSON.

Required format:
[
  {
    "id": 1,
    "questionType": "recall",
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": "A. ...",
    "explanation": "One or two sentences explaining why this answer is correct."
  }
]

Rules:
- Generate exactly ${count} questions numbered 1 through ${count}
- Distribute question types evenly: "recall" (factual memory), "application" (apply concepts), "analysis" (evaluate/compare/infer)
  — Aim for roughly 1/3 each; never skip any type
- Every question MUST have exactly 4 options labelled A through D (e.g. "A. Paris")
- "correct" MUST exactly match one of the four option strings
- "explanation" must reference the correct answer and briefly explain why the others are wrong
- Questions must test real understanding, not trivial wording
- Vary difficulty: some easy, most medium, a few hard`;
}

function parseAIJson(raw) {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const rl = checkRateLimit(ip, '/api/quiz', { max: 15, windowMs: 60_000 });
  if (rl.limited) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  try {
    const body = await req.json();
    const { topic, material, count: rawCount } = body;

    if (!topic?.trim() && !material?.trim()) {
      return NextResponse.json({ error: 'topic or material is required' }, { status: 400 });
    }

    const count = Math.min(Math.max(parseInt(rawCount, 10) || 10, 5), 20);

    const topicLine   = topic?.trim()    ? `Topic: "${topic.trim()}"` : '';
    const materialLine = material?.trim()
      ? `\n\nCourse material to base questions on:\n---\n${material.trim().slice(0, 6000)}\n---`
      : '';

    const userPrompt = `${topicLine}${materialLine}\n\nGenerate ${count} MCQ questions covering recall, application, and analysis.`;

    const raw = await callAI(buildSystem(count), userPrompt);

    let questions;
    try {
      questions = parseAIJson(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned malformed JSON. Please try again.' }, { status: 500 });
    }

    if (!Array.isArray(questions) || questions.length < count - 1) {
      return NextResponse.json({ error: `AI returned fewer questions than expected. Please try again.` }, { status: 500 });
    }

    // Sanitize text fields
    const safe = questions.slice(0, count).map((q, i) => ({
      id:           q.id ?? i + 1,
      questionType: ['recall','application','analysis'].includes(q.questionType) ? q.questionType : 'recall',
      question:     stripDangerousHtml(String(q.question ?? '')),
      options:      Array.isArray(q.options) ? q.options.map(o => stripDangerousHtml(String(o))) : [],
      correct:      stripDangerousHtml(String(q.correct ?? '')),
      explanation:  stripDangerousHtml(String(q.explanation ?? '')),
    }));

    return NextResponse.json({ questions: safe });
  } catch (err) {
    console.error('Quiz API error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
