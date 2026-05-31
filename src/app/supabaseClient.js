// src/app/supabaseClient.js
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  throw new Error(`Invalid Supabase URL: "${supabaseUrl}". Make sure it includes the "https://" prefix.`);
}

// createBrowserClient (from @supabase/ssr) automatically stores the session in
// cookies, which means every page request sends the session to the server and
// the middleware can verify it without any manual cookie-sync logic.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
