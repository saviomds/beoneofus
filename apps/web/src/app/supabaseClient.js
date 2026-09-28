// src/app/supabaseClient.js
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // warn, not error: Next's dev overlay treats console.error as a crash.
  console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing. Run `vercel env pull .env.local` in apps/web (or copy .env.example) and restart the dev server.');
}

// Stand-in used when the public env vars are missing, so pages render as
// "signed out, no data" instead of crashing on `null.from(...)`. Every query
// chain resolves to { data: null, error } like a failed Supabase call.
function createUnconfiguredClient() {
  const error = { message: 'Supabase is not configured', code: 'unconfigured' };
  const result = { data: null, error, count: null };
  const chain = new Proxy(function () {}, {
    get(_, prop) {
      if (prop === 'then') return (resolve) => resolve(result);
      return chain;
    },
    apply() { return chain; },
  });
  const noSub = { data: { subscription: { unsubscribe() {} } } };
  return {
    auth: new Proxy({
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => noSub,
      signOut: async () => ({ error: null }),
    }, {
      get: (target, prop) => (prop in target ? target[prop] : async () => ({ data: { user: null, session: null }, error })),
    }),
    from: () => chain,
    rpc: () => chain,
    storage: { from: () => chain },
    channel: () => chain,
    removeChannel: () => {},
    removeAllChannels: () => {},
  };
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        // Keep the in-tab access token fresh. With this off, an open tab starts
        // getting 401s ~1h after login until a full navigation lets middleware
        // refresh the cookie — one of the "session randomly drops" symptoms.
        autoRefreshToken: true,
        // OAuth / magic-link / email-confirm codes are exchanged server-side in
        // src/app/auth/callback/route.js (PKCE), so the browser client never
        // needs to parse tokens out of the URL.
        detectSessionInUrl: false,
      },
    })
  : /** @type {any} */ (createUnconfiguredClient());
