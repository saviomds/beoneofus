// Cross-link target for the public BeOneOfUs platform (apps/web).
// Set VITE_WEB_URL per environment; the default is the local Next dev port.
export const WEB_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:3000'
