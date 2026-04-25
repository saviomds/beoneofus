// src/app/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fail fast with a clear error message if the environment variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check your .env.local file.");
}

if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  throw new Error(`Invalid Supabase URL: "${supabaseUrl}". Make sure it includes the "https://" prefix.`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
