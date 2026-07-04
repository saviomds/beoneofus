"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Sparkles, X } from "lucide-react";
import { cn, DUR, EASE } from "./lib";

// Sticky natural-language search with AI suggestion chips.
const DEFAULT_SUGGESTIONS = [
  "I need a React dashboard",
  "Best AI tools",
  "Laravel admin panel",
  "Next.js SaaS starter",
];

export default function SearchBar({
  value = "",
  onChange,
  onSubmit,
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder = "Search anything — try “I need a React dashboard”",
  sticky = true,
  className = "",
}) {
  const [focused, setFocused] = useState(false);
  const showChips = focused && suggestions.length > 0;

  return (
    <div className={cn(sticky && "sticky top-0 z-30", "w-full", className)}>
      <div className={cn(
        "rounded-2xl border bg-mkt-card/80 p-1.5 backdrop-blur-xl transition-[border-color,box-shadow] duration-200",
        focused ? "border-mkt-primary/70 shadow-[0_0_0_4px_rgba(109,93,246,0.15)]" : "border-mkt-border"
      )}>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit?.(value); }}
          className="flex items-center gap-2"
        >
          <Search size={18} className="ml-2.5 shrink-0 text-mkt-muted" aria-hidden />
          <input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={placeholder}
            aria-label="Search the marketplace"
            className="h-10 w-full bg-transparent text-[15px] text-mkt-text placeholder:text-mkt-muted/70 focus:outline-none"
          />
          {value && (
            <button type="button" onClick={() => onChange?.("")} aria-label="Clear search" className="grid h-8 w-8 place-items-center rounded-lg text-mkt-muted hover:text-mkt-text mkt-focus">
              <X size={16} />
            </button>
          )}
          <button type="submit" className="mr-1 inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-mkt-primary to-mkt-secondary px-3.5 text-[13px] font-bold text-white mkt-focus">
            <Sparkles size={14} /> Ask AI
          </button>
        </form>
      </div>

      <AnimatePresence>
        {showChips && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DUR.base, ease: EASE }}
            className="mt-2 flex flex-wrap items-center gap-2"
          >
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-mkt-primary"><Sparkles size={12} /> Try</span>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange?.(s); onSubmit?.(s); }}
                className="rounded-full border border-mkt-border bg-mkt-card px-3 py-1 text-[12px] text-mkt-muted transition hover:border-mkt-primary/50 hover:text-mkt-text mkt-focus"
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
