"use client";

import { Star } from "lucide-react";
import { cn, compact } from "./lib";

// Star rating with fractional fill + optional review count.
export default function Rating({ value = 0, count, size = 13, showValue = true, className = "" }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div className={cn("inline-flex items-center gap-1", className)} aria-label={`Rated ${v.toFixed(1)} out of 5`}>
      <span className="relative inline-flex" style={{ width: size * 5 + 8 }} aria-hidden>
        <span className="flex gap-0.5 text-mkt-border">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={size} fill="currentColor" strokeWidth={0} />)}
        </span>
        <span className="absolute inset-0 flex gap-0.5 overflow-hidden text-mkt-gold" style={{ width: `${(v / 5) * 100}%` }}>
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={size} fill="currentColor" strokeWidth={0} className="shrink-0" />)}
        </span>
      </span>
      {showValue && <span className="text-[12px] font-bold text-mkt-text tabular-nums">{v.toFixed(1)}</span>}
      {count != null && <span className="text-[12px] text-mkt-muted">({compact(count)})</span>}
    </div>
  );
}
