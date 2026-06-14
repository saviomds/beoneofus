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

  // Sync DB theme preference early so users see the correct theme on every
  // device/browser without needing to visit Settings first.
  useEffect(() => {
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
  }, [setTheme]);

  return (
    <>
      <ErrorLogger />
      <InstallPrompt />
    </>
  );
}
