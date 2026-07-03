'use client';

import { useEffect } from 'react';

// In-session deduplication — don't re-send the same error twice
const SEEN = new Set();

export async function logError({
  level = 'error',
  category = 'client',
  message,
  stack,
  url,
  component,
  metadata = {},
}) {
  if (!message || typeof window === 'undefined') return;

  const key = `${String(message).slice(0, 100)}|${url || ''}`;
  if (SEEN.has(key)) return;
  SEEN.add(key);
  if (SEEN.size > 30) SEEN.clear();

  try {
    const { supabase } = await import('../supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();

    await fetch('/api/system/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        category,
        message: String(message).slice(0, 1000),
        stack: stack ? String(stack).slice(0, 3000) : undefined,
        url: url || window.location.href,
        component: component || undefined,
        user_id: session?.user?.id || undefined,
        user_agent: navigator.userAgent,
        metadata,
      }),
    });
  } catch {
    // Never throw — the logger must be silent
  }
}

// A failed lazy chunk (typically after a new deploy invalidates old hashed
// filenames) should self-heal with a single reload instead of leaving the user
// on a broken page they have to refresh by hand. Guarded to never loop.
const CHUNK_ERR_RE =
  /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed/i;

function recoverFromChunkError(message) {
  if (!message || !CHUNK_ERR_RE.test(String(message))) return false;
  try {
    const KEY = 'chunk_reload_at';
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 15000) return false; // reloaded recently → avoid loop
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* storage blocked — reload anyway */ }
  window.location.reload();
  return true;
}

export default function ErrorLogger() {
  useEffect(() => {
    const onError = (event) => {
      // Skip opaque cross-origin script errors (no useful info)
      if (event.message === 'Script error.' && !event.filename) return;
      if (recoverFromChunkError(event.message || event.error?.message)) return;
      logError({
        level: 'error',
        category: 'client',
        message: event.message || 'JavaScript error',
        stack: event.error?.stack,
        url: event.filename || window.location.href,
      });
    };

    const onUnhandledRejection = (event) => {
      const reason = event.reason;
      if (recoverFromChunkError(reason?.message || String(reason))) return;
      logError({
        level: 'error',
        category: 'client',
        message: reason?.message || String(reason) || 'Unhandled promise rejection',
        stack: reason?.stack,
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
