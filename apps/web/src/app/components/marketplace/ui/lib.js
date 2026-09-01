// ── Shared helpers & motion presets for the premium marketplace UI ──────────
// Hybrid stack: Tailwind v4 (mkt-* tokens) + Framer Motion for premium motion.

/** Join class names, dropping falsy values. */
export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

/** Format a USD price. Returns "Free" for 0/null. */
export function formatPrice(value, currency = "USD") {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "Free";
  const opts = { style: "currency", currency, minimumFractionDigits: n % 1 === 0 ? 0 : 2 };
  try { return new Intl.NumberFormat("en-US", opts).format(n); }
  catch { return `$${n}`; }
}

/** Compact number: 1200 → "1.2k". */
export function compact(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

// Standard timing — spec calls for 200–300ms, ease-out feel.
export const EASE = [0.22, 1, 0.36, 1];
export const DUR = { fast: 0.18, base: 0.24, slow: 0.32 };

// Reusable Framer Motion variants.
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: DUR.slow, ease: EASE, delay: i * 0.05 },
  }),
};

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export const pop = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: DUR.base, ease: EASE } },
};

// Press feedback shared by interactive elements.
export const pressable = { whileTap: { scale: 0.97 }, transition: { duration: DUR.fast, ease: EASE } };
