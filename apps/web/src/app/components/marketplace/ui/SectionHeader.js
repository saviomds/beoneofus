"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "./lib";

// "Featured / Trending / Best Sellers" section header with optional action.
export default function SectionHeader({ title, subtitle, icon: Icon, action, onAction, className = "" }) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-mkt-primary/15 text-mkt-primary ring-1 ring-mkt-primary/20">
            <Icon size={18} aria-hidden />
          </span>
        )}
        <div>
          <h2 className="text-lg font-black tracking-tight text-mkt-text sm:text-xl">{title}</h2>
          {subtitle && <p className="text-[13px] text-mkt-muted">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-mkt-primary transition hover:gap-2 mkt-focus rounded-lg"
        >
          {action} <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
