"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "./lib";
import Badge, { VerifiedBadge } from "./Badge";

// Seller / creator profile block used on the product page.
export default function CreatorCard({ creator, premium, className = "" }) {
  if (!creator?.name) return null;
  const href = `/u/${creator.name}`;
  return (
    <div className={cn("flex items-center gap-3 rounded-mkt border border-mkt-border bg-mkt-card p-4", className)}>
      {creator.avatar ? (
        <img src={creator.avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-mkt-border" />
      ) : (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-mkt-primary to-mkt-secondary text-lg font-black text-white">
          {creator.name[0]?.toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-bold text-mkt-text">@{creator.name}</p>
          {creator.verified && <VerifiedBadge />}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {premium ? <Badge tone="premium" size="xs">Premium creator</Badge> : <span className="text-[12px] text-mkt-muted">Creator</span>}
        </div>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-xl border border-mkt-border px-3 py-1.5 text-[13px] font-semibold text-mkt-text transition hover:border-mkt-primary/60 hover:bg-mkt-bg-2 mkt-focus"
      >
        View profile <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}
