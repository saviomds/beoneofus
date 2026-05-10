'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import Image from 'next/image';

const emptySubscribe = () => () => {};

const subscribeStandalone = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia('(display-mode: standalone)');
  if (media.addEventListener) {
    media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
  }
  media.addListener(callback);
  return () => media.removeListener(callback);
};

const getStandaloneSnapshot = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
};

const getIOSSnapshot = () => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /ipad|iphone|ipod/.test(ua) && !window.MSStream;
};

const getServerSnapshot = () => false;

export function InstallPrompt() {
  const isStandalone = useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, getServerSnapshot);
  const isIOS = useSyncExternalStore(emptySubscribe, getIOSSnapshot, getServerSnapshot);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  if (isStandalone || isDismissed || (!isIOS && !deferredPrompt)) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-80 z-[200] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {/* top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-400" />

        <div className="flex items-center gap-3 px-4 py-3">
          {/* app icon */}
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" />
            </svg>
          </div>

          {/* text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {isIOS ? 'Add to Home Screen' : 'Install BeOneOfUs'}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-tight mt-0.5 truncate">
              {isIOS
                ? 'Tap share ⎋ then "Add to Home Screen" ➕'
                : 'Faster, offline-ready experience'}
            </p>
          </div>

          {/* actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isIOS && deferredPrompt && (
              <button
                onClick={handleInstall}
                className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              >
                Install
              </button>
            )}
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
