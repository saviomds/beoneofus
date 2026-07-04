"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn, compact, DUR, EASE } from "./lib";

// Large category tile with gradient wash, icon, and count.
// `gradient` is a CSS gradient string; falls back to the indigo→blue brand wash.
export default function CategoryCard({ label, icon: Icon, count, gradient, onClick, className = "" }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: DUR.base, ease: EASE }}
      className={cn(
        "group relative flex min-h-[128px] flex-col justify-between overflow-hidden rounded-mkt border border-mkt-border p-4 text-left mkt-focus",
        "bg-mkt-card transition-[border-color,box-shadow] duration-300 hover:border-mkt-primary/50 hover:shadow-[0_20px_50px_-24px_rgba(109,93,246,0.6)]",
        className
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: gradient || "radial-gradient(120% 100% at 0% 0%, rgba(109,93,246,0.22), transparent 55%)" }}
      />
      <div className="relative flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mkt-bg-2 text-mkt-text ring-1 ring-mkt-border backdrop-blur-sm">
          {Icon ? <Icon size={20} aria-hidden /> : "✦"}
        </span>
        <ArrowUpRight size={18} className="text-mkt-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-mkt-text" />
      </div>
      <div className="relative">
        <p className="text-[15px] font-bold text-mkt-text">{label}</p>
        {count != null && <p className="text-[12px] text-mkt-muted">{compact(count)} items</p>}
      </div>
    </motion.button>
  );
}
