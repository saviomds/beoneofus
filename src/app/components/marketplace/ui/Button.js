"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn, DUR, EASE } from "./lib";

// Premium button with variants, ripple, loading state and press feedback.
// Accessible: real <button>, focus-visible ring, aria-busy while loading.

const VARIANTS = {
  primary:
    "text-white bg-gradient-to-br from-mkt-primary to-mkt-secondary shadow-[0_8px_24px_-8px_rgba(109,93,246,0.7)] hover:shadow-[0_10px_30px_-6px_rgba(109,93,246,0.85)]",
  gold:
    "text-[#231a00] bg-gradient-to-br from-mkt-gold to-[#f7b955] shadow-[0_8px_24px_-8px_rgba(255,209,102,0.7)]",
  secondary:
    "text-mkt-text bg-mkt-card-2 border border-mkt-border hover:border-mkt-primary/60 hover:bg-mkt-card",
  ghost:
    "text-mkt-muted hover:text-mkt-text hover:bg-mkt-bg-2",
  outline:
    "text-mkt-text border border-mkt-border hover:border-mkt-primary/70 hover:bg-mkt-primary/10",
};

const SIZES = {
  sm: "h-9 px-4 text-[13px] gap-1.5 rounded-xl",
  md: "h-11 px-5 text-sm gap-2 rounded-2xl",
  lg: "h-13 px-7 text-base gap-2.5 rounded-2xl",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconRight: IconRight = null,
  ripple = true,
  className = "",
  ...props
}) {
  const [ripples, setRipples] = useState([]);
  const isDisabled = disabled || loading;

  const addRipple = useCallback((e) => {
    if (!ripple) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const id = `${rect.left}-${e.clientX}-${e.clientY}-${rect.width}`;
    const next = { id, size, x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2 };
    setRipples((r) => [...r, next]);
    setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 600);
  }, [ripple]);

  return (
    <motion.button
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ duration: DUR.fast, ease: EASE }}
      onPointerDown={isDisabled ? undefined : addRipple}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "relative overflow-hidden inline-flex items-center justify-center font-semibold select-none",
        "transition-[transform,box-shadow,background,border,color] duration-200 mkt-focus",
        "disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none",
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        className
      )}
      {...props}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-white/30 animate-[mkt-ripple_0.6s_ease-out]"
          style={{ width: r.size, height: r.size, left: r.x, top: r.y }}
        />
      ))}
      {loading ? <Loader2 size={size === "sm" ? 15 : 17} className="animate-spin" aria-hidden /> : Icon ? <Icon size={size === "sm" ? 15 : 17} aria-hidden /> : null}
      {children}
      {IconRight && !loading ? <IconRight size={size === "sm" ? 15 : 17} aria-hidden /> : null}
    </motion.button>
  );
}
