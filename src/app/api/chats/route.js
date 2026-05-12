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
Be concise, professional, encouraging, and practical. Use markdown for code snippets and structured answers.`;

async function callOpenAI(messages) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  });
  return completion.choices[0].message.content;
}

async function callGroq(messages) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  });
  return completion.choices[0].message.content;
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const rl = checkRateLimit(ip, '/api/chats', { max: 15, windowMs: 60_000 });
  if (rl.limited) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const fullMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
    let content = null;
    let lastError = null;

    if (openai) {
      try {
        content = await callOpenAI(fullMessages);
      } catch (err) {
        lastError = err;
        console.warn('OpenAI failed, trying Groq fallback:', err.message);
      }
    }

    if (!content && groq) {
      try {
        content = await callGroq(fullMessages);
      } catch (err) {
        lastError = err;
        console.error('Groq also failed:', err.message);
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
        { error: 'AI service temporarily unavailable. Please try again in a moment.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ message: { role: 'assistant', content } });
  } catch (error) {
    console.error('AI route error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
