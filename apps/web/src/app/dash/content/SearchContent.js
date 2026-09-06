"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search, Users, MessageCircle, Hash,
  CalendarDays, Briefcase, MapPin, Building2, Globe,
  X, Clock, FileText, BadgeCheck, ArrowRight, SlidersHorizontal,
  ChevronDown, CheckCircle2, Loader2,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

/* ── Constants ─────────────────────────────────────────────────── */
const HISTORY_KEY = "search_history_v2";
const MAX_HISTORY = 8;
const LIMIT_ALL   = 6;
const LIMIT_TAB   = 40;
const DEBOUNCE_MS = 380;

// Priority order — fast/important first so they appear before slow tables
const QUERY_ORDER = ["people", "posts", "groups", "pages", "events", "jobs"];

const TABS = [
  { key: "all",      label: "All",      Icon: Search        },
  { key: "people",   label: "People",   Icon: Users         },
  { key: "posts",    label: "Posts",    Icon: MessageCircle },
  { key: "groups",   label: "Groups",   Icon: Hash          },
  { key: "pages",    label: "Pages",    Icon: FileText      },
  { key: "events",   label: "Events",   Icon: CalendarDays  },
  { key: "jobs",     label: "Jobs",     Icon: Briefcase     },
];

const EMPTY = { people: [], posts: [], groups: [], pages: [], events: [], jobs: [] };

/* ── Filters config ─────────────────────────────────────────────── */
const TAB_FILTERS = {
  people: [
    { id: "work_status", label: "Status",       type: "select", options: ["All", "Hiring", "Open to Work", "Available", "Not Looking"] },
    { id: "verified",    label: "Verified only", type: "toggle" },
    { id: "premium",     label: "Premium only",  type: "toggle" },
  ],
  posts: [
    { id: "category", label: "Category", type: "select", options: ["All", "Tech", "Business", "Achievement", "General", "Design", "Career"] },
    { id: "sort",     label: "Sort by",  type: "select", options: ["Newest", "Most Comments"] },
  ],
  events: [
    { id: "format",   label: "Format",       type: "select", options: ["All", "Online", "In-Person"] },
    { id: "upcoming", label: "Upcoming only", type: "toggle" },
  ],
  jobs: [
    { id: "type", label: "Job type", type: "select", options: ["All", "Full-time", "Part-time", "Contract", "Remote", "Internship"] },
  ],
  groups: [
    { id: "visibility", label: "Visibility", type: "select", options: ["All", "Public", "Private"] },
  ],
  pages: [
    { id: "category", label: "Category", type: "select", options: ["All", "Tech", "Business", "Engineering", "Community", "Resources", "Founder", "Product"] },
  ],
};

/* ── History helpers ────────────────────────────────────────────── */
function getHistory() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function addHistory(q) {
  if (!q?.trim()) return;
  try {
    const prev = getHistory().filter(h => h.toLowerCase() !== q.toLowerCase());
    localStorage.setItem(HISTORY_KEY, JSON.stringify([q, ...prev].slice(0, MAX_HISTORY)));
  } catch {}
}
function removeHistory(q) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(getHistory().filter(h => h !== q))); } catch {}
}
function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

/* ── HighlightMatch ─────────────────────────────────────────────── */
const HL = ({ text, q }) => {
  if (!q || !text) return <>{text || ""}</>;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.toString().split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === q.toLowerCase()
          ? <mark key={i} className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-sm px-px not-italic font-semibold">{p}</mark>
          : p
      )}
    </>
  );
};

/* ── Section wrapper ────────────────────────────────────────────── */
function Section({ title, Icon, count, isAll, onSeeAll, colorClass = "text-gray-500", loading, children }) {
  const showSeeAll = isAll && count >= LIMIT_ALL;
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Icon size={12} className={colorClass} />
          <span className="text-[10px] font-black uppercase tracking-[2px] text-gray-500 dark:text-gray-400">{title}</span>
          {loading
            ? <Loader2 size={10} className="animate-spin text-gray-400" />
            : <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-black text-gray-500 dark:text-gray-400 tabular-nums">{count}{showSeeAll ? "+" : ""}</span>}
        </div>
        {showSeeAll && !loading && (
          <button onClick={onSeeAll} className="flex items-center gap-1 text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-wider">
            See all <ArrowRight size={10} />
          </button>
        )}
      </div>
      <div className="bg-white dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/50 shadow-sm">
        {loading
          ? <RowSkeleton count={2} />
          : children}
      </div>
    </div>
  );
}

function RowSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3.5 animate-pulse">
          <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-2/5" />
            <div className="h-2.5 bg-gray-50 dark:bg-gray-800/70 rounded-lg w-3/5" />
          </div>
        </div>
      ))}
    </>
  );
}

/* ── FilterBar ──────────────────────────────────────────────────── */
function FilterBar({ tab, filters, setFilters }) {
  const defs = TAB_FILTERS[tab] || [];
  if (!defs.length) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <SlidersHorizontal size={12} className="text-gray-400 shrink-0" />
      {defs.map(f => {
        if (f.type === "toggle") {
          const on = !!filters[f.id];
          return (
            <button key={f.id} onClick={() => setFilters(p => ({ ...p, [f.id]: !p[f.id] }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                on ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300"
              }`}>
              {on && <CheckCircle2 size={11} />}{f.label}
            </button>
          );
        }
        const val = filters[f.id] || f.options[0];
        const active = val !== f.options[0];
        return (
          <div key={f.id} className="relative">
            <select value={val} onChange={e => setFilters(p => ({ ...p, [f.id]: e.target.value }))}
              className={`appearance-none pl-3 pr-7 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer focus:outline-none ${
                active ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300"
              }`}>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown size={9} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${active ? "text-white" : "text-gray-400"}`} />
          </div>
        );
      })}
      {Object.values(filters).some(Boolean) && (
        <button onClick={() => setFilters({})} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 transition-all">
          <X size={10} /> Clear
        </button>
      )}
    </div>
  );
}

/* ── SearchInput ────────────────────────────────────────────────── */
function SearchInput({ value, onChange, inputRef, anyLoading, onFocus, onBlur, autoFocus }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        {anyLoading
          ? <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin" />
          : <Search size={17} className="text-gray-400" />}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
        placeholder="Search people, posts, groups, jobs, events, pages…"
        className="w-full pl-11 pr-16 py-3.5 bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/60 rounded-2xl text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-600 transition-all shadow-sm"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {value && (
          <button onClick={() => onChange("")} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={14} />
          </button>
        )}
        <kbd className="hidden sm:block text-[9px] font-black text-gray-300 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded-md">⌘K</kbd>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function SearchContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const urlQ         = searchParams.get("q") || "";

  const [inputQ,      setInputQ]      = useState(urlQ);
  const [activeQ,     setActiveQ]     = useState(urlQ);
  const [tab,         setTab]         = useState("all");
  const [results,     setResults]     = useState(EMPTY);
  const [loadingKeys, setLoadingKeys] = useState(new Set());  // which categories are still loading
  const [filters,     setFilters]     = useState({});
  const [history,     setHistory]     = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const inputRef    = useRef(null);
  const debounceRef = useRef(null);
  const queryCache  = useRef(new Map());   // key → results snapshot
  const cancelRef   = useRef(false);

  /* Sync from URL */
  useEffect(() => { (() => { setInputQ(urlQ); setActiveQ(urlQ); })(); }, [urlQ]);

  /* Load history */
  useEffect(() => { (() => { setHistory(getHistory()); })(); }, []);

  /* Reset on query change */
  useEffect(() => { (() => { setTab("all"); setFilters({}); })(); }, [activeQ]);

  /* ⌘K / "/" shortcut */
  useEffect(() => {
    const h = (e) => {
      if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* Debounced input handler */
  const handleInput = (val) => {
    setInputQ(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setActiveQ(val.trim());
      if (val.trim()) router.replace(`/dash/search?q=${encodeURIComponent(val.trim())}`, { scroll: false });
      else router.replace("/dash/search", { scroll: false });
    }, DEBOUNCE_MS);
  };

  /* ── Progressive search ─────────────────────────────────────── */
  useEffect(() => {
    const q = activeQ.trim();
    if (!q) { (() => { setResults(EMPTY); setLoadingKeys(new Set()); })(); return; }

    // Cache hit — instant
    const cacheKey = `${q}|${tab}|${JSON.stringify(filters)}`;
    const cached = queryCache.current.get(cacheKey);
    if (cached) { (() => { setResults(cached); setLoadingKeys(new Set()); })(); return; }

    cancelRef.current = true;  // cancel previous run
    const cancelled = { v: false };
    cancelRef.current = false;

    const pat = `%${q}%`;
    const lim  = tab === "all" ? LIMIT_ALL : LIMIT_TAB;
    const keys = tab === "all" ? QUERY_ORDER : [tab];

    // Mark all keys as loading and clear old results
    (() => { setLoadingKeys(new Set(keys)); setResults(EMPTY); })();

    const accumulated = { ...EMPTY };
    let remaining = keys.length;

    const buildQuery = (key) => {
      switch (key) {
        case "people": {
          let qb = supabase
            .from("profiles")
            .select("id, username, full_name, name, status, work_status, bio, field, avatar_url, is_verified, is_premium, is_trial_premium, location")
            .or(`username.ilike.${pat},full_name.ilike.${pat},name.ilike.${pat},bio.ilike.${pat},field.ilike.${pat},status.ilike.${pat}`)
            .limit(lim);
          if (filters.work_status && filters.work_status !== "All") qb = qb.ilike("work_status", `%${filters.work_status}%`);
          if (filters.verified) qb = qb.eq("is_verified", true);
          if (filters.premium)  qb = qb.eq("is_premium", true);
          return qb;
        }
        case "posts": {
          let qb = supabase
            .from("posts")
            .select("id, title, content, category, comment_count, created_at, profiles:user_id(id, username, avatar_url, is_verified)")
            .or(`title.ilike.${pat},content.ilike.${pat},category.ilike.${pat}`);
          if (filters.category && filters.category !== "All") qb = qb.ilike("category", filters.category);
          qb = filters.sort === "Most Comments"
            ? qb.order("comment_count", { ascending: false })
            : qb.order("created_at", { ascending: false });
          return qb.limit(lim);
        }
        case "groups": {
          let qb = supabase
            .from("groups")
            .select("id, name, description, is_private, created_at")
            .or(`name.ilike.${pat},description.ilike.${pat}`);
          if (filters.visibility === "Public")  qb = qb.eq("is_private", false);
          if (filters.visibility === "Private") qb = qb.eq("is_private", true);
          return qb.limit(lim);
        }
        case "pages":
          return supabase
            .from("pages")
            .select("id, title, description, icon, visibility, created_at, company_data")
            .or(`title.ilike.${pat},description.ilike.${pat}`)
            .limit(lim);
        case "events": {
          let qb = supabase
            .from("events")
            .select("id, title, description, event_date, is_online, location, event_url")
            .or(`title.ilike.${pat},description.ilike.${pat},location.ilike.${pat}`);
          if (filters.format === "Online")    qb = qb.eq("is_online", true);
          if (filters.format === "In-Person") qb = qb.eq("is_online", false);
          if (filters.upcoming) qb = qb.gte("event_date", new Date().toISOString());
          return qb.order("event_date", { ascending: true }).limit(lim);
        }
        case "jobs": {
          let qb = supabase
            .from("jobs")
            .select("id, title, company, type, location, salary, created_at")
            .eq("approved", true)
            .or(`title.ilike.${pat},company.ilike.${pat},location.ilike.${pat}`);
          if (filters.type && filters.type !== "All") qb = qb.ilike("type", `%${filters.type}%`);
          return qb.order("created_at", { ascending: false }).limit(lim);
        }
        default:
          return null;
      }
    };

    // Fire each query independently — update state as each arrives
    keys.forEach(async (key) => {
      try {
        const qb = buildQuery(key);
        if (!qb) throw new Error("unknown key");
        const { data, error } = await qb;
        if (error) throw error;
        if (cancelled.v) return;
        accumulated[key] = data || [];
        setResults(prev => ({ ...prev, [key]: data || [] }));
      } catch (e) {
        // Silently ignore missing tables / RLS errors — just show empty for that category
        if (!cancelled.v) setResults(prev => ({ ...prev, [key]: [] }));
      } finally {
        if (!cancelled.v) {
          setLoadingKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
          remaining--;
          if (remaining === 0) {
            // Cache the full result set
            queryCache.current.set(cacheKey, { ...accumulated });
            if (queryCache.current.size > 40) {
              queryCache.current.delete(queryCache.current.keys().next().value);
            }
            addHistory(q);
            setHistory(getHistory());
          }
        }
      }
    });

    return () => { cancelled.v = true; };
  }, [activeQ, tab, filters]);

  const totalCount = Object.values(results).reduce((s, a) => s + a.length, 0);
  const anyLoading = loadingKeys.size > 0;
  const isAll      = tab === "all";
  const go         = (s) => router.push(`/dash/${s}`);

  /* ── Empty / landing state ─────────────────────────────────── */
  if (!activeQ && !inputQ) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <SearchInput value={inputQ} onChange={handleInput} inputRef={inputRef} anyLoading={false}
          onFocus={() => setShowHistory(true)} onBlur={() => setTimeout(() => setShowHistory(false), 150)} autoFocus />

        {showHistory && history.length > 0 ? (
          <div className="mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 dark:border-gray-800">
              <span className="text-[10px] font-black uppercase tracking-[2px] text-gray-400">Recent searches</span>
              <button onClick={() => { clearHistory(); setHistory([]); }} className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors">Clear all</button>
            </div>
            {history.map(h => (
              <div key={h} onClick={() => handleInput(h)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors">
                <Clock size={13} className="text-gray-400 shrink-0" />
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 font-medium truncate">{h}</span>
                <button onClick={e => { e.stopPropagation(); removeHistory(h); setHistory(getHistory()); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-all">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-12 text-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search size={26} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2 tracking-tight">Search everything</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto leading-relaxed">
              People, posts, groups, pages, events, jobs — all in one place.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {["Frontend developer", "Internships", "Open Source", "Remote jobs", "Mentors", "Founders"].map(s => (
                <button key={s} onClick={() => handleInput(s)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-[12px] font-semibold text-gray-600 dark:text-gray-400 transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-800/50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Results view ───────────────────────────────────────────── */
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Search input */}
      <div className="mb-5 relative">
        <SearchInput value={inputQ} onChange={handleInput} inputRef={inputRef} anyLoading={anyLoading}
          onFocus={() => setShowHistory(true)} onBlur={() => setTimeout(() => setShowHistory(false), 150)} />
        {showHistory && !anyLoading && history.length > 0 && (
          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {history.map(h => (
              <div key={h} onClick={() => handleInput(h)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors">
                <Clock size={13} className="text-gray-400 shrink-0" />
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 font-medium truncate">{h}</span>
                <button onClick={e => { e.stopPropagation(); removeHistory(h); setHistory(getHistory()); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[22px] font-black text-gray-900 dark:text-gray-100 tracking-tight">
          Results for <span className="text-blue-600 dark:text-blue-400">&ldquo;{activeQ}&rdquo;</span>
        </h1>
        <p className="text-[13px] text-gray-400 dark:text-gray-500 font-medium mt-0.5 flex items-center gap-2">
          {anyLoading
            ? <><Loader2 size={11} className="animate-spin" /> Searching across all categories…</>
            : totalCount === 0
              ? "No results found — try different keywords"
              : `${totalCount}${isAll && totalCount >= LIMIT_ALL ? "+" : ""} result${totalCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar pb-1 mb-3 border-b border-gray-100 dark:border-gray-800">
        {TABS.map(({ key, label, Icon }) => {
          const count   = key === "all" ? undefined : results[key]?.length;
          const loading = loadingKeys.has(key);
          return (
            <button key={key} onClick={() => { setTab(key); setFilters({}); }}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-[12px] font-bold whitespace-nowrap transition-all ${
                tab === key
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}>
              <Icon size={12} />
              {label}
              {loading
                ? <Loader2 size={9} className="animate-spin text-gray-400" />
                : count !== undefined && count > 0
                  ? <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${tab === key ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>{count}</span>
                  : null}
              {tab === key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      {!isAll && (
        <div className="mb-4">
          <FilterBar tab={tab} filters={filters} setFilters={setFilters} />
        </div>
      )}

      {/* No results (only when ALL loading is done) */}
      {!anyLoading && totalCount === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">No results for &ldquo;{activeQ}&rdquo;</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Try different keywords or adjust your filters.</p>
          {Object.values(filters).some(Boolean) && (
            <button onClick={() => setFilters({})} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">Clear all filters</button>
          )}
        </div>
      )}

      {/* Results — rendered progressively as loadingKeys shrinks */}
      <div className="space-y-6">

        {/* People */}
        {(isAll || tab === "people") && (results.people.length > 0 || loadingKeys.has("people")) && (
          <Section title="People" Icon={Users} count={results.people.length} isAll={isAll} onSeeAll={() => setTab("people")} colorClass="text-blue-500" loading={loadingKeys.has("people")}>
            {results.people.map(u => (
              <a key={u.id} href={`/u/${u.username}`} className="flex items-center gap-3 p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group">
                <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 ring-1 ring-gray-200/60 dark:ring-gray-700/40">
                  {u.avatar_url
                    ? <Image src={u.avatar_url} alt={u.username || ""} fill sizes="44px" className="object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center text-sm font-black text-blue-600 dark:text-blue-400 uppercase">{u.username?.slice(0, 2) || "??"}</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-[14px] font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      @<HL text={u.username} q={activeQ} />
                    </span>
                    {u.is_verified && <BadgeCheck size={13} className="text-blue-500 shrink-0" fill="currentColor" stroke="white" />}
                    {u.work_status && u.work_status !== "None" && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${u.work_status === "Hiring" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"}`}>
                        {u.work_status}
                      </span>
                    )}
                  </div>
                  {(u.full_name || u.name) && (
                    <p className="text-[12px] text-gray-600 dark:text-gray-400 font-medium truncate">
                      <HL text={u.full_name || u.name} q={activeQ} />
                      {u.field && <span className="text-gray-400 dark:text-gray-500"> · <HL text={u.field} q={activeQ} /></span>}
                    </p>
                  )}
                  {u.bio && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5"><HL text={u.bio} q={activeQ} /></p>}
                </div>
                <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 shrink-0 transition-colors" />
              </a>
            ))}
          </Section>
        )}

        {/* Posts */}
        {(isAll || tab === "posts") && (results.posts.length > 0 || loadingKeys.has("posts")) && (
          <Section title="Posts" Icon={MessageCircle} count={results.posts.length} isAll={isAll} onSeeAll={() => setTab("posts")} colorClass="text-violet-500" loading={loadingKeys.has("posts")}>
            {results.posts.map(p => (
              <div key={p.id} onClick={() => go("feed")} className="flex items-start gap-3 p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-500 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2 mb-0.5">
                    <span className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1">
                      <HL text={p.title || "Untitled post"} q={activeQ} />
                    </span>
                    {p.category && (
                      <span className="shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-800/40">
                        {p.category}
                      </span>
                    )}
                  </div>
                  {p.content && <p className="text-[12px] text-gray-500 dark:text-gray-400 line-clamp-2"><HL text={p.content} q={activeQ} /></p>}
                  <div className="flex items-center gap-3 mt-1">
                    {p.profiles?.username && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                        @{p.profiles.username}
                        {p.profiles.is_verified && <BadgeCheck size={9} className="text-blue-500 ml-0.5" fill="currentColor" stroke="white" />}
                      </span>
                    )}
                    {p.comment_count > 0 && <span className="text-[10px] text-gray-400 dark:text-gray-500">{p.comment_count} comment{p.comment_count !== 1 ? "s" : ""}</span>}
                  </div>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Groups */}
        {(isAll || tab === "groups") && (results.groups.length > 0 || loadingKeys.has("groups")) && (
          <Section title="Groups" Icon={Hash} count={results.groups.length} isAll={isAll} onSeeAll={() => setTab("groups")} colorClass="text-emerald-500" loading={loadingKeys.has("groups")}>
            {results.groups.map(g => (
              <div key={g.id} onClick={() => go("groups")} className="flex items-center gap-3 p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <Hash size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1">
                      <HL text={g.name} q={activeQ} />
                    </p>
                    <span className={`shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border ${g.is_private ? "bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40"}`}>
                      {g.is_private ? "Private" : "Public"}
                    </span>
                  </div>
                  {g.description && <p className="text-[12px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5"><HL text={g.description} q={activeQ} /></p>}
                </div>
                <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 shrink-0 transition-colors" />
              </div>
            ))}
          </Section>
        )}

        {/* Pages */}
        {(isAll || tab === "pages") && (results.pages.length > 0 || loadingKeys.has("pages")) && (
          <Section title="Pages" Icon={FileText} count={results.pages.length} isAll={isAll} onSeeAll={() => setTab("pages")} colorClass="text-indigo-500" loading={loadingKeys.has("pages")}>
            {results.pages.map(p => (
              <div key={p.id} onClick={() => go("pages")} className="flex items-center gap-3 p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0 text-lg leading-none">
                  {p.icon || <FileText size={15} className="text-indigo-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1">
                      <HL text={p.title} q={activeQ} />
                    </p>
                    {p.company_data?.category && (
                      <span className="shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40">
                        {p.company_data.category}
                      </span>
                    )}
                  </div>
                  {p.description && <p className="text-[12px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5"><HL text={p.description} q={activeQ} /></p>}
                </div>
                <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 shrink-0 transition-colors" />
              </div>
            ))}
          </Section>
        )}

        {/* Events */}
        {(isAll || tab === "events") && (results.events.length > 0 || loadingKeys.has("events")) && (
          <Section title="Events" Icon={CalendarDays} count={results.events.length} isAll={isAll} onSeeAll={() => setTab("events")} colorClass="text-rose-500" loading={loadingKeys.has("events")}>
            {results.events.map(e => (
              <div key={e.id} onClick={() => go("events")} className="flex items-center gap-3 p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center shrink-0">
                  <CalendarDays size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <HL text={e.title} q={activeQ} />
                  </p>
                  <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                    {e.event_date && <span className="text-[11px] text-gray-400 dark:text-gray-500">{new Date(e.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                    {e.is_online
                      ? <span className="text-[10px] text-blue-500 font-bold flex items-center gap-0.5 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md"><Globe size={9} /> Online</span>
                      : e.location ? <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><MapPin size={9} /><HL text={e.location} q={activeQ} /></span> : null}
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 shrink-0 transition-colors" />
              </div>
            ))}
          </Section>
        )}

        {/* Jobs */}
        {(isAll || tab === "jobs") && (results.jobs.length > 0 || loadingKeys.has("jobs")) && (
          <Section title="Jobs" Icon={Briefcase} count={results.jobs.length} isAll={isAll} onSeeAll={() => setTab("jobs")} colorClass="text-amber-500" loading={loadingKeys.has("jobs")}>
            {results.jobs.map(j => (
              <div key={j.id} onClick={() => window.dispatchEvent(new CustomEvent("open-header-modal", { detail: "jobs" }))} className="flex items-center gap-3 p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Briefcase size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <HL text={j.title} q={activeQ} />
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {j.company  && <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5"><Building2 size={9} /><HL text={j.company} q={activeQ} /></span>}
                    {j.location && <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5"><MapPin size={9} />{j.location}</span>}
                    {j.type     && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md">{j.type}</span>}
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 shrink-0 transition-colors" />
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}
