"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Eye, Download } from "lucide-react";
import { cn, compact, DUR, EASE } from "./lib";
import Badge, { VerifiedBadge } from "./Badge";
import Rating from "./Rating";
import Price from "./Price";

// The hero marketplace card. Hover: lift + image zoom + gradient border + shadow.
// Fully keyboard-accessible; wishlist & preview are real buttons that don't
// trigger the card's onClick.
export default function ProductCard({ product = {}, onOpen, onWishlist, onPreview, wishlisted = false, className = "" }) {
  const {
    title = "Untitled", category, thumbnail, price, originalPrice, currency = "USD",
    rating, reviews, downloads, creator, premium, verified, isNew, hot, badge,
  } = product;
  const [saved, setSaved] = useState(wishlisted);

  const stop = (fn) => (e) => { e.stopPropagation(); e.preventDefault(); fn?.(e); };

  return (
    <motion.article
      whileHover="hover"
      initial="rest"
      animate="rest"
      variants={{ rest: { y: 0 }, hover: { y: -8 } }}
      transition={{ duration: DUR.base, ease: EASE }}
      onClick={() => onOpen?.(product)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(product); } }}
      tabIndex={0}
      role="button"
      aria-label={`${title}${creator?.name ? ` by ${creator.name}` : ""}`}
      className={cn(
        "group relative flex cursor-pointer flex-col rounded-mkt border border-mkt-border bg-mkt-card p-3 mkt-focus",
        "transition-[border-color,box-shadow] duration-300 hover:border-mkt-primary/50",
        "hover:shadow-[0_24px_60px_-24px_rgba(109,93,246,0.6)]",
        className
      )}
    >
      {/* gradient border sheen on hover */}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-mkt opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: "inset 0 0 0 1px rgba(109,93,246,0.35)" }} />

      {/* thumbnail */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-mkt-bg-2">
        {thumbnail ? (
          <motion.img
            src={thumbnail} alt={title} loading="lazy"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.06 } }}
            transition={{ duration: DUR.slow, ease: EASE }}
            className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl opacity-40">📦</div>
        )}

        {/* top-left badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {premium && <Badge tone="premium" size="xs">Premium</Badge>}
          {hot ? <Badge tone="hot" size="xs">Hot</Badge> : isNew ? <Badge tone="new" size="xs">New</Badge> : null}
          {badge && !premium && !hot && !isNew ? <Badge tone="neutral" size="xs" icon={null}>{badge}</Badge> : null}
        </div>

        {/* wishlist */}
        <button
          type="button"
          onClick={stop(() => { setSaved((s) => !s); onWishlist?.(product); })}
          aria-pressed={saved}
          aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65 mkt-focus"
        >
          <Heart size={16} className={cn("transition", saved && "fill-rose-500 text-rose-500")} />
        </button>

        {/* quick preview — revealed on hover */}
        {onPreview && (
          <motion.button
            type="button"
            onClick={stop(() => onPreview(product))}
            variants={{ rest: { opacity: 0, y: 8 }, hover: { opacity: 1, y: 0 } }}
            transition={{ duration: DUR.base, ease: EASE }}
            className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-br from-mkt-primary to-mkt-secondary px-3.5 py-1.5 text-[12px] font-bold text-white shadow-lg mkt-focus"
          >
            <Eye size={13} /> Quick preview
          </motion.button>
        )}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-2 p-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-mkt-text">{title}</h3>
        </div>

        {creator?.name && (
          <div className="flex items-center gap-1.5 text-[12px] text-mkt-muted">
            {creator.avatar
              ? <img src={creator.avatar} alt="" className="h-4 w-4 rounded-full object-cover" />
              : <span className="grid h-4 w-4 place-items-center rounded-full bg-mkt-primary/25 text-[8px] font-bold text-mkt-text">{creator.name[0]}</span>}
            <span className="truncate">{creator.name}</span>
            {verified && <VerifiedBadge />}
          </div>
        )}

        <div className="flex items-center gap-3 text-[12px]">
          {rating != null && <Rating value={rating} count={reviews} size={12} />}
          {downloads != null && (
            <span className="inline-flex items-center gap-1 text-mkt-muted">
              <Download size={12} /> {compact(downloads)}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <Price value={price} original={originalPrice} currency={currency} size="sm" />
          {category && <span className="rounded-md bg-mkt-bg-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mkt-muted">{category}</span>}
        </div>
      </div>
    </motion.article>
  );
}
