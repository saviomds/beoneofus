"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../supabaseClient";
import {
  Terminal, Search, X, Tag, Heart, MessageSquare,
  Eye, Clock, Zap, Sparkles, RefreshCw, User,
  TrendingUp, BookOpen, Loader2, SlidersHorizontal,
  ArrowUpDown, History, Crown, ShieldCheck,
} from "lucide-react";

/* ─── helpers ────────────────────────────────────── */
function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TAG_COLORS = [
  "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40",
  "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
  "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40",
];
function tagColor(tag) { let h = 0; for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xff; return TAG_COLORS[h % TAG_COLORS.length]; }

/* Highlights matching query inside text */
function HighlightMatch({ text, query }) {
  if (!query || !text) return text || null;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/60 text-gray-900 dark:text-yellow-100 rounded-sm px-0.5 not-italic">{part}</mark>
          : part
      )}
    </>
  );
}

const SELECT = `
  id, title, slug, excerpt, cover_url, tags, views, is_featured, created_at,
  author:profiles!author_id(id, username, avatar_url, is_verified, is_premium, is_trial_premium, profile_visibility),
  blog_comments(count),
  blog_likes(count)
`;

/* ─── main component ────────────────────────────── */
export default function BlogPage() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(() => searchParams?.get("tag") || null);
  const [allTags, setAllTags] = useState([]);
  const [newBanner, setNewBanner] = useState(false);
  const [sortBy, setSortBy] = useState("latest"); // "latest" | "popular" | "liked"
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("blog_recent_searches") || "[]"); } catch { return []; }
  });
  const channelRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTimerRef = useRef(null);

  /* ── fetch all published posts ── */
  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select(SELECT)
      .eq("published", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) {
      setPosts(data);
      setAllTags([...new Set(data.flatMap((p) => p.tags || []))]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
    const name = `blog-public-${Date.now()}`;
    channelRef.current = supabase
      .channel(name)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "blog_posts" }, (payload) => {
        if (payload.new.published) setNewBanner(true);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "blog_posts" }, fetchPosts)
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [fetchPosts]);

  /* ── keyboard shortcut: press / to focus search ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearch("");
        setShowRecent(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ── server-side search (debounced 350ms) ── */
  const doSearch = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);

    const [ilikeRes, ftsRes] = await Promise.all([
      /* partial match on title + excerpt */
      supabase.from("blog_posts").select(SELECT)
        .eq("published", true)
        .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12),
      /* full-text search across content via search_vector (falls back gracefully if column missing) */
      supabase.from("blog_posts").select(SELECT)
        .eq("published", true)
        .textSearch("search_vector", q.trim().split(/\s+/).join(" & "), { type: "plain", config: "english" })
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    /* merge + deduplicate; ilike results come first */
    const seen = new Set();
    const merged = [];
    [...(ilikeRes.data || []), ...(ftsRes.data || [])].forEach((p) => {
      if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
    });

    /* also include tag matches from already-loaded posts */
    posts.forEach((p) => {
      if (!seen.has(p.id) && (p.tags || []).some((t) => t.toLowerCase().includes(q.toLowerCase()))) {
        seen.add(p.id);
        merged.push(p);
      }
    });

    /* author username match */
    posts.forEach((p) => {
      if (!seen.has(p.id) && p.author?.username?.toLowerCase().includes(q.toLowerCase())) {
        seen.add(p.id);
        merged.push(p);
      }
    });

    setSearchResults(merged);
    setSearching(false);
  }, [posts]);

  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    if (!search.trim()) { setSearchResults([]); setSearching(false); return; }
    searchTimerRef.current = setTimeout(() => doSearch(search), 350);
    return () => clearTimeout(searchTimerRef.current);
  }, [search, doSearch]);

  /* ── save recent search ── */
  const saveRecent = (q) => {
    if (!q.trim() || q.length < 2) return;
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 6);
    setRecentSearches(updated);
    localStorage.setItem("blog_recent_searches", JSON.stringify(updated));
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem("blog_recent_searches");
  };

  /* ── sorting ── */
  const sortPosts = (list) => {
    if (sortBy === "popular") return [...list].sort((a, b) => (b.views || 0) - (a.views || 0));
    if (sortBy === "liked") return [...list].sort((a, b) => (b.blog_likes?.[0]?.count || 0) - (a.blog_likes?.[0]?.count || 0));
    return list; // "latest" — already sorted by API
  };

  /* ── decide what to display ── */
  const isSearching = search.trim().length >= 2;
  const baseList = isSearching ? searchResults : posts;
  const tagFiltered = activeTag ? baseList.filter((p) => (p.tags || []).includes(activeTag)) : baseList;
  const display = sortPosts(tagFiltered);
  const featured = !isSearching && !activeTag && sortBy === "latest" ? display[0] : null;
  const grid = featured ? display.slice(1) : display;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#080c12] text-gray-900 dark:text-gray-100">
      {/* nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-200/80 dark:border-white/5 bg-white/80 dark:bg-[#080c12]/80 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow shadow-blue-500/30">
              <Terminal size={14} className="text-white" />
            </div>
            <span className="font-black text-base tracking-tight">beone<span className="text-blue-600">of</span>us</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors hidden sm:block">Home</Link>
            <Link href="/dash" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow shadow-blue-500/20">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-full text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest mb-5">
            <Sparkles size={11} /> beoneofus Blog
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-4 text-gray-900 dark:text-white">
            Stories from the<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600">network.</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium max-w-xl mx-auto">
            Engineering insights, career advice, product updates, and community highlights.
          </p>
        </div>

        {/* New post banner */}
        {newBanner && (
          <div className="mb-6 flex items-center justify-between gap-3 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-blue-500/20 animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Zap size={15} className="animate-pulse" /> New post just published!
            </div>
            <button onClick={() => { setNewBanner(false); fetchPosts(); }} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-xl text-xs font-bold transition-all">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        )}

        {/* ── Search bar ── */}
        <div className="mb-4">
          <div className="relative">
            {searching
              ? <Loader2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin pointer-events-none" />
              : <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            }
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setShowRecent(true)}
              onBlur={() => setTimeout(() => setShowRecent(false), 150)}
              onKeyDown={(e) => { if (e.key === "Enter" && search.trim()) { saveRecent(search.trim()); setShowRecent(false); } }}
              placeholder="Search posts, tags, authors… (press / to focus)"
              className="w-full pl-10 pr-24 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {search
                ? <button onClick={() => { setSearch(""); setSearchResults([]); }} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"><X size={14} /></button>
                : <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 text-[10px] font-mono text-gray-400 dark:text-gray-500">/</kbd>
              }
            </div>

            {/* Recent searches dropdown */}
            {showRecent && !search && recentSearches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0f1723] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><History size={11} /> Recent Searches</span>
                  <button onClick={clearRecent} className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors">Clear</button>
                </div>
                {recentSearches.map((s) => (
                  <button key={s} onMouseDown={() => { setSearch(s); setShowRecent(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left">
                    <History size={13} className="text-gray-300 dark:text-gray-600 shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search hint */}
          {isSearching && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Search size={11} />
              {searching ? "Searching titles, excerpts, tags, content, and authors…" : `${display.length} result${display.length !== 1 ? "s" : ""} for "${search}"`}
              {!searching && display.length > 0 && <button onClick={() => saveRecent(search.trim())} className="ml-1 text-blue-500 hover:underline">Save search</button>}
            </p>
          )}
        </div>

        {/* ── Sort + Tag filters ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {/* Sort pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ArrowUpDown size={13} className="text-gray-400 shrink-0" />
            {[
              { id: "latest", label: "Latest" },
              { id: "popular", label: "Popular" },
              { id: "liked", label: "Most Liked" },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setSortBy(id)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${sortBy === id ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap overflow-x-auto no-scrollbar">
              <Tag size={13} className="text-gray-400 shrink-0" />
              {allTags.slice(0, 8).map((t) => (
                <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${activeTag === t ? tagColor(t) + " ring-1 ring-current ring-offset-1" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300"}`}>
                  {t}
                </button>
              ))}
              {activeTag && (
                <button onClick={() => setActiveTag(null)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border border-red-200 dark:border-red-800/40 text-red-500 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all">
                  <X size={10} /> Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <BlogSkeleton />
        ) : display.length === 0 ? (
          <EmptyState search={search} activeTag={activeTag} searching={searching} onClear={() => { setSearch(""); setActiveTag(null); setSearchResults([]); }} />
        ) : (
          <>
            {featured && <FeaturedCard post={featured} query={search} />}
            {grid.length > 0 && (
              <div className={`${featured ? "mt-8" : ""} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5`}>
                {grid.map((p) => <PostCard key={p.id} post={p} query={search} />)}
              </div>
            )}
            {display.length > 0 && (
              <p className="mt-10 text-center text-xs text-gray-400 dark:text-gray-600 font-medium">
                {display.length} post{display.length !== 1 ? "s" : ""}{isSearching ? ` matching "${search}"` : ""}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── cards ─────────────────────────────────────── */
function FeaturedCard({ post, query = "" }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block bg-white dark:bg-[#0f1723] border border-gray-200 dark:border-white/5 rounded-3xl overflow-hidden hover:shadow-2xl hover:border-blue-300 dark:hover:border-blue-700/50 transition-all duration-300">
      <div className="flex flex-col lg:flex-row">
        {post.cover_url && (
          <div className="relative w-full lg:w-[45%] h-52 lg:h-auto shrink-0">
            <Image src={post.cover_url} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:1024px) 100vw, 45vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 dark:to-black/20" />
          </div>
        )}
        <div className="flex-1 p-7 lg:p-10 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{post.is_featured ? "⭐ Featured" : "Latest"}</span>
              {post.author?.is_premium && !post.author?.is_trial_premium && post.author?.profile_visibility?.premium_badge !== false && <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200 dark:border-amber-700/40 flex items-center gap-1"><Crown size={9} /> Premium</span>}
              {post.author?.is_premium && post.author?.is_trial_premium && post.author?.profile_visibility?.premium_badge !== false && <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-200 dark:border-blue-700/40 flex items-center gap-1"><Sparkles size={9} /> Freemium</span>}
              {post.author?.is_verified && !post.author?.is_premium && <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-200 dark:border-emerald-700/40 flex items-center gap-1"><ShieldCheck size={9} /> Verified</span>}
              {(post.tags || []).slice(0, 2).map((t) => (
                <span key={t} className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${tagColor(t)}`}>{t}</span>
              ))}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
              <HighlightMatch text={post.title} query={query} />
            </h2>
            {post.excerpt && (
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3">
                <HighlightMatch text={post.excerpt} query={query} />
              </p>
            )}
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <AuthorMeta author={post.author} date={post.created_at} />
            <PostMeta likes={post.blog_likes?.[0]?.count} comments={post.blog_comments?.[0]?.count} views={post.views} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post, query = "" }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col bg-white dark:bg-[#0f1723] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700/40 hover:-translate-y-1 transition-all duration-300">
      {post.cover_url && (
        <div className="relative h-44 shrink-0 overflow-hidden">
          <Image src={post.cover_url} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:640px) 100vw, 33vw" />
          {post.is_featured && (
            <div className="absolute top-2 left-2">
              <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow">⭐ Featured</span>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {(post.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((t) => (
              <span key={t} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tagColor(t)}`}>
                <HighlightMatch text={t} query={query} />
              </span>
            ))}
          </div>
        )}
        <h3 className="font-black text-gray-900 dark:text-white text-base leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
          <HighlightMatch text={post.title} query={query} />
        </h3>
        {post.excerpt && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            <HighlightMatch text={post.excerpt} query={query} />
          </p>
        )}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2">
          <AuthorMeta author={post.author} date={post.created_at} compact />
          <PostMeta likes={post.blog_likes?.[0]?.count} comments={post.blog_comments?.[0]?.count} />
        </div>
      </div>
    </Link>
  );
}

function AuthorMeta({ author, date, compact = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`relative ${compact ? "w-6 h-6" : "w-8 h-8"} rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 ${author?.is_premium && !author?.is_trial_premium && author?.profile_visibility?.premium_badge !== false ? "ring-2 ring-amber-400" : author?.is_premium && author?.is_trial_premium && author?.profile_visibility?.premium_badge !== false ? "ring-2 ring-blue-400" : author?.is_verified ? "ring-2 ring-emerald-400" : ""}`}>
        {author?.avatar_url ? <Image src={author.avatar_url} alt="av" fill className="object-cover" sizes="32px" /> : <User size={compact ? 11 : 14} />}
      </div>
      <div>
        <p className={`font-bold text-gray-900 dark:text-white ${compact ? "text-xs" : "text-sm"} flex items-center gap-1`}>
          @{author?.username || "beoneofus"}
          {author?.is_premium && !author?.is_trial_premium && author?.profile_visibility?.premium_badge !== false && <Crown size={10} className="text-amber-500" />}
          {author?.is_premium && author?.is_trial_premium && author?.profile_visibility?.premium_badge !== false && <Sparkles size={10} className="text-blue-500" />}
          {author?.is_verified && !author?.is_premium && <ShieldCheck size={10} className="text-emerald-500" />}
        </p>
        {!compact && <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} />{timeAgo(date)}</p>}
        {compact && <p className="text-[10px] text-gray-500">{timeAgo(date)}</p>}
      </div>
    </div>
  );
}

function PostMeta({ likes = 0, comments = 0, views }) {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
      <span className="flex items-center gap-1"><Heart size={12} />{likes}</span>
      <span className="flex items-center gap-1"><MessageSquare size={12} />{comments}</span>
      {views != null && <span className="flex items-center gap-1 hidden sm:flex"><Eye size={12} />{views}</span>}
    </div>
  );
}

function BlogSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-64 bg-gray-100 dark:bg-white/5 rounded-3xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-gray-100 dark:bg-white/5 rounded-2xl" />)}
      </div>
    </div>
  );
}

function EmptyState({ search, activeTag, searching, onClear }) {
  return (
    <div className="text-center py-24">
      <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
        {searching ? <Loader2 size={24} className="text-blue-400 animate-spin" /> : <BookOpen size={24} className="text-gray-400" />}
      </div>
      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
        {searching ? "Searching…" : "No posts found"}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        {searching ? `Looking for "${search}"` : search ? `No results for "${search}"` : activeTag ? `No posts tagged "${activeTag}"` : "No published posts yet."}
      </p>
      {(search || activeTag) && !searching && (
        <button onClick={onClear} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors">
          Clear search
        </button>
      )}
    </div>
  );
}
