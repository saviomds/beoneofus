"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  Flame, Sparkles, TrendingUp, Star, Clock, ShoppingBag,
  Download, Users, Rocket, ArrowRight, AlertCircle, Sun, Moon,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import {
  Button, Badge, Card, ProductCard, CategoryCard, SectionHeader,
  StatCard, Tabs, SearchBar, ProductGridSkeleton, AnimatedCounter, fadeUp, stagger,
} from "../components/marketplace/ui";
import { AI_SUGGESTIONS } from "../components/marketplace/data/sample";
import { mapListing, dedupeListings, deriveCategories } from "../components/marketplace/data/mapListing";

const LISTING_SELECT =
  "id, title, description, category, price, currency, image_url, tags, purchases, created_at, " +
  "profiles:seller_id(id, username, avatar_url, is_verified, is_premium, is_trial_premium, profile_visibility)";

const FILTERS = [
  { id: "featured", label: "Featured", icon: Sparkles },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "top", label: "Best Sellers", icon: Star },
  { id: "new", label: "New Releases", icon: Clock },
];

export default function MarketPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("featured");
  const [activeCat, setActiveCat] = useState(null);
  const [listings, setListings] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  // Theme toggle — follows the site's next-themes state. Icon visibility is
  // pure CSS on the `.dark` class (set by next-themes' blocking script before
  // hydration), so it's SSR-safe with no mounted guard.
  const { setTheme, resolvedTheme } = useTheme();
  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const fetchListings = useCallback(async () => {
    if (!supabase) { setStatus("error"); return; }
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select(LISTING_SELECT)
      .eq("is_active", true)
      .order("purchases", { ascending: false });
    if (error) { setStatus("error"); return; }
    setListings(dedupeListings(data || []).map(mapListing).filter(Boolean));
    setStatus("ready");
  }, []);

  // Initial load + realtime sync (insert/update refetch, delete prunes locally).
  useEffect(() => {
    // Defer so no setState runs during the synchronous effect pass.
    queueMicrotask(fetchListings);
    if (!supabase) return;
    const ch = supabase
      .channel("mkt-market-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_listings" }, fetchListings)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "marketplace_listings" }, fetchListings)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "marketplace_listings" }, (p) =>
        setListings((prev) => prev.filter((l) => l.id !== p.old?.id))
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchListings]);

  const categories = useMemo(() => deriveCategories(listings), [listings]);

  const products = useMemo(() => {
    let list = [...listings];
    if (activeCat) list = list.filter((p) => p.category === activeCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => String(t).toLowerCase().includes(q))
      );
    }
    if (tab === "trending") list = list.filter((p) => p.hot);
    if (tab === "new") list = list.filter((p) => p.isNew);
    if (tab === "top") list = [...list].sort((a, b) => b.downloads - a.downloads);
    return list;
  }, [listings, query, tab, activeCat]);

  // Live hero stats from real data.
  const stats = useMemo(() => {
    const creators = new Set(listings.map((l) => l.creator?.name).filter(Boolean));
    const downloads = listings.reduce((s, l) => s + l.downloads, 0);
    return { products: listings.length, creators: creators.size, downloads, categories: categories.length };
  }, [listings, categories.length]);

  return (
    <div className="min-h-screen bg-mkt-bg text-mkt-text">
      {/* ── Sticky top bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-mkt-border/70 bg-mkt-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/dash" className="flex items-center gap-2 mkt-focus rounded-lg" aria-label="Back to BeOneOfUs">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-mkt-primary to-mkt-secondary text-sm font-black text-white">B</span>
            <span className="text-[15px] font-black text-mkt-text">BeOneOfUs <span className="font-medium text-mkt-muted">Market</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {[["Marketplace", "/market"], ["Opportunities", "/opportunities"], ["Community", "/community"], ["Pricing", "/dash/premium"]].map(([label, href]) => (
              <Link key={label} href={href} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-mkt-muted transition hover:bg-mkt-bg-2 hover:text-mkt-text mkt-focus">{label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle light or dark mode"
              className="grid h-9 w-9 place-items-center rounded-xl border border-mkt-border bg-mkt-card text-mkt-muted transition hover:text-mkt-text mkt-focus"
            >
              <Moon size={16} className="dark:hidden" />
              <Sun size={16} className="hidden dark:block" />
            </button>
            <Link href="/dash" className="hidden sm:block">
              <Button size="sm" variant="secondary">Open app</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Animated hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="mkt-blob absolute -left-24 -top-24 h-96 w-96 rounded-full bg-mkt-primary/30 blur-3xl" />
          <div className="mkt-blob absolute right-0 top-10 h-80 w-80 rounded-full bg-mkt-secondary/25 blur-3xl" style={{ animationDelay: "-6s" }} />
          <div className="mkt-blob absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#ec4899]/20 blur-3xl" style={{ animationDelay: "-12s" }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-16 sm:pt-24">
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl">
            <motion.div variants={fadeUp}><Badge tone="premium" className="mb-5">Ecosystem Commerce</Badge></motion.div>
            <motion.h1 variants={fadeUp} className="text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">
              <span className="mkt-gradient-text">Build. Learn.</span><br />
              <span className="mkt-gradient-text">Sell. Grow.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 max-w-xl text-lg text-mkt-muted">
              The complete ecosystem for developers, creators, freelancers and businesses.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" icon={ShoppingBag} onClick={() => document.getElementById("mkt-grid")?.scrollIntoView({ behavior: "smooth" })}>Explore Marketplace</Button>
              <Button size="lg" variant="secondary" iconRight={ArrowRight}>Start Free</Button>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-8">
              {[["Products", stats.products], ["Creators", stats.creators], ["Downloads", stats.downloads], ["Categories", stats.categories]].map(([l, v]) => (
                <div key={l}>
                  <div className="text-2xl font-black"><AnimatedCounter value={v} /></div>
                  <div className="text-[12px] text-mkt-muted">{l}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <div className="mt-10 max-w-3xl">
            <SearchBar value={query} onChange={setQuery} onSubmit={setQuery} suggestions={AI_SUGGESTIONS} sticky={false} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-5 pb-24">
        {/* ── Categories (live counts) ───────────────────────────────── */}
        {(status === "loading" || categories.length > 0) && (
          <section>
            <SectionHeader title="Browse categories" subtitle="Live from the marketplace" icon={ShoppingBag}
              action={activeCat ? "Clear filter" : undefined} onAction={() => setActiveCat(null)} />
            {status === "loading" ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-mkt border border-mkt-border bg-mkt-card-2 mkt-shimmer relative overflow-hidden" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {categories.map((c) => (
                  <CategoryCard key={c.id} {...c}
                    onClick={() => setActiveCat((cur) => (cur === c.id ? null : c.id))}
                    className={activeCat === c.id ? "ring-2 ring-mkt-primary" : ""} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Product grid ───────────────────────────────────────────── */}
        <section id="mkt-grid">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <SectionHeader title={activeCat ? `${activeCat} products` : "Discover products"} icon={Flame} className="mb-0" />
            <Tabs tabs={FILTERS} value={tab} onChange={setTab} />
          </div>

          {status === "loading" ? (
            <ProductGridSkeleton count={8} />
          ) : status === "error" ? (
            <Card className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="text-mkt-warning" />
              <p className="text-mkt-muted">Couldn’t load listings. Check your connection and try again.</p>
              <Button variant="secondary" onClick={fetchListings}>Retry</Button>
            </Card>
          ) : products.length === 0 ? (
            <Card className="py-16 text-center text-mkt-muted">
              {listings.length === 0 ? "No listings yet — be the first to publish one." : `Nothing matches your filters${query ? ` for “${query}”` : ""}.`}
            </Card>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p, i) => (
                <motion.div key={p.id} variants={fadeUp} custom={i}>
                  <ProductCard product={p} onOpen={(prod) => router.push(`/market/${prod.id}`)} onPreview={(prod) => router.push(`/market/${prod.id}`)} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* ── Live marketplace analytics ─────────────────────────────── */}
        {status === "ready" && listings.length > 0 && (
          <section>
            <SectionHeader title="Marketplace at a glance" subtitle="Aggregated from live listings" icon={TrendingUp} />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Listings" value={stats.products} icon={ShoppingBag} tone="primary" format="plain" />
              <StatCard label="Total downloads" value={stats.downloads} icon={Download} tone="secondary" />
              <StatCard label="Creators" value={stats.creators} icon={Users} tone="success" format="plain" />
              <StatCard label="Categories" value={stats.categories} icon={Rocket} tone="gold" format="plain" />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
