// ── Map real `marketplace_listings` rows → design-system shapes ─────────────
// Keeps every component (ProductCard, CategoryCard) decoupled from the DB
// schema: swap the query, keep the mappers.

import { GraduationCap, Award, Handshake, LayoutTemplate, Boxes, Package } from "lucide-react";

const NEW_WINDOW_DAYS = 14;
const HOT_THRESHOLD = 5; // matches MarketplaceContent's "trending" rule

// Category → tile presentation. Unknown categories fall back to a neutral tile.
export const CATEGORY_META = {
  Course:     { icon: GraduationCap,  gradient: "radial-gradient(120% 100% at 0% 0%, rgba(59,130,246,0.26), transparent 55%)" },
  Credential: { icon: Award,          gradient: "radial-gradient(120% 100% at 0% 0%, rgba(255,209,102,0.24), transparent 55%)" },
  Service:    { icon: Handshake,      gradient: "radial-gradient(120% 100% at 0% 0%, rgba(34,197,94,0.22), transparent 55%)" },
  Template:   { icon: LayoutTemplate, gradient: "radial-gradient(120% 100% at 0% 0%, rgba(109,93,246,0.26), transparent 55%)" },
  Asset:      { icon: Boxes,          gradient: "radial-gradient(120% 100% at 0% 0%, rgba(160,174,192,0.18), transparent 55%)" },
};

export function categoryMeta(category) {
  return CATEGORY_META[category] || { icon: Package, gradient: "radial-gradient(120% 100% at 0% 0%, rgba(109,93,246,0.2), transparent 55%)" };
}

/** One raw listing row → ProductCard `product` prop. */
export function mapListing(row) {
  if (!row) return null;
  const profile = row.profiles || {};
  const createdAt = row.created_at ? new Date(row.created_at) : null;
  const isNew = createdAt ? (Date.now() - createdAt.getTime()) < NEW_WINDOW_DAYS * 86400000 : false;
  const downloads = Number(row.purchases) || 0;
  return {
    id: row.id,
    title: row.title || "Untitled",
    description: row.description || "",
    category: row.category || "Asset",
    thumbnail: row.image_url || null,
    price: Number(row.price) || 0,
    currency: row.currency || "USD",
    tags: row.tags || [],
    downloads,
    hot: downloads >= HOT_THRESHOLD,
    isNew,
    premium: !!(profile.is_premium || profile.is_trial_premium),
    verified: !!profile.is_verified,
    creator: profile.username
      ? { name: profile.username, avatar: profile.avatar_url || null }
      : null,
    raw: row, // keep the original for detail views / actions
  };
}

/** Dedupe by title+category, mirroring MarketplaceContent. */
export function dedupeListings(rows = []) {
  const seen = new Set();
  return rows.filter((l) => {
    const key = `${(l.title || "").toLowerCase().trim()}|${(l.category || "").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Derive category tiles (with live counts) from mapped products. */
export function deriveCategories(products = []) {
  const counts = new Map();
  for (const p of products) counts.set(p.category, (counts.get(p.category) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ id: label, label, count, ...categoryMeta(label) }));
}
