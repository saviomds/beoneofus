// src/app/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  throw new Error(`Invalid Supabase URL: "${supabaseUrl}". Make sure it includes the "https://" prefix.`);
}

// Cookie name the middleware reads to verify the session
const COOKIE_NAME = 'sb-at';

// Custom storage: keeps localStorage as primary, syncs access token to a
// same-site cookie so middleware can verify auth server-side.
const cookieSyncStorage = {
  getItem: (key) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
    try {
      const parsed = JSON.parse(value);
      // Supabase stores the session as either an object or a JSON array
      const token = Array.isArray(parsed)
        ? parsed[0]?.access_token
        : parsed?.access_token;
      const expiresIn = Array.isArray(parsed)
        ? parsed[0]?.expires_in
        : parsed?.expires_in;
      if (token) {
        const secure = location.protocol === 'https:' ? ';Secure' : '';
        const maxAge = typeof expiresIn === 'number' ? expiresIn : 3600;
        document.cookie = `${COOKIE_NAME}=${token};path=/;max-age=${maxAge};SameSite=Lax${secure}`;
      }
    } catch {
      // Non-JSON storage key — ignore
    }
  },
  removeItem: (key) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
    document.cookie = `${COOKIE_NAME}=;path=/;max-age=0;SameSite=Lax`;
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieSyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
