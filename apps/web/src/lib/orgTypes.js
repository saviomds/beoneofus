import {
  Building2, Landmark, GraduationCap, HeartPulse, HandHeart, Users2, Sparkles,
} from 'lucide-react';

/**
 * Per-institution-type design + copy system.
 *
 * Each participant type reads as a distinct, credible vertical rather than one
 * generic style — government/public sector leans authoritative slate, healthcare
 * uses the trust (teal) accent, education/business use the primary brand, and
 * NGO/community use the warmer premium (amber). Class strings are literal so
 * Tailwind's content scanner picks them up (no dynamic class construction).
 */

// Accent presets — full literal class strings (Tailwind-safe)
const ACCENT = {
  brand: {
    icon: 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300',
    chip: 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300',
    dot: 'bg-brand-500',
    ring: 'hover:border-brand-300 dark:hover:border-brand-500/40',
    solid: 'bg-brand-500',
  },
  trust: {
    icon: 'bg-trust-50 dark:bg-trust-500/15 text-trust-600 dark:text-trust-500',
    chip: 'bg-trust-50 dark:bg-trust-500/15 text-trust-600 dark:text-trust-500',
    dot: 'bg-trust-500',
    ring: 'hover:border-trust-500/50',
    solid: 'bg-trust-500',
  },
  premium: {
    icon: 'bg-premium-50 dark:bg-premium-500/15 text-premium-600 dark:text-premium-500',
    chip: 'bg-premium-50 dark:bg-premium-500/15 text-premium-600 dark:text-premium-500',
    dot: 'bg-premium-500',
    ring: 'hover:border-premium-500/50',
    solid: 'bg-premium-500',
  },
  slate: {
    icon: 'bg-slate-100 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300',
    chip: 'bg-slate-100 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-500',
    ring: 'hover:border-slate-400/60',
    solid: 'bg-slate-700',
  },
};

export const ORG_TYPES = {
  business: {
    label: 'Business', icon: Building2, accent: ACCENT.brand,
    blurb: 'Hire, upskill, and engage talent through one verified channel — with AI insight into your talent pool.',
  },
  government: {
    label: 'Government', icon: Landmark, accent: ACCENT.slate,
    blurb: 'Reach citizens with employment, training, and civic programs on a trusted, measurable channel.',
  },
  education: {
    label: 'Education', icon: GraduationCap, accent: ACCENT.brand,
    blurb: 'Connect courses and graduates directly to real-world opportunity and employer demand.',
  },
  healthcare: {
    label: 'Healthcare', icon: HeartPulse, accent: ACCENT.trust,
    blurb: 'Extend access and wellbeing support into the professional network — verified and secure.',
  },
  ngo: {
    label: 'NGO', icon: HandHeart, accent: ACCENT.premium,
    blurb: 'Reach and mobilize communities around programs and support, with a verified presence.',
  },
  community: {
    label: 'Community', icon: Users2, accent: ACCENT.premium,
    blurb: 'Give grassroots groups a verified, connected home inside the wider opportunity graph.',
  },
  other: {
    label: 'Organization', icon: Sparkles, accent: ACCENT.slate,
    blurb: 'A verified presence on the opportunity graph.',
  },
};

export const ORG_TYPE_ORDER = ['business', 'government', 'education', 'healthcare', 'ngo', 'community'];

export function orgMeta(type) {
  return ORG_TYPES[type] || ORG_TYPES.other;
}
