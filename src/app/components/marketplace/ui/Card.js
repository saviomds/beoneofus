"use client";

import { motion } from "framer-motion";
import { cn, DUR, EASE } from "./lib";

// Glass surface with an optional animated gradient border on hover.
// `as` lets it render a link/section while keeping the motion wrapper.
export default function Card({
  children,
  className = "",
  interactive = false,
  glow = false,
  padding = "p-5",
  ...props
}) {
  return (
    <motion.div
      whileHover={interactive ? { y: -6 } : undefined}
      transition={{ duration: DUR.base, ease: EASE }}
      className={cn(
        "group relative rounded-mkt border border-mkt-border bg-mkt-card/90 backdrop-blur-xl",
        "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)]",
        interactive && "cursor-pointer hover:border-mkt-primary/50 hover:shadow-[0_20px_50px_-20px_rgba(109,93,246,0.55)]",
        interactive && "transition-[border-color,box-shadow] duration-300",
        padding,
        className
      )}
      {...props}
    >
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-mkt opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "linear-gradient(130deg, rgba(109,93,246,0.5), rgba(59,130,246,0.3) 40%, transparent 70%)",
            mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            padding: 1,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}

// A subtle glass panel (non-interactive) for sidebars / info blocks.
export function GlassPanel({ children, className = "", padding = "p-5" }) {
  return (
    <div className={cn("rounded-mkt border border-mkt-border bg-mkt-card/70 backdrop-blur-xl", padding, className)}>
      {children}
    </div>
  );
}
