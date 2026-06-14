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

  // Sync DB theme preference once on mount so the theme follows users across
  // devices. Empty deps is intentional — we must not re-run this when setTheme
  // changes identity, otherwise it would override the user's in-session choice.
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ErrorLogger />
      <InstallPrompt />
    </>
  );
}
