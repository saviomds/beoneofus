// Cross-link target for the BeOneOfUs education & government portal (apps/core).
// Set NEXT_PUBLIC_CORE_URL per environment; the default is the local dev port.
export const CORE_URL =
  process.env.NEXT_PUBLIC_CORE_URL || 'http://localhost:5173';

// Deep link straight to the Core sign-in screen.
export const CORE_LOGIN_URL = `${CORE_URL.replace(/\/$/, '')}/login`;
