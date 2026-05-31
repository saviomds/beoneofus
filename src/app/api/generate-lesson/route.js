import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/rateLimit';
import { stripDangerousHtml } from '../../../lib/sanitize';
import OpenAI from 'openai';
import Groq from 'groq-sdk';

export const runtime = 'edge';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// Circuit breaker: skip OpenAI for 5 min after a quota error
let openaiSkipUntil = 0;

const LESSON_SYSTEM = `You are a professional course content creator for the beoneofus learning platform.
Output ONLY clean HTML — no markdown, no backtick fences, no prose outside of HTML tags.

Rules:
- Use <h2> and <h3> for section headings (never <h1>)
- Use <p> for paragraphs with clear explanations
- Use <ul><li> or <ol><li> for lists
- Use <strong> for key terms, <blockquote> for important notes or tips
- Content must be comprehensive, educational, and practical
- Return ONLY the inner HTML — no <html>, <body>, or outer wrapper tags

Code examples rule (READ CAREFULLY):
- ONLY include <pre><code> blocks if the lesson subject actually involves writing or reading code/scripts/markup (e.g. programming, web dev, databases, DevOps, data science).
- If the subject is non-technical (e.g. business, design, photography, marketing, music, cooking, finance, communication, leadership, etc.) do NOT include any code blocks at all. Use real-world examples, case studies, step-by-step prose, and lists instead.`;

const DESCRIPTION_SYSTEM = `You are a course marketing writer for the beoneofus developer platform.
Output ONLY clean HTML — no markdown, no backtick fences.

Rules:
- 2–3 engaging <p> paragraphs that sell the course
- A <ul> list of 4–6 bullet points: "What you will learn:"
- Use <strong> for emphasis
- Be concise, professional, and motivating
- Return ONLY the inner HTML — no <html>, <body>, or outer wrapper tags`;

const BATCH_SYSTEM = `You are a professional course content creator for the beoneofus learning platform.
Output each lesson using EXACTLY this delimiter format — repeat the block for every lesson. No JSON. No markdown. No extra text outside the blocks.

<<<LESSON>>>
TITLE: Your lesson title here
<<<CONTENT>>>
<h2>Section heading</h2>
<p>Explanation paragraph...</p>
<<<END>>>

HTML content rules:
- Use <h2> and <h3> for headings (never <h1>)
- Use <p> for paragraphs, <ul><li> or <ol><li> for lists
- Use <strong> for key terms, <blockquote> for important notes or tips
- No <html>, <body>, or outer wrapper tags

Code examples rule (READ CAREFULLY):
- ONLY use <pre><code class="language-LANG"> blocks if the course subject involves writing or reading code/scripts/markup (e.g. programming, web dev, databases, DevOps, data science).
- If the course is non-technical (e.g. business, design, photography, marketing, music, cooking, finance, communication, leadership, etc.) do NOT include any code blocks. Use real-world examples, case studies, step-by-step instructions, and lists instead.

Output ONLY the <<<LESSON>>> blocks — nothing before the first block, nothing after the last <<<END>>>.`;

async function callAI(systemPrompt, userPrompt, maxTokens = 4096) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  if (openai && Date.now() > openaiSkipUntil) {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      });
      return res.choices[0].message.content;
    } catch (err) {
      if (err.status === 429) {
        openaiSkipUntil = Date.now() + 5 * 60 * 1000;
        console.warn('OpenAI quota exceeded — switching to Groq for 5 min.');
      } else {
        console.warn('OpenAI failed, falling back to Groq:', err.message);
      }
    }
  }

  if (groq) {
    // Try primary model, fall back to lighter model on quota/rate errors
    for (const model of ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']) {
      try {
        const res = await groq.chat.completions.create({
          model,
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
        });
        return res.choices[0].message.content;
      } catch (err) {
        const isQuota = err.status === 429 || err.status === 413;
        if (isQuota && model !== 'llama-3.1-8b-instant') {
          console.warn(`Groq ${model} quota hit — trying llama-3.1-8b-instant.`);
          continue;
        }
        throw err;
      }
    }
  }

  throw new Error('No AI provider configured. Add OPENAI_API_KEY or GROQ_API_KEY.');
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';

  try {
    const { courseTitle, lessonTitle, category, level, type = 'lesson', count, topics, existingTitles } = await req.json();

    // Batch generation — separate rate limit (3 per 3 minutes, heavier call)
    if (type === 'batch') {
      const rl = checkRateLimit(ip, '/api/generate-lesson/batch', { max: 3, windowMs: 180_000 });
      if (rl.limited) {
        const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
        return NextResponse.json(
          { error: `Rate limited. Please wait ${retryAfter}s before generating more lessons.`, retryAfter },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        );
      }
      if (!courseTitle || !count || count < 1) {
        return NextResponse.json({ error: 'courseTitle and count required' }, { status: 400 });
      }
      const n = Math.min(count, 5); // cap at 5 per batch to stay within token limits
      const topicHint = topics?.length ? `\nCover these topics: ${topics.slice(0, 8).join(', ')}.` : '';
      const skipHint = existingTitles?.length ? `\nSkip topics already covered: ${existingTitles.join(', ')}.` : '';
      const prompt = `Generate exactly ${n} lessons for this course:
Course: "${courseTitle}" (${category || 'General'}, ${level || 'Beginner'} level)${topicHint}${skipHint}

Lessons must flow logically from beginner to advanced. Use the <<<LESSON>>> delimiter format from your instructions.`;

      const raw = await callAI(BATCH_SYSTEM, prompt, 4096);

      // Parse delimiter-based format — immune to HTML quote escaping issues
      const lessons = [];
      const blocks = raw.split('<<<LESSON>>>');
      for (const block of blocks) {
        const contentIdx = block.indexOf('<<<CONTENT>>>');
        if (contentIdx === -1) continue;
        const endIdx = block.indexOf('<<<END>>>');
        const titleRaw = block.slice(0, contentIdx);
        const title = titleRaw.replace(/^TITLE:\s*/i, '').trim();
        const content = block.slice(contentIdx + 13, endIdx === -1 ? undefined : endIdx).trim();
        if (title && content) lessons.push({ title, content: stripDangerousHtml(content) });
      }

      if (lessons.length === 0) {
        console.error('Batch parse: no lessons found. Raw (first 800):', raw.slice(0, 800));
        return NextResponse.json({ error: 'AI returned no lessons. Try again.' }, { status: 500 });
      }
      return NextResponse.json({ lessons });
    }

    // Regular single-lesson rate limit
    const rl = checkRateLimit(ip, '/api/generate-lesson', { max: 5, windowMs: 60_000 });
    if (rl.limited) {
      return NextResponse.json({ error: 'Too many requests' }, {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      });
    }

    if (type === 'description') {
      if (!courseTitle) {
        return NextResponse.json({ error: 'courseTitle required' }, { status: 400 });
      }
      const prompt = `Write a course description for:
Course: "${courseTitle}"
Category: ${category || 'General'}
Level: ${level || 'Beginner'}`;

      const html = await callAI(DESCRIPTION_SYSTEM, prompt);
      return NextResponse.json({ html });
    }

    // Default: generate lesson content
    if (!lessonTitle || !courseTitle) {
      return NextResponse.json({ error: 'courseTitle and lessonTitle required' }, { status: 400 });
    }

    const prompt = `Create a complete lesson for:
Course: "${courseTitle}" (${category || 'General'}, ${level || 'Beginner'} level)
Lesson title: "${lessonTitle}"

Write a comprehensive lesson with clear explanations and practical code examples.`;

    const rawHtml = await callAI(LESSON_SYSTEM, prompt);
    return NextResponse.json({ html: stripDangerousHtml(rawHtml) });
  } catch (err) {
    console.error('generate-lesson error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
