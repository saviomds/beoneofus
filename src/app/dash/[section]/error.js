'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default function SectionError({ error, unstable_retry }) {
  const router = useRouter();

  useEffect(() => {
    console.error('[dash section error]', error);
  }, [error]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 flex items-center justify-center mb-5">
        <AlertTriangle size={24} className="text-red-500" />
      </div>
      <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-1 tracking-tight">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs leading-relaxed">
        This page failed to load. Try refreshing — it's usually a temporary glitch.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => unstable_retry()}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all active:scale-95 shadow-sm shadow-blue-500/20"
        >
          <RefreshCw size={14} /> Try again
        </button>
        <button
          onClick={() => router.push('/dash/home')}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl transition-all active:scale-95"
        >
          <Home size={14} /> Go home
        </button>
      </div>
    </div>
  );
}
