"use client";

import Image from "next/image";
import { MessageSquare, Star } from "lucide-react";
import { cn } from "./lib";
import Rating from "./Rating";

// Reviews block. Renders a summary + list when reviews exist, otherwise a
// polished empty state. `reviews` is an array of { id, author, avatar, rating,
// body, created_at }. Shapes are ready for a future `listing_reviews` table.
export default function Reviews({ reviews = [], className = "" }) {
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count : 0;

  return (
    <section className={cn("rounded-mkt border border-mkt-border bg-mkt-card p-5 sm:p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-black text-mkt-text">
          <Star size={18} className="text-mkt-gold" /> Reviews
        </h2>
        {count > 0 && <Rating value={avg} count={count} size={14} />}
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mkt-bg-2 text-mkt-muted">
            <MessageSquare size={20} />
          </span>
          <p className="font-semibold text-mkt-text">No reviews yet</p>
          <p className="max-w-xs text-[13px] text-mkt-muted">Be the first to share your experience with this product.</p>
        </div>
      ) : (
        <ul className="divide-y divide-mkt-border">
          {reviews.map((r) => (
            <li key={r.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
              {r.avatar ? (
                <Image src={r.avatar} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" unoptimized />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-mkt-primary/20 text-sm font-bold text-mkt-text">{(r.author || "?")[0]}</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[14px] font-bold text-mkt-text">{r.author || "Anonymous"}</p>
                  <Rating value={r.rating} size={12} showValue={false} />
                </div>
                <p className="mt-1 text-[14px] leading-relaxed text-mkt-muted">{r.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
