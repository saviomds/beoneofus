"use client";

import { BadgeCheck, Crown, Flame, Sparkles, Star } from "lucide-react";
import { cn } from "./lib";

// Small status pills used across cards & profiles.
const TONES = {
  premium: "bg-mkt-gold/15 text-mkt-gold border-mkt-gold/30",
  verified: "bg-mkt-secondary/15 text-mkt-secondary border-mkt-secondary/30",
  new: "bg-mkt-primary/15 text-[#b7aeffe6] border-mkt-primary/30",
  hot: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  success: "bg-mkt-success/15 text-mkt-success border-mkt-success/30",
  neutral: "bg-mkt-bg-2 text-mkt-muted border-mkt-border",
};

const ICONS = { premium: Crown, verified: BadgeCheck, new: Sparkles, hot: Flame, staff: Star };

export default function Badge({ tone = "neutral", icon, children, size = "sm", className = "" }) {
  const Icon = icon === undefined ? ICONS[tone] : icon;
  const px = size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border font-bold uppercase tracking-wide backdrop-blur-sm",
        px,
        TONES[tone] || TONES.neutral,
        className
      )}
    >
      {Icon ? <Icon size={size === "xs" ? 10 : 12} aria-hidden /> : null}
      {children}
    </span>
  );
}

// Convenience: a verified-creator inline chip.
export function VerifiedBadge({ className = "" }) {
  return <BadgeCheck size={14} className={cn("text-mkt-secondary shrink-0", className)} aria-label="Verified creator" />;
}
