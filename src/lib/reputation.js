/**
 * Reputation signal — a transparent, portable score derived from real
 * verified outcomes: review ratings, review volume, skill endorsements, and
 * verified identity. Pure function, safe on client or server.
 *
 * @param {{reviews?: Array<{rating?:number, verified?:boolean}>, endorsementCount?: number, isVerified?: boolean}} input
 */
export function computeReputation({ reviews = [], endorsementCount = 0, isVerified = false } = {}) {
  const reviewCount = reviews.length;
  const avg = reviewCount ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviewCount : 0;
  const verifiedReviews = reviews.filter((r) => r.verified).length;

  // 0–100 blend — quality, volume, endorsements, verified identity.
  let score = 0;
  score += Math.min(45, (avg / 5) * 45);          // rating quality
  score += Math.min(25, reviewCount * 3);          // review volume
  score += Math.min(15, endorsementCount * 1.5);   // endorsements
  score += isVerified ? 15 : 0;                    // verified identity
  score = Math.round(score);

  const tier =
    score >= 80 ? { label: 'Excellent', tone: 'trust' } :
    score >= 60 ? { label: 'Strong',    tone: 'brand' } :
    score >= 35 ? { label: 'Building',  tone: 'premium' } :
                  { label: 'New',       tone: 'slate' };

  const signals = [];
  if (isVerified) signals.push('Verified identity');
  if (verifiedReviews) signals.push(`${verifiedReviews} verified review${verifiedReviews > 1 ? 's' : ''}`);
  if (reviewCount) signals.push(`${reviewCount} review${reviewCount > 1 ? 's' : ''}`);
  if (endorsementCount) signals.push(`${endorsementCount} endorsement${endorsementCount > 1 ? 's' : ''}`);
  if (signals.length === 0) signals.push('Reputation grows with reviews, endorsements & verification');

  return { score, tier, avg: Math.round(avg * 10) / 10, reviewCount, endorsementCount, verifiedReviews, signals };
}

export const REP_TONE = {
  trust:   { text: 'text-trust-600 dark:text-trust-500',   ring: 'bg-trust-500',   soft: 'bg-trust-50 dark:bg-trust-500/15' },
  brand:   { text: 'text-brand-600 dark:text-brand-400',   ring: 'bg-brand-500',   soft: 'bg-brand-50 dark:bg-brand-500/15' },
  premium: { text: 'text-premium-600 dark:text-premium-500', ring: 'bg-premium-500', soft: 'bg-premium-50 dark:bg-premium-500/15' },
  slate:   { text: 'text-gray-500 dark:text-gray-400',     ring: 'bg-gray-400',    soft: 'bg-gray-100 dark:bg-white/5' },
};
