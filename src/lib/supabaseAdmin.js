import { createClient } from '@supabase/supabase-js';

// Single server-side admin client — import this instead of calling createClient in each route
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser (no NEXT_PUBLIC_ prefix)
let _client = null;
function getSupabaseAdmin() {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _client;
}

// Proxy so existing imports (`supabaseAdmin.from(...)`) keep working unchanged
export const supabaseAdmin = new Proxy({}, {
  get(_, prop) {
    return getSupabaseAdmin()[prop];
  },
});
