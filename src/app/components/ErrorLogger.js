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

export default function ErrorLogger() {
  useEffect(() => {
    const onError = (event) => {
      // Skip opaque cross-origin script errors (no useful info)
      if (event.message === 'Script error.' && !event.filename) return;
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
