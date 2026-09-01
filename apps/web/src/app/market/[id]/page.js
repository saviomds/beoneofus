"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight, Check, Sparkles, ListChecks, Info, PackageOpen, ArrowLeft } from "lucide-react";
import { supabase } from "../../supabaseClient";
import MarketTopBar from "../../components/marketplace/MarketTopBar";
import {
  Badge, Rating, ProductCard, ProductGallery, CreatorCard, Reviews, PurchaseCard,
  SectionHeader, Skeleton, compact, fadeUp, stagger,
} from "../../components/marketplace/ui";
import { mapListing, dedupeListings, categoryMeta } from "../../components/marketplace/data/mapListing";

const LISTING_SELECT =
  "id, title, description, category, price, currency, image_url, tags, purchases, created_at, " +
  "profiles:seller_id(id, username, avatar_url, is_verified, is_premium, is_trial_premium, profile_visibility)";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | notfound | error

  const load = useCallback(async () => {
    if (!supabase || !id) { setStatus("error"); return; }
    const { data, error } = await supabase.from("marketplace_listings").select(LISTING_SELECT).eq("id", id).maybeSingle();
    if (error) { setStatus("error"); return; }
    if (!data) { setStatus("notfound"); return; }
    const mapped = mapListing(data);
    setProduct(mapped);
    setStatus("ready");

    // Related: same category, exclude self.
    const { data: rel } = await supabase
      .from("marketplace_listings")
      .select(LISTING_SELECT)
      .eq("category", data.category)
      .eq("is_active", true)
      .neq("id", id)
      .order("purchases", { ascending: false })
      .limit(4);
    setRelated(dedupeListings(rel || []).map(mapListing).filter(Boolean));
  }, [id]);

  useEffect(() => { queueMicrotask(load); }, [load]);

  const meta = useMemo(() => (product ? categoryMeta(product.category) : null), [product]);
  const CatIcon = meta?.icon;
  const images = useMemo(
    () => (product ? [product.thumbnail || `https://picsum.photos/seed/${product.id}/1200/750`] : []),
    [product]
  );

  return (
    <div className="min-h-screen bg-mkt-bg text-mkt-text">
      <MarketTopBar />

      {status === "loading" && (
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4"><Skeleton className="aspect-[16/10] w-full rounded-mkt" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-24 w-full" /></div>
          <Skeleton className="h-72 w-full rounded-mkt" />
        </div>
      )}

      {status === "notfound" && (
        <div className="mx-auto max-w-lg px-5 py-24 text-center">
          <p className="text-2xl font-black">Product not found</p>
          <p className="mt-2 text-mkt-muted">This listing may have been removed or is no longer active.</p>
          <Link href="/market" className="mt-6 inline-flex items-center gap-1 font-semibold text-mkt-primary">← Back to marketplace</Link>
        </div>
      )}

      {status === "error" && (
        <div className="mx-auto max-w-lg px-5 py-24 text-center">
          <p className="text-2xl font-black">Something went wrong</p>
          <button onClick={load} className="mt-4 font-semibold text-mkt-primary">Try again</button>
        </div>
      )}

      {status === "ready" && product && (
        <>
          {/* breadcrumb */}
          <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-5 pt-6 text-[13px] text-mkt-muted">
            <button onClick={() => router.push("/market")} className="inline-flex items-center gap-1 hover:text-mkt-text mkt-focus rounded"><ArrowLeft size={14} /> Marketplace</button>
            <ChevronRight size={14} />
            <span className="text-mkt-muted">{product.category}</span>
            <ChevronRight size={14} />
            <span className="truncate text-mkt-text">{product.title}</span>
          </div>

          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
            {/* ── Left column ─────────────────────────────────────────── */}
            <motion.div variants={stagger} initial="hidden" animate="show" className="min-w-0 space-y-8">
              <motion.div variants={fadeUp}>
                <ProductGallery
                  images={images}
                  title={product.title}
                  badges={
                    <>
                      {product.premium && <Badge tone="premium" size="xs">Premium</Badge>}
                      {product.hot ? <Badge tone="hot" size="xs">Hot</Badge> : product.isNew ? <Badge tone="new" size="xs">New</Badge> : null}
                    </>
                  }
                />
              </motion.div>

              <motion.div variants={fadeUp} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-mkt-primary/12 px-2.5 py-1 text-[12px] font-bold text-mkt-primary">
                    {CatIcon && <CatIcon size={13} />} {product.category}
                  </span>
                  {product.downloads != null && <span className="text-[13px] text-mkt-muted">{compact(product.downloads)} downloads</span>}
                </div>
                <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-4xl">{product.title}</h1>
                {product.rating != null && <Rating value={product.rating} count={product.reviews} size={15} />}
              </motion.div>

              {/* Overview */}
              {product.description && (
                <motion.section variants={fadeUp} className="rounded-mkt border border-mkt-border bg-mkt-card p-5 sm:p-6">
                  <h2 className="mb-3 flex items-center gap-2 text-lg font-black"><Info size={18} className="text-mkt-secondary" /> Overview</h2>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-mkt-muted">{product.description}</p>
                </motion.section>
              )}

              {/* What's included (from tags) */}
              {product.tags?.length > 0 && (
                <motion.section variants={fadeUp} className="rounded-mkt border border-mkt-border bg-mkt-card p-5 sm:p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-black"><ListChecks size={18} className="text-mkt-success" /> What&apos;s included</h2>
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {product.tags.map((t, i) => (
                      <li key={i} className="flex items-center gap-2 text-[14px] text-mkt-text">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mkt-success/15 text-mkt-success"><Check size={12} /></span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </motion.section>
              )}

              {/* Creator */}
              <motion.section variants={fadeUp} className="space-y-3">
                <SectionHeader title="Creator" icon={Sparkles} className="mb-0" />
                <CreatorCard creator={{ ...product.creator, verified: product.verified }} premium={product.premium} />
              </motion.section>

              {/* Reviews */}
              <motion.div variants={fadeUp}><Reviews reviews={[]} /></motion.div>
            </motion.div>

            {/* ── Right column (sticky purchase) ──────────────────────── */}
            <div className="lg:sticky lg:top-20">
              <PurchaseCard product={product} />
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mx-auto max-w-7xl px-5 pb-24 pt-4">
              <SectionHeader title="Related products" subtitle={`More in ${product.category}`} icon={PackageOpen} action="Browse all" onAction={() => router.push("/market")} />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {related.map((p) => (
                  <ProductCard key={p.id} product={p} onOpen={() => router.push(`/market/${p.id}`)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
