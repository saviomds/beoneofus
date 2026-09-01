'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { supabase } from '../supabaseClient';

const InstallPrompt = dynamic(() => import('./InstallPrompt').then(m => ({ default: m.InstallPrompt })), { ssr: false });
const ErrorLogger = dynamic(() => import('./ErrorLogger'), { ssr: false });

export default function ClientShell() {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // In development the served /sw.js is a no-op "kill switch"; registering it
    // causes reload loops (blank/skeleton flashes) on localhost. Instead, make
    // sure no stale worker is controlling the dev page.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }

    // Production: register, and auto-refresh ONCE when a new deployment's worker
    // takes control — so users get fresh assets without a manual reload. Guard
    // against the first-install control change and against reload loops.
    let refreshing = false;
    let hadController = !!navigator.serviceWorker.controller;

    const onControllerChange = () => {
      if (!hadController) { hadController = true; return; } // first claim, not an update
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        reg.update().catch(() => {});
        // Check for a new deployment whenever the tab regains focus.
        const onVisible = () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); };
        document.addEventListener('visibilitychange', onVisible);
      })
      .catch(() => {});

    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  // Sync DB theme only if this device has no saved theme preference.
  // If localStorage already has a value the user set it explicitly — trust it.
  // This prevents the async DB response from overriding an in-session toggle.
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return; // device already has an explicit preference
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase
        .from('profiles')
        .select('theme_preference')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.theme_preference) setTheme(data.theme_preference);
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ErrorLogger />
      <InstallPrompt />
    </>
  );
}
