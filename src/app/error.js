'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Terminal, AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error("Application Error Caught:", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center p-6 bg-transparent">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-500">
        
        <div className="mx-auto w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center relative">
          <div className="absolute inset-0 border-2 border-red-500/20 rounded-full animate-ping"></div>
          <AlertTriangle size={40} className="text-red-500 drop-shadow-lg relative z-10" />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight flex items-center justify-center gap-2">
            <Terminal className="text-blue-500" size={24} />
            System Offline
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            We lost connection to the <span className="font-bold text-blue-500">beoneofus</span> network. We might be deploying an upgrade or undergoing routine maintenance.
          </p>
        </div>

        <button
          onClick={() => reset()}
          className="w-full bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
        >
          <RefreshCw size={18} /> Reboot Connection
        </button>

      </div>
    </div>
  );
}