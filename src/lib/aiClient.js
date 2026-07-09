// ── Resilient AI chat client ────────────────────────────────────────────────
// Drop-in replacement for a Groq client's `.chat.completions.create(...)`.
// Prefers Groq when a REAL Groq key (gsk_...) is present; otherwise — or if the
// Groq call errors — transparently falls back to Anthropic (claude-haiku-4-5).
// Returns a Groq/OpenAI-shaped result so existing call sites need no changes:
//   const c = await aiClient.chat.completions.create({ model, messages, ... });
//   c.choices[0].message.content
//
// This keeps every AI feature working even when GROQ_API_KEY is missing or
// misconfigured (e.g. accidentally holding a Resend key).

import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

// Validate by prefix so a mis-pasted key (e.g. a Resend re_… in GROQ_API_KEY) is
// skipped rather than 401-ing: Groq = gsk_, Anthropic = sk-ant-, OpenAI = sk-…
// (but NOT sk-ant-, which is Anthropic).
const groqUsable = GROQ_KEY.startsWith('gsk_');
const anthropicUsable = ANTHROPIC_KEY.startsWith('sk-ant-');
const openaiUsable = OPENAI_KEY.startsWith('sk-') && !OPENAI_KEY.startsWith('sk-ant-');

const _groq = groqUsable ? new Groq({ apiKey: GROQ_KEY, maxRetries: 1 }) : null;
const _anthropic = anthropicUsable ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null;
const _openai = openaiUsable ? new OpenAI({ apiKey: OPENAI_KEY, maxRetries: 1 }) : null;

// Small, fast, cheap fallback models per provider.
const FALLBACK_MODEL = 'claude-haiku-4-5';
const OPENAI_MODEL = 'gpt-4o-mini';

function textFrom(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((p) => (typeof p === 'string' ? p : p?.text || '')).join(' ');
  return '';
}

// Convert OpenAI/Groq message content → Anthropic content (handles vision parts).
function toAnthropicContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content ?? '');
  const blocks = [];
  for (const part of content) {
    if (typeof part === 'string') { if (part) blocks.push({ type: 'text', text: part }); continue; }
    if (part?.type === 'text' && part.text) { blocks.push({ type: 'text', text: part.text }); continue; }
    const url = part?.image_url?.url || (typeof part?.image_url === 'string' ? part.image_url : null);
    if (url) {
      const m = /^data:([^;]+);base64,(.*)$/.exec(url);
      if (m) blocks.push({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } });
      else blocks.push({ type: 'image', source: { type: 'url', url } });
    }
  }
  return blocks.length ? blocks : '';
}

function stripFences(s) {
  return String(s || '').replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

async function anthropicCreate({ messages = [], max_tokens = 1024, response_format } = {}) {
  const wantJson = response_format?.type === 'json_object';

  // Anthropic takes the system prompt as a separate top-level field.
  const sys = messages.filter((m) => m.role === 'system').map((m) => textFrom(m.content)).filter(Boolean);
  if (wantJson) sys.push('Return ONLY valid JSON with no markdown, code fences, or commentary.');

  let convo = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: toAnthropicContent(m.content) }))
    .filter((m) => (typeof m.content === 'string' ? m.content.trim() : m.content.length));

  // Anthropic requires a non-empty first user turn.
  if (!convo.length) convo = [{ role: 'user', content: textFrom(messages.map((m) => m.content).join('\n')) || 'Hello' }];

  const resp = await _anthropic.messages.create({
    model: FALLBACK_MODEL,
    max_tokens: Math.min(Math.max(Number(max_tokens) || 1024, 16), 8000),
    ...(sys.length ? { system: sys.join('\n\n') } : {}),
    messages: convo,
  });

  let text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (wantJson) text = stripFences(text);
  return text;
}

// OpenAI is already OpenAI-shaped; just swap in an OpenAI model (Groq model ids
// like llama-3.3-70b won't exist there) and tag the provider.
async function openaiCreate(params = {}) {
  const r = await _openai.chat.completions.create({ ...params, model: OPENAI_MODEL });
  return { choices: r.choices, model: r.model, _provider: 'openai' };
}

// Try each configured provider in preference order, falling through on error so a
// single provider outage (or an unfunded account) never takes a feature down.
async function create(params = {}) {
  let lastErr = null;

  if (_groq) {
    try { return await _groq.chat.completions.create(params); }
    catch (err) { lastErr = err; }
  }
  if (_openai) {
    try { return await openaiCreate(params); }
    catch (err) { lastErr = err; }
  }
  if (_anthropic) {
    try {
      const content = await anthropicCreate(params);
      return {
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
        model: FALLBACK_MODEL,
        _provider: 'anthropic',
      };
    } catch (err) { lastErr = err; }
  }

  throw lastErr || new Error('No AI provider configured (set GROQ_API_KEY=gsk_…, OPENAI_API_KEY=sk-…, or ANTHROPIC_API_KEY=sk-ant-…)');
}

export const aiClient = {
  /** true when at least one provider (Groq, OpenAI, or Anthropic) is usable. */
  available: !!(_groq || _openai || _anthropic),
  chat: { completions: { create } },
};

export default aiClient;
