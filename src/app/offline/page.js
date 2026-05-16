"use client";

import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-6">
        <WifiOff size={32} className="text-gray-400" />
      </div>
      <h1 className="text-2xl font-black text-white mb-2 tracking-tight">You&apos;re offline</h1>
      <p className="text-gray-400 text-sm mb-8 max-w-xs leading-relaxed">
        No internet connection found. Check your connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20"
      >
        <RefreshCw size={16} /> Try Again
      </button>
      <Link href="/" className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors">
        Go to homepage
      </Link>
    </div>
  );
}
