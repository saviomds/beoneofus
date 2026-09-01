import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-6 selection:bg-blue-500/30 relative overflow-hidden">
      {/* Global Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <div className="text-center max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-100 dark:border-red-900/50 shadow-sm rotate-12">
          <AlertTriangle size={48} className="-rotate-12" />
        </div>
        <h1 className="text-7xl font-black text-gray-900 dark:text-gray-100 tracking-tighter mb-2">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Sector Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 font-medium mb-10 leading-relaxed">
          The node you are looking for does not exist, has been severed from the network, or you lack the required authorization.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-sm font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={18} strokeWidth={3} /> Return to Base
        </Link>
      </div>
    </div>
  );
}