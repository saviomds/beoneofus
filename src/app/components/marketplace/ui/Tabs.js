"use client";

import { motion } from "framer-motion";
import { cn } from "./lib";

// Animated segmented tabs. Shared layoutId gives the sliding pill indicator.
export default function Tabs({ tabs = [], value, onChange, size = "md", className = "" }) {
  const pad = size === "sm" ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[13px]";
  return (
    <div className={cn("inline-flex flex-wrap gap-1 rounded-2xl border border-mkt-border bg-mkt-card/70 p-1 backdrop-blur-xl", className)} role="tablist">
      {tabs.map((t) => {
        const key = t.id ?? t;
        const label = t.label ?? t;
        const active = value === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(key)}
            className={cn(
              "relative rounded-xl font-semibold transition-colors mkt-focus",
              pad,
              active ? "text-white" : "text-mkt-muted hover:text-mkt-text"
            )}
          >
            {active && (
              <motion.span
                layoutId="mkt-tab-pill"
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-mkt-primary to-mkt-secondary"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {t.icon ? <t.icon size={14} aria-hidden /> : null}
              {label}
              {t.count != null && <span className={cn("rounded-md px-1.5 text-[10px]", active ? "bg-white/20" : "bg-mkt-bg-2")}>{t.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
