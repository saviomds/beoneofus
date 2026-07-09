"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../../supabaseClient";
import { useLanguage } from "../../../lib/i18n";
import {
  Search, X, Bookmark, BookmarkCheck, Play,
  Clock, Code2, Briefcase, Palette, Brain,
  Globe, Terminal, LayoutGrid, List, Rows,
  Sparkles, BookOpen, Video,
  Zap, RefreshCw, Flame, Plus, Send, Trash2, Edit2, Check,
  Share2, MessageCircle, ShieldCheck, TrendingUp,
  Lock, ChevronRight, ChevronLeft, ExternalLink, Newspaper,
  Eye, EyeOff, ListVideo,
  ArrowUpDown, GraduationCap, BarChart2,
  ChevronDown, Heart, ThumbsUp,
  CheckCircle2, Layers, MoreHorizontal,
} from "lucide-react";

// ── Seed fallback ──────────────────────────────────────────────────────────────
const SEED_CONTENT = [
  { id:"seed_v1",  type:"video",   platform:"youtube", youtube_id:"DHjqpvDnNGE", topic:"coding",   title:"JavaScript in 100 Seconds",        author:"Fireship",               duration:"2:14",   tags:["javascript","web"],      featured:true,  level:"Beginner",     published:"2023-09-12", description:"A lightning-fast overview of JavaScript." },
  { id:"seed_v2",  type:"video",   platform:"youtube", youtube_id:"Tn6-PIqc4UM", topic:"coding",   title:"React in 100 Seconds",             author:"Fireship",               duration:"2:54",   tags:["react","frontend"],     featured:false, level:"Beginner",     published:"2023-11-20", description:"Everything you need to know about React in under 3 minutes." },
  { id:"seed_v3",  type:"video",   platform:"youtube", youtube_id:"uvU0tWlsE8s", topic:"ai",       title:"Machine Learning in 100 Seconds",  author:"Fireship",               duration:"2:32",   tags:["ml","ai"],              featured:true,  level:"Beginner",     published:"2024-01-05", description:"Machine learning explained simply." },
  { id:"seed_v4",  type:"video",   platform:"youtube", youtube_id:"VqgUkExPvLY", topic:"webdev",   title:"CSS in 100 Seconds",               author:"Fireship",               duration:"1:52",   tags:["css","frontend"],       featured:false, level:"Beginner",     published:"2024-02-10", description:"The cascade, specificity and layout, fast." },
  { id:"seed_v5",  type:"article", platform:null,      youtube_id:null,           topic:"career",   title:"The 10x Engineer Myth",            author:"Dan Abramov",            duration:null,     tags:["career","culture"],     featured:false, level:"Intermediate", published:"2024-03-01", description:"Why the notion of the 10x engineer is harmful.", read_time:"8 min", url:"https://overreacted.io", source:"Overreacted" },
  { id:"seed_v6",  type:"video",   platform:"youtube", youtube_id:"I7ZT_KmY6Ck", topic:"devops",   title:"Docker in 100 Seconds",            author:"Fireship",               duration:"2:10",   tags:["docker","containers"],  featured:false, level:"Beginner",     published:"2024-01-20", description:"Containers and Docker demystified." },
  { id:"seed_v7",  type:"video",   platform:"youtube", youtube_id:"eIrMbAQSU34", topic:"design",   title:"UI Design Fundamentals in 7 Min",  author:"Adrian Twarog",          duration:"7:14",   tags:["ui","design"],          featured:true,  level:"Beginner",     published:"2024-02-14", description:"Visual hierarchy, spacing, colour and typography." },
  { id:"seed_v8",  type:"video",   platform:"youtube", youtube_id:"x7cQ3mrcKaY", topic:"business", title:"How to Validate a Startup Idea",   author:"Y Combinator",           duration:"14:22",  tags:["startup","product"],    featured:false, level:"Intermediate", published:"2024-03-05", description:"The fastest way to find out if your idea is worth building." },
];

const TOPICS = [
  { id:"all",      labelKey:"learn.topics.all",      icon:Sparkles,   color:"blue"    },
  { id:"coding",   labelKey:"learn.topics.coding",   icon:Code2,      color:"violet"  },
  { id:"ai",       labelKey:"learn.topics.ai",       icon:Brain,      color:"pink"    },
  { id:"webdev",   labelKey:"learn.topics.webdev",   icon:Globe,      color:"cyan"    },
  { id:"design",   labelKey:"learn.topics.design",   icon:Palette,    color:"rose"    },
  { id:"business", labelKey:"learn.topics.business", icon:Briefcase,  color:"amber"   },
  { id:"career",   labelKey:"learn.topics.career",   icon:TrendingUp, color:"emerald" },
  { id:"devops",   labelKey:"learn.topics.devops",   icon:Terminal,   color:"gray"    },
];

function levelLabel(level, t) {
  if (!level) return "";
  return t(`learn.level_${String(level).toLowerCase()}`);
}

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

const TOPIC_SOLID = {
  blue:"bg-blue-500", violet:"bg-violet-500", pink:"bg-pink-500", cyan:"bg-cyan-500",
  rose:"bg-rose-500", amber:"bg-amber-500", emerald:"bg-emerald-500", gray:"bg-gray-500",
};

const TOPIC_RING = {
  blue:"ring-blue-400/60", violet:"ring-violet-400/60", pink:"ring-pink-400/60", cyan:"ring-cyan-400/60",
  rose:"ring-rose-400/60", amber:"ring-amber-400/60", emerald:"ring-emerald-400/60", gray:"ring-gray-400/60",
};

const LEVEL_COLORS = {
  Beginner:     "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  Intermediate: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  Advanced:     "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
};

const LAYOUTS = [
  { id:"grid",     icon:LayoutGrid, labelKey:"learn.layout_grid"     },
  { id:"list",     icon:List,       labelKey:"learn.layout_list"     },
  { id:"magazine", icon:Rows,       labelKey:"learn.layout_magazine" },
];

const SORT_OPTIONS = [
  { id:"newest",  labelKey:"learn.sort_newest",    icon:Clock      },
  { id:"popular", labelKey:"learn.sort_popular",   icon:TrendingUp },
  { id:"az",      labelKey:"learn.sort_az",        icon:ArrowUpDown},
  { id:"watched", labelKey:"learn.sort_unwatched", icon:Eye        },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function ytThumb(id, q="mqdefault") { return `https://img.youtube.com/vi/${id}/${q}.jpg`; }
function topicConfig(id) { return TOPICS.find(t => t.id === id) || TOPICS[0]; }

function formatTimeAgo(iso) {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function extractVideo(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { platform:"youtube", id:yt[1] };
  const tt = url.match(/tiktok\.com\/(?:@[^/]+\/video\/|v\/)(\d+)/);
  if (tt) return { platform:"tiktok", id:tt[1] };
  return null;
}

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

// ── StatsBar ──────────────────────────────────────────────────────────────────
function StatsBar({ allContent, watched, bookmarks }) {
  const { t } = useLanguage();
  const totalVideos  = allContent.filter(i => i.type === "video").length;
  const watchedCount = watched.length;
  const pct = totalVideos > 0 ? Math.round((watchedCount / totalVideos) * 100) : 0;
  const totalMins = allContent
    .filter(i => watched.includes(i.id) && i.duration)
    .reduce((acc, i) => {
      const [m, s] = i.duration.split(":").map(Number);
      return acc + m + (s||0)/60;
    }, 0);

  const stats = [
    { label:"Resources",    value:allContent.length,     icon:Layers,   color:"violet", sub:t("learn.stat_total")                },
    { label:"Watched",      value:watchedCount,           icon:Eye,      color:"emerald",sub:t("learn.stat_pct_done",{pct})       },
    { label:"Saved",        value:bookmarks.length,       icon:Bookmark, color:"amber",  sub:t("learn.stat_bookmarked")           },
    { label:"Mins Learned", value:Math.round(totalMins), icon:Clock,    color:"blue",   sub:t("learn.stat_time_invested")        },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map(({ label, value, icon:Icon, color, sub }) => (
        <div key={label} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${TOPIC_COLORS[color]}`}>
            <Icon size={15}/>
          </div>
          <div className="min-w-0">
            <p className="text-xl font-black text-gray-900 dark:text-gray-100 leading-none tabular-nums">{value}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CommentsPanel ─────────────────────────────────────────────────────────────
function CommentsPanel({ itemId, userProfile }) {
  const { t } = useLanguage();
  const [comments,    setComments]  = useLocalState(`learn_comments_${itemId}`, []);
  const [commentText, setComment]   = useState("");
  const [editingId,   setEditingId] = useState(null);
  const [editText,    setEditText]  = useState("");
  const [likes,       setLikes]     = useLocalState(`learn_clikes_${itemId}`, {});
  const bottomRef = useRef(null);

  const addComment = () => {
    if (!commentText.trim() || !userProfile) return;
    const next = [...comments, {
      id: Date.now().toString(), userId: userProfile.id,
      username: userProfile.username || "You", avatar: userProfile.avatar_url || null,
      text: commentText.trim(), timestamp: new Date().toISOString(), edited: false,
    }];
    setComments(next); setComment("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 50);
  };
  const toggleLike = (cid) => setLikes(prev => ({ ...prev, [cid]:!prev[cid] }));
  const saveEdit = (cid) => {
    setComments(comments.map(x => x.id===cid ? {...x, text:editText.trim(), edited:true} : x));
    setEditingId(null);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {comments.length === 0 && (
          <div className="text-center py-10">
            <MessageCircle size={24} className="text-gray-700 mx-auto mb-2"/>
            <p className="text-gray-600 text-xs">{t("learn.comments_empty")}</p>
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} className="group flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 text-[11px] font-black text-white overflow-hidden">
              {c.avatar ? <Image src={c.avatar} alt="" width={28} height={28} unoptimized className="w-full h-full object-cover"/> : (c.username[0]||"U").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className="text-[11px] font-bold text-gray-200">{c.username}</span>
                {c.edited && <span className="text-[9px] text-gray-600">{t("learn.edited")}</span>}
                <span className="text-[9px] text-gray-600">{formatTimeAgo(c.timestamp)}</span>
              </div>
              {editingId===c.id ? (
                <div className="flex items-center gap-1 mt-1">
                  <input value={editText} onChange={e=>setEditText(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter")saveEdit(c.id);if(e.key==="Escape")setEditingId(null);}}
                    autoFocus className="flex-1 text-xs bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white outline-none focus:border-blue-500/60"/>
                  <button onClick={()=>saveEdit(c.id)} className="p-1.5 text-blue-400"><Check size={12}/></button>
                  <button onClick={()=>setEditingId(null)} className="p-1.5 text-gray-500"><X size={12}/></button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 leading-relaxed break-words">{c.text}</p>
              )}
              <button onClick={()=>toggleLike(c.id)}
                className={`flex items-center gap-1 mt-1 text-[10px] font-bold transition-colors ${likes[c.id]?"text-pink-400":"text-gray-600 hover:text-gray-400"}`}>
                <Heart size={9} className={likes[c.id]?"fill-pink-400":""}/> {likes[c.id]?t("learn.liked"):t("learn.like")}
              </button>
            </div>
            {userProfile?.id===c.userId && editingId!==c.id && (
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={()=>{setEditingId(c.id);setEditText(c.text);}} className="p-1.5 text-gray-600 hover:text-gray-300 rounded-lg hover:bg-white/10"><Edit2 size={11}/></button>
                <button onClick={()=>setComments(comments.filter(x=>x.id!==c.id))} className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-white/10"><Trash2 size={11}/></button>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div className="p-4 border-t border-white/10 shrink-0">
        {userProfile ? (
          <div className="flex items-center gap-2">
            <input value={commentText} onChange={e=>setComment(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addComment();}}}
              placeholder={t("learn.add_comment_ph")}
              className="flex-1 text-xs bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 outline-none focus:border-blue-500/40 transition-colors"/>
            <button onClick={addComment} disabled={!commentText.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-xl transition-colors">
              <Send size={13}/>
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-600 text-center py-1">{t("learn.signin_comment")}</p>
        )}
      </div>
    </>
  );
}

// ── WatchlistPanel ────────────────────────────────────────────────────────────
function WatchlistPanel({ queue, allContent, onRemove, onOpen }) {
  const { t } = useLanguage();
  const items = queue.map(id => allContent.find(i => i.id===id)).filter(Boolean);
  if (items.length===0) return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <ListVideo size={28} className="text-gray-700 mb-3"/>
      <p className="text-xs text-gray-500 font-medium">{t("learn.queue_empty")}</p>
    </div>
  );
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
      {items.map((item,idx) => {
        const thumb = item.platform==="youtube" ? ytThumb(item.youtube_id) : null;
        return (
          <div key={item.id} className="flex items-center gap-2.5 group p-2 rounded-xl hover:bg-white/5 transition-colors">
            <span className="text-[10px] font-black text-gray-600 w-4 shrink-0">{idx+1}</span>
            <div className="relative w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-800">
              {thumb ? <Image src={thumb} alt="" fill unoptimized className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Video size={12} className="text-gray-600"/></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-300 line-clamp-2 leading-snug">{item.title}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{item.author}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={()=>onOpen(item)} className="p-1.5 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-white/10"><Play size={11} className="fill-current"/></button>
              <button onClick={()=>onRemove(item.id)} className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-white/10"><X size={11}/></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── VideoModal ────────────────────────────────────────────────────────────────
function VideoModal({ initialItem, allContent, onClose, onBookmark, getBookmarked, userProfile, getWatched, onWatch, queue, onQueueToggle }) {
  const { t } = useLanguage();
  const [current,   setCurrent]  = useState(initialItem);
  const [rightTab,  setRightTab] = useState("upnext");
  const [mobileTab, setMobileTab]= useState("video");
  const [copied,    setCopied]   = useState(false);
  const [liked,     setLiked]    = useLocalState(`learn_liked_${initialItem.id}`, false);
  const [isMobile,  setIsMobile] = useState(() => typeof window!=="undefined" ? window.matchMedia("(max-width:1023px)").matches : false);

  const isWatched = getWatched(current.id);
  const isQueued  = queue.includes(current.id);

  useEffect(() => { document.body.style.overflow="hidden"; return ()=>{document.body.style.overflow=""}; }, []);
  useEffect(() => {
    const mq = window.matchMedia("(max-width:1023px)");
    const h = e=>setIsMobile(e.matches);
    mq.addEventListener("change",h); return ()=>mq.removeEventListener("change",h);
  }, []);
  useEffect(() => {
    const handler = e=>{
      if(e.key==="Escape") onClose();
      if(e.key==="b"||e.key==="B") onBookmark(current.id);
      if(e.key==="w"||e.key==="W") onWatch(current.id);
    };
    window.addEventListener("keydown",handler); return ()=>window.removeEventListener("keydown",handler);
  }, [current.id, onClose, onBookmark, onWatch]);

  const upNext = useMemo(() => allContent.filter(i=>i.type==="video"&&i.id!==current.id).slice(0,30), [allContent, current.id]);
  const share = async()=>{
    const url = current.platform==="tiktok" ? `https://www.tiktok.com/video/${current.tiktok_id}` : `https://youtube.com/watch?v=${current.youtube_id}`;
    if(navigator.share){try{await navigator.share({title:current.title,url});}catch{}}
    else{try{navigator.clipboard.writeText(url);}catch{} setCopied(true); setTimeout(()=>setCopied(false),2000);}
  };
  const embedSrc = current.platform==="tiktok"
    ? `https://www.tiktok.com/embed/v2/${current.tiktok_id}`
    : `https://www.youtube.com/embed/${current.youtube_id}?autoplay=1&rel=0`;
  const topic = topicConfig(current.topic);

  const MiniCard = (item)=>{
    const tc=topicConfig(item.topic); const thumb=item.platform==="youtube"?ytThumb(item.youtube_id):null; const isW=getWatched(item.id); const isCurr=item.id===current.id;
    return (
      <button key={item.id} onClick={()=>{setCurrent(item);setMobileTab("video");}} className={`w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group ${isCurr?"bg-white/8 ring-1 ring-blue-500/30":""}`}>
        <div className="relative w-28 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-800">
          {thumb?<Image src={thumb} alt="" fill unoptimized className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center"><Video size={16} className="text-gray-600"/></div>}
          {isW&&<div className="absolute inset-0 bg-black/50 flex items-center justify-center"><CheckCircle2 size={14} className="text-emerald-400"/></div>}
          {item.duration&&<span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1 py-0.5 rounded">{item.duration}</span>}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-xs font-bold text-gray-200 line-clamp-2 leading-snug group-hover:text-white">{item.title}</p>
          <p className="text-[10px] text-gray-500 mt-1">{item.author}</p>
          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 border ${TOPIC_COLORS[tc.color]}`}>{t(tc.labelKey)}</span>
        </div>
      </button>
    );
  };

  const RTABS=[{id:"upnext",label:t("learn.tab_up_next"),icon:ListVideo},{id:"comments",label:t("learn.tab_comments"),icon:MessageCircle},{id:"queue",label:t("learn.tab_queue"),icon:Bookmark}];
  const RightPanel=(mobile=false)=>{
    const active=mobile?mobileTab:rightTab; const setTab=mobile?setMobileTab:setRightTab;
    return (
      <>
        <div className="flex border-b border-white/10 shrink-0">
          {RTABS.map(({id,label,icon:Icon})=>(
            <button key={id} onClick={()=>setTab(id)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors border-b-2 ${active===id?"text-white border-blue-500":"text-gray-500 border-transparent hover:text-gray-300"}`}>
              <Icon size={12}/> {label}
            </button>
          ))}
        </div>
        {active==="upnext"
          ?<div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">{upNext.length===0?<p className="text-gray-600 text-xs text-center py-8">{t("learn.no_more_videos")}</p>:upNext.map(v=>MiniCard(v))}</div>
          :active==="comments"?<CommentsPanel itemId={current.id} userProfile={userProfile}/>
          :<WatchlistPanel queue={queue} allContent={allContent} onRemove={onQueueToggle} onOpen={item=>{setCurrent(item);if(mobile)setMobileTab("video");}}/>}
      </>
    );
  };

  const MetaStrip=(compact=false)=>(
    <div className={`${compact?"p-4":"p-5 border-t border-white/10"} shrink-0`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2 className={`text-white font-black leading-snug ${compact?"text-sm":"text-base"}`}>{current.title}</h2>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${LEVEL_COLORS[current.level]}`}>{levelLabel(current.level, t)}</span>
      </div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${TOPIC_COLORS[topic.color]}`}><topic.icon size={9}/> {t(topic.labelKey)}</span>
        <span className="text-gray-500 text-xs">{current.author}</span>
        {current.duration&&<span className="flex items-center gap-1 text-gray-600 text-xs"><Clock size={10}/>{current.duration}</span>}
        {isWatched&&<span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500"><CheckCircle2 size={10}/> {t("learn.watched_badge")}</span>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={()=>setLiked(l=>!l)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${liked?"bg-pink-500/20 border-pink-500/40 text-pink-400":"bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
          <ThumbsUp size={12} className={liked?"fill-pink-400":""}/> {liked?t("learn.liked"):t("learn.like")}
        </button>
        <button onClick={()=>onQueueToggle(current.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isQueued?"bg-blue-500/20 border-blue-500/40 text-blue-400":"bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
          <Plus size={12}/> {isQueued?t("learn.in_queue"):t("learn.queue_btn")}
        </button>
        <button onClick={()=>onWatch(current.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isWatched?"bg-emerald-500/20 border-emerald-500/40 text-emerald-400":"bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
          {isWatched?<EyeOff size={12}/>:<Eye size={12}/>} {isWatched?t("learn.unwatch"):t("learn.watched_action")}
        </button>
      </div>
      {!compact&&current.description&&<p className="text-gray-500 text-sm leading-relaxed mt-3">{current.description}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors shrink-0"><X size={18}/></button>
          <p className="text-sm font-bold text-white truncate">{current.title}</p>
          <span className="hidden sm:block text-[10px] text-gray-600 border border-gray-800 px-2 py-0.5 rounded-full">{t("learn.esc")}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <button onClick={()=>onWatch(current.id)} className={`p-2 rounded-xl hover:bg-white/10 transition-colors ${isWatched?"text-emerald-400":"text-gray-400 hover:text-white"}`}>
            {isWatched?<EyeOff size={16}/>:<Eye size={16}/>}
          </button>
          <button onClick={()=>onBookmark(current.id)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            {getBookmarked(current.id)?<BookmarkCheck size={17} className="text-amber-400 fill-amber-400"/>:<Bookmark size={17} className="text-gray-400 hover:text-white"/>}
          </button>
          <button onClick={share} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs font-bold">
            {copied?<Check size={14} className="text-emerald-400"/>:<Share2 size={14}/>} {copied?t("learn.copied"):t("learn.share")}
          </button>
        </div>
      </div>
      {isMobile&&(
        <div className="flex shrink-0 border-b border-white/10 bg-black">
          {[{id:"video",label:t("learn.tab_video")},{id:"upnext",label:t("learn.tab_up_next")},{id:"comments",label:t("learn.tab_comments")},{id:"queue",label:t("learn.tab_queue")}].map(tab=>(
            <button key={tab.id} onClick={()=>setMobileTab(tab.id)} className={`flex-1 py-2.5 text-[11px] font-bold transition-colors ${mobileTab===tab.id?"text-white border-b-2 border-blue-500":"text-gray-500 hover:text-gray-300"}`}>{tab.label}</button>
          ))}
        </div>
      )}
      {!isMobile&&(
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="relative w-full bg-black shrink-0" style={{paddingBottom:"56.25%"}}>
              <iframe className="absolute inset-0 w-full h-full" src={embedSrc} title={current.title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen/>
            </div>
            {MetaStrip()}
          </div>
          <div className="w-72 xl:w-80 flex flex-col border-l border-white/10 bg-[#0a0a0a] min-h-0 shrink-0">{RightPanel()}</div>
        </div>
      )}
      {isMobile&&(
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {mobileTab==="video"&&(
            <div className="flex-1 overflow-y-auto">
              <div className="relative w-full bg-black" style={{paddingBottom:"56.25%"}}>
                <iframe className="absolute inset-0 w-full h-full" src={embedSrc} title={current.title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen/>
              </div>
              {MetaStrip(true)}
            </div>
          )}
          {(mobileTab==="upnext"||mobileTab==="comments"||mobileTab==="queue")&&(
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-[#0a0a0a]">{RightPanel(true)}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AddContentModal ───────────────────────────────────────────────────────────
function AddContentModal({ onClose, onAdd, userProfile, isPremium }) {
  const { t } = useLanguage();
  const [url,setUrl]=useState(""); const [title,setTitle]=useState(""); const [desc,setDesc]=useState("");
  const [topic,setTopic]=useState("coding"); const [level,setLevel]=useState("Beginner");
  const [tags,setTags]=useState(""); const [detected,setDetected]=useState(null); const [error,setError]=useState("");

  useEffect(()=>{
    (async()=>{
      const d=extractVideo(url); setDetected(d);
      setError(d?.platform==="tiktok"&&!isPremium?t("learn.tiktok_premium_note"):"");
    })();
  },[url,isPremium,t]);

  const submit=()=>{
    if(!detected){setError(t("learn.err_paste_url"));return;}
    if(detected.platform==="tiktok"&&!isPremium){setError(t("learn.err_tiktok_premium"));return;}
    if(!title.trim()){setError(t("learn.err_title_required"));return;}
    onAdd({ id:`user_${Date.now()}`, type:"video", platform:detected.platform,
      ...(detected.platform==="youtube"?{youtube_id:detected.id}:{tiktok_id:detected.id}),
      title:title.trim(), description:desc.trim()||"Community resource.",
      topic, level, author:userProfile?.username||"Community",
      source:detected.platform==="youtube"?"YouTube":"TikTok",
      published:new Date().toISOString().split("T")[0],
      tags:tags.split(",").map(t=>t.trim()).filter(Boolean), featured:false, userId:userProfile?.id,
    }); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-gray-100">{t("learn.add_resource_title")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{isPremium?t("learn.supported_all"):t("learn.supported_yt")}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-4">
          {[{label:t("learn.field_video_url"),val:url,set:setUrl,ph:t("learn.ph_video_url")},{label:t("learn.field_title_req"),val:title,set:setTitle,ph:t("learn.ph_title")},{label:t("learn.field_description"),val:desc,set:setDesc,ph:t("learn.ph_description"),area:true},{label:t("learn.field_tags"),val:tags,set:setTags,ph:t("learn.ph_tags")}].map(({label,val,set,ph,area})=>(
            <div key={label}>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">{label}</label>
              {area
                ?<textarea value={val} onChange={e=>set(e.target.value)} placeholder={ph} rows={2} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"/>
                :<input value={val} onChange={e=>set(e.target.value)} placeholder={ph} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {[{label:t("learn.field_topic"),val:topic,set:setTopic,opts:TOPICS.filter(tp=>tp.id!=="all").map(tp=>({v:tp.id,l:t(tp.labelKey)}))},{label:t("learn.field_level"),val:level,set:setLevel,opts:["Beginner","Intermediate","Advanced"].map(v=>({v,l:levelLabel(v,t)}))}].map(({label,val,set,opts})=>(
              <div key={label}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">{label}</label>
                <select value={val} onChange={e=>set(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none">
                  {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
          </div>
          {detected&&<p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t("learn.detected",{platform:detected.platform})}</p>}
          {error&&<p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">{t("learn.cancel")}</button>
          <button onClick={submit} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors active:scale-95"><Plus size={14}/> {t("learn.add")}</button>
        </div>
      </div>
    </div>
  );
}

// ── EditContentModal ──────────────────────────────────────────────────────────
function EditContentModal({ item, onClose, onUpdate }) {
  const { t } = useLanguage();
  const [title,setTitle]=useState(item.title||""); const [desc,setDesc]=useState(item.description||"");
  const [topic,setTopic]=useState(item.topic||"coding"); const [level,setLevel]=useState(item.level||"Beginner");
  const [tags,setTags]=useState((item.tags||[]).join(", ")); const [saving,setSaving]=useState(false); const [error,setError]=useState("");

  const submit=async()=>{
    if(!title.trim()){setError(t("learn.err_title_short"));return;}
    setSaving(true);
    await onUpdate(item.id,{title:title.trim(),description:desc.trim(),topic,level,tags:tags.split(",").map(t=>t.trim()).filter(Boolean)});
    setSaving(false); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <div className="min-w-0"><h2 className="text-base font-black text-gray-900 dark:text-gray-100">{t("learn.edit_resource_title")}</h2><p className="text-xs text-gray-500 mt-0.5 truncate">{item.title}</p></div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-4">
          {[{label:t("learn.field_title_req"),val:title,set:setTitle,ph:t("learn.ph_title")},{label:t("learn.field_description"),val:desc,set:setDesc,ph:t("learn.ph_description"),area:true},{label:t("learn.field_tags"),val:tags,set:setTags,ph:t("learn.ph_tags")}].map(({label,val,set,ph,area})=>(
            <div key={label}>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">{label}</label>
              {area?<textarea value={val} onChange={e=>set(e.target.value)} placeholder={ph} rows={2} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"/>
              :<input value={val} onChange={e=>set(e.target.value)} placeholder={ph} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {[{label:t("learn.field_topic"),val:topic,set:setTopic,opts:TOPICS.filter(tp=>tp.id!=="all").map(tp=>({v:tp.id,l:t(tp.labelKey)}))},{label:t("learn.field_level"),val:level,set:setLevel,opts:["Beginner","Intermediate","Advanced"].map(v=>({v,l:levelLabel(v,t)}))}].map(({label,val,set,opts})=>(
              <div key={label}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">{label}</label>
                <select value={val} onChange={e=>set(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none">
                  {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
          </div>
          {error&&<p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">{t("learn.cancel")}</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors active:scale-95"><Check size={14}/> {saving?t("learn.saving"):t("learn.update")}</button>
        </div>
      </div>
    </div>
  );
}

// ── OwnerMenu — always-visible dropdown for the item's uploader ───────────────
function OwnerMenu({ item, onDelete, onEdit, onHide, isHidden }) {
  const { t } = useLanguage();
  const [open,    setOpen]    = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef(null);

  useEffect(()=>{
    if(!open) return;
    const h = e => { if(ref.current && !ref.current.contains(e.target)) { setOpen(false); setConfirm(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleDelete = () => {
    onDelete?.(item.id);
    setOpen(false);
    setConfirm(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e=>{ e.stopPropagation(); setOpen(o=>!o); setConfirm(false); }}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={t("learn.manage")}
      >
        <MoreHorizontal size={14}/>
      </button>

      {open&&(
        <div className="absolute right-0 bottom-full mb-1.5 z-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden w-40 py-1">
          <button
            onClick={e=>{ e.stopPropagation(); onEdit?.(item); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Edit2 size={13} className="text-blue-500"/> {t("learn.menu_edit")}
          </button>
          <button
            onClick={e=>{ e.stopPropagation(); onHide?.(item.id); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {isHidden
              ? <><Eye size={13} className="text-emerald-500"/> {t("learn.menu_show")}</>
              : <><EyeOff size={13} className="text-gray-400"/> {t("learn.menu_hide")}</>}
          </button>
          <div className="mx-3 my-1 h-px bg-gray-100 dark:bg-gray-800"/>
          {!confirm
            ? <button
                onClick={e=>{ e.stopPropagation(); setConfirm(true); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={13}/> {t("learn.menu_delete")}
              </button>
            : <div className="px-3.5 py-2.5 space-y-2">
                <p className="text-[10px] font-black text-red-500">{t("learn.confirm_delete_item")}</p>
                <div className="flex gap-1.5">
                  <button onClick={e=>{ e.stopPropagation(); handleDelete(); }}
                    className="flex-1 py-1.5 text-[10px] font-black bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                    {t("learn.yes_delete")}
                  </button>
                  <button onClick={e=>{ e.stopPropagation(); setConfirm(false); }}
                    className="flex-1 py-1.5 text-[10px] font-black bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg transition-colors">
                    {t("learn.cancel")}
                  </button>
                </div>
              </div>
          }
        </div>
      )}
    </div>
  );
}

// ── VideoCard ─────────────────────────────────────────────────────────────────
function VideoCard({ item, layout, bookmarked, onBookmark, onOpen, watched, onQueueToggle, queued, isOwner=false, onDelete, onEdit, onHide, isHidden=false }) {
  const { t } = useLanguage();
  const topic = topicConfig(item.topic);
  const thumb = item.platform==="youtube" ? ytThumb(item.youtube_id) : null;

  // List layout
  if (layout==="list") {
    return (
      <div className={`group relative flex items-center gap-4 p-3 bg-white dark:bg-gray-900 rounded-2xl border transition-all duration-200 ${isHidden?"opacity-40 border-dashed":"border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md"}`}>
        <button onClick={()=>onOpen(item)} className="relative shrink-0 w-28 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800" style={{aspectRatio:"16/9"}}>
          {thumb?<Image src={thumb} alt={item.title} fill unoptimized className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center bg-gray-900"><Video size={16} className="text-gray-600"/></div>}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <Play size={14} className="text-white fill-white opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
          {item.duration&&<span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[8px] font-bold px-1 py-0.5 rounded">{item.duration}</span>}
          {watched&&<div className="absolute top-0.5 left-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={8} className="text-white"/></div>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TOPIC_COLORS[topic.color]}`}><topic.icon size={8}/> {t(topic.labelKey)}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[item.level]}`}>{levelLabel(item.level, t)}</span>
          </div>
          <p className={`text-sm font-bold line-clamp-1 ${watched?"text-gray-400":"text-gray-900 dark:text-gray-100"}`}>{item.title}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{item.author}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isOwner&&<OwnerMenu item={item} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHidden}/>}
          <button onClick={()=>onQueueToggle(item.id)} className={`p-1.5 rounded-lg transition-colors ${queued?"text-blue-500":"text-gray-300 dark:text-gray-600 hover:text-blue-400"}`}><Plus size={14}/></button>
          <button onClick={()=>onBookmark(item.id)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-amber-500 transition-colors">
            {bookmarked?<BookmarkCheck size={14} className="text-amber-500 fill-current"/>:<Bookmark size={14}/>}
          </button>
          <button onClick={()=>onOpen(item)} className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"><Play size={12} className="fill-white"/></button>
        </div>
      </div>
    );
  }

  // Grid card
  return (
    <div className={`group relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${isHidden?"opacity-40 border-dashed border-gray-300 dark:border-gray-700":watched?"border-gray-100 dark:border-gray-800/50":"border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-gray-700"}`}>

      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
        <button onClick={()=>onOpen(item)} className="absolute inset-0 w-full h-full">
          {thumb
            ?<Image src={thumb} alt={item.title} fill unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
            :<div className="w-full h-full flex items-center justify-center bg-gray-900"><Video size={28} className="text-gray-600"/></div>}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
            <div className="w-11 h-11 bg-white/95 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200">
              <Play size={14} className="text-gray-900 fill-gray-900 ml-0.5"/>
            </div>
          </div>
          {item.featured&&!isHidden&&<span className="absolute top-2 left-2 flex items-center gap-0.5 bg-amber-400 text-gray-900 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"><Flame size={7}/> {t("learn.featured")}</span>}
          {isHidden&&<span className="absolute top-2 left-2 flex items-center gap-0.5 bg-gray-600/90 text-white text-[8px] font-black px-2 py-0.5 rounded-full z-10"><EyeOff size={7}/> {t("learn.hidden_badge")}</span>}
          {watched&&<span className="absolute top-2 right-2 flex items-center gap-0.5 bg-emerald-500/90 text-white text-[8px] font-black px-2 py-0.5 rounded-full"><CheckCircle2 size={7}/> {t("learn.watched_badge")}</span>}
          {item.duration&&<span className="absolute bottom-2 right-2 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md tabular-nums">{item.duration}</span>}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TOPIC_COLORS[topic.color]}`}><topic.icon size={8}/> {t(topic.labelKey)}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[item.level]}`}>{levelLabel(item.level, t)}</span>
          {isOwner&&<span className="ml-auto text-[8px] font-black text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/40">{item.userId===userProfile?.id||item.user_id===userProfile?.id?t("learn.your_upload"):t("learn.admin_badge")}</span>}
        </div>
        <h3 className={`text-[13px] font-black leading-snug line-clamp-2 flex-1 mb-3 ${watched?"text-gray-400 dark:text-gray-500":"text-gray-900 dark:text-gray-100"}`}>{item.title}</h3>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-[11px] text-gray-500 font-medium truncate min-w-0 pr-2">{item.author}</span>
          <div className="flex items-center gap-1 shrink-0">
            {isOwner&&<OwnerMenu item={item} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHidden}/>}
            <button onClick={()=>onQueueToggle(item.id)} className={`p-1 rounded-lg transition-colors ${queued?"text-blue-500":"text-gray-300 dark:text-gray-600 hover:text-blue-400"}`}><Plus size={13}/></button>
            <button onClick={()=>onBookmark(item.id)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-amber-500 transition-colors rounded-lg">
              {bookmarked?<BookmarkCheck size={13} className="text-amber-500 fill-current"/>:<Bookmark size={13}/>}
            </button>
            <button onClick={()=>onOpen(item)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-colors active:scale-95">
              <Play size={8} className="fill-white"/> {t("learn.watch")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ArticleCard ───────────────────────────────────────────────────────────────
function ArticleCard({ item, layout, bookmarked, onBookmark, isOwner=false, onDelete, onEdit, onHide, isHidden=false }) {
  const { t } = useLanguage();
  const topic = topicConfig(item.topic);

  // List layout
  if (layout==="list") {
    return (
      <div className={`flex items-center gap-4 p-3 bg-white dark:bg-gray-900 rounded-2xl border transition-all duration-200 ${isHidden?"opacity-40 border-dashed":"border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${TOPIC_COLORS[topic.color]}`}><topic.icon size={16}/></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TOPIC_COLORS[topic.color]}`}>{t(topic.labelKey)}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[item.level]}`}>{levelLabel(item.level, t)}</span>
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{item.title}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{item.author}{item.read_time?` · ${item.read_time}`:""}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isOwner&&<OwnerMenu item={item} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHidden}/>}
          <button onClick={()=>onBookmark(item.id)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-amber-500 transition-colors">
            {bookmarked?<BookmarkCheck size={14} className="text-amber-500 fill-current"/>:<Bookmark size={14}/>}
          </button>
          {item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 border border-gray-200 dark:border-gray-700 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-xl transition-colors"><ExternalLink size={13}/></a>}
        </div>
      </div>
    );
  }

  // Grid card — top accent strip distinguishes from video
  return (
    <div className={`flex flex-col bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${isHidden?"opacity-40 border-dashed border-gray-300 dark:border-gray-700":"border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"}`}>

      {/* Top accent */}
      <div className={`h-1.5 w-full shrink-0 ${TOPIC_SOLID[topic.color]}`}/>

      {/* Header band */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${TOPIC_COLORS[topic.color]}`}>
          <topic.icon size={17}/>
        </div>
        <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TOPIC_COLORS[topic.color]}`}>{t(topic.labelKey)}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[item.level]}`}>{levelLabel(item.level, t)}</span>
          {item.featured&&<span className="flex items-center gap-0.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50"><Flame size={8}/> {t("learn.featured")}</span>}
          {isOwner&&<span className="text-[8px] font-black text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/40">{item.userId===userProfile?.id||item.user_id===userProfile?.id?t("learn.your_upload"):t("learn.admin_badge")}</span>}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-4 pb-4">
        <div className="flex items-start gap-2 mb-2">
          <BookOpen size={14} className="text-gray-400 dark:text-gray-600 mt-0.5 shrink-0"/>
          <h3 className="text-[13px] font-black text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 flex-1">{item.title}</h3>
        </div>
        {item.description&&<p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed flex-1">{item.description}</p>}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 mt-auto">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{item.author}</p>
            {item.read_time&&<span className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5"><Clock size={9}/> {item.read_time}</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isOwner&&<OwnerMenu item={item} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHidden}/>}
            <button onClick={()=>onBookmark(item.id)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-amber-500 transition-colors rounded-lg">
              {bookmarked?<BookmarkCheck size={13} className="text-amber-500 fill-current"/>:<Bookmark size={13}/>}
            </button>
            {item.url&&(
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 hover:border-blue-400 text-gray-600 dark:text-gray-300 hover:text-blue-600 text-[10px] font-bold rounded-lg transition-colors">
                {t("learn.read")} <ExternalLink size={8}/>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FeaturedSpotlight ─────────────────────────────────────────────────────────
function FeaturedSpotlight({ items, bookmarks, onBookmark, onOpen }) {
  const { t } = useLanguage();
  const [idx,setIdx]=useState(0);
  useEffect(()=>{ if(items.length<=1) return; const t=setInterval(()=>setIdx(i=>(i+1)%items.length),8000); return()=>clearInterval(t); },[items.length]);

  const feat=items[idx]; if(!feat) return null;
  const topic=topicConfig(feat.topic);
  const thumb=feat.platform==="youtube"?ytThumb(feat.youtube_id,"maxresdefault"):null;

  return (
    <div className="relative rounded-2xl overflow-hidden mb-8 shadow-2xl border border-gray-800 min-h-[200px] sm:min-h-[240px]">
      {thumb&&<div className="absolute inset-0"><Image src={thumb} alt="" fill unoptimized className="w-full h-full object-cover opacity-20"/><div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/90 to-gray-900/50"/></div>}
      {!thumb&&<div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800"/>}

      <div className="relative px-6 sm:px-8 py-8 sm:py-10 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest"><Zap size={10}/> {t("learn.editors_pick")}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${TOPIC_COLORS[topic.color]}`}><topic.icon size={9}/> {t(topic.labelKey)}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_COLORS[feat.level]}`}>{levelLabel(feat.level, t)}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-3 line-clamp-2">{feat.title}</h2>
          {feat.description&&<p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-4 max-w-xl">{feat.description}</p>}
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span className="font-medium">{feat.author}</span>
            {feat.duration&&<span className="flex items-center gap-1 text-xs text-gray-500"><Clock size={11}/>{feat.duration}</span>}
            {feat.read_time&&<span className="flex items-center gap-1 text-xs text-gray-500"><BookOpen size={11}/>{feat.read_time}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto sm:min-w-[160px]">
          {feat.type==="video"
            ?<button onClick={()=>onOpen(feat)} className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-blue-500/30 active:scale-95"><Play size={14} className="fill-white"/> {t("learn.watch_now")}</button>
            :feat.url?<a href={feat.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/30"><BookOpen size={14}/> {t("learn.read_article")}</a>:null}
          <button onClick={()=>onBookmark(feat.id)} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm border border-white/20 transition-colors">
            {bookmarks.includes(feat.id)?<><BookmarkCheck size={14} className="fill-amber-400 text-amber-400"/> {t("learn.saved")}</>:<><Bookmark size={14}/> {t("learn.save")}</>}
          </button>
        </div>
      </div>
      {items.length>1&&(
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {items.map((_,i)=><button key={i} onClick={()=>setIdx(i)} className={`rounded-full transition-all ${i===idx?"w-5 h-1.5 bg-blue-500":"w-1.5 h-1.5 bg-gray-600 hover:bg-gray-500"}`}/>)}
        </div>
      )}
    </div>
  );
}

// ── ScrollRow ─────────────────────────────────────────────────────────────────
function ScrollRow({ title, icon:Icon, color="blue", items, bookmarks, onBookmark, onOpen, onSeeMore, watched, queue, onQueueToggle, currentUserId, onDelete, onEdit, onHide, hiddenIds=[] }) {
  const { t } = useLanguage();
  const rowRef = useRef(null);
  const [canLeft,setCanLeft]=useState(false);
  const [canRight,setCanRight]=useState(true);

  const checkScroll=useCallback(()=>{
    const el=rowRef.current; if(!el) return;
    setCanLeft(el.scrollLeft>8); setCanRight(el.scrollLeft+el.clientWidth<el.scrollWidth-8);
  },[]);

  useEffect(()=>{
    const el=rowRef.current; if(!el) return;
    el.addEventListener("scroll",checkScroll,{passive:true}); checkScroll();
    return()=>el.removeEventListener("scroll",checkScroll);
  },[checkScroll,items]);

  const scroll=dir=>{ const el=rowRef.current; if(!el) return; el.scrollBy({left:dir==="left"?-(el.clientWidth*0.75):el.clientWidth*0.75,behavior:"smooth"}); };

  if(items.length===0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon&&<div className={`w-7 h-7 rounded-xl flex items-center justify-center border ${TOPIC_COLORS[color]}`}><Icon size={13}/></div>}
          <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">{title}</h3>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {onSeeMore&&<button onClick={onSeeMore} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">{t("learn.see_all")} <ChevronRight size={12}/></button>}
          {[{dir:"left",dis:!canLeft},{dir:"right",dis:!canRight}].map(({dir,dis})=>(
            <button key={dir} onClick={()=>scroll(dir)} disabled={dis}
              className={`p-1.5 rounded-xl border transition-all ${dis?"border-gray-100 dark:border-gray-800 text-gray-200 dark:text-gray-700 cursor-not-allowed":"bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400 shadow-sm"}`}>
              {dir==="left"?<ChevronLeft size={14}/>:<ChevronRight size={14}/>}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        {canLeft&&<div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 dark:from-gray-950 to-transparent z-10 pointer-events-none"/>}
        {canRight&&<div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 dark:from-gray-950 to-transparent z-10 pointer-events-none"/>}
        <div ref={rowRef} className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
          {items.map(item=>{
            const isOwner=!!(currentUserId&&(item.userId===currentUserId||item.user_id===currentUserId));
            const isHid=hiddenIds.includes(item.id);
            return (
              <div key={item.id} className="w-72 sm:w-80 shrink-0">
                {item.type==="video"
                  ?<VideoCard item={item} layout="grid" bookmarked={bookmarks.includes(item.id)} onBookmark={onBookmark} onOpen={onOpen} watched={watched?.includes(item.id)} queue={queue} onQueueToggle={onQueueToggle} queued={queue?.includes(item.id)} isOwner={isOwner} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHid}/>
                  :<ArticleCard item={item} layout="grid" bookmarked={bookmarks.includes(item.id)} onBookmark={onBookmark} isOwner={isOwner} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHid}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── MagazineLayout ────────────────────────────────────────────────────────────
function MagazineLayout({ filtered, bookmarks, onBookmark, onOpen, watched, queue, onQueueToggle, currentUserId, onDelete, onEdit, onHide, hiddenIds=[] }) {
  const { t } = useLanguage();
  if(filtered.length===0) return null;
  const hero=filtered[0]; const sidebar=filtered.slice(1,4); const rest=filtered.slice(4);
  const heroTopic=topicConfig(hero.topic);
  const heroThumb=hero.platform==="youtube"?ytThumb(hero.youtube_id,"maxresdefault"):null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2">
          <div className="group relative w-full overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 cursor-pointer shadow-xl aspect-video"
            onClick={()=>hero.type==="video"?onOpen(hero):null}>
            {heroThumb?<Image src={heroThumb} alt={hero.title} fill unoptimized className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>:<div className="absolute inset-0 flex items-center justify-center bg-gray-900"><Video size={48} className="text-gray-700"/></div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"/>
            {hero.type==="video"&&<div className="absolute inset-0 flex items-center justify-center"><div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform shadow-2xl"><Play size={22} className="text-white fill-white ml-1"/></div></div>}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {hero.featured&&<span className="flex items-center gap-1 bg-amber-400 text-gray-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"><Flame size={9}/> {t("learn.featured")}</span>}
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${TOPIC_COLORS[heroTopic.color]}`}><heroTopic.icon size={9}/> {t(heroTopic.labelKey)}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_COLORS[hero.level]}`}>{levelLabel(hero.level, t)}</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white leading-tight mb-1 line-clamp-2">{hero.title}</h2>
              <p className="text-xs text-gray-300 line-clamp-1 mb-3">{hero.author} · {hero.description}</p>
              <div className="flex items-center gap-2">
                {hero.type==="video"&&<button onClick={e=>{e.stopPropagation();onOpen(hero);}} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors active:scale-95"><Play size={11} className="fill-white"/> {t("learn.watch")}</button>}
                <button onClick={e=>{e.stopPropagation();onBookmark(hero.id);}} className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors">
                  {bookmarks.includes(hero.id)?<BookmarkCheck size={12} className="fill-amber-400 text-amber-400"/>:<Bookmark size={12}/>} {bookmarks.includes(hero.id)?t("learn.saved"):t("learn.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-3">
          {sidebar.map(item=>{
            const isOwner=!!(currentUserId&&(item.userId===currentUserId||item.user_id===currentUserId));
            const isHid=hiddenIds.includes(item.id);
            return item.type==="video"
              ?<VideoCard key={item.id} item={item} layout="list" bookmarked={bookmarks.includes(item.id)} onBookmark={onBookmark} onOpen={onOpen} watched={watched.includes(item.id)} queue={queue} onQueueToggle={onQueueToggle} queued={queue.includes(item.id)} isOwner={isOwner} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHid}/>
              :<ArticleCard key={item.id} item={item} layout="list" bookmarked={bookmarks.includes(item.id)} onBookmark={onBookmark} isOwner={isOwner} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHid}/>;
          })}
        </div>
      </div>
      {rest.length>0&&(
        <>
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"/>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">{t("learn.more_resources")}</span>
            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map(item=>{
              const isOwner=!!(currentUserId&&(item.userId===currentUserId||item.user_id===currentUserId));
              const isHid=hiddenIds.includes(item.id);
              return item.type==="video"
                ?<VideoCard key={item.id} item={item} layout="grid" bookmarked={bookmarks.includes(item.id)} onBookmark={onBookmark} onOpen={onOpen} watched={watched.includes(item.id)} queue={queue} onQueueToggle={onQueueToggle} queued={queue.includes(item.id)} isOwner={isOwner} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHid}/>
                :<ArticleCard key={item.id} item={item} layout="grid" bookmarked={bookmarks.includes(item.id)} onBookmark={onBookmark} isOwner={isOwner} onDelete={onDelete} onEdit={onEdit} onHide={onHide} isHidden={isHid}/>;
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── TopicDropdown ─────────────────────────────────────────────────────────────
function TopicDropdown({ topics, value, onChange, counts, compact=false }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = topics.find(tp => tp.id === value) || topics[0];

  useEffect(()=>{
    if(!open) return;
    const h = e => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  },[open]);

  return (
    <div className={`relative ${compact?"":"w-full sm:w-72"}`} ref={ref}>
      <button
        onClick={()=>setOpen(o=>!o)}
        className={`flex items-center gap-2 font-bold transition-all border whitespace-nowrap
          ${compact
            ? `px-3 py-1.5 rounded-lg text-xs ${open?"border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600":"border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`
            : `w-full justify-between px-4 py-2.5 rounded-xl text-sm shadow-sm ${open?"border-blue-400 ring-2 ring-blue-500/20":"border-gray-200 dark:border-gray-700 hover:border-gray-300"} bg-white dark:bg-gray-900`
          }`}
      >
        <div className={`flex items-center justify-center border rounded-md shrink-0 ${TOPIC_COLORS[current.color]} ${compact?"w-5 h-5":"w-6 h-6 rounded-lg"}`}>
          <current.icon size={compact?10:12}/>
        </div>
        <span className={`text-gray-900 dark:text-gray-100 ${compact?"":"truncate"}`}>{t(current.labelKey)}</span>
        <span className={`font-black rounded-full shrink-0 ${compact?"text-[9px] px-1 py-px bg-gray-100 dark:bg-gray-800 text-gray-400":"text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
          {counts[current.id]}
        </span>
        <ChevronDown size={compact?11:14} className={`text-gray-400 transition-transform shrink-0 ${open?"rotate-180":""}`}/>
      </button>

      {open&&(
        <div className={`absolute left-0 top-full mt-1.5 z-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden py-1 ${compact?"w-52":"w-full"}`}>
          {topics.map(tp=>{
            const active = tp.id === value;
            const cnt = counts[tp.id];
            if(cnt === 0 && tp.id !== "all") return null;
            return (
              <button
                key={tp.id}
                onClick={()=>{ onChange(tp.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2 text-xs font-bold transition-colors text-left ${active?"bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400":"text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${TOPIC_COLORS[tp.color]}`}>
                  <tp.icon size={11}/>
                </div>
                <span className="flex-1 truncate">{t(tp.labelKey)}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${active?"bg-blue-100 dark:bg-blue-900/40 text-blue-600":"bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                  {cnt}
                </span>
                {active&&<Check size={11} className="text-blue-500 shrink-0"/>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SortDropdown ──────────────────────────────────────────────────────────────
function SortDropdown({ value, onChange }) {
  const { t } = useLanguage();
  const [open,setOpen]=useState(false); const ref=useRef(null);
  const current=SORT_OPTIONS.find(o=>o.id===value)||SORT_OPTIONS[0];
  useEffect(()=>{ if(!open) return; const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);}; document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); },[open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(o=>!o)} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:border-gray-300 transition-all whitespace-nowrap">
        <current.icon size={11}/> {t(current.labelKey)} <ChevronDown size={11} className={`transition-transform ${open?"rotate-180":""}`}/>
      </button>
      {open&&(
        <div className="absolute right-0 top-full mt-1.5 z-30 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden w-36">
          {SORT_OPTIONS.map(opt=>(
            <button key={opt.id} onClick={()=>{onChange(opt.id);setOpen(false);}} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold transition-colors ${value===opt.id?"bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400":"text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
              <opt.icon size={12}/> {t(opt.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LearnContent() {
  const { t } = useLanguage();
  const [topic,       setTopic]       = useState("all");
  const [layout,      setLayout]      = useLocalState("learn_layout","grid");
  const [search,      setSearch]      = useState("");
  const [dSearch,     setDSearch]     = useState("");
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sortBy,      setSortBy]      = useState("newest");
  const [bookmarks,   setBookmarks]   = useLocalState("learn_bookmarks",[]);
  const [watched,     setWatched]     = useLocalState("learn_watched",[]);
  const [queue,       setQueue]       = useLocalState("learn_queue",[]);
  const [viewCounts,  setViewCounts]  = useLocalState("learn_views",{});
  const [showSaved,   setShowSaved]   = useState(false);
  const [showWatched, setShowWatched] = useState(false);
  const [showHidden,  setShowHidden]  = useState(false);
  const [hiddenIds,   setHiddenIds]   = useLocalState("learn_hidden_ids",[]);
  const [openItem,    setOpenItem]    = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [showStats,   setShowStats]   = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [dbContent,   setDbContent]   = useState([]);
  const [userContent, setUserContent] = useLocalState("learn_user_content",[]);
  const [loading,     setLoading]     = useState(true);

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session) return;
      const {data}=await supabase.from("profiles").select("id,username,avatar_url,is_verified,is_premium,is_admin,role").eq("id",session.user.id).single();
      if(data) setUserProfile({...data, _email: session.user.email ?? ""});
    });
  },[]);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{ const{data,error}=await supabase.from("learn_content").select("*").order("created_at",{ascending:false}); if(!error&&data) setDbContent(data); }catch{}
      setLoading(false);
    })();
  },[]);

  useEffect(()=>{const t=setTimeout(()=>setDSearch(search),250);return()=>clearTimeout(t);},[search]);

  // Admin check is based on server-side profile fields only — never client-side env vars
  const isAdmin   = !!(userProfile?.is_admin || ["admin","founder"].includes(userProfile?.role));
  const canAdd    = userProfile?.is_verified || userProfile?.is_premium || isAdmin;
  const isPremium = userProfile?.is_premium || isAdmin;

  const toggleBookmark = useCallback(id=>setBookmarks(prev=>prev.includes(id)?prev.filter(b=>b!==id):[...prev,id]),[setBookmarks]);
  const toggleWatched  = useCallback(id=>setWatched(prev=>prev.includes(id)?prev.filter(w=>w!==id):[...prev,id]),[setWatched]);
  const toggleQueue    = useCallback(id=>setQueue(prev=>prev.includes(id)?prev.filter(q=>q!==id):[...prev,id]),[setQueue]);
  const toggleHide     = useCallback(id=>setHiddenIds(prev=>prev.includes(id)?prev.filter(h=>h!==id):[...prev,id]),[setHiddenIds]);
  const addUserContent = useCallback(item=>setUserContent(prev=>[item,...prev]),[setUserContent]);

  const deleteContent = useCallback(async id=>{
    if(String(id).startsWith("user_")){
      setUserContent(prev=>prev.filter(i=>i.id!==id));
      return;
    }
    const { error } = await supabase.from("learn_content").delete().eq("id", id);
    if(error){
      // If RLS blocks the delete (e.g. not the uploader), call admin API route instead
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/content/${id}`, {
        method:"DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if(!res.ok){ console.error("Admin delete failed:", await res.text()); return; }
    }
    setDbContent(prev=>prev.filter(i=>i.id!==id));
  },[setUserContent]);

  const updateContent = useCallback(async(id,updates)=>{
    if(String(id).startsWith("user_")){setUserContent(prev=>prev.map(i=>i.id===id?{...i,...updates}:i));}
    else{try{await supabase.from("learn_content").update(updates).eq("id",id);setDbContent(prev=>prev.map(i=>i.id===id?{...i,...updates}:i));}catch{}}
  },[setUserContent]);

  const openVideo = useCallback(item=>{
    setOpenItem(item); setViewCounts(prev=>({...prev,[item.id]:(prev[item.id]||0)+1}));
  },[setViewCounts]);

  const allContent = useMemo(()=>{
    const base=dbContent.length>0?dbContent:SEED_CONTENT;
    return [...userContent,...base];
  },[dbContent,userContent]);

  const filtered = useMemo(()=>{
    let items=allContent.filter(item=>{
      if(topic!=="all"&&item.topic!==topic) return false;
      if(typeFilter!=="all"&&item.type!==typeFilter) return false;
      if(levelFilter!=="all"&&item.level!==levelFilter) return false;
      if(showSaved&&!bookmarks.includes(item.id)) return false;
      if(showWatched&&watched.includes(item.id)) return false;
      if(showHidden&&!hiddenIds.includes(item.id)) return false;
      if(!showHidden&&hiddenIds.includes(item.id)) return false;
      if(dSearch){const q=dSearch.toLowerCase();return item.title.toLowerCase().includes(q)||(item.author||"").toLowerCase().includes(q)||(item.tags||[]).some(t=>t.toLowerCase().includes(q))||(item.description||"").toLowerCase().includes(q);}
      return true;
    });
    if(sortBy==="newest")  items=[...items].sort((a,b)=>new Date(b.published||0)-new Date(a.published||0));
    else if(sortBy==="popular") items=[...items].sort((a,b)=>((b.views||0)+(b.likes||0))-((a.views||0)+(a.likes||0)));
    else if(sortBy==="az")      items=[...items].sort((a,b)=>a.title.localeCompare(b.title));
    else if(sortBy==="watched") items=[...items].sort((a,b)=>(watched.includes(a.id)?1:0)-(watched.includes(b.id)?1:0));
    return items;
  },[allContent,topic,typeFilter,levelFilter,dSearch,showSaved,showWatched,bookmarks,watched,sortBy,hiddenIds,showHidden]);

  const featuredItems = useMemo(()=>filtered.filter(i=>i.featured),[filtered]);
  const videoCount    = filtered.filter(i=>i.type==="video").length;
  const articleCount  = filtered.filter(i=>i.type==="article").length;
  const watchedCount  = allContent.filter(i=>watched.includes(i.id)).length;
  const isFiltered    = !!(dSearch||showSaved||showWatched||showHidden||topic!=="all"||typeFilter!=="all"||levelFilter!=="all");

  const ownerCheck = item=>!!(userProfile?.id&&(isAdmin||(item.userId===userProfile.id||item.user_id===userProfile.id)));
  const cardProps  = item=>({item, bookmarked:bookmarks.includes(item.id), onBookmark:toggleBookmark, onOpen:openVideo, watched:watched.includes(item.id), queue, onQueueToggle:toggleQueue, queued:queue.includes(item.id), isOwner:ownerCheck(item), onDelete:deleteContent, onEdit:setEditingItem, onHide:toggleHide, isHidden:hiddenIds.includes(item.id)});
  const clearFilters = ()=>{ setTopic("all");setTypeFilter("all");setLevelFilter("all");setSearch("");setShowSaved(false);setShowWatched(false);setShowHidden(false); };

  return (
    <>
      {openItem?.type==="video"&&<VideoModal initialItem={openItem} allContent={allContent} onClose={()=>setOpenItem(null)} onBookmark={toggleBookmark} getBookmarked={id=>bookmarks.includes(id)} userProfile={userProfile} getWatched={id=>watched.includes(id)} onWatch={toggleWatched} queue={queue} onQueueToggle={toggleQueue}/>}
      {showAdd&&<AddContentModal onClose={()=>setShowAdd(false)} onAdd={addUserContent} userProfile={userProfile} isPremium={isPremium}/>}
      {editingItem&&<EditContentModal item={editingItem} onClose={()=>setEditingItem(null)} onUpdate={updateContent}/>}

      <div className="w-full max-w-7xl mx-auto pb-16">

        {/* ══ HEADER ════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm mb-5 overflow-hidden">

          {/* Top stripe */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500"/>

          <div className="px-5 pt-5 pb-4">
            {/* Title row */}
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <GraduationCap size={18} className="text-white"/>
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 leading-tight tracking-tight">{t("learn.title")}</h1>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                    <span className="text-gray-700 dark:text-gray-300 font-bold">{allContent.length}</span> {t("learn.resources_word")} ·{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{watchedCount}</span> {t("learn.watched_word")} ·{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{queue.length}</span> {t("learn.queued_word")}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {hiddenIds.length>0&&userProfile&&(
                  <button onClick={()=>setShowHidden(p=>!p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${showHidden?"bg-gray-800 text-white border-gray-600":"border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 bg-gray-50 dark:bg-gray-800"}`}>
                    {showHidden?<Eye size={11}/>:<EyeOff size={11}/>}
                    {t("learn.hidden_count",{n:hiddenIds.length})}
                  </button>
                )}
                <button onClick={()=>setShowStats(s=>!s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${showStats?"bg-blue-600 text-white border-blue-600":"border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 bg-white dark:bg-gray-900"}`}>
                  <BarChart2 size={11}/> {t("learn.stats_btn")}
                </button>
                {canAdd
                  ?<button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors active:scale-95 shadow-sm">
                    <Plus size={13}/> {t("learn.add_resource_btn")}
                  </button>
                  :userProfile
                    ?<span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 cursor-not-allowed select-none">
                      <Lock size={11}/> {t("learn.verified_to_add")}
                    </span>
                    :null}
                {/* Layout switcher */}
                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {LAYOUTS.map(({id,icon:Icon,labelKey})=>(
                    <button key={id} onClick={()=>setLayout(id)} title={t(labelKey)}
                      className={`px-2.5 py-1.5 transition-all border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${layout===id?"bg-blue-600 text-white":"bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                      <Icon size={13}/>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats panel */}
            {showStats&&<div className="mb-4"><StatsBar allContent={allContent} watched={watched} bookmarks={bookmarks}/></div>}

            {/* Search */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              <input
                value={search} onChange={e=>setSearch(e.target.value)}
                placeholder={t("learn.search_ph2")}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900 transition-all"
              />
              {search&&(
                <button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md transition-colors">
                  <X size={13}/>
                </button>
              )}
            </div>

            {/* Filter bar — one clean row */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* Topic */}
              <div className="shrink-0">
                <TopicDropdown
                  topics={TOPICS}
                  value={topic}
                  onChange={setTopic}
                  counts={Object.fromEntries(TOPICS.map(t=>[t.id, t.id==="all"?allContent.length:allContent.filter(i=>i.topic===t.id).length]))}
                  compact
                />
              </div>

              <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 shrink-0"/>

              {/* Type */}
              <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
                {[
                  {v:"all",  l:t("learn.type_all")},
                  {v:"video",   l:`${t("learn.type_videos")}${videoCount>0?` · ${videoCount}`:""}`},
                  {v:"article", l:`${t("learn.type_articles")}${articleCount>0?` · ${articleCount}`:""}`},
                ].map(({v,l})=>(
                  <button key={v} onClick={()=>setTypeFilter(v)}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors border-r border-gray-200 dark:border-gray-700 last:border-r-0 whitespace-nowrap ${typeFilter===v?"bg-blue-600 text-white":"bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Level */}
              <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
                {[
                  {v:"all",          l:t("learn.level_all")},
                  {v:"Beginner",     l:t("learn.level_beginner")},
                  {v:"Intermediate", l:t("learn.level_intermediate")},
                  {v:"Advanced",     l:t("learn.level_advanced")},
                ].map(({v,l})=>(
                  <button key={v} onClick={()=>setLevelFilter(v)}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors border-r border-gray-200 dark:border-gray-700 last:border-r-0 whitespace-nowrap ${levelFilter===v?"bg-blue-600 text-white":"bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                    {l}
                  </button>
                ))}
              </div>

              <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 shrink-0"/>

              {/* Saved */}
              <button onClick={()=>setShowSaved(p=>!p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 whitespace-nowrap ${showSaved?"bg-amber-500 text-white border-amber-500":"bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}>
                {showSaved?<BookmarkCheck size={12} className="fill-white"/>:<Bookmark size={12}/>}
                {t("learn.saved")}{bookmarks.length>0&&` · ${bookmarks.length}`}
              </button>

              {/* Unwatched */}
              <button onClick={()=>setShowWatched(p=>!p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 whitespace-nowrap ${showWatched?"bg-violet-600 text-white border-violet-600":"bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}>
                <EyeOff size={12}/> {t("learn.unwatched")}
              </button>

              {/* Sort + Clear pushed right */}
              <div className="ml-auto flex items-center gap-2 shrink-0">
                {isFiltered&&(
                  <button onClick={clearFilters}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-500 hover:text-red-600 border border-red-200 dark:border-red-800/40 rounded-lg bg-red-50 dark:bg-red-900/10 transition-colors whitespace-nowrap">
                    <X size={11}/> {t("learn.clear_filters")}
                  </button>
                )}
                <SortDropdown value={sortBy} onChange={setSortBy}/>
              </div>

            </div>
          </div>
        </div>
        {/* ── Sign-in notice ────────────────────────────────────────────── */}
        {!userProfile&&(
          <div className="mb-6 px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 flex items-center gap-3">
            <ShieldCheck size={16} className="text-blue-500 shrink-0"/>
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">{t("learn.signin_notice")}</p>
          </div>
        )}

        {/* ── Loading skeleton ──────────────────────────────────────────── */}
        {loading&&(
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({length:6}).map((_,i)=>(
              <div key={i} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse shadow-sm">
                <div className="aspect-video bg-gray-100 dark:bg-gray-800"/>
                <div className="p-4 space-y-2.5">
                  <div className="flex gap-1.5"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16"/><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full w-12"/></div>
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full w-3/4"/>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-1/2"/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Featured spotlight ────────────────────────────────────────── */}
        {!loading&&!dSearch&&!showSaved&&!showWatched&&layout!=="list"&&featuredItems.length>0&&(
          <FeaturedSpotlight items={featuredItems} bookmarks={bookmarks} onBookmark={toggleBookmark} onOpen={openVideo}/>
        )}

        {/* ── Content area ──────────────────────────────────────────────── */}
        {!loading&&(
          filtered.length===0
          ?(
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-700">
                <Search size={28} className="text-gray-300 dark:text-gray-600"/>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-1">{t("learn.no_results_title")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">{t("learn.no_results_body")}</p>
              <button onClick={clearFilters} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors active:scale-95">
                <RefreshCw size={13}/> {t("learn.reset_filters")}
              </button>
            </div>
          )
          :layout==="list"
          ?(
            <div className="flex flex-col gap-2.5">
              {filtered.map(item=>
                item.type==="video"
                  ?<VideoCard key={item.id} layout="list" {...cardProps(item)}/>
                  :<ArticleCard key={item.id} layout="list" item={item} bookmarked={bookmarks.includes(item.id)} onBookmark={toggleBookmark} isOwner={ownerCheck(item)} onDelete={deleteContent} onEdit={setEditingItem} onHide={toggleHide} isHidden={hiddenIds.includes(item.id)}/>
              )}
            </div>
          )
          :layout==="magazine"
          ?(
            <MagazineLayout filtered={filtered} bookmarks={bookmarks} onBookmark={toggleBookmark} onOpen={openVideo} watched={watched} queue={queue} onQueueToggle={toggleQueue} currentUserId={userProfile?.id} onDelete={deleteContent} onEdit={setEditingItem} onHide={toggleHide} hiddenIds={hiddenIds}/>
          )
          :(
            isFiltered
            ?(
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map(item=>
                  item.type==="video"
                    ?<VideoCard key={item.id} layout="grid" {...cardProps(item)}/>
                    :<ArticleCard key={item.id} layout="grid" item={item} bookmarked={bookmarks.includes(item.id)} onBookmark={toggleBookmark} isOwner={ownerCheck(item)} onDelete={deleteContent} onEdit={setEditingItem} onHide={toggleHide} isHidden={hiddenIds.includes(item.id)}/>
                )}
              </div>
            )
            :(
              <div>
                {TOPICS.filter(tp=>tp.id!=="all").map(tp=>{
                  const rowItems = allContent.filter(i=>i.topic===tp.id&&i.type==="video"&&!hiddenIds.includes(i.id));
                  if(rowItems.length===0) return null;
                  return (
                    <ScrollRow key={tp.id} title={t("learn.topic_videos",{topic:t(tp.labelKey)})} icon={tp.icon} color={tp.color}
                      items={rowItems}
                      bookmarks={bookmarks} onBookmark={toggleBookmark} onOpen={openVideo}
                      onSeeMore={()=>{setTopic(tp.id);setTypeFilter("video");}}
                      watched={watched} queue={queue} onQueueToggle={toggleQueue}
                      currentUserId={userProfile?.id} onDelete={deleteContent} onEdit={setEditingItem} onHide={toggleHide} hiddenIds={hiddenIds}/>
                  );
                })}
                {allContent.filter(i=>i.type==="article"&&!hiddenIds.includes(i.id)).length>0&&(
                  <ScrollRow title={t("learn.articles_row")} icon={BookOpen} color="gray"
                    items={allContent.filter(i=>i.type==="article"&&!hiddenIds.includes(i.id))}
                    bookmarks={bookmarks} onBookmark={toggleBookmark} onOpen={openVideo}
                    onSeeMore={()=>setTypeFilter("article")}
                    watched={watched} queue={queue} onQueueToggle={toggleQueue}
                    currentUserId={userProfile?.id} onDelete={deleteContent} onEdit={setEditingItem} onHide={toggleHide} hiddenIds={hiddenIds}/>
                )}

                {/* Blog CTA */}
                <div className="mt-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-br from-violet-50/60 dark:from-violet-900/10 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center border border-violet-200 dark:border-violet-800/30">
                      <Newspaper size={18} className="text-violet-600 dark:text-violet-400"/>
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-gray-100">{t("learn.explore_blog")}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t("learn.explore_blog_desc")}</p>
                    </div>
                  </div>
                  <Link href="/dash/blog" className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-colors active:scale-95 whitespace-nowrap">
                    {t("learn.go_to_blog")} <ChevronRight size={14}/>
                  </Link>
                </div>
              </div>
            )
          )
        )}

        {!loading&&filtered.length>0&&(
          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-10">
            {t("learn.footer_summary",{filtered:filtered.length,total:allContent.length,watched:watchedCount,queued:queue.length})}
          </p>
        )}
      </div>
    </>
  );
}
