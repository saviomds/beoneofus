"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "../../supabaseClient";

import {
  Search, X, Bookmark, BookmarkCheck, Play,
  Clock, Code2, Briefcase, Palette, Brain,
  Globe, Terminal, LayoutGrid, List, Rows,
  Sparkles, BookOpen, Video,
  Zap, RefreshCw, Flame, Plus, Send, Trash2, Edit2, Check,
  Share2, MessageCircle, ShieldCheck, Star, TrendingUp,
  Lock, ChevronRight, ChevronLeft, ExternalLink, Newspaper,
  Eye, EyeOff, ListVideo, SkipForward,
  Shuffle, ArrowUpDown, GraduationCap, History, BarChart2,
  Filter, SortAsc, Tag, Users, Award, Rss,
  ChevronDown, Bell, Heart, ThumbsUp, Download,
  Maximize2, PictureInPicture, MoreHorizontal,
  CheckCircle2, Circle, Layers, Compass, BookMarked,
} from "lucide-react";

// ── Seed fallback ─────────────────────────────────────────────────────────────
const SEED_CONTENT = [
  {
    id: "seed_v1", type: "video", platform: "youtube", youtube_id: "DHjqpvDnNGE",
    topic: "coding", title: "JavaScript in 100 Seconds", author: "Fireship",
    duration: "2:14", tags: ["javascript", "web"], featured: true,
    level: "Beginner", published: "2023-09-12",
    description: "A lightning-fast overview of JavaScript — the world's most popular language.",
  },
  {
    id: "seed_v2", type: "video", platform: "youtube", youtube_id: "Tn6-PIqc4UM",
    topic: "coding", title: "React in 100 Seconds", author: "Fireship",
    duration: "2:54", tags: ["react", "frontend"], featured: false,
    level: "Beginner", published: "2023-11-20",
    description: "Everything you need to know about React in under 3 minutes.",
  },
  {
    id: "seed_v3", type: "video", platform: "youtube", youtube_id: "uvU0tWlsE8s",
    topic: "ai", title: "Machine Learning in 100 Seconds", author: "Fireship",
    duration: "2:32", tags: ["ml", "ai"], featured: true,
    level: "Beginner", published: "2024-01-05",
    description: "Machine learning explained simply.",
  },
  {
    id: "seed_v4", type: "video", platform: "youtube", youtube_id: "VqgUkExPvLY",
    topic: "webdev", title: "CSS in 100 Seconds", author: "Fireship",
    duration: "1:52", tags: ["css", "frontend"], featured: false,
    level: "Beginner", published: "2024-02-10",
    description: "The cascade, specificity and layout, fast.",
  },
  {
    id: "seed_v5", type: "article", platform: null, youtube_id: null,
    topic: "career", title: "The 10x Engineer Myth", author: "Dan Abramov",
    duration: null, tags: ["career", "culture"], featured: false,
    level: "Intermediate", published: "2024-03-01",
    description: "Why the notion of the 10x engineer is harmful and what really drives team performance.",
    read_time: "8 min", url: "https://overreacted.io", source: "Overreacted",
  },
  {
    id: "seed_v6", type: "video", platform: "youtube", youtube_id: "I7ZT_KmY6Ck",
    topic: "devops", title: "Docker in 100 Seconds", author: "Fireship",
    duration: "2:10", tags: ["docker", "containers"], featured: false,
    level: "Beginner", published: "2024-01-20",
    description: "Containers, images and the whole Docker ecosystem demystified.",
  },
  {
    id: "seed_v7", type: "video", platform: "youtube", youtube_id: "eIrMbAQSU34",
    topic: "design", title: "UI Design Fundamentals in 7 Minutes", author: "Adrian Twarog",
    duration: "7:14", tags: ["ui", "design"], featured: true,
    level: "Beginner", published: "2024-02-14",
    description: "Visual hierarchy, spacing, colour and typography in one tight sit-down.",
  },
  {
    id: "seed_v8", type: "video", platform: "youtube", youtube_id: "x7cQ3mrcKaY",
    topic: "business", title: "How to Validate a Startup Idea", author: "Y Combinator",
    duration: "14:22", tags: ["startup", "product"], featured: false,
    level: "Intermediate", published: "2024-03-05",
    description: "YC partners walk through the fastest way to find out if your idea is worth building.",
  },
];

const TOPICS = [
  { id: "all",      label: "All",      icon: Sparkles,   color: "blue" },
  { id: "coding",   label: "Coding",   icon: Code2,      color: "violet" },
  { id: "ai",       label: "AI / ML",  icon: Brain,      color: "pink" },
  { id: "webdev",   label: "Web Dev",  icon: Globe,      color: "cyan" },
  { id: "design",   label: "Design",   icon: Palette,    color: "rose" },
  { id: "business", label: "Business", icon: Briefcase,  color: "amber" },
  { id: "career",   label: "Career",   icon: TrendingUp, color: "emerald" },
  { id: "devops",   label: "DevOps",   icon: Terminal,   color: "gray" },
];

const TOPIC_COLORS = {
  blue:    "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50",
  violet:  "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/50",
  pink:    "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800/50",
  cyan:    "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50",
  rose:    "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50",
  amber:   "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
  emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
  gray:    "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

const LEVEL_COLORS = {
  Beginner:     "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  Intermediate: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  Advanced:     "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
};

const LAYOUTS = [
  { id: "grid",     icon: LayoutGrid, label: "Grid" },
  { id: "list",     icon: List,       label: "List" },
  { id: "magazine", icon: Rows,       label: "Magazine" },
];

const SORT_OPTIONS = [
  { id: "newest",  label: "Newest",   icon: Clock },
  { id: "popular", label: "Popular",  icon: TrendingUp },
  { id: "az",      label: "A → Z",    icon: SortAsc },
  { id: "watched", label: "Unwatched", icon: Eye },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function ytThumb(id, quality = "mqdefault") {
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}
function topicConfig(id) { return TOPICS.find(t => t.id === id) || TOPICS[0]; }

function formatTimeAgo(iso) {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function formatCount(n) {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function extractVideo(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { platform: "youtube", id: yt[1] };
  const tt = url.match(/tiktok\.com\/(?:@[^/]+\/video\/|v\/)(\d+)/);
  if (tt) return { platform: "tiktok", id: tt[1] };
  return null;
}

// ── useLocalState – localStorage-backed useState ───────────────────────────────
function useLocalState(key, fallback) {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return fallback;
    try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
  });
  const set = useCallback((val) => {
    setState(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [state, set];
}

// ── ProgressRing ───────────────────────────────────────────────────────────────
function ProgressRing({ pct = 0, size = 36, stroke = 3, color = "#3b82f6" }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

// ── StatsBar ───────────────────────────────────────────────────────────────────
function StatsBar({ allContent, watched, bookmarks }) {
  const totalVideos   = allContent.filter(i => i.type === "video").length;
  const watchedCount  = watched.length;
  const pct           = totalVideos > 0 ? Math.round((watchedCount / totalVideos) * 100) : 0;
  const totalMins     = allContent
    .filter(i => watched.includes(i.id) && i.duration)
    .reduce((acc, i) => {
      const [m, s] = i.duration.split(":").map(Number);
      return acc + m + (s || 0) / 60;
    }, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Resources",    value: allContent.length, icon: Layers,     color: "blue" },
        { label: "Watched",      value: watchedCount,      icon: Eye,        color: "emerald" },
        { label: "Saved",        value: bookmarks.length,  icon: Bookmark,   color: "amber" },
        { label: "Mins learned", value: Math.round(totalMins), icon: Clock,  color: "violet" },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label}
          className="flex items-center gap-3 p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${TOPIC_COLORS[color]}`}>
            <Icon size={15} />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900 dark:text-gray-100 leading-none">{value}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CommentsPanel ──────────────────────────────────────────────────────────────
function CommentsPanel({ itemId, userProfile }) {
  const [comments,    setComments]  = useLocalState(`learn_comments_${itemId}`, []);
  const [commentText, setComment]   = useState("");
  const [editingId,   setEditingId] = useState(null);
  const [editText,    setEditText]  = useState("");
  const [likes,       setLikes]     = useLocalState(`learn_clikes_${itemId}`, {});
  const bottomRef                   = useRef(null);

  const addComment = () => {
    if (!commentText.trim() || !userProfile) return;
    const next = [...comments, {
      id: Date.now().toString(),
      userId: userProfile.id,
      username: userProfile.username || "You",
      avatar: userProfile.avatar_url || null,
      text: commentText.trim(),
      timestamp: new Date().toISOString(),
      edited: false,
    }];
    setComments(next);
    setComment("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const toggleLike = (cid) => {
    setLikes(prev => ({ ...prev, [cid]: !prev[cid] }));
  };

  const saveEdit = (cid) => {
    setComments(comments.map(x => x.id === cid ? { ...x, text: editText.trim(), edited: true } : x));
    setEditingId(null);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {comments.length === 0 && (
          <div className="text-center py-10">
            <MessageCircle size={24} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-600 text-xs">No comments yet. Start the conversation.</p>
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} className="group flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 text-[11px] font-black text-white overflow-hidden">
              {c.avatar
                ? <img src={c.avatar} alt="" className="w-full h-full object-cover" />
                : (c.username[0] || "U").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className="text-[11px] font-bold text-gray-200">{c.username}</span>
                {c.edited && <span className="text-[9px] text-gray-600">(edited)</span>}
                <span className="text-[9px] text-gray-600">{formatTimeAgo(c.timestamp)}</span>
              </div>
              {editingId === c.id ? (
                <div className="flex items-center gap-1 mt-1">
                  <input value={editText} onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(c.id); if (e.key === "Escape") setEditingId(null); }}
                    autoFocus
                    className="flex-1 text-xs bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white outline-none focus:border-blue-500/60" />
                  <button onClick={() => saveEdit(c.id)} className="p-1.5 text-blue-400 hover:text-blue-300"><Check size={12} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-500 hover:text-gray-300"><X size={12} /></button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 leading-relaxed break-words">{c.text}</p>
              )}
              {/* Like button */}
              <button onClick={() => toggleLike(c.id)}
                className={`flex items-center gap-1 mt-1 text-[10px] font-bold transition-colors ${likes[c.id] ? "text-pink-400" : "text-gray-600 hover:text-gray-400"}`}>
                <Heart size={9} className={likes[c.id] ? "fill-pink-400" : ""} />
                {likes[c.id] ? "Liked" : "Like"}
              </button>
            </div>
            {userProfile?.id === c.userId && editingId !== c.id && (
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => { setEditingId(c.id); setEditText(c.text); }}
                  className="p-1.5 text-gray-600 hover:text-gray-300 rounded-lg hover:bg-white/10"><Edit2 size={11} /></button>
                <button onClick={() => setComments(comments.filter(x => x.id !== c.id))}
                  className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-white/10"><Trash2 size={11} /></button>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-white/10 shrink-0">
        {userProfile ? (
          <div className="flex items-center gap-2">
            <input value={commentText} onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
              placeholder="Add a comment…"
              className="flex-1 text-xs bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 outline-none focus:border-blue-500/40 transition-colors" />
            <button onClick={addComment} disabled={!commentText.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-colors">
              <Send size={13} />
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-600 text-center py-1">Sign in to comment.</p>
        )}
      </div>
    </>
  );
}

// ── WatchlistPanel ─────────────────────────────────────────────────────────────
function WatchlistPanel({ queue, allContent, onRemove, onOpen }) {
  const items = queue.map(id => allContent.find(i => i.id === id)).filter(Boolean);
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <ListVideo size={28} className="text-gray-700 mb-3" />
        <p className="text-xs text-gray-500 font-medium">Your watch queue is empty.</p>
        <p className="text-[11px] text-gray-600 mt-1">Long-press a video to add it to your queue.</p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
      {items.map((item, idx) => {
        const thumb = item.platform === "youtube" ? ytThumb(item.youtube_id) : null;
        return (
          <div key={item.id} className="flex items-center gap-2.5 group p-2 rounded-xl hover:bg-white/5 transition-colors">
            <span className="text-[10px] font-black text-gray-600 w-4 shrink-0">{idx + 1}</span>
            <div className="relative w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-800">
              {thumb
                ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Video size={12} className="text-gray-600" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-300 line-clamp-2 leading-snug">{item.title}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{item.author}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => onOpen(item)} className="p-1.5 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-white/10"><Play size={11} className="fill-current" /></button>
              <button onClick={() => onRemove(item.id)} className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-white/10"><X size={11} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── VideoModal ─────────────────────────────────────────────────────────────────
function VideoModal({
  initialItem, allContent, onClose, onBookmark, getBookmarked,
  userProfile, getWatched, onWatch, queue, onQueueToggle,
}) {
  const [current,   setCurrent]   = useState(initialItem);
  const [rightTab,  setRightTab]  = useState("upnext");
  const [mobileTab, setMobileTab] = useState("video");
  const [copied,    setCopied]    = useState(false);
  const [speed,     setSpeed]     = useState(1);
  const [liked,     setLiked]     = useLocalState(`learn_liked_${initialItem.id}`, false);
  const [isMobile,  setIsMobile]  = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false);
  const iframeRef = useRef(null);

  const isWatched  = getWatched(current.id);
  const isQueued   = queue.includes(current.id);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const h = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "b" || e.key === "B") onBookmark(current.id);
      if (e.key === "w" || e.key === "W") onWatch(current.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current.id, onClose, onBookmark, onWatch]);

  const upNext = useMemo(() =>
    allContent.filter(i => i.type === "video" && i.id !== current.id).slice(0, 30),
    [allContent, current.id]);

  const share = async () => {
    const url = current.platform === "tiktok"
      ? `https://www.tiktok.com/video/${current.tiktok_id}`
      : `https://youtube.com/watch?v=${current.youtube_id}`;
    if (navigator.share) { try { await navigator.share({ title: current.title, url }); } catch {} }
    else {
      try { navigator.clipboard.writeText(url); } catch {}
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const embedSrc = current.platform === "tiktok"
    ? `https://www.tiktok.com/embed/v2/${current.tiktok_id}`
    : `https://www.youtube.com/embed/${current.youtube_id}?autoplay=1&rel=0`;

  const topic = topicConfig(current.topic);

  /* ── Mini card for Up Next ── */
  const MiniCard = ({ item }) => {
    const t       = topicConfig(item.topic);
    const thumb   = item.platform === "youtube" ? ytThumb(item.youtube_id) : null;
    const isW     = getWatched(item.id);
    const isCurr  = item.id === current.id;
    return (
      <button onClick={() => { setCurrent(item); setMobileTab("video"); }}
        className={`w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group ${isCurr ? "bg-white/8 ring-1 ring-blue-500/30" : ""}`}>
        <div className="relative w-28 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-800">
          {thumb
            ? <img src={thumb} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Video size={16} className="text-gray-600" /></div>}
          {isW && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><CheckCircle2 size={14} className="text-emerald-400" /></div>}
          {item.duration && <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1 py-0.5 rounded">{item.duration}</span>}
          {isCurr && <div className="absolute inset-0 bg-blue-500/20 border border-blue-500/40 rounded-lg" />}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-xs font-bold text-gray-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">{item.title}</p>
          <p className="text-[10px] text-gray-500 mt-1">{item.author}</p>
          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 border ${TOPIC_COLORS[t.color]}`}>{t.label}</span>
        </div>
      </button>
    );
  };

  /* ── Right panel tabs ── */
  const RTABS = [
    { id: "upnext",    label: "Up Next",  icon: ListVideo },
    { id: "comments",  label: "Comments", icon: MessageCircle },
    { id: "queue",     label: "Queue",    icon: Bookmark },
  ];

  const RightPanel = ({ mobile = false }) => {
    const active = mobile ? mobileTab : rightTab;
    const setTab = mobile ? setMobileTab : setRightTab;
    return (
      <>
        <div className="flex border-b border-white/10 shrink-0">
          {RTABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors border-b-2 ${active === id ? "text-white border-blue-500" : "text-gray-500 border-transparent hover:text-gray-300"}`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
        {active === "upnext"
          ? <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
              {upNext.length === 0
                ? <p className="text-gray-600 text-xs text-center py-8">No more videos.</p>
                : upNext.map(v => <MiniCard key={v.id} item={v} />)}
            </div>
          : active === "comments"
          ? <CommentsPanel itemId={current.id} userProfile={userProfile} />
          : <WatchlistPanel queue={queue} allContent={allContent} onRemove={onQueueToggle} onOpen={(item) => { setCurrent(item); if (mobile) setMobileTab("video"); }} />}
      </>
    );
  };

  /* ── Shared meta strip ── */
  const MetaStrip = ({ compact = false }) => (
    <div className={`${compact ? "p-4" : "p-5 border-t border-white/10"} shrink-0`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2 className={`text-white font-black leading-snug ${compact ? "text-sm" : "text-base"}`}>{current.title}</h2>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${LEVEL_COLORS[current.level]}`}>{current.level}</span>
      </div>
      <div className={`flex items-center gap-2 mb-3 flex-wrap ${compact ? "text-xs" : ""}`}>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${TOPIC_COLORS[topic.color]}`}>
          <topic.icon size={9} /> {topic.label}
        </span>
        <span className="text-gray-500 text-xs">{current.author}</span>
        {current.duration && <span className="flex items-center gap-1 text-gray-600 text-xs"><Clock size={10} />{current.duration}</span>}
        <span className="text-[10px] font-bold text-gray-600 bg-gray-900 px-2 py-0.5 rounded-full border border-gray-800">
          {current.platform === "tiktok" ? "TikTok" : "YouTube"}
        </span>
        {isWatched && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500"><CheckCircle2 size={10} /> Watched</span>}
      </div>
      {/* Reaction row */}
      <div className="flex items-center gap-2">
        <button onClick={() => setLiked(l => !l)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${liked ? "bg-pink-500/20 border-pink-500/40 text-pink-400" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
          <ThumbsUp size={12} className={liked ? "fill-pink-400" : ""} /> {liked ? "Liked" : "Like"}
        </button>
        <button onClick={() => onQueueToggle(current.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isQueued ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
          <Plus size={12} /> {isQueued ? "In Queue" : "Add to Queue"}
        </button>
      </div>
      {!compact && current.description && (
        <p className="text-gray-500 text-sm leading-relaxed mt-3">{current.description}</p>
      )}
      {!compact && current.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {current.tags.map(tag => (
            <span key={tag} className="text-[10px] text-gray-600 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded-full">#{tag}</span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors shrink-0">
            <X size={18} />
          </button>
          <p className="text-sm font-bold text-white truncate">{current.title}</p>
          <span className="hidden sm:block text-[10px] text-gray-600 border border-gray-800 px-2 py-0.5 rounded-full">Esc to close</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <button onClick={() => onWatch(current.id)} title={isWatched ? "Mark unwatched" : "Mark watched"}
            className={`p-2 rounded-xl hover:bg-white/10 transition-colors ${isWatched ? "text-emerald-400" : "text-gray-400 hover:text-white"}`}>
            {isWatched ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button onClick={() => onBookmark(current.id)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            {getBookmarked(current.id)
              ? <BookmarkCheck size={17} className="text-amber-400 fill-amber-400" />
              : <Bookmark size={17} className="text-gray-400 hover:text-white" />}
          </button>
          <button onClick={share}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs font-bold">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </div>

      {/* Mobile tab bar */}
      {isMobile && (
        <div className="flex shrink-0 border-b border-white/10 bg-black">
          {[{ id: "video", label: "Video" }, { id: "upnext", label: "Up Next" }, { id: "comments", label: "Comments" }, { id: "queue", label: "Queue" }].map(t => (
            <button key={t.id} onClick={() => setMobileTab(t.id)}
              className={`flex-1 py-2.5 text-[11px] font-bold transition-colors ${mobileTab === t.id ? "text-white border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Desktop layout */}
      {!isMobile && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="relative w-full bg-black shrink-0" style={{ paddingBottom: "56.25%" }}>
              <iframe ref={iframeRef} className="absolute inset-0 w-full h-full" src={embedSrc}
                title={current.title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
            </div>
            <MetaStrip />
          </div>
          <div className="w-72 xl:w-80 flex flex-col border-l border-white/10 bg-[#0a0a0a] min-h-0 shrink-0">
            <RightPanel />
          </div>
        </div>
      )}

      {/* Mobile layout */}
      {isMobile && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {mobileTab === "video" && (
            <div className="flex-1 overflow-y-auto">
              <div className="relative w-full bg-black" style={{ paddingBottom: "56.25%" }}>
                <iframe className="absolute inset-0 w-full h-full" src={embedSrc}
                  title={current.title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
              </div>
              <MetaStrip compact />
            </div>
          )}
          {(mobileTab === "upnext" || mobileTab === "comments" || mobileTab === "queue") && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-[#0a0a0a]">
              <RightPanel mobile />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AddContentModal ────────────────────────────────────────────────────────────
function AddContentModal({ onClose, onAdd, userProfile, isPremium }) {
  const [url,      setUrl]      = useState("");
  const [title,    setTitle]    = useState("");
  const [desc,     setDesc]     = useState("");
  const [topic,    setTopic]    = useState("coding");
  const [level,    setLevel]    = useState("Beginner");
  const [tags,     setTags]     = useState("");
  const [detected, setDetected] = useState(null);
  const [error,    setError]    = useState("");

  useEffect(() => {
    const d = extractVideo(url);
    setDetected(d);
    setError(d?.platform === "tiktok" && !isPremium ? "TikTok links require a Premium account." : "");
  }, [url, isPremium]);

  const submit = () => {
    if (!detected) { setError("Paste a valid YouTube or TikTok URL."); return; }
    if (detected.platform === "tiktok" && !isPremium) { setError("TikTok requires Premium."); return; }
    if (!title.trim()) { setError("Title is required."); return; }
    onAdd({
      id: `user_${Date.now()}`,
      type: "video", platform: detected.platform,
      ...(detected.platform === "youtube" ? { youtube_id: detected.id } : { tiktok_id: detected.id }),
      title: title.trim(), description: desc.trim() || "Community resource.",
      topic, level, author: userProfile?.username || "Community",
      source: detected.platform === "youtube" ? "YouTube" : "TikTok",
      published: new Date().toISOString().split("T")[0],
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      featured: false,
      userId: userProfile?.id,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-gray-100">Add a Resource</h2>
            <p className="text-xs text-gray-500 mt-0.5">{isPremium ? "YouTube & TikTok supported" : "YouTube · TikTok requires Premium"}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* URL */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Video URL *</label>
            <input value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=… or https://tiktok.com/@…"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            {detected && !error && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <Check size={10} /> {detected.platform === "youtube" ? "YouTube" : "TikTok"} detected (ID: {detected.id})
              </p>
            )}
          </div>
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Descriptive title"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          {/* Description */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What will people learn?" rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
          </div>
          {/* Tags */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Tags <span className="font-normal text-gray-400">(comma-separated)</span></label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="react, hooks, tutorial"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Topic</label>
              <select value={topic} onChange={e => setTopic(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                {TOPICS.filter(t => t.id !== "all").map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Level</label>
              <select value={level} onChange={e => setLevel(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><X size={11} />{error}</p>}
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            {isPremium ? <><Star size={10} className="text-amber-400" /> Premium</> : <><ShieldCheck size={10} className="text-blue-500" /> Verified</>}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
            <button onClick={submit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors active:scale-95">
              <Plus size={14} /> Add Resource
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EditContentModal ───────────────────────────────────────────────────────────
function EditContentModal({ item, onClose, onUpdate }) {
  const [title, setTitle] = useState(item.title || "");
  const [desc,  setDesc]  = useState(item.description || "");
  const [topic, setTopic] = useState(item.topic || "coding");
  const [level, setLevel] = useState(item.level || "Beginner");
  const [tags,  setTags]  = useState((item.tags || []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const submit = async () => {
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    await onUpdate(item.id, {
      title: title.trim(),
      description: desc.trim() || item.description,
      topic, level,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-black text-gray-900 dark:text-gray-100">Edit Resource</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{item.title}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Descriptive title"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What will people learn?" rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Tags <span className="font-normal text-gray-400">(comma-separated)</span></label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="react, hooks, tutorial"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Topic</label>
              <select value={topic} onChange={e => setTopic(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                {TOPICS.filter(t => t.id !== "all").map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Level</label>
              <select value={level} onChange={e => setLevel(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><X size={11} />{error}</p>}
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors active:scale-95">
            <Check size={14} /> {saving ? "Saving…" : "Update Resource"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── VideoCard ──────────────────────────────────────────────────────────────────
function VideoCard({ item, layout, bookmarked, onBookmark, onOpen, watched, onQueueToggle, queued, isOwner = false, onDelete, onEdit, onHide, isHidden = false }) {
  const topic = topicConfig(item.topic);
  const thumb = item.platform === "youtube" ? ytThumb(item.youtube_id) : null;

  const [confirmDel, setConfirmDel] = useState(false);

  if (layout === "list") {
    return (
      <div className={`group relative flex items-center gap-3 p-2.5 bg-white dark:bg-gray-900 border rounded-2xl hover:shadow-md transition-all duration-200 ${isHidden ? "opacity-50 border-dashed border-gray-300 dark:border-gray-700" : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"}`}>
        {isHidden && (
          <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-gray-500/80 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10">
            <EyeOff size={7} /> Hidden
          </span>
        )}
        {/* Owner actions — hover overlay top-right */}
        {isOwner && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            {confirmDel ? (
              <div className="flex items-center gap-1">
                <button onClick={() => { onDelete?.(item.id); setConfirmDel(false); }}
                  className="px-2 py-1 text-[9px] font-bold bg-red-500 text-white rounded-lg shadow-md">Delete</button>
                <button onClick={() => setConfirmDel(false)}
                  className="px-2 py-1 text-[9px] font-bold bg-gray-800 text-gray-200 rounded-lg shadow-md">No</button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={() => onHide?.(item.id)} title={isHidden ? "Show" : "Hide"}
                  className={`w-6 h-6 bg-white dark:bg-gray-800 border rounded-lg flex items-center justify-center shadow-sm transition-colors ${isHidden ? "border-emerald-300 dark:border-emerald-700 text-emerald-500 hover:bg-emerald-50" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                  {isHidden ? <Eye size={10} /> : <EyeOff size={10} />}
                </button>
                <button onClick={() => onEdit?.(item)}
                  className="w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-500 rounded-lg flex items-center justify-center shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <Edit2 size={10} />
                </button>
                <button onClick={() => setConfirmDel(true)}
                  className="w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-red-500 rounded-lg flex items-center justify-center shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={10} />
                </button>
              </div>
            )}
          </div>
        )}
        <button onClick={() => onOpen(item)} className="relative w-20 sm:w-24 h-12 sm:h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
          {thumb
            ? <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center bg-gray-900"><Video size={18} className="text-gray-600" /></div>}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play size={16} className="text-white fill-white" />
          </div>
          {item.duration && <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1 py-0.5 rounded">{item.duration}</span>}
          {watched && <div className="absolute top-1 left-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={8} className="text-white" /></div>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TOPIC_COLORS[topic.color]}`}>
              <topic.icon size={8} /> {topic.label}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[item.level]}`}>{item.level}</span>
          </div>
          <p className={`text-xs font-bold truncate ${watched ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"}`}>{item.title}</p>
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">{item.author}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onQueueToggle(item.id)}
            className={`p-1.5 rounded-lg transition-colors ${queued ? "text-blue-500" : "text-gray-300 dark:text-gray-600 hover:text-blue-400"}`}>
            <Plus size={13} />
          </button>
          <button onClick={() => onBookmark(item.id)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-amber-500 transition-colors">
            {bookmarked ? <BookmarkCheck size={14} className="text-amber-500 fill-current" /> : <Bookmark size={14} />}
          </button>
          <button onClick={() => onOpen(item)}
            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shrink-0">
            <Play size={12} className="fill-white" />
          </button>
        </div>
      </div>
    );
  }

  // Grid card
  return (
    <div className={`group relative flex flex-col bg-white dark:bg-gray-900 border rounded-2xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${isHidden ? "opacity-50 border-dashed border-gray-300 dark:border-gray-700" : watched ? "border-gray-100 dark:border-gray-800/60 opacity-80" : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"}`}>
      {/* Thumbnail */}
      <div className="relative w-full rounded-t-2xl overflow-hidden bg-gray-100 dark:bg-gray-800" style={{ paddingBottom: "56.25%" }}>
        <button onClick={() => onOpen(item)} className="absolute inset-0 w-full h-full">
          {thumb
            ? <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full flex items-center justify-center bg-gray-900"><Video size={28} className="text-gray-700" /></div>}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/50 transition-colors">
            <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play size={14} className="text-gray-900 fill-gray-900 ml-0.5" />
            </div>
          </div>
          {item.duration && <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{item.duration}</span>}
          {item.featured && (
            <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-amber-400 text-gray-900 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
              <Flame size={7} /> Featured
            </span>
          )}
          {watched && (
            <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-emerald-500/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
              <CheckCircle2 size={7} /> Watched
            </span>
          )}
        </button>
        {/* Hidden badge */}
        {isHidden && (
          <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-gray-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10 pointer-events-none">
            <EyeOff size={7} /> Hidden
          </span>
        )}
        {/* Owner controls — bottom-left hover overlay on thumbnail */}
        {isOwner && (
          <div className="absolute bottom-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {confirmDel ? (
              <div className="flex items-center gap-1">
                <button onClick={() => { onDelete?.(item.id); setConfirmDel(false); }}
                  className="px-2 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-lg shadow">Delete</button>
                <button onClick={() => setConfirmDel(false)}
                  className="px-2 py-0.5 text-[9px] font-bold bg-gray-800 text-gray-100 rounded-lg shadow">No</button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={() => onHide?.(item.id)} title={isHidden ? "Show" : "Hide"}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shadow transition-colors ${isHidden ? "bg-emerald-500/90 text-white hover:bg-emerald-500" : "bg-white/90 text-gray-600 hover:bg-white"}`}>
                  {isHidden ? <Eye size={10} /> : <EyeOff size={10} />}
                </button>
                <button onClick={() => onEdit?.(item)}
                  className="w-6 h-6 bg-white/90 text-blue-500 rounded-lg flex items-center justify-center shadow hover:bg-white transition-colors">
                  <Edit2 size={10} />
                </button>
                <button onClick={() => setConfirmDel(true)}
                  className="w-6 h-6 bg-white/90 text-red-500 rounded-lg flex items-center justify-center shadow hover:bg-white transition-colors">
                  <Trash2 size={10} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Card body — no description to avoid repeated text and overflow */}
      <div className="p-3">
        <div className="flex items-center gap-1 mb-1.5">
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TOPIC_COLORS[topic.color]}`}>
            <topic.icon size={8} /> {topic.label}
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[item.level]}`}>{item.level}</span>
        </div>
        <h3 className={`text-[13px] font-black leading-snug line-clamp-2 mb-3 ${watched ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"}`}>{item.title}</h3>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-[10px] text-gray-500 font-medium truncate min-w-0 pr-2">{item.author}</span>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onQueueToggle(item.id)}
              className={`p-1 rounded-lg transition-colors ${queued ? "text-blue-500" : "text-gray-300 dark:text-gray-600 hover:text-blue-400"}`}>
              <Plus size={12} />
            </button>
            <button onClick={() => onBookmark(item.id)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-amber-500 transition-colors rounded-lg">
              {bookmarked ? <BookmarkCheck size={12} className="text-amber-500 fill-current" /> : <Bookmark size={12} />}
            </button>
            <button onClick={() => onOpen(item)}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-colors active:scale-95">
              <Play size={8} className="fill-white" /> Watch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ArticleCard ────────────────────────────────────────────────────────────────
function ArticleCard({ item, layout, bookmarked, onBookmark, isOwner = false, onDelete, onEdit, onHide, isHidden = false }) {
  const topic = topicConfig(item.topic);
  const [confirmDel, setConfirmDel] = useState(false);

  if (layout === "list") {
    return (
      <div className={`group relative flex items-center gap-3 p-2.5 bg-white dark:bg-gray-900 border rounded-2xl hover:shadow-md transition-all duration-200 ${isHidden ? "opacity-50 border-dashed border-gray-300 dark:border-gray-700" : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"}`}>
        {isHidden && (
          <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-gray-500/80 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10">
            <EyeOff size={7} /> Hidden
          </span>
        )}
        {/* Owner controls — top-right hover overlay */}
        {isOwner && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            {confirmDel ? (
              <div className="flex items-center gap-1">
                <button onClick={() => { onDelete?.(item.id); setConfirmDel(false); }}
                  className="px-2 py-1 text-[9px] font-bold bg-red-500 text-white rounded-lg shadow-md">Delete</button>
                <button onClick={() => setConfirmDel(false)}
                  className="px-2 py-1 text-[9px] font-bold bg-gray-800 text-gray-200 rounded-lg shadow-md">No</button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={() => onHide?.(item.id)} title={isHidden ? "Show" : "Hide"}
                  className={`w-6 h-6 bg-white dark:bg-gray-800 border rounded-lg flex items-center justify-center shadow-sm transition-colors ${isHidden ? "border-emerald-300 dark:border-emerald-700 text-emerald-500 hover:bg-emerald-50" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                  {isHidden ? <Eye size={10} /> : <EyeOff size={10} />}
                </button>
                <button onClick={() => onEdit?.(item)}
                  className="w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-500 rounded-lg flex items-center justify-center shadow-sm hover:bg-blue-50 transition-colors">
                  <Edit2 size={10} />
                </button>
                <button onClick={() => setConfirmDel(true)}
                  className="w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-red-500 rounded-lg flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors">
                  <Trash2 size={10} />
                </button>
              </div>
            )}
          </div>
        )}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${TOPIC_COLORS[topic.color]}`}>
          <topic.icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TOPIC_COLORS[topic.color]}`}>{topic.label}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[item.level]}`}>{item.level}</span>
          </div>
          <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{item.title}</p>
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">{item.author}{item.read_time ? ` · ${item.read_time}` : ""}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onBookmark(item.id)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-amber-500 transition-colors">
            {bookmarked ? <BookmarkCheck size={14} className="text-amber-500 fill-current" /> : <Bookmark size={14} />}
          </button>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 border border-gray-200 dark:border-gray-700 hover:border-blue-400 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-xl transition-colors">
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative flex flex-col bg-white dark:bg-gray-900 border rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${isHidden ? "opacity-50 border-dashed border-gray-300 dark:border-gray-700" : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"}`}>
      {isHidden && (
        <span className="absolute top-2.5 left-3 flex items-center gap-0.5 bg-gray-500/80 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10">
          <EyeOff size={7} /> Hidden
        </span>
      )}
      {/* Owner controls — top-right hover overlay */}
      {isOwner && (
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmDel ? (
            <div className="flex items-center gap-1">
              <button onClick={() => { onDelete?.(item.id); setConfirmDel(false); }}
                className="px-2 py-1 text-[9px] font-bold bg-red-500 text-white rounded-lg shadow-md">Delete</button>
              <button onClick={() => setConfirmDel(false)}
                className="px-2 py-1 text-[9px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg shadow-md">No</button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => onHide?.(item.id)} title={isHidden ? "Show" : "Hide"}
                className={`w-6 h-6 bg-white dark:bg-gray-800 border rounded-lg flex items-center justify-center shadow-sm transition-colors ${isHidden ? "border-emerald-300 dark:border-emerald-700 text-emerald-500 hover:bg-emerald-50" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                {isHidden ? <Eye size={10} /> : <EyeOff size={10} />}
              </button>
              <button onClick={() => onEdit?.(item)}
                className="w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-500 rounded-lg flex items-center justify-center shadow-sm hover:bg-blue-50 transition-colors">
                <Edit2 size={10} />
              </button>
              <button onClick={() => setConfirmDel(true)}
                className="w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-red-500 rounded-lg flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors">
                <Trash2 size={10} />
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${TOPIC_COLORS[topic.color]}`}>
          <topic.icon size={16} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TOPIC_COLORS[topic.color]}`}>
            <topic.icon size={8} /> {topic.label}
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[item.level]}`}>{item.level}</span>
          {item.featured && (
            <span className="flex items-center gap-0.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">
              <Flame size={8} /> Featured
            </span>
          )}
        </div>
      </div>
      <h3 className="text-[13px] font-black text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 mb-3">{item.title}</h3>
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-auto">
        <div className="min-w-0 pr-2">
          <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate">{item.author}</p>
          {item.read_time && (
            <span className="text-[9px] text-gray-400 flex items-center gap-0.5 mt-0.5">
              <Clock size={8} /> {item.read_time}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onBookmark(item.id)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-amber-500 transition-colors rounded-lg">
            {bookmarked ? <BookmarkCheck size={12} className="text-amber-500 fill-current" /> : <Bookmark size={12} />}
          </button>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 border border-gray-200 dark:border-gray-700 hover:border-blue-400 text-gray-600 dark:text-gray-300 hover:text-blue-600 text-[10px] font-bold rounded-lg transition-colors">
              Read <ExternalLink size={8} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ScrollRow ──────────────────────────────────────────────────────────────────
function ScrollRow({ title, icon: Icon, color = "blue", items, bookmarks, onBookmark, onOpen, onSeeMore, watched, queue, onQueueToggle, currentUserId, onDelete, onEdit, onHide, hiddenIds = [] }) {
  const rowRef = useRef(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll, items]);

  const scroll = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -(el.clientWidth * 0.75) : el.clientWidth * 0.75, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          {Icon && <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${TOPIC_COLORS[color]}`}><Icon size={12} /></div>}
          <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">{title}</h3>
          <span className="text-[10px] text-gray-400">({items.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onSeeMore && (
            <button onClick={onSeeMore} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 mr-1">
              See all <ChevronRight size={12} />
            </button>
          )}
          <button onClick={() => scroll("left")} disabled={!canLeft}
            className={`p-1.5 rounded-xl border transition-all ${canLeft ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 shadow-sm" : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed"}`}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => scroll("right")} disabled={!canRight}
            className={`p-1.5 rounded-xl border transition-all ${canRight ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 shadow-sm" : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed"}`}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="relative">
        {canLeft  && <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-gray-50 dark:from-gray-950 to-transparent z-10 pointer-events-none" />}
        {canRight && <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-gray-50 dark:from-gray-950 to-transparent z-10 pointer-events-none" />}
        <div ref={rowRef} className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {items.map(item => {
            const isOwner  = !!(currentUserId && (item.userId === currentUserId || item.user_id === currentUserId));
            const isHidden = hiddenIds.includes(item.id);
            return (
              <div key={item.id} className="w-64 sm:w-72 shrink-0">
                {item.type === "video"
                  ? <VideoCard item={item} layout="grid" bookmarked={bookmarks.includes(item.id)} onBookmark={onBookmark} onOpen={onOpen} watched={watched?.includes(item.id)} queue={queue} onQueueToggle={onQueueToggle} queued={queue?.includes(item.id)} isOwner={isOwner} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHidden} />
                  : <ArticleCard item={item} layout="grid" bookmarked={bookmarks.includes(item.id)} onBookmark={onBookmark} isOwner={isOwner} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHidden} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── FeaturedSpotlight ──────────────────────────────────────────────────────────
function FeaturedSpotlight({ items, bookmarks, onBookmark, onOpen }) {
  const [idx, setIdx] = useState(0);

  // Auto-advance spotlight every 8s
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), 8000);
    return () => clearInterval(t);
  }, [items.length]);

  const featured = items[idx];
  if (!featured) return null;

  const topic = topicConfig(featured.topic);
  const thumb = featured.platform === "youtube" ? ytThumb(featured.youtube_id, "maxresdefault") : null;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 shadow-2xl mb-8">
      {thumb && (
        <div className="absolute inset-0 opacity-20">
          <img src={thumb} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent" />
        </div>
      )}
      <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] font-black text-amber-400 uppercase tracking-widest"><Zap size={10} /> Editor's Pick</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${TOPIC_COLORS[topic.color]}`}>
              <topic.icon size={9} /> {topic.label}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_COLORS[featured.level]}`}>{featured.level}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2 line-clamp-2">{featured.title}</h2>
          <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-4">{featured.description}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-400 font-medium">{featured.author}</span>
            {featured.duration  && <span className="flex items-center gap-1 text-xs text-gray-500"><Clock size={11} />{featured.duration}</span>}
            {featured.read_time && <span className="flex items-center gap-1 text-xs text-gray-500"><BookOpen size={11} />{featured.read_time}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
          {featured.type === "video" ? (
            <button onClick={() => onOpen(featured)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-blue-500/30 active:scale-95">
              <Play size={14} className="fill-white" /> Watch Now
            </button>
          ) : featured.url ? (
            <a href={featured.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/30">
              <BookOpen size={14} /> Read Article
            </a>
          ) : null}
          <button onClick={() => onBookmark(featured.id)}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm border border-white/20">
            {bookmarks.includes(featured.id)
              ? <><BookmarkCheck size={14} className="fill-amber-400 text-amber-400" /> Saved</>
              : <><Bookmark size={14} /> Save</>}
          </button>
        </div>
      </div>
      {/* Pagination dots with progress ring */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-2 pb-4">
          {items.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${i === idx ? "w-5 h-1.5 bg-blue-500" : "w-1.5 h-1.5 bg-gray-600 hover:bg-gray-500"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── MagazineLayout ─────────────────────────────────────────────────────────────
function MagazineLayout({ filtered, bookmarks, onBookmark, onOpen, watched, queue, onQueueToggle, currentUserId, onDelete, onEdit, onHide, hiddenIds = [] }) {
  if (filtered.length === 0) return null;

  const hero     = filtered[0];
  const sidebar  = filtered.slice(1, 4);   // 3 compact list items next to hero
  const rest     = filtered.slice(4);      // remaining in a 3-col grid

  const heroTopic = topicConfig(hero.topic);
  const heroThumb = hero.platform === "youtube" ? ytThumb(hero.youtube_id, "maxresdefault") : null;

  return (
    <div className="space-y-4">
      {/* ── Hero + sidebar row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* Hero – takes 2 of 3 cols */}
        <div className="lg:col-span-2">
          <div
            className="group relative w-full overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 cursor-pointer shadow-xl"
            style={{ aspectRatio: "16 / 9" }}
            onClick={() => hero.type === "video" ? onOpen(hero) : null}
          >
            {heroThumb
              ? <img src={heroThumb} alt={hero.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              : <div className="absolute inset-0 flex items-center justify-center bg-gray-900"><Video size={48} className="text-gray-700" /></div>}
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            {/* Play button */}
            {hero.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform shadow-2xl">
                  <Play size={22} className="text-white fill-white ml-1" />
                </div>
              </div>
            )}
            {/* Meta overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {hero.featured && (
                  <span className="flex items-center gap-1 bg-amber-400 text-gray-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Flame size={9} /> Featured
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${TOPIC_COLORS[heroTopic.color]}`}>
                  <heroTopic.icon size={9} /> {heroTopic.label}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_COLORS[hero.level]}`}>{hero.level}</span>
                {hero.duration && <span className="text-[10px] text-gray-300 flex items-center gap-1"><Clock size={9} />{hero.duration}</span>}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight mb-1 line-clamp-2">{hero.title}</h2>
              <p className="text-xs text-gray-300 line-clamp-1 mb-3">{hero.author} · {hero.description}</p>
              <div className="flex items-center gap-2">
                {hero.type === "video" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpen(hero); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors active:scale-95">
                    <Play size={11} className="fill-white" /> Watch
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); onBookmark(hero.id); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors">
                  {bookmarks.includes(hero.id) ? <BookmarkCheck size={12} className="fill-amber-400 text-amber-400" /> : <Bookmark size={12} />}
                  {bookmarks.includes(hero.id) ? "Saved" : "Save"}
                </button>
                {watched.includes(hero.id) && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <CheckCircle2 size={10} /> Watched
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar – 3 compact cards */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          {sidebar.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-xs p-6">No more items</div>
          )}
          {sidebar.map(item => {
            const isOwner  = !!(currentUserId && (item.userId === currentUserId || item.user_id === currentUserId));
            const isHidden = hiddenIds.includes(item.id);
            return item.type === "video"
              ? <VideoCard key={item.id} item={item} layout="list"
                  bookmarked={bookmarks.includes(item.id)} onBookmark={onBookmark}
                  onOpen={onOpen} watched={watched.includes(item.id)}
                  queue={queue} onQueueToggle={onQueueToggle} queued={queue.includes(item.id)}
                  isOwner={isOwner} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHidden} />
              : <ArticleCard key={item.id} item={item} layout="list"
                  bookmarked={bookmarks.includes(item.id)} onBookmark={onBookmark}
                  isOwner={isOwner} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHidden} />;
          })}
        </div>
      </div>

      {/* ── Section divider ────────────────────────────────────────────── */}
      {rest.length > 0 && (
        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">More Resources</span>
          <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
        </div>
      )}

      {/* ── Continuation grid – masonry-like 3-col ────────────────────── */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest.map(item => {
            const isOwner  = !!(currentUserId && (item.userId === currentUserId || item.user_id === currentUserId));
            const isHidden = hiddenIds.includes(item.id);
            return item.type === "video"
              ? <VideoCard key={item.id} item={item} layout="grid"
                  bookmarked={bookmarks.includes(item.id)} onBookmark={onBookmark}
                  onOpen={onOpen} watched={watched.includes(item.id)}
                  queue={queue} onQueueToggle={onQueueToggle} queued={queue.includes(item.id)}
                  isOwner={isOwner} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHidden} />
              : <ArticleCard key={item.id} item={item} layout="grid"
                  bookmarked={bookmarks.includes(item.id)} onBookmark={onBookmark}
                  isOwner={isOwner} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHidden} />;
          })}
        </div>
      )}
    </div>
  );
}

// ── SortDropdown ───────────────────────────────────────────────────────────────
function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = SORT_OPTIONS.find(o => o.id === value) || SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:border-gray-300 transition-all">
        <current.icon size={11} /> {current.label} <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden w-40">
          {SORT_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold transition-colors ${value === opt.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
              <opt.icon size={12} /> {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function LearnContent() {
  const [topic,        setTopic]        = useState("all");
  const [layout,       setLayout]       = useLocalState("learn_layout", "grid");
  const [search,       setSearch]       = useState("");
  const [dSearch,      setDSearch]      = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [levelFilter,  setLevelFilter]  = useState("all");
  const [sortBy,       setSortBy]       = useState("newest");
  const [bookmarks,    setBookmarks]    = useLocalState("learn_bookmarks", []);
  const [watched,      setWatched]      = useLocalState("learn_watched", []);
  const [queue,        setQueue]        = useLocalState("learn_queue", []);
  const [viewCounts,   setViewCounts]   = useLocalState("learn_views", {});
  const [showSaved,    setShowSaved]    = useState(false);
  const [showWatched,  setShowWatched]  = useState(false); // filter unwatched only
  const [showHidden,   setShowHidden]   = useState(false); // show only owner-hidden items
  const [hiddenIds,    setHiddenIds]    = useLocalState("learn_hidden_ids", []);
  const [openItem,     setOpenItem]     = useState(null);
  const [showAdd,      setShowAdd]      = useState(false);
  const [showStats,    setShowStats]    = useState(false);
  const [editingItem,  setEditingItem]  = useState(null);
  const [userProfile,  setUserProfile]  = useState(null);
  const [dbContent,    setDbContent]    = useState([]);
  const [userContent,  setUserContent]  = useLocalState("learn_user_content", []);
  const [loading,      setLoading]      = useState(true);

  // Load session + profile
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase
        .from("profiles").select("id, username, avatar_url, is_verified, is_premium")
        .eq("id", session.user.id).single();
      if (data) setUserProfile(data);
    });
  }, []);

  // Fetch DB content
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("learn_content").select("*").order("created_at", { ascending: false });
        if (!error && data) setDbContent(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const canAdd    = userProfile?.is_verified || userProfile?.is_premium;
  const isPremium = userProfile?.is_premium;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const toggleBookmark = useCallback((id) => {
    setBookmarks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  }, [setBookmarks]);

  const toggleWatched = useCallback((id) => {
    setWatched(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  }, [setWatched]);

  const toggleQueue = useCallback((id) => {
    setQueue(prev => prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]);
  }, [setQueue]);

  const toggleHide = useCallback((id) => {
    setHiddenIds(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]);
  }, [setHiddenIds]);

  const addUserContent = useCallback((item) => {
    setUserContent(prev => [item, ...prev]);
  }, [setUserContent]);

  const deleteContent = useCallback(async (id) => {
    const idStr = String(id);
    if (idStr.startsWith("user_")) {
      setUserContent(prev => prev.filter(i => i.id !== id));
    } else {
      try {
        await supabase.from("learn_content").delete().eq("id", id);
        setDbContent(prev => prev.filter(i => i.id !== id));
      } catch {}
    }
  }, [setUserContent]);

  const updateContent = useCallback(async (id, updates) => {
    const idStr = String(id);
    if (idStr.startsWith("user_")) {
      setUserContent(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    } else {
      try {
        await supabase.from("learn_content").update(updates).eq("id", id);
        setDbContent(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
      } catch {}
    }
  }, [setUserContent]);

  // Track view + open modal
  const openVideo = useCallback((item) => {
    setOpenItem(item);
    setViewCounts(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
  }, [setViewCounts]);

  const allContent = useMemo(() => {
    const base = dbContent.length > 0 ? dbContent : SEED_CONTENT;
    return [...userContent, ...base];
  }, [dbContent, userContent]);

  // Filter
  const filtered = useMemo(() => {
    let items = allContent.filter(item => {
      if (topic !== "all" && item.topic !== topic) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (levelFilter !== "all" && item.level !== levelFilter) return false;
      if (showSaved && !bookmarks.includes(item.id)) return false;
      if (showWatched && watched.includes(item.id)) return false; // hide watched
      // hidden mode: show ONLY hidden items when toggled; otherwise exclude hidden items
      if (showHidden && !hiddenIds.includes(item.id)) return false;
      if (!showHidden && hiddenIds.includes(item.id)) return false;
      if (dSearch) {
        const q = dSearch.toLowerCase();
        return item.title.toLowerCase().includes(q)
          || (item.author || "").toLowerCase().includes(q)
          || (item.tags || []).some(t => t.toLowerCase().includes(q))
          || (item.description || "").toLowerCase().includes(q);
      }
      return true;
    });

    // Sort
    if (sortBy === "newest") {
      items = [...items].sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
    } else if (sortBy === "popular") {
      items = [...items].sort((a, b) => ((b.views || 0) + (b.likes || 0)) - ((a.views || 0) + (a.likes || 0)));
    } else if (sortBy === "az") {
      items = [...items].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "watched") {
      // Unwatched first
      items = [...items].sort((a, b) => {
        const aw = watched.includes(a.id) ? 1 : 0;
        const bw = watched.includes(b.id) ? 1 : 0;
        return aw - bw;
      });
    }

    return items;
  }, [allContent, topic, typeFilter, levelFilter, dSearch, showSaved, showWatched, bookmarks, watched, sortBy]);

  const featuredItems = useMemo(() => filtered.filter(i => i.featured), [filtered]);
  const videoCount    = filtered.filter(i => i.type === "video").length;
  const articleCount  = filtered.filter(i => i.type === "article").length;
  const watchedCount  = allContent.filter(i => watched.includes(i.id)).length;

  const isFiltered = dSearch || showSaved || showWatched || showHidden || topic !== "all" || typeFilter !== "all" || levelFilter !== "all";

  const ownerCheck = (item) =>
    !!(userProfile?.id && (item.userId === userProfile.id || item.user_id === userProfile.id));

  const cardProps = (item) => ({
    item,
    bookmarked: bookmarks.includes(item.id),
    onBookmark: toggleBookmark,
    onOpen: openVideo,
    watched: watched.includes(item.id),
    queue,
    onQueueToggle: toggleQueue,
    queued: queue.includes(item.id),
    isOwner: ownerCheck(item),
    onDelete: deleteContent,
    onEdit: setEditingItem,
    onHide: toggleHide,
    isHidden: hiddenIds.includes(item.id),
  });

  return (
    <>
      {/* Video Modal */}
      {openItem?.type === "video" && (
        <VideoModal
          initialItem={openItem}
          allContent={allContent}
          onClose={() => setOpenItem(null)}
          onBookmark={toggleBookmark}
          getBookmarked={(id) => bookmarks.includes(id)}
          userProfile={userProfile}
          getWatched={(id) => watched.includes(id)}
          onWatch={toggleWatched}
          queue={queue}
          onQueueToggle={toggleQueue}
        />
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddContentModal
          onClose={() => setShowAdd(false)}
          onAdd={addUserContent}
          userProfile={userProfile}
          isPremium={isPremium}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditContentModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdate={updateContent}
        />
      )}

      <div className="w-full max-w-7xl mx-auto pb-16">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="mb-3">
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Discover &amp; Learn</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 font-medium">Curated videos &amp; articles — all right here.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Stats toggle */}
            <button onClick={() => setShowStats(s => !s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${showStats ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300"}`}>
              <BarChart2 size={12} /> Stats
            </button>
            {/* Queue badge */}
            {queue.length > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800/30">
                <ListVideo size={12} /> {queue.length} queued
              </span>
            )}
            {/* Watched badge */}
            {watchedCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800/30">
                <Eye size={12} /> {watchedCount} watched
              </span>
            )}
            {/* Hidden items toggle — only visible to the owner when they have hidden content */}
            {hiddenIds.length > 0 && userProfile && (
              <button onClick={() => setShowHidden(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${showHidden ? "bg-gray-800 dark:bg-gray-700 text-white border-gray-600" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300"}`}>
                {showHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                {hiddenIds.length} hidden
              </button>
            )}
            {/* Add resource */}
            {canAdd ? (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors active:scale-95 shadow-sm">
                <Plus size={13} /> Add Resource
              </button>
            ) : userProfile ? (
              <span title="Requires verified or premium account"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 cursor-not-allowed">
                <Lock size={11} /> Verified to Add
              </span>
            ) : null}
            {/* Layout switcher — pushed to end */}
            <div className="ml-auto flex items-center bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl p-1 gap-0.5">
              {LAYOUTS.map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setLayout(id)} title={label}
                  className={`p-1.5 rounded-lg transition-all ${layout === id ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        {showStats && <StatsBar allContent={allContent} watched={watched} bookmarks={bookmarks} />}

        {/* ── Search ──────────────────────────────────────────────────── */}
        <div className="relative mb-5">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, author, tag…"
            className="w-full pl-11 pr-10 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Topic pills ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          {TOPICS.map(({ id, label, icon: Icon, color }) => {
            const active = topic === id;
            return (
              <button key={id} onClick={() => setTopic(id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all shrink-0 ${active ? `${TOPIC_COLORS[color]} shadow-sm` : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"}`}>
                <Icon size={12} /> {label}
                {active && id !== "all" && (
                  <span className="ml-0.5 text-[9px] font-black opacity-60">{allContent.filter(c => c.topic === id).length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Sub-filters + Sort ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
          {/* Type */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5 border border-gray-200 dark:border-gray-700 shrink-0">
            {[
              { id: "all",     label: "All" },
              { id: "video",   label: `Videos` },
              { id: "article", label: `Articles` },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setTypeFilter(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${typeFilter === id ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Level */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5 border border-gray-200 dark:border-gray-700 shrink-0">
            {["all", "Beginner", "Intermediate", "Advanced"].map(l => (
              <button key={l} onClick={() => setLevelFilter(l)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${levelFilter === l ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                {l === "all" ? "Level" : l}
              </button>
            ))}
          </div>

          {/* Saved toggle */}
          <button onClick={() => setShowSaved(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 whitespace-nowrap ${showSaved ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50" : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300"}`}>
            {showSaved ? <BookmarkCheck size={12} className="fill-current" /> : <Bookmark size={12} />}
            Saved {bookmarks.length > 0 && `(${bookmarks.length})`}
          </button>

          {/* Unwatched toggle */}
          <button onClick={() => setShowWatched(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 whitespace-nowrap ${showWatched ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/50" : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300"}`}>
            <EyeOff size={12} /> Unwatched
          </button>

          {/* Sort */}
          <div className="shrink-0">
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>

          {/* Clear */}
          {isFiltered && (
            <button onClick={() => { setTopic("all"); setTypeFilter("all"); setLevelFilter("all"); setSearch(""); setShowSaved(false); setShowWatched(false); setShowHidden(false); }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 whitespace-nowrap">
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* ── Sign-in notice ───────────────────────────────────────────── */}
        {!userProfile && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 flex items-center gap-3">
            <ShieldCheck size={16} className="text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
              Sign in to comment and track watched videos. Verified or Premium members can add resources.
            </p>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── Featured Spotlight ───────────────────────────────────────── */}
        {!loading && !dSearch && !showSaved && !showWatched && layout !== "list" && featuredItems.length > 0 && (
          <FeaturedSpotlight items={featuredItems} bookmarks={bookmarks} onBookmark={toggleBookmark} onOpen={openVideo} />
        )}

        {/* ── Content ──────────────────────────────────────────────────── */}
        {!loading && (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Search size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-1">No results</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">Try a different search, topic, or remove filters.</p>
              <button onClick={() => { setTopic("all"); setTypeFilter("all"); setLevelFilter("all"); setSearch(""); setShowSaved(false); setShowWatched(false); setShowHidden(false); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm">
                <RefreshCw size={13} /> Reset
              </button>
            </div>
          ) : layout === "list" ? (
            <div className="flex flex-col gap-2">
              {filtered.map(item =>
                item.type === "video"
                  ? <VideoCard key={item.id} layout="list" {...cardProps(item)} />
                  : <ArticleCard key={item.id} layout="list" item={item} bookmarked={bookmarks.includes(item.id)} onBookmark={toggleBookmark} isOwner={ownerCheck(item)} onDelete={deleteContent} onEdit={setEditingItem} onHide={toggleHide} isHidden={hiddenIds.includes(item.id)} />
              )}
            </div>
          ) : layout === "magazine" ? (
            <MagazineLayout
              filtered={filtered}
              bookmarks={bookmarks}
              onBookmark={toggleBookmark}
              onOpen={openVideo}
              watched={watched}
              queue={queue}
              onQueueToggle={toggleQueue}
              currentUserId={userProfile?.id}
              onDelete={deleteContent}
              onEdit={setEditingItem}
              onHide={toggleHide}
              hiddenIds={hiddenIds}
            />
          ) : (
            /* Grid — scroll rows when browsing, flat grid when filtering */
            isFiltered ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(item =>
                  item.type === "video"
                    ? <VideoCard key={item.id} layout="grid" {...cardProps(item)} />
                    : <ArticleCard key={item.id} layout="grid" item={item} bookmarked={bookmarks.includes(item.id)} onBookmark={toggleBookmark} isOwner={ownerCheck(item)} onDelete={deleteContent} onEdit={setEditingItem} onHide={toggleHide} isHidden={hiddenIds.includes(item.id)} />
                )}
              </div>
            ) : (
              <div>
                {TOPICS.filter(t => t.id !== "all").map(t => (
                  <ScrollRow
                    key={t.id}
                    title={`${t.label} Videos`}
                    icon={t.icon}
                    color={t.color}
                    items={allContent.filter(i => i.topic === t.id && i.type === "video" && !hiddenIds.includes(i.id))}
                    bookmarks={bookmarks}
                    onBookmark={toggleBookmark}
                    onOpen={openVideo}
                    onSeeMore={() => { setTopic(t.id); setTypeFilter("video"); }}
                    watched={watched}
                    queue={queue}
                    onQueueToggle={toggleQueue}
                    currentUserId={userProfile?.id}
                    onDelete={deleteContent}
                    onEdit={setEditingItem}
                    onHide={toggleHide}
                    hiddenIds={hiddenIds}
                  />
                ))}
                <ScrollRow
                  title="Articles"
                  icon={BookOpen}
                  color="gray"
                  items={allContent.filter(i => i.type === "article" && !hiddenIds.includes(i.id))}
                  bookmarks={bookmarks}
                  onBookmark={toggleBookmark}
                  onOpen={openVideo}
                  onSeeMore={() => setTypeFilter("article")}
                  watched={watched}
                  queue={queue}
                  onQueueToggle={toggleQueue}
                  currentUserId={userProfile?.id}
                  onDelete={deleteContent}
                  onEdit={setEditingItem}
                  onHide={toggleHide}
                  hiddenIds={hiddenIds}
                />
                {/* Blog CTA */}
                <div className="mt-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center border border-violet-200 dark:border-violet-800/30">
                      <Newspaper size={18} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-gray-100">Explore the Blog</p>
                      <p className="text-xs text-gray-500 mt-0.5">Deep-dive articles from the community and founders.</p>
                    </div>
                  </div>
                  <a href="/dash/blog"
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-colors active:scale-95 whitespace-nowrap">
                    Go to Blog <ChevronRight size={14} />
                  </a>
                </div>
              </div>
            )
          )
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-10">
            {filtered.length} of {allContent.length} resources · {watchedCount} watched · {queue.length} queued
          </p>
        )}
      </div>
    </>
  );
}