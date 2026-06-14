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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Sync DB theme only if this device has no saved theme preference.
  // If localStorage already has a value the user set it explicitly — trust it.
  // This prevents the async DB response from overriding an in-session toggle.
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return; // device already has an explicit preference

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
