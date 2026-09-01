import { createClient } from '@supabase/supabase-js';

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 60_000; // 60 seconds

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Fetch all platform_settings rows and return as a flat key→value map.
 * Results are cached for 60 s to avoid per-request DB round-trips.
 */
export async function getPlatformSettings() {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL) return _cache;

  try {
    const supa = adminClient();
    const { data } = await supa.from('platform_settings').select('key, value');
    const map = {};
    for (const row of data || []) map[row.key] = row.value;
    _cache = map;
    _cacheAt = now;
    return map;
  } catch {
    return _cache || {};
  }
}

/** Invalidate the in-process cache (call after saving new settings). */
export function invalidatePlatformSettingsCache() {
  _cache = null;
  _cacheAt = 0;
}

/**
 * Get a single platform setting, falling back to an env-var or default.
 *   getSettingOr('paystack_secret_key', process.env.PAYSTACK_SECRET_KEY)
 */
export async function getSettingOr(key, fallback = null) {
  const settings = await getPlatformSettings();
  return settings[key] ?? fallback;
}
