"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, DUR, EASE } from "./lib";

// Large gallery with a zoomable hero + thumbnail strip. `images` is a string[];
// a single-image listing simply shows the hero.
export default function ProductGallery({ images = [], title = "", badges = null, className = "" }) {
  const list = images.filter(Boolean);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const src = list[active] || null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-mkt border border-mkt-border bg-mkt-bg-2"
        onMouseLeave={() => setZoom(false)}
      >
        <AnimatePresence mode="wait">
          {src ? (
            <motion.img
              key={src}
              src={src}
              alt={title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, scale: zoom ? 1.35 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.base, ease: EASE }}
              onClick={() => setZoom((z) => !z)}
              className={cn("h-full w-full object-cover", zoom ? "cursor-zoom-out" : "cursor-zoom-in")}
              onError={(e) => { e.currentTarget.style.opacity = 0; }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl opacity-30">📦</div>
          )}
        </AnimatePresence>
        {badges && <div className="absolute left-3 top-3 flex flex-wrap gap-2">{badges}</div>}
      </div>

      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((img, i) => (
            <button
              key={img + i}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border transition mkt-focus",
                i === active ? "border-mkt-primary ring-2 ring-mkt-primary/40" : "border-mkt-border opacity-70 hover:opacity-100"
              )}
            >
              <Image src={img} alt="" fill sizes="96px" className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
