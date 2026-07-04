"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { compact } from "./lib";

// Counts up from 0 → value when scrolled into view. Respects reduced motion.
export default function AnimatedCounter({ value = 0, duration = 1100, format = "compact", prefix = "", suffix = "", className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const target = Number(value) || 0;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf; const start = performance.now();
    const tick = (now) => {
      // Reduced motion → jump straight to the target on the first frame.
      const t = reduce ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  const shown = format === "compact" ? compact(Math.round(display)) : Math.round(display).toLocaleString();
  return <span ref={ref} className={className}>{prefix}{shown}{suffix}</span>;
}
