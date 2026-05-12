import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/rateLimit';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

async function callAI(systemPrompt, userPrompt) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  if (openai) {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: 2048,
      });
      return res.choices[0].message.content;
    } catch (err) {
      console.warn('OpenAI failed, falling back to Groq:', err.message);
    }
  }
  if (groq) {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.4,
      max_tokens: 2048,
    });
    return res.choices[0].message.content;
  }
  throw new Error('No AI provider configured. Add OPENAI_API_KEY or GROQ_API_KEY.');
}

const GENERATE_SYSTEM = `You are an expert course examiner for the beoneofus developer platform.
Generate exactly 5 exam questions for a course.
Return ONLY a valid JSON array — no markdown, no code fences, no extra text outside the JSON.

Required format:
[
  { "id": 1, "type": "mcq", "question": "...", "options": ["A","B","C","D"], "correct": "A" },
  { "id": 2, "type": "mcq", "question": "...", "options": ["A","B","C","D"], "correct": "B" },
  { "id": 3, "type": "mcq", "question": "...", "options": ["A","B","C","D"], "correct": "C" },
  { "id": 4, "type": "written", "question": "Explain or demonstrate..." },
  { "id": 5, "type": "written", "question": "Describe how you would..." }
]

Rules:
- IDs must be 1 through 5
- Questions 1-3 MUST be type "mcq" with exactly 4 options and a "correct" field matching one of the options exactly
- Questions 4-5 MUST be type "written" with no options/correct field
- Test real conceptual understanding, not trivia
- Difficulty must match the course level`;

const GRADE_SYSTEM = `You are an expert, encouraging course grader for the beoneofus developer platform.
Grade a student's exam and return ONLY a valid JSON object — no markdown, no code fences, no text outside the JSON.

Required format:
{
  "score": 85,
  "passed": true,
  "overall_feedback": "Great work! ...",
  "question_feedback": [
    { "id": 1, "correct": true, "points": 15, "feedback": "Correct! ..." },
    { "id": 2, "correct": false, "points": 0, "feedback": "The correct answer is X because ..." },
    { "id": 3, "correct": true, "points": 15, "feedback": "Correct! ..." },
    { "id": 4, "points": 22, "max_points": 27, "feedback": "Good explanation, but ..." },
    { "id": 5, "points": 25, "max_points": 28, "feedback": "Excellent demonstration of ..." }
  ]
}

Scoring (total 100 pts):
- Each MCQ (Q1-Q3): 15 pts each = 45 pts total (15 if correct, 0 if wrong)
- Each Written (Q4-Q5): up to ~27-28 pts each ≈ 55 pts total
- score field = sum of all points earned (0-100)
- passed = score >= 70

Rules:
- For MCQ: match student answer to correct answer (case-insensitive, partial match OK)
- For written: grade 0-27/28 based on accuracy, depth, and relevance
- overall_feedback: 2 sentences max — be encouraging and specific
- question_feedback must have exactly 5 entries, one per question id 1-5`;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key);
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
  const rl = checkRateLimit(ip, '/api/exam', { max: 10, windowMs: 60_000 });
  if (rl.limited) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  try {
    const body = await req.json();
    const { type } = body;

    // ── Generate exam questions ──────────────────────────────────────────────
    if (type === 'generate') {
      const { courseTitle, category, level } = body;
      if (!courseTitle) return NextResponse.json({ error: 'courseTitle required' }, { status: 400 });

      const prompt = `Generate 5 exam questions for:
Course: "${courseTitle}"
Category: ${category ?? 'General'}
Level: ${level ?? 'Beginner'}

Make questions test real understanding of the subject, increasing in difficulty.`;

      const raw = await callAI(GENERATE_SYSTEM, prompt);
      let questions;
      try {
        questions = parseAIJson(raw);
      } catch {
        return NextResponse.json({ error: 'AI returned malformed JSON. Please try again.' }, { status: 500 });
      }

      if (!Array.isArray(questions) || questions.length !== 5) {
        return NextResponse.json({ error: 'AI did not return 5 questions. Please try again.' }, { status: 500 });
      }

      return NextResponse.json({ questions });
    }

    // ── Grade exam + issue certificate ───────────────────────────────────────
    if (type === 'grade') {
      const { courseTitle, questions, answers, userId, courseId } = body;
      if (!courseTitle || !questions || !answers) {
        return NextResponse.json({ error: 'courseTitle, questions and answers are required' }, { status: 400 });
      }

      const qaText = questions
        .map((q) => {
          const student = answers[q.id] ?? '(no answer provided)';
          if (q.type === 'mcq') {
            return `Q${q.id} [Multiple Choice]\nQuestion: ${q.question}\nOptions: ${q.options.join(' | ')}\nCorrect answer: ${q.correct}\nStudent answered: ${student}`;
          }
          return `Q${q.id} [Written]\nQuestion: ${q.question}\nStudent answered: ${student}`;
        })
        .join('\n\n');

      const prompt = `Grade this exam submission for course: "${courseTitle}"\n\n${qaText}`;
      const raw = await callAI(GRADE_SYSTEM, prompt);

      let result;
      try {
        result = parseAIJson(raw);
      } catch {
        return NextResponse.json({ error: 'AI grading failed. Please try again.' }, { status: 500 });
      }

      // If passed and user info provided → persist to DB
      if (result.passed && userId && courseId) {
        try {
          const supabase = getSupabase();

          // Store exam submission record
          await supabase.from('exam_submissions').insert({
            user_id: userId,
            course_id: courseId,
            questions,
            answers,
            score: result.score,
            passed: true,
            feedback: result.overall_feedback,
          });

          // Upsert certificate (adds exam_score + exam_passed columns if they exist)
          const { data: cert } = await supabase
            .from('user_certificates')
            .upsert(
              {
                user_id: userId,
                course_id: courseId,
                exam_passed: true,
                exam_score: result.score,
              },
              { onConflict: 'user_id, course_id' }
            )
            .select('id')
            .single();

          result.certificateId = cert?.id ?? null;
        } catch (dbErr) {
          console.error('DB error (non-fatal):', dbErr.message);
        }
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid type. Use "generate" or "grade".' }, { status: 400 });
  } catch (err) {
    console.error('Exam API error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
