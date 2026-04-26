"use client"; // Error components must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCcw, Home } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error("Runtime Error Caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 selection:bg-blue-500/30 relative overflow-hidden">
      {/* Global Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <div className="text-center max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-sm rotate-12">
          <AlertOctagon size={48} className="-rotate-12" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-4">System Malfunction</h1>
        <p className="text-gray-600 font-medium mb-10 leading-relaxed">
          A critical runtime error has been detected in the interface. Our nodes have logged the exception.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => reset()} 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-sm font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95"
          >
            <RefreshCcw size={18} strokeWidth={3} /> Attempt Recovery
          </button>
          <Link 
            href="/" 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-2xl text-sm font-black transition-all shadow-sm hover:scale-105 active:scale-95"
          >
            <Home size={18} strokeWidth={3} /> Return to Base
          </Link>
        </div>
      </div>
    </div>
  );
}