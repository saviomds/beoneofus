'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';

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
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /ipad|iphone|ipod/.test(userAgent) && !window.MSStream;
};

const getServerSnapshot = () => false;

export function InstallPrompt() {
  const isStandalone = useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, getServerSnapshot);
  const isIOS = useSyncExternalStore(emptySubscribe, getIOSSnapshot, getServerSnapshot);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Listen for the beforeinstallprompt event (Desktop/Android Chrome)
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Don't render anything if installed, dismissed, or not ready to prompt
  if (isStandalone || isDismissed || (!isIOS && !deferredPrompt)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-beone-gray border border-white/10 p-4 rounded-xl shadow-2xl flex flex-col gap-3 z-50">
      <div className="flex justify-between items-start">
        <h3 className="text-white font-bold text-lg">Install beoneofus</h3>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-beone-text-muted hover:text-white transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {isIOS ? (
        <p className="text-sm text-beone-text-muted">
          To install this app on your iOS device, tap the share button
          <span role="img" aria-label="share icon" className="mx-1">⎋</span>
          and then <strong>{`"Add to Home Screen"`}</strong>
          <span role="img" aria-label="plus icon" className="mx-1">➕</span>.
        </p>
      ) : (
        <p className="text-sm text-beone-text-muted">
          Install the beoneofus app for a better, faster, and offline-ready experience!
        </p>
      )}

      {!isIOS && deferredPrompt && (
        <button
          onClick={handleInstallClick}
          className="w-full bg-beone-orange hover:opacity-90 text-white font-semibold py-2 px-4 rounded-lg transition-opacity"
        >
          Add to Home Screen
        </button>
      )}
    </div>
  );
}