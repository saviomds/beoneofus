import { Crown, Sparkles } from "lucide-react";

export default function PremiumBadge({ size = 14, className = "", isTrial = false }) {
  if (isTrial) {
    return (
      <span className={`relative group/badge inline-flex items-center justify-center shrink-0 ${className}`}>
        <Sparkles
          size={size}
          className="text-blue-500 dark:text-blue-400 drop-shadow-sm group-hover/badge:scale-110 group-hover/badge:rotate-6 transition-all duration-300"
          fill="currentColor"
          strokeWidth={1.5}
          stroke="white"
        />
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/badge:opacity-100 scale-95 group-hover/badge:scale-100 transition-all duration-200 pointer-events-none bg-blue-900 text-blue-50 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-[100] border border-blue-700">
          Freemium
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-blue-900"></span>
        </span>
      </span>
    );
  }

  return (
    <span className={`relative group/badge inline-flex items-center justify-center shrink-0 ${className}`}>
      <Crown
        size={size}
        className="text-amber-500 dark:text-amber-400 drop-shadow-sm group-hover/badge:scale-110 group-hover/badge:-rotate-3 transition-all duration-300"
        fill="currentColor"
        strokeWidth={1.5}
        stroke="white"
      />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/badge:opacity-100 scale-95 group-hover/badge:scale-100 transition-all duration-200 pointer-events-none bg-amber-900 text-amber-50 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-[100] border border-amber-700">
        Premium Member
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-amber-900"></span>
      </span>
    </span>
  );
}
