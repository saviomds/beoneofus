// Minimal classname joiner — drops falsy values. No clsx/tailwind-merge dep;
// keep class lists non-conflicting at the call site.
export function cn(...parts) {
  return parts.flat().filter(Boolean).join(' ');
}

export default cn;
