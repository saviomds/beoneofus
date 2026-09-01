import { BadgeCheck } from "lucide-react";

export default function VerifiedBadge({ size = 14, className = "" }) {
  return (
    <span className={`relative group/badge inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Animated Badge */}
      <BadgeCheck 
        size={size} 
        className="text-blue-500 dark:text-blue-400 drop-shadow-sm group-hover/badge:scale-110 group-hover/badge:-rotate-3 transition-all duration-300" 
        fill="currentColor" 
        stroke="white" 
      />
      
      {/* Custom CSS Tooltip */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/badge:opacity-100 scale-95 group-hover/badge:scale-100 transition-all duration-200 pointer-events-none bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-100 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-[100] border border-gray-800 dark:border-gray-700">
        Verified
        
        {/* Tooltip Arrow pointing down */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-900 dark:border-t-gray-800"></span>
      </span>
    </span>
  );
}