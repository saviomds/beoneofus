"use client";

import { supabase } from "../app/supabaseClient";

// Runtime caches that can hold a *previous user's* data. Static-asset caches
// (fonts/images/JS/CSS) are intentionally left intact — they're identity-neutral
// and clearing them on every logout would needlessly slow the next load.
const AUTH_SENSITIVE_CACHES = ["apis", "documents", "next-data"];

// Every place the sidebar/app stashes per-user state in web storage. These MUST
// be purged on logout, otherwise the next account on the same tab is hydrated
// from the previous user's cached data before the network refresh lands.
const AUTH_SENSITIVE_STORAGE = [
  "sidebar_profile_v1",
  "rightsidebar_v2",
  "member_auth",
  "member_session_user",
  "member_dashboard_tasks",
  "member_dashboard_updates",
];

/**
 * Single, canonical sign-out. Use this everywhere instead of calling
 * `supabase.auth.signOut()` directly, so logout is always complete and
 * consistent: it ends the Supabase session (clearing the `sb-*` cookies and
 * localStorage token) AND removes any cached view of the old identity.
 *
 * Does NOT navigate — the caller decides where to send the user afterwards
 * (usually `window.location.href = '/auth'` for a clean, fully-reset load).
 *
 * @param {{ scope?: 'global' | 'local' | 'others' }} [opts]
 */
export async function signOutEverywhere(opts = {}) {
  const { scope } = opts;

  // 1) End the server/client session first.
  try {
    await supabase.auth.signOut(scope ? { scope } : undefined);
  } catch {
    /* proceed with local cleanup even if the network call fails */
  }

  // 2) Purge per-user web storage.
  try {
    for (const k of AUTH_SENSITIVE_STORAGE) sessionStorage.removeItem(k);
  } catch { /* ignore */ }

  // 3) Purge auth-sensitive service-worker caches so the next account can never
  //    be served the previous account's cached responses.
  try {
    if (typeof caches !== "undefined") {
      await Promise.all(AUTH_SENSITIVE_CACHES.map((name) => caches.delete(name)));
    }
  } catch { /* ignore */ }
}
