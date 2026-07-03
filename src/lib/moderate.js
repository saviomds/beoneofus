import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/**
 * AI-assisted content moderation. Server-only.
 * Fails OPEN (returns not-flagged) when the model is unavailable — moderation
 * is a safety net, not a hard gate that should block legitimate users on error.
 *
 * @returns {Promise<{flagged:boolean, severity:'none'|'low'|'medium'|'high', categories:string[], reason:string, engine:string}>}
 */
export async function moderateText(text, kind = 'content') {
  const clean = (text || '').trim();
  if (!clean) return { flagged: false, severity: 'none', categories: [], reason: '', engine: 'empty' };
  if (!anthropic) return { flagged: false, severity: 'none', categories: [], reason: '', engine: 'disabled' };

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system:
        'You are a content-safety classifier for a professional opportunity network (jobs, mentorship, learning, organizations). Classify text for: fraud/scam, hate/harassment, sexual content, violence/threats, spam, and misrepresentation. Legitimate professional, business, and civic content is fine. Return JSON only: {"flagged":boolean,"severity":"none|low|medium|high","categories":[...],"reason":"<=14 words"}. Reserve "high" for clear, serious violations.',
      messages: [{ role: 'user', content: `Kind: ${kind}\nText:\n"""${clean.slice(0, 4000)}"""\n\nClassify. JSON only.` }],
    });
    const raw = resp.content[0]?.text || '';
    let v;
    try { v = JSON.parse(raw.trim()); }
    catch { v = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0]); }

    const severity = ['none', 'low', 'medium', 'high'].includes(v.severity)
      ? v.severity : (v.flagged ? 'medium' : 'none');
    return {
      flagged: !!v.flagged,
      severity,
      categories: Array.isArray(v.categories) ? v.categories.slice(0, 6) : [],
      reason: typeof v.reason === 'string' ? v.reason.slice(0, 140) : '',
      engine: 'ai',
    };
  } catch {
    return { flagged: false, severity: 'none', categories: [], reason: '', engine: 'error' };
  }
}
