'use client';

import dynamic from 'next/dynamic';

const InstallPrompt = dynamic(() => import('./InstallPrompt').then(m => ({ default: m.InstallPrompt })), { ssr: false });
const ErrorLogger = dynamic(() => import('./ErrorLogger'), { ssr: false });

export default function ClientShell() {
  return (
    <>
      <ErrorLogger />
      <InstallPrompt />
    </>
  );
}
