"use client";

import { cn, formatPrice } from "./lib";

// Price with optional strikethrough original + computed discount pill.
export default function Price({ value, original, currency = "USD", size = "md", className = "" }) {
  const price = Number(value) || 0;
  const orig = Number(original) || 0;
  const hasDiscount = orig > price && price > 0;
  const pct = hasDiscount ? Math.round(((orig - price) / orig) * 100) : 0;
  const free = !price || price <= 0;

  const sz = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-black tracking-tight", sz, free ? "text-mkt-success" : "text-mkt-text")}>
        {formatPrice(price, currency)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-mkt-muted line-through">{formatPrice(orig, currency)}</span>
          <span className="rounded-md bg-mkt-success/15 px-1.5 py-0.5 text-[11px] font-bold text-mkt-success">−{pct}%</span>
        </>
      )}
    </div>
  );
}
