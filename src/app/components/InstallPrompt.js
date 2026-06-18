'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { X, Download, Zap, Wifi } from 'lucide-react';
import Image from 'next/image';

/* ── SSR-safe snapshot helpers ──────────────────────────────────── */
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
const getIOSSnapshot    = () => {
  if (typeof window === 'undefined') return false;
  return /ipad|iphone|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
};
const getServerSnapshot = () => false;

/* ── Component ──────────────────────────────────────────────────── */
export function InstallPrompt() {
  const isStandalone  = useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, getServerSnapshot);
  const isIOS         = useSyncExternalStore(emptySubscribe,      getIOSSnapshot,        getServerSnapshot);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed,    setIsDismissed]    = useState(false);
  const [visible,        setVisible]        = useState(false);

  /* Capture the native browser install event */
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  /* Slight delay before showing so it doesn't flash on initial load */
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { setDeferredPrompt(null); setIsDismissed(true); }
  };

  /* Nothing to show */
  if (isStandalone || isDismissed || !visible || (!isIOS && !deferredPrompt)) return null;

  return (
    /*
     * POSITION: bottom-LEFT — clear of the AI FAB (bottom-right) and the
     * mobile bottom nav (center). On mobile we add safe-area clearance so
     * the card never hides behind the floating nav pill in the /dash layout.
     * On desktop (md+) we use the standard 24px gutter via the Tailwind
     * responsive class, which wins over the base value in the cascade because
     * Tailwind places @media variants after base utilities in the output CSS.
     */
    <div
      className="
        fixed left-3 right-3
        md:left-6 md:right-auto md:w-72
        z-[60]
        animate-in slide-in-from-bottom-3 fade-in duration-400
      "
      style={{ bottom: 'calc(env(safe-area-inset-bottom,0px) + 5.5rem)' }}
      role="complementary"
      aria-label="Install app prompt"
    >
      <div className="
        bg-white dark:bg-slate-900
        rounded-2xl overflow-hidden
        border border-gray-100 dark:border-slate-700/50
        shadow-[0_12px_40px_rgba(0,0,0,0.11),0_4px_12px_rgba(0,0,0,0.06)]
        dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]
      ">
        {/* ── Gradient accent bar ── */}
        <div className="h-[3px] bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500" />

        <div className="p-4">
          <div className="flex items-start gap-3">

            {/* ── App icon badge ── */}
            <div className="w-[52px] h-[52px] shrink-0 rounded-[14px] overflow-hidden shadow-lg shadow-blue-500/20 border border-gray-100 dark:border-slate-700/60">
              <Image
                src="/appIcon.png"
                alt="BeOneOfUs"
                width={52}
                height={52}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            {/* ── Text ── */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[13.5px] font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                {isIOS ? 'Add to Home Screen' : 'Install BeOneOfUs App'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-snug">
                Faster load times and full offline access
              </p>

              {/* Feature pills */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/40">
                  <Zap size={8} /> Faster
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40">
                  <Wifi size={8} /> Offline
                </span>
              </div>
            </div>

            {/* ── Dismiss ── */}
            <button
              onClick={() => setIsDismissed(true)}
              className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
              aria-label="Dismiss install prompt"
            >
              <X size={11} />
            </button>
          </div>

          {/* ── iOS manual instructions ── */}
          {isIOS && (
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-slate-700/50 leading-relaxed">
              Tap <strong className="font-bold text-gray-700 dark:text-slate-200">Share ⎋</strong> then{' '}
              <strong className="font-bold text-gray-700 dark:text-slate-200">"Add to Home Screen" ➕</strong>
            </p>
          )}

          {/* ── Action buttons (Android / Desktop) ── */}
          {!isIOS && (
            <div className="flex gap-2 mt-3.5">
              <button
                onClick={handleInstall}
                disabled={!deferredPrompt}
                className="
                  flex-1 flex items-center justify-center gap-1.5
                  bg-gray-900 dark:bg-white
                  hover:bg-gray-800 dark:hover:bg-gray-100
                  disabled:opacity-50 disabled:cursor-not-allowed
                  text-white dark:text-gray-900
                  font-bold text-[12px]
                  py-2.5 rounded-xl
                  transition-all active:scale-[0.97]
                  shadow-sm
                "
              >
                <Download size={12} />
                Install App
              </button>
              <button
                onClick={() => setIsDismissed(true)}
                className="
                  flex-1
                  text-[12px] font-semibold
                  text-gray-400 dark:text-slate-500
                  hover:text-gray-700 dark:hover:text-slate-200
                  py-2.5 rounded-xl
                  hover:bg-gray-50 dark:hover:bg-slate-800/50
                  transition-all
                "
              >
                Maybe Later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
