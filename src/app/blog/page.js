"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../supabaseClient";
import {
  Terminal, ArrowRight, Search, X, Tag, Heart, MessageSquare,
  Eye, Clock, ChevronRight, Zap, Sparkles, RefreshCw, User,
  TrendingUp, BookOpen, Loader2,
} from "lucide-react";

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function slugify(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const TAG_COLORS = [
  "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40",
  "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
  "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40",
];
function tagColor(tag) { let h = 0; for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xff; return TAG_COLORS[h % TAG_COLORS.length]; }

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [newBanner, setNewBanner] = useState(false);
  const channelRef = useRef(null);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select(`
        id, title, slug, excerpt, cover_url, tags, views, published, created_at,
        author:profiles!author_id(id, username, avatar_url, is_verified),
        blog_comments(count),
        blog_likes(count)
      `)
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (data) {
      setPosts(data);
      const tags = [...new Set(data.flatMap((p) => p.tags || []))];
      setAllTags(tags);
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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "blog_posts" }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [fetchPosts]);

  const handleRefresh = () => { setNewBanner(false); fetchPosts(); };

  const filtered = posts.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || (p.excerpt || "").toLowerCase().includes(q) || (p.tags || []).some((t) => t.toLowerCase().includes(q));
    const matchTag = !activeTag || (p.tags || []).includes(activeTag);
    return matchSearch && matchTag;
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#080c12] text-gray-900 dark:text-gray-100">
      {/* nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-200/80 dark:border-white/5 bg-white/80 dark:bg-[#080c12]/80 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
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
            Engineering insights, career advice, product updates, and community highlights — live as they publish.
          </p>
        </div>

        {/* New post banner */}
        {newBanner && (
          <div className="mb-6 flex items-center justify-between gap-3 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-blue-500/20 animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Zap size={15} className="animate-pulse" /> New post just published!
            </div>
            <button onClick={handleRefresh} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-xl text-xs font-bold transition-all">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        )}

        {/* Search + Tags */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts…"
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>}
          </div>
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={14} className="text-gray-400 shrink-0" />
              {allTags.slice(0, 6).map((t) => (
                <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${activeTag === t ? tagColor(t) + " ring-1 ring-current ring-offset-1" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300"}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <BlogSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState search={search} activeTag={activeTag} onClear={() => { setSearch(""); setActiveTag(null); }} />
        ) : (
          <>
            {/* Featured */}
            {featured && <FeaturedCard post={featured} />}

            {/* Grid */}
            {rest.length > 0 && (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FeaturedCard({ post }) {
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
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Featured</span>
              {(post.tags || []).slice(0, 2).map((t) => (
                <span key={t} className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${tagColor(t)}`}>{t}</span>
              ))}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
              {post.title}
            </h2>
            {post.excerpt && <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3">{post.excerpt}</p>}
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

function PostCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col bg-white dark:bg-[#0f1723] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700/40 hover:-translate-y-1 transition-all duration-300">
      {post.cover_url && (
        <div className="relative h-44 shrink-0 overflow-hidden">
          <Image src={post.cover_url} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:640px) 100vw, 33vw" />
        </div>
      )}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {(post.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((t) => (
              <span key={t} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tagColor(t)}`}>{t}</span>
            ))}
          </div>
        )}
        <h3 className="font-black text-gray-900 dark:text-white text-base leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">{post.title}</h3>
        {post.excerpt && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{post.excerpt}</p>}
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
      <div className={`${compact ? "w-6 h-6" : "w-8 h-8"} rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-xs font-bold overflow-hidden relative shrink-0`}>
        {author?.avatar_url ? <Image src={author.avatar_url} alt="av" fill className="object-cover" sizes="32px" /> : <User size={compact ? 11 : 14} />}
      </div>
      <div>
        <p className={`font-bold text-gray-900 dark:text-white ${compact ? "text-xs" : "text-sm"}`}>@{author?.username || "beoneofus"}</p>
        {!compact && <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1"><Clock size={10} />{timeAgo(date)}</p>}
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

function EmptyState({ search, activeTag, onClear }) {
  return (
    <div className="text-center py-24">
      <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <BookOpen size={24} className="text-gray-400" />
      </div>
      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No posts found</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        {search ? `No results for "${search}"` : activeTag ? `No posts tagged "${activeTag}"` : "No published posts yet."}
      </p>
      {(search || activeTag) && (
        <button onClick={onClear} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors">Clear filters</button>
      )}
    </div>
  );
}
