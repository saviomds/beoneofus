// src/app/supabaseClient.js
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing. Run: vercel env pull .env.local --environment production && restart dev server.');
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
  : /** @type {any} */ (null);
