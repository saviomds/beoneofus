"use client";

import { motion } from "framer-motion";
import { cn, DUR, EASE } from "./lib";
import AnimatedCounter from "./AnimatedCounter";

// Dashboard stat tile: label, animated value, delta, icon accent.
export default function StatCard({ label, value, delta, icon: Icon, tone = "primary", format = "compact", prefix = "", suffix = "", className = "" }) {
  const tones = {
    primary: "text-mkt-primary bg-mkt-primary/15 ring-mkt-primary/20",
    secondary: "text-mkt-secondary bg-mkt-secondary/15 ring-mkt-secondary/20",
    gold: "text-mkt-gold bg-mkt-gold/15 ring-mkt-gold/25",
    success: "text-mkt-success bg-mkt-success/15 ring-mkt-success/20",
  };
  const up = Number(delta) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: DUR.slow, ease: EASE }}
      className={cn("rounded-mkt border border-mkt-border bg-mkt-card p-4", className)}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-mkt-muted">{label}</span>
        {Icon && <span className={cn("grid h-8 w-8 place-items-center rounded-xl ring-1", tones[tone] || tones.primary)}><Icon size={15} aria-hidden /></span>}
      </div>
      <div className="mt-2 text-2xl font-black tracking-tight text-mkt-text">
        <AnimatedCounter value={value} format={format} prefix={prefix} suffix={suffix} />
      </div>
      {delta != null && (
        <div className={cn("mt-1 text-[12px] font-semibold", up ? "text-mkt-success" : "text-rose-400")}>
          {up ? "▲" : "▼"} {Math.abs(Number(delta))}% <span className="font-normal text-mkt-muted">vs last month</span>
        </div>
      )}
    </motion.div>
  );
}
