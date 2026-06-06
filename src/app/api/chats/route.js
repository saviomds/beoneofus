import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/rateLimit';
import OpenAI from 'openai';
import Groq from 'groq-sdk';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const SYSTEM_PROMPT = `You are beoneofus AI, a highly skilled career assistant and software engineering mentor for the beoneofus developer network.
You help users with: coding problems, system design, career advice, CV/resume reviews, job search strategies, interview prep, and project ideas.

When responding in voice/spoken mode, produce a natural spoken reply — conversational, clear, and concise. Avoid bullet points, headers, or markdown formatting in voice responses; instead write in flowing sentences as if speaking aloud. Match the tone to the user's context: warm and encouraging for career topics, precise and calm for technical questions.

When responding in text/chat mode, be concise, professional, and practical. Use markdown for code snippets and structured answers.

When shown images, describe what you see and answer questions about them accurately.

Always generate your text reply first, then it will be passed to a text-to-speech engine — so write in a way that sounds natural when read aloud.`;

/* ── Detect if messages contain any image content ── */
function hasImageContent(messages) {
  return messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === "image_url"));
}

/* ── Flatten array content to plain text (for models that don't support vision) ── */
function flattenMessages(messages) {
  return messages.map(m => {
    if (!Array.isArray(m.content)) return m;
    const text = m.content
      .map(p => p.type === "text" ? p.text : p.type === "image_url" ? "[image attached]" : "")
      .filter(Boolean)
      .join("\n");
    return { ...m, content: text };
  });
}

/* ── OpenAI — gpt-4o-mini supports both text and vision ── */
async function callOpenAI(messages) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  });
  return completion.choices[0].message.content;
}

/* ── Groq — use vision model when images present ── */
async function callGroq(messages, withImages) {
  if (withImages) {
    /* llama-3.2-11b-vision-preview: only accepts image in the last user message */
    const lastIdx = [...messages].map((m, i) => m.role === 'user' ? i : -1).filter(i => i >= 0).at(-1);
    const prepared = messages.map((m, i) => {
      if (!Array.isArray(m.content)) return m;
      if (i === lastIdx) return m; // keep image in last user message
      // flatten earlier messages to text
      const text = m.content.map(p => p.type === "text" ? p.text : "[image]").join("\n");
      return { ...m, content: text };
    });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.2-11b-vision-preview',
      messages: prepared,
      temperature: 0.7,
      max_tokens: 2048,
    });
    return completion.choices[0].message.content;
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: flattenMessages(messages),
    temperature: 0.7,
    max_tokens: 2048,
  });
  return completion.choices[0].message.content;
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const rl = checkRateLimit(ip, '/api/chats', { max: 20, windowMs: 60_000 });
  if (rl.limited) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const fullMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
    const withImages   = hasImageContent(fullMessages);
    let content  = null;
    let lastError = null;

    /* Try OpenAI first (supports vision natively) */
    if (openai) {
      try {
        content = await callOpenAI(fullMessages);
      } catch (err) {
        lastError = err;
        console.warn('OpenAI failed, falling back to Groq:', err.message);
      }
    }

    /* Groq fallback */
    if (!content && groq) {
      try {
        content = await callGroq(fullMessages, withImages);
      } catch (err) {
        lastError = err;
        console.error('Groq failed:', err.message);
      }
    }

    if (!content) {
      if (!openai && !groq) {
        return NextResponse.json(
          { error: 'No AI provider configured. Add OPENAI_API_KEY or GROQ_API_KEY to your environment variables.' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: lastError?.message || 'AI service temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ message: { role: 'assistant', content } });
  } catch (error) {
    console.error('AI route error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
