import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Groq from 'groq-sdk';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const LESSON_SYSTEM = `You are a professional technical course content creator for the beoneofus developer platform.
Output ONLY clean HTML — no markdown, no backtick fences, no prose outside of HTML tags.

Rules:
- Use <h2> and <h3> for section headings (never <h1>)
- Use <p> for paragraphs with clear explanations
- Use <ul><li> or <ol><li> for lists
- Wrap ALL code samples in: <pre><code class="language-LANG">code here</code></pre>
  Replace LANG with: javascript, typescript, python, bash, css, html, sql, json, go, rust, java, c, cpp, etc.
- Use <strong> for key terms, <blockquote> for important notes
- Include at least 2–3 real, runnable code examples for technical topics
- Content must be comprehensive, educational, and practical
- Return ONLY the inner HTML — no <html>, <body>, or outer wrapper tags`;

const DESCRIPTION_SYSTEM = `You are a course marketing writer for the beoneofus developer platform.
Output ONLY clean HTML — no markdown, no backtick fences.

Rules:
- 2–3 engaging <p> paragraphs that sell the course
- A <ul> list of 4–6 bullet points: "What you will learn:"
- Use <strong> for emphasis
- Be concise, professional, and motivating
- Return ONLY the inner HTML — no <html>, <body>, or outer wrapper tags`;

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
        temperature: 0.7,
        max_tokens: 4096,
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
      temperature: 0.7,
      max_tokens: 4096,
    });
    return res.choices[0].message.content;
  }

  throw new Error('No AI provider configured. Add OPENAI_API_KEY or GROQ_API_KEY.');
}

export async function POST(req) {
  try {
    const { courseTitle, lessonTitle, category, level, type = 'lesson' } = await req.json();

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

    const html = await callAI(LESSON_SYSTEM, prompt);
    return NextResponse.json({ html });
  } catch (err) {
    console.error('generate-lesson error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
