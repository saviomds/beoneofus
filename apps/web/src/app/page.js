"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "./supabaseClient";
import {
  Terminal, Zap, ArrowRight, Code2, Users, Globe, Bot,
  Menu, X, Bell, ChevronDown, UserPlus, Handshake,
  AlertTriangle, Briefcase, GraduationCap, BookOpen, Star,
  Sparkles, Lock, CheckCircle2, MessageSquare, TrendingUp,
  Play, Shield, ChevronRight, Award, Pencil, Trash2,
  Laptop, ShoppingBag, Trophy, FileText, Newspaper, Crown,
  Heart, Check, ShieldAlert, ShieldCheck,
  LogOut, User, Settings, LayoutDashboard,
} from "lucide-react";
import dynamic from "next/dynamic";
import { getAvatarSrc } from "../lib/avatar";
import { signOutEverywhere } from "../lib/signOutEverywhere";
import { useLanguage } from "../lib/i18n";
import { CORE_URL } from "../lib/platform";
import RwandaFlag from "./components/RwandaFlag";

/* ─── Animation helpers ─────────────────────────────────────── */
function useIntersect(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { threshold: 0.15, ...options });
    io.observe(el);
    return () => io.disconnect();
    // `options` is read once to configure the observer at mount; every caller passes no args
    // (default `{}` is a new object each render), so depending on it would needlessly re-subscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, visible];
}

function AnimatedCounter({ to, duration = 2000, suffix = "" }) {
  const [val, setVal] = useState(0);
  const [ref, visible] = useIntersect();
  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.floor(p * to));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [visible, to, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ─── Data ──────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Briefcase size={22} />,
    label: "landing.features.jobs.label",
    title: "landing.features.jobs.title",
    desc: "landing.features.jobs.desc",
    color: "from-brand-500/10 to-brand-600/5",
    border: "border-brand-200 dark:border-brand-800/40",
    icon_bg: "bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400",
    tag: "landing.features.jobs.tag",
    tag_color: "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-700/40",
    size: "lg",
  },
  {
    icon: <Handshake size={22} />,
    label: "landing.features.connections.label",
    title: "landing.features.connections.title",
    desc: "landing.features.connections.desc",
    color: "from-indigo-500/10 to-indigo-600/5",
    border: "border-indigo-200 dark:border-indigo-800/40",
    icon_bg: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
    tag: "landing.features.connections.tag",
    tag_color: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700/40",
    size: "lg",
  },
  {
    icon: <ShoppingBag size={22} />,
    label: "landing.features.marketplace.label",
    title: "landing.features.marketplace.title",
    desc: "landing.features.marketplace.desc",
    color: "from-amber-500/10 to-amber-600/5",
    border: "border-amber-200 dark:border-amber-800/40",
    icon_bg: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    tag: "landing.features.marketplace.tag",
    tag_color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700/40",
    size: "sm",
  },
  {
    icon: <Code2 size={22} />,
    label: "landing.features.projects.label",
    title: "landing.features.projects.title",
    desc: "landing.features.projects.desc",
    color: "from-emerald-500/10 to-emerald-600/5",
    border: "border-emerald-200 dark:border-emerald-800/40",
    icon_bg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    tag: "landing.features.projects.tag",
    tag_color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/40",
    size: "sm",
  },
];

const STEPS = [
  { n: "01", icon: <UserPlus size={20} />, title: "landing.how.build.title", desc: "landing.how.build.desc", color: "text-brand-600 dark:text-brand-400", bg: "bg-brand-600" },
  { n: "02", icon: <Handshake size={20} />, title: "landing.how.connect.title", desc: "landing.how.connect.desc", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-600" },
  { n: "03", icon: <Briefcase size={20} />, title: "landing.how.work.title", desc: "landing.how.work.desc", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-600" },
  { n: "04", icon: <TrendingUp size={20} />, title: "landing.how.grow.title", desc: "landing.how.grow.desc", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500" },
];

const COMMUNITIES = [
  { name: "landing.community.founders.name", icon: <Zap size={20} />, desc: "landing.community.founders.desc", color: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400" },
  { name: "landing.community.design.name", icon: <Sparkles size={20} />, desc: "landing.community.design.desc", color: "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400" },
  { name: "landing.community.marketing.name", icon: <TrendingUp size={20} />, desc: "landing.community.marketing.desc", color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" },
  { name: "landing.community.tech.name", icon: <Code2 size={20} />, desc: "landing.community.tech.desc", color: "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400" },
  { name: "landing.community.finance.name", icon: <Briefcase size={20} />, desc: "landing.community.finance.desc", color: "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400" },
];

const FALLBACK_STATS = [
  { label: "landing.stats.professionals", value: 0, suffix: "" },
  { label: "landing.stats.jobs",   value: 0, suffix: "" },
  { label: "landing.stats.connections",   value: 0, suffix: "" },
  { label: "landing.stats.projects",      value: 0, suffix: "" },
];

const FALLBACK_TESTIMONIALS = [];

/* ─── Helpers ───────────────────────────────────────────────── */
function authLink(session, dest) {
  if (session) return dest;
  return `/auth?next=${encodeURIComponent(dest)}`;
}


const TYPEWRITER_WORD_KEYS = [
  "landing.hero.typewriter.future",
  "landing.hero.typewriter.career",
  "landing.hero.typewriter.mentor",
  "landing.hero.typewriter.pathway",
  "landing.hero.typewriter.chance",
  "landing.hero.typewriter.livelihood",
];

/* ─── Component ─────────────────────────────────────────────── */
export default function LandingPage() {
  const { t } = useLanguage();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileSection, setMobileSection] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [pageViews, setPageViews] = useState(null);
  const [liveStats, setLiveStats] = useState(FALLBACK_STATS);
  const [testimonials, setTestimonials] = useState(FALLBACK_TESTIMONIALS);
  const [sponsors, setSponsors] = useState([]);
  const [heroVisible, setHeroVisible] = useState(false);
  const [navAvatarError, setNavAvatarError] = useState(false);
  const [typeText, setTypeText] = useState("");
  const wordIndex = useRef(0);
  const charIndex = useRef(0);
  const deleting = useRef(false);
  const typewriterWordsRef = useRef(TYPEWRITER_WORD_KEYS);

  // Notification bell state
  const [unreadCount, setUnreadCount] = useState(0);
  const [navNotifs, setNavNotifs] = useState([]);
  const [notifNow, setNotifNow] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);
  const notifChannelRef = useRef(null);

  // Profile dropdown state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  /* auth */
  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const { data: { session: s }, error } = await supabase.auth.getSession();
        if (error) {
          if (error.message.includes("Refresh Token") || error.message.includes("Invalid Refresh")) {
            await signOutEverywhere().catch(() => {});
          } else if (isMounted) setAuthError(error.message);
        }
        if (isMounted) setSession(s);
        if (s) {
          const { data } = await supabase.from("profiles").select("username, avatar_url, full_name, role, company").eq("id", s.user.id).single();
          if (isMounted) setProfile(data);
        }
      } catch { if (isMounted) setAuthError("__AUTH_FAILED__"); }
      finally { if (isMounted) setLoading(false); }
    };
    check();
    return () => { isMounted = false; };
  }, []);

  /* live platform stats + page view counter */
  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: devCount },
        { count: jobCount },
        { count: connCount },
        { count: projectCount },
        { data: viewData },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("connections").select("id", { count: "exact", head: true }).eq("status", "accepted"),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.rpc("increment_page_views"),
      ]);

      setLiveStats([
        { label: "landing.stats.professionals", value: devCount ?? 0, suffix: "+" },
        { label: "landing.stats.jobs", value: jobCount ?? 0, suffix: "+" },
        { label: "landing.stats.connections", value: connCount ?? 0, suffix: "+" },
        { label: "landing.stats.projects", value: projectCount ?? 0, suffix: "+" },
      ]);
      if (viewData) setPageViews(viewData);
    };
    fetchStats();
  }, []);

  /* sponsors */
  useEffect(() => {
    fetch("/api/sponsors")
      .then(r => r.json())
      .then(d => setSponsors(d.sponsors || []))
      .catch(() => {});
  }, []);

  /* testimonials */
  useEffect(() => {
    supabase
      .from("testimonials")
      .select("id, user_id, name, username, role, company, content, rating, avatar_url")
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (data && data.length > 0) setTestimonials(data);
      });
  }, []);

  /* hero entrance */
  useEffect(() => { const t = setTimeout(() => setHeroVisible(true), 100); return () => clearTimeout(t); }, []);

  /* notification unread count + real-time */
  useEffect(() => {
    if (!session) {
      const frame = requestAnimationFrame(() => { setUnreadCount(0); setNavNotifs([]); });
      return () => cancelAnimationFrame(frame);
    }
    const uid = session.user.id;

    const fetchCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', uid)
        .eq('unread', true);
      setUnreadCount(count || 0);
    };

    fetchCount();

    if (notifChannelRef.current) supabase.removeChannel(notifChannelRef.current);
    notifChannelRef.current = supabase
      .channel(`nav-notif-${uid}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `receiver_id=eq.${uid}` }, fetchCount)
      .subscribe();

    return () => { if (notifChannelRef.current) supabase.removeChannel(notifChannelRef.current); };
  }, [session]);

  /* fetch notification list when panel opens */
  useEffect(() => {
    if (!notifOpen || !session) return;
    const fetchNotifs = async () => {
      setNotifLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('*, actor:actor_id(username, avatar_url)')
        .eq('receiver_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(8);
      setNavNotifs(data || []);
      setNotifNow(Date.now());
      setNotifLoading(false);
    };
    fetchNotifs();
  }, [notifOpen, session]);

  /* close notif dropdown on outside click */
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  /* close profile dropdown on outside click */
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  /* notification helpers */
  const getNotifIcon = (type) => {
    switch (type) {
      case 'like': return <Heart size={9} className="text-rose-500" />;
      case 'comment': return <MessageSquare size={9} className="text-brand-500" />;
      case 'message': return <MessageSquare size={9} className="text-violet-500" />;
      case 'handshake': return <Check size={9} className="text-emerald-500" />;
      case 'blocked': return <ShieldAlert size={9} className="text-orange-500" />;
      case 'unblocked': return <ShieldCheck size={9} className="text-green-500" />;
      case 'group_invite':
      case 'group_join_request': return <Users size={9} className="text-purple-500" />;
      case 'connection_request': return <UserPlus size={9} className="text-brand-500" />;
      case 'partnership_update': return <Handshake size={9} className="text-indigo-500" />;
      default: return <Zap size={9} className="text-amber-500" />;
    }
  };

  const formatNotifTime = (dateString) => {
    const diff = Math.floor((notifNow - new Date(dateString)) / 1000);
    if (diff < 60) return t('landing.notif.just_now');
    if (diff < 3600) return t('landing.notif.minutes_ago', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('landing.notif.hours_ago', { n: Math.floor(diff / 3600) });
    if (diff < 604800) return t('landing.notif.days_ago', { n: Math.floor(diff / 86400) });
    return new Date(dateString).toLocaleDateString();
  };

  const handleMarkAllRead = async () => {
    if (!session) return;
    await supabase.from('notifications').update({ unread: false }).eq('receiver_id', session.user.id).eq('unread', true);
    setUnreadCount(0);
    setNavNotifs(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const getNotifDest = (notif) => {
    if (notif.link) return notif.link;
    return {
      group_invite: '/dash/groups',
      group_join_request: '/dash/groups',
      comment: '/dash/feed',
      like: '/dash/feed',
      message: '/dash/messages',
      connection_request: '/dash/connections',
      handshake: notif.actor?.username ? `/u/${notif.actor.username}` : '/dash/connections',
      partnership_update: '/dash/partnerships',
    }[notif.type] || '/dash';
  };

  const handleNotifClick = (notif) => {
    setNotifOpen(false);
    if (notif.unread) {
      supabase.from('notifications').update({ unread: false }).eq('id', notif.id).then(() => {});
      setNavNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  /* keep typewriter words translated in sync with the active language.
     Stored in a ref so the mount-once tick loop below can read fresh
     translations without re-subscribing or restarting the animation. */
  useEffect(() => {
    typewriterWordsRef.current = TYPEWRITER_WORD_KEYS.map((k) => t(k));
  }, [t]);

  /* typewriter */
  useEffect(() => {
    const tick = () => {
      const words = typewriterWordsRef.current;
      const word = words[wordIndex.current] || "";
      if (!deleting.current) {
        setTypeText(word.slice(0, charIndex.current + 1));
        charIndex.current++;
        if (charIndex.current === word.length) { deleting.current = true; return setTimeout(tick, 1800); }
      } else {
        setTypeText(word.slice(0, charIndex.current - 1));
        charIndex.current--;
        if (charIndex.current === 0) { deleting.current = false; wordIndex.current = (wordIndex.current + 1) % words.length; }
      }
      setTimeout(tick, deleting.current ? 60 : 90);
    };
    const t = setTimeout(tick, 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,-40px) scale(1.1)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-50px,50px) scale(0.95)} }
        @keyframes orb3 { 0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,30px) scale(1.05)}66%{transform:translate(-30px,-20px) scale(0.97)} }
        @keyframes floatY { 0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)} }
        @keyframes floatY2 { 0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)} }
        @keyframes spin-slow { to{transform:rotate(360deg)} }
        @keyframes fade-up { from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)} }
        @keyframes fade-in { from{opacity:0}to{opacity:1} }
        @keyframes shimmer { 0%{background-position:200% center}100%{background-position:-200% center} }
        @keyframes grid-fade { from{opacity:0}to{opacity:1} }
        @keyframes badge-pop { 0%{opacity:0;transform:scale(0.7) translateY(8px)}100%{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(59,130,246,0.4)}70%{box-shadow:0 0 0 10px rgba(59,130,246,0)}100%{box-shadow:0 0 0 0 rgba(59,130,246,0)} }
        @keyframes cursor-blink { 0%,100%{opacity:1}50%{opacity:0} }
        @keyframes marquee-left { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes marquee-right { from{transform:translateX(-50%)} to{transform:translateX(0)} }
        .animate-marquee-left { animation: marquee-left 40s linear infinite; }
        .animate-marquee-right { animation: marquee-right 44s linear infinite; }
        .marquee-track:hover .animate-marquee-left,
        .marquee-track:hover .animate-marquee-right { animation-play-state: paused; }

        .animate-orb1 { animation: orb1 8s ease-in-out infinite; }
        .animate-orb2 { animation: orb2 11s ease-in-out infinite; }
        .animate-orb3 { animation: orb3 14s ease-in-out infinite; }
        .animate-float { animation: floatY 4s ease-in-out infinite; }
        .animate-float2 { animation: floatY2 5s ease-in-out infinite 0.5s; }
        .animate-float3 { animation: floatY 6s ease-in-out infinite 1s; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-fade-up { animation: fade-up 0.7s ease-out both; }
        .animate-fade-in { animation: fade-in 0.5s ease-out both; }
        .animate-shimmer { background-size:200% auto; animation: shimmer 3s linear infinite; }
        .animate-badge-pop { animation: badge-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        .animate-pulse-ring { animation: pulse-ring 2s cubic-bezier(0.455,0.03,0.515,0.955) infinite; }
        .cursor-blink { animation: cursor-blink 0.9s step-end infinite; }

        .reveal { opacity:0; transform:translateY(32px); transition:opacity 0.7s ease, transform 0.7s ease; }
        .reveal.visible { opacity:1; transform:translateY(0); }
        .reveal-delay-1 { transition-delay:0.1s; }
        .reveal-delay-2 { transition-delay:0.2s; }
        .reveal-delay-3 { transition-delay:0.3s; }
        .reveal-delay-4 { transition-delay:0.4s; }
        .reveal-delay-5 { transition-delay:0.5s; }

        .gradient-text {
          background: linear-gradient(135deg, #4C5FF5, #17C3A6, #4C5FF5);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .card-glow:hover { box-shadow: 0 0 0 1px rgba(99,102,241,0.3), 0 8px 32px rgba(99,102,241,0.12); }
        .noise-bg { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"); }
      `}</style>

      <div className="min-h-screen bg-[#fafafa] dark:bg-[#080c12] text-gray-900 dark:text-gray-100 overflow-x-hidden">

        {/* ── Grid bg ─────────────────────────── */}
        <div className="fixed inset-0 pointer-events-none z-0"
          style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.035) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="fixed inset-0 pointer-events-none z-0 dark:block hidden"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* ── Navbar ──────────────────────────── */}
        <nav
          className="fixed top-0 w-full z-50 border-b border-gray-200/80 dark:border-white/5 bg-white/95 dark:bg-[#080c12]/95 backdrop-blur-2xl"
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

           <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Rwanda */}
            <RwandaFlag className="-mt-1" />

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group" onClick={() => setActiveDropdown(null)}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform bg-gradient-to-br from-brand-500 to-trust-500">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M9 9 4 4.5M9 9l5-4.5M9 9v6" stroke="#fff" strokeWidth="1.3" opacity=".85"/>
                  <circle cx="9" cy="9" r="2.4" fill="#fff"/>
                  <circle cx="4" cy="4.5" r="1.6" fill="#fff" opacity=".92"/>
                  <circle cx="14" cy="4.5" r="1.6" fill="#fff" opacity=".92"/>
                  <circle cx="9" cy="15" r="1.6" fill="#fff" opacity=".92"/>
                </svg>
              </div>
              <span className="font-black text-xl tracking-tight text-gray-900 dark:text-white">
                beone<span className="text-trust-500">of</span>us
              </span>
            </Link>
           </div>

            {/* Desktop nav — mega menus */}
            <div className="hidden lg:flex items-center gap-0.5">
              {[
                { id: "product",   label: "landing.nav.product"   },
                { id: "community", label: "landing.nav.community" },
                { id: "resources", label: "landing.nav.resources" },
                { id: "company",   label: "landing.nav.company"   },
              ].map(item => (
                <button
                  key={item.id}
                  onMouseEnter={() => setActiveDropdown(item.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    activeDropdown === item.id
                      ? "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  {t(item.label)}
                  <ChevronDown size={13} className={`transition-transform duration-200 ${activeDropdown === item.id ? "rotate-180 text-brand-500" : ""}`} />
                </button>
              ))}
              <Link href="/docs" onMouseEnter={() => setActiveDropdown(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all">
                {t('landing.nav.docs')}
              </Link>
            </div>

            {/* Auth area */}
            <div className="flex items-center gap-2 sm:gap-3">
              {loading ? (
                <div className="w-32 sm:w-48 h-9 bg-gray-100 dark:bg-white/5 animate-pulse rounded-xl" />
              ) : session ? (
                <>
                  {/* Notification bell with dropdown */}
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); setActiveDropdown(null); }}
                      onMouseEnter={() => setActiveDropdown(null)}
                      className="relative text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 p-2 transition-colors shrink-0"
                      aria-label={t('landing.notif.aria_label')}
                    >
                      <Bell size={19} className={notifOpen ? 'text-brand-600 dark:text-brand-400' : ''} />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-[#080c12] leading-none">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {notifOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden z-[60]">
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-2">
                            <Bell size={14} className="text-brand-600 dark:text-brand-400" />
                            <span className="font-black text-sm text-gray-900 dark:text-gray-100">{t('landing.notif.panel_title')}</span>
                            {unreadCount > 0 && (
                              <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none">{unreadCount}</span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline">
                              {t('landing.notif.mark_all_read')}
                            </button>
                          )}
                        </div>

                        {/* List */}
                        <div className="max-h-[340px] overflow-y-auto">
                          {notifLoading ? (
                            <div className="p-4 space-y-3">
                              {[0, 1, 2].map(i => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
                                  <div className="flex-1 space-y-1.5 py-0.5">
                                    <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-4/5" />
                                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-2/5" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : navNotifs.length === 0 ? (
                            <div className="text-center py-10">
                              <Bell size={26} className="text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                              <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold">{t('landing.notif.empty')}</p>
                            </div>
                          ) : (
                            navNotifs.map(notif => (
                              <Link
                                key={notif.id}
                                href={getNotifDest(notif)}
                                onClick={() => handleNotifClick(notif)}
                                className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800/40 last:border-0 ${notif.unread ? 'bg-brand-50/60 dark:bg-brand-950/30' : ''}`}
                              >
                                {/* Avatar + type icon */}
                                <div className="relative shrink-0 mt-0.5">
                                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-xs font-black text-gray-600 dark:text-gray-300">
                                    {notif.actor?.avatar_url
                                      ? <Image src={notif.actor.avatar_url} alt="" width={32} height={32} unoptimized className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      : (notif.actor?.username?.[0] || '?').toUpperCase()}
                                  </div>
                                  <span className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] bg-white dark:bg-gray-950 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                    {getNotifIcon(notif.type)}
                                  </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-2">
                                    <span className="font-bold">{notif.actor?.username || t('landing.notif.someone')}</span>{' '}{notif.content}
                                  </p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatNotifTime(notif.created_at)}</p>
                                </div>

                                {notif.unread && <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-2 shrink-0" />}
                              </Link>
                            ))
                          )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
                          <Link
                            href="/dash/notifications"
                            onClick={() => setNotifOpen(false)}
                            className="flex items-center justify-center gap-1 text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline py-0.5"
                          >
                            {t('landing.notif.view_all')} <ChevronRight size={12} />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Profile dropdown */}
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); setActiveDropdown(null); }}
                      onMouseEnter={() => setActiveDropdown(null)}
                      className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 pl-1.5 pr-3 py-1.5 rounded-full transition-all shrink-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-black overflow-hidden shadow-sm shrink-0">
                        {getAvatarSrc(profile, session) && !navAvatarError
                          ? <Image src={getAvatarSrc(profile, session)} alt="av" width={28} height={28} unoptimized className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setNavAvatarError(true)} />
                          : (profile?.username?.[0] || session?.user?.email?.[0] || "U").toUpperCase()}
                      </div>
                      <span className="hidden sm:block text-sm font-bold text-gray-700 dark:text-gray-300">
                        {profile?.username || t('landing.profile_menu.dashboard_fallback')}
                      </span>
                      <ChevronDown size={13} className={`hidden sm:block transition-transform duration-200 text-gray-400 dark:text-gray-500 ${profileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {profileOpen && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden z-[60]">
                        {/* Profile header */}
                        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-brand-50/80 to-white dark:from-brand-950/20 dark:to-gray-950">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-brand-600 text-white flex items-center justify-center text-base font-black overflow-hidden shadow-sm shrink-0 ring-2 ring-brand-100 dark:ring-brand-900/50">
                              {getAvatarSrc(profile, session) && !navAvatarError
                                ? <Image src={getAvatarSrc(profile, session)} alt="av" width={44} height={44} unoptimized className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setNavAvatarError(true)} />
                                : (profile?.username?.[0] || session?.user?.email?.[0] || "U").toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">
                                {profile?.username || profile?.full_name || session?.user?.email?.split('@')[0] || t('landing.profile_menu.user_fallback')}
                              </p>
                              {profile?.username && (
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">@{profile.username}</p>
                              )}
                              {(profile?.role || profile?.company) && (
                                <p className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold truncate mt-0.5">
                                  {[profile.role, profile.company].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Nav links */}
                        <div className="py-1.5">
                          {[
                            { href: '/dash', icon: <LayoutDashboard size={15} />, label: t('landing.profile_menu.dashboard') },
                            { href: profile?.username ? `/u/${profile.username}` : '/dash', icon: <User size={15} />, label: t('landing.profile_menu.my_profile') },
                            { href: '/dash/notifications', icon: <Bell size={15} />, label: t('landing.profile_menu.notifications'), badge: unreadCount > 0 ? unreadCount : null },
                            { href: '/dash/settings', icon: <Settings size={15} />, label: t('landing.profile_menu.settings') },
                          ].map(item => (
                            <Link
                              key={item.label}
                              href={item.href}
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                            >
                              <span className="text-gray-400 dark:text-gray-500 shrink-0">{item.icon}</span>
                              <span className="flex-1 font-semibold">{item.label}</span>
                              {item.badge && (
                                <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                                  {item.badge > 99 ? '99+' : item.badge}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>

                        {/* Sign out */}
                        <div className="border-t border-gray-100 dark:border-gray-800 py-1.5">
                          <button
                            onClick={async () => { setProfileOpen(false); await signOutEverywhere(); window.location.href = '/auth'; }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          >
                            <LogOut size={15} className="shrink-0" />
                            <span className="font-semibold">{t('landing.profile_menu.sign_out')}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link href="/auth" onMouseEnter={() => setActiveDropdown(null)} className="hidden sm:block px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    {t('landing.auth.sign_in')}
                  </Link>
                  <Link href="/auth"
                    onMouseEnter={() => setActiveDropdown(null)}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-105">
                    {t('landing.auth.get_started')}
                  </Link>
                </>
              )}

              {/* Mobile toggle */}
              <button
                className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setMobileSection(null); }}>
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* ── Mega dropdown panel ── */}
          {activeDropdown && (
            <div
              className="absolute top-full left-0 right-0 border-t border-gray-100 dark:border-white/[0.06] bg-white/98 dark:bg-[#080c12]/98 backdrop-blur-xl shadow-2xl shadow-black/10 dark:shadow-black/50"
              onMouseEnter={() => {}}
            >
              <div className="max-w-7xl mx-auto px-6 py-8">

                {/* ── Product ── */}
                {activeDropdown === "product" && (
                  <div className="grid grid-cols-4 gap-8">
                    <div className="col-span-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{t('landing.nav.product_menu.features_heading')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { icon: <Briefcase size={17} />,    label: t('landing.nav.product_menu.jobs_label'), desc: t('landing.nav.product_menu.jobs_desc'),    href: "/dash/services",    color: "blue"    },
                          { icon: <Users size={17} />,        label: t('landing.nav.product_menu.connections_label'),     desc: t('landing.nav.product_menu.connections_desc'),  href: "/dash/connections", color: "indigo"  },
                          { icon: <ShoppingBag size={17} />,  label: t('landing.nav.product_menu.marketplace_label'),     desc: t('landing.nav.product_menu.marketplace_desc'),  href: "/dash/marketplace", color: "amber"   },
                          { icon: <Code2 size={17} />,        label: t('landing.nav.product_menu.projects_label'),        desc: t('landing.nav.product_menu.projects_desc'),     href: "/projects",         color: "emerald" },
                        ].map(({ icon, label, desc, href, color }) => (
                          <Link key={label} href={href} onClick={() => setActiveDropdown(null)}
                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              color === "violet" ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" :
                              color === "blue"   ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400" :
                              color === "emerald"? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
                              color === "amber"  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" :
                              color === "indigo" ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" :
                                                   "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                            }`}>{icon}</div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{label}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{t('landing.nav.product_menu.tools_heading')}</p>
                      <div className="space-y-0.5">
                        {[
                          { icon: <Laptop size={15} />,      label: t('landing.nav.product_menu.tool_ide'), href: "/IDEPage"            },
                          { icon: <ShoppingBag size={15} />, label: t('landing.nav.product_menu.tool_marketplace'),    href: "/dash/marketplace"   },
                          { icon: <Code2 size={15} />,       label: t('landing.nav.product_menu.tool_projects'),       href: "/projects"           },
                          { icon: <Trophy size={15} />,      label: t('landing.nav.product_menu.tool_leaderboard'),    href: "/dash/leaderboard"   },
                          { icon: <FileText size={15} />,    label: t('landing.nav.product_menu.tool_resume'), href: "/dash/profile"       },
                          { icon: <Crown size={15} />,       label: t('landing.nav.product_menu.tool_premium'),        href: "/dash/premium"       },
                        ].map(({ icon, label, href }) => (
                          <Link key={label} href={href} onClick={() => setActiveDropdown(null)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all font-medium">
                            <span className="shrink-0">{icon}</span>{label}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-brand-600 to-violet-600 rounded-2xl p-6 text-white flex flex-col justify-between">
                      <div>
                        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mb-4"><Sparkles size={18} /></div>
                        <p className="font-black text-lg leading-tight mb-2">{t('landing.nav.product_menu.promo_title')}</p>
                        <p className="text-sm text-white/80 leading-relaxed">{t('landing.nav.product_menu.promo_desc')}</p>
                      </div>
                      <Link href="/dash/premium" onClick={() => setActiveDropdown(null)}
                        className="mt-5 flex items-center gap-2 bg-white text-brand-600 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-brand-50 transition-colors self-start">
                        {t('landing.nav.product_menu.promo_cta')} <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                )}

                {/* ── Community ── */}
                {activeDropdown === "community" && (
                  <div className="grid grid-cols-3 gap-10">
                    <div className="col-span-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{t('landing.nav.community_menu.hubs_heading')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: t('landing.nav.community_menu.hub_tech'),   href: "/community/tech-engineering"    },
                          { label: t('landing.nav.community_menu.hub_design'),  href: "/community/design-creativity"   },
                          { label: t('landing.nav.community_menu.hub_founders'),  href: "/community/founders-startups"   },
                          { label: t('landing.nav.community_menu.hub_marketing'),   href: "/community/marketing-growth"    },
                          { label: t('landing.nav.community_menu.hub_finance'),   href: "/community/finance-business"    },
                        ].map(({ label, href }) => (
                          <Link key={label} href={href} onClick={() => setActiveDropdown(null)}
                            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-gray-100 dark:border-white/5 hover:border-brand-200 dark:hover:border-brand-500/20 hover:bg-brand-50/40 dark:hover:bg-brand-500/5 transition-all group">
                            <div className="w-2 h-2 rounded-full bg-brand-500/60 shrink-0" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{t('landing.nav.community_menu.explore_heading')}</p>
                      <div className="space-y-0.5">
                        {[
                          { icon: <Globe size={15} />,        label: t('landing.nav.community_menu.explore_projects'), href: "/Explore_Projects" },
                          { icon: <Newspaper size={15} />,    label: t('landing.nav.community_menu.blog'),             href: "/blog" },
                          { icon: <MessageSquare size={15} />,label: t('landing.nav.community_menu.messaging'),        href: "/dash/messages" },
                          { icon: <Users size={15} />,        label: t('landing.nav.community_menu.connections'),      href: "/dash/connections" },
                          { icon: <Star size={15} />,         label: t('landing.nav.community_menu.sponsors'),         href: "/sponsors" },
                        ].map(({ icon, label, href }) => (
                          <Link key={label} href={href} onClick={() => setActiveDropdown(null)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all font-medium">
                            <span className="shrink-0">{icon}</span>{label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Resources ── */}
                {activeDropdown === "resources" && (
                  <div className="grid grid-cols-3 gap-10">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{t('landing.nav.resources_menu.learn_heading')}</p>
                      {[
                        { icon: <Laptop size={16} />,   label: t('landing.nav.resources_menu.ide_label'),   desc: t('landing.nav.resources_menu.ide_desc'), href: "/IDEPage"          },
                        { icon: <Globe size={16} />,    label: t('landing.nav.resources_menu.projects_label'), desc: t('landing.nav.resources_menu.projects_desc'), href: "/Explore_Projects" },
                      ].map(({ icon, label, desc, href }) => (
                        <Link key={label} href={href} onClick={() => setActiveDropdown(null)}
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 group-hover:text-brand-500 transition-colors">{icon}</div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{label}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{t('landing.nav.resources_menu.docs_heading')}</p>
                      {[
                        { icon: <FileText size={16} />,    label: t('landing.nav.resources_menu.documentation_label'), desc: t('landing.nav.resources_menu.documentation_desc'),     href: "/docs"         },
                        { icon: <Zap size={16} />,         label: t('landing.nav.resources_menu.how_label'),  desc: t('landing.nav.resources_menu.how_desc'),       href: "/how_it_works" },
                        { icon: <Shield size={16} />,      label: t('landing.nav.resources_menu.premium_label'), desc: t('landing.nav.resources_menu.premium_desc'),   href: "/dash/premium" },
                        { icon: <CheckCircle2 size={16} />,label: t('landing.nav.resources_menu.quickstart_label'),   desc: t('landing.nav.resources_menu.quickstart_desc'), href: "/quick-start"  },
                      ].map(({ icon, label, desc, href }) => (
                        <Link key={label} href={href} onClick={() => setActiveDropdown(null)}
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 group-hover:text-brand-500 transition-colors">{icon}</div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{label}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 rounded-2xl p-5 flex flex-col gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">{t('landing.nav.resources_menu.support_heading')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('landing.nav.resources_menu.support_desc')}</p>
                      </div>
                      {[
                        { icon: <Globe size={14} />,         label: t('landing.nav.resources_menu.all_resources'),          href: "/resources" },
                        { icon: <MessageSquare size={14} />, label: t('landing.nav.resources_menu.support_ticket'),  href: "/dash/more?tool=support" },
                        { icon: <Users size={14} />,         label: t('landing.nav.resources_menu.community_forum'),         href: "/community" },
                      ].map(({ icon, label, href }) => (
                        <Link key={label} href={href} onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                          {icon}{label} <ChevronRight size={13} className="ml-auto" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Company ── */}
                {activeDropdown === "company" && (
                  <div className="grid grid-cols-3 gap-10">
                    <div className="col-span-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{t('landing.nav.company_menu.about_heading')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { icon: <Star size={17} />,      label: t('landing.nav.company_menu.sponsors_label'),          desc: t('landing.nav.company_menu.sponsors_desc'),      href: "/sponsors",         color: "amber"  },
                          { icon: <Newspaper size={17} />, label: t('landing.nav.company_menu.blog_label'),              desc: t('landing.nav.company_menu.blog_desc'),    href: "/blog",             color: "gray"   },
                          { icon: <Users size={17} />,     label: t('landing.nav.company_menu.community_label'),         desc: t('landing.nav.company_menu.community_desc'),   href: "/community",        color: "indigo" },
                          { icon: <Shield size={17} />,    label: t('landing.nav.company_menu.founder_label'), desc: t('landing.nav.company_menu.founder_desc'),      href: "/founder-dashboard",color: "blue"   },
                        ].map(({ icon, label, desc, href, color }) => (
                          <Link key={label} href={href} onClick={() => setActiveDropdown(null)}
                            className="flex items-start gap-3 p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              color === "amber"  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" :
                              color === "indigo" ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" :
                              color === "blue"   ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400" :
                                                   "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400"
                            }`}>{icon}</div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{label}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">{t('landing.nav.company_menu.join_heading')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t('landing.nav.company_menu.join_desc')}</p>
                      </div>
                      <div className="space-y-2">
                        <Link href="/auth" onClick={() => setActiveDropdown(null)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-brand-500/20 w-full">
                          {t('landing.nav.company_menu.get_started_free')} <ArrowRight size={14} />
                        </Link>
                        <Link href="/sponsors" onClick={() => setActiveDropdown(null)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-all hover:border-brand-300 dark:hover:border-brand-500/30 w-full">
                          {t('landing.nav.company_menu.become_sponsor')}
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ── Mobile menu ── */}
          <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? "max-h-[85vh] opacity-100 overflow-y-auto" : "max-h-0 opacity-0"}`}>
            <div className="px-4 pb-6 pt-2 border-t border-gray-100 dark:border-white/5">
              {/* User card */}
              {session && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl mb-4">
                  <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-black overflow-hidden shrink-0">
                    {getAvatarSrc(profile, session) && !navAvatarError
                      ? <Image src={getAvatarSrc(profile, session)} alt="av" width={36} height={36} unoptimized className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setNavAvatarError(true)} />
                      : (profile?.username?.[0] || session?.user?.email?.[0] || "U").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">@{profile?.username || session?.user?.email?.split("@")[0] || t('landing.nav.mobile.member')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{profile?.role || t('landing.nav.mobile.member')}</p>
                  </div>
                </div>
              )}

              {/* Accordion sections */}
              {[
                {
                  id: "product", label: t('landing.nav.product'),
                  links: [
                    { label: t('landing.nav.product_menu.jobs_label'), href: "/dash/services"    },
                    { label: t('landing.nav.product_menu.connections_label'),     href: "/dash/connections" },
                    { label: t('landing.nav.product_menu.tool_marketplace'),     href: "/dash/marketplace" },
                    { label: t('landing.nav.product_menu.tool_projects'),        href: "/projects"         },
                    { label: t('landing.nav.product_menu.tool_ide'),  href: "/IDEPage"          },
                  ],
                },
                {
                  id: "community", label: t('landing.nav.community'),
                  links: [
                    { label: t('landing.nav.community_menu.explore_projects'),       href: "/Explore_Projects" },
                    { label: t('landing.nav.community_menu.hubs_heading'),         href: "/community"        },
                    { label: t('landing.nav.community_menu.blog'),                   href: "/blog"             },
                    { label: t('landing.nav.community_menu.messaging'),              href: "/dash/messages"    },
                  ],
                },
                {
                  id: "resources", label: t('landing.nav.resources'),
                  links: [
                    { label: t('landing.nav.resources_menu.documentation_label'), href: "/docs"         },
                    { label: t('landing.nav.resources_menu.how_label'),  href: "/how_it_works" },
                    { label: t('landing.nav.resources_menu.quickstart_label'),   href: "/docs"         },
                  ],
                },
                {
                  id: "company", label: t('landing.nav.company'),
                  links: [
                    { label: t('landing.nav.company_menu.sponsors_label'), href: "/sponsors"          },
                    { label: t('landing.nav.company_menu.blog_label'),     href: "/blog"              },
                    { label: t('landing.nav.company_menu.community_label'),href: "/community"         },
                  ],
                },
              ].map(section => (
                <div key={section.id} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                  <button
                    onClick={() => setMobileSection(mobileSection === section.id ? null : section.id)}
                    className="flex items-center justify-between w-full px-3 py-3.5 text-sm font-bold text-gray-700 dark:text-gray-300">
                    {section.label}
                    <ChevronDown size={15} className={`transition-transform text-gray-400 ${mobileSection === section.id ? "rotate-180" : ""}`} />
                  </button>
                  {mobileSection === section.id && (
                    <div className="pb-2 pl-4 space-y-0.5">
                      {section.links.map(link => (
                        <Link key={link.href + link.label} href={link.href}
                          onClick={() => { setMobileMenuOpen(false); setMobileSection(null); }}
                          className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all font-medium">
                          <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 shrink-0" />{link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Direct links */}
              <div className="pt-3 space-y-0.5">
                <Link href="/docs" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-3 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all">
                  {t('landing.nav.mobile.docs')}
                </Link>
                {session && (
                  <Link href="/dash" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center px-3 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all">
                    {t('landing.nav.mobile.dashboard')}
                  </Link>
                )}
              </div>

              {/* CTA */}
              <div className="pt-4 flex flex-col gap-2">
                {!session && (
                  <Link href="/auth" onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-bold rounded-xl text-sm border border-gray-200 dark:border-white/10">
                    {t('landing.nav.mobile.sign_in')}
                  </Link>
                )}
                <Link href={session ? "/dash" : "/auth"} onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2">
                  {session ? t('landing.nav.mobile.open_dashboard') : t('landing.nav.mobile.get_started_free')} <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* ── Hero ────────────────────────────── */}
        <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden">

          {/* Orbs — decorative, never clip content */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
            <div className="animate-orb1 absolute -top-20 left-[5%] w-[500px] h-[500px] rounded-full bg-brand-400/20 dark:bg-brand-500/10 blur-[100px]" />
            <div className="animate-orb2 absolute top-[10%] right-0 w-[400px] h-[400px] rounded-full bg-violet-400/20 dark:bg-violet-500/10 blur-[100px]" />
            <div className="animate-orb3 absolute bottom-0 left-[30%] w-[350px] h-[350px] rounded-full bg-indigo-400/15 dark:bg-indigo-500/8 blur-[120px]" />
          </div>

          {/* Floating badges — xl only so they never cover the centered text */}
          <div className="absolute inset-0 pointer-events-none hidden xl:block" style={{ zIndex: 0 }}>
            {/* Connection request */}
            <div className="animate-float absolute top-[22%] left-[6%] xl:left-[10%] animate-badge-pop" style={{ animationDelay: "1.2s" }}>
              <div className="flex items-center gap-2.5 bg-white/90 dark:bg-[#0f1723]/90 border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl px-3.5 py-2.5 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 shrink-0">
                  <UserPlus size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{t('landing.hero.badges.connection_title')}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('landing.hero.badges.connection_desc')}</p>
                </div>
              </div>
            </div>

            {/* Endorsement */}
            <div className="animate-float2 absolute top-[35%] right-[5%] xl:right-[9%] animate-badge-pop" style={{ animationDelay: "1.5s" }}>
              <div className="flex items-center gap-2.5 bg-white/90 dark:bg-[#0f1723]/90 border border-violet-200 dark:border-violet-700/40 rounded-2xl shadow-xl px-3.5 py-2.5 backdrop-blur-sm max-w-[210px]">
                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 shrink-0">
                  <CheckCircle2 size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{t('landing.hero.badges.endorse_title')}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('landing.hero.badges.endorse_desc')}</p>
                </div>
              </div>
            </div>

            {/* Job match */}
            <div className="animate-float3 absolute bottom-[28%] left-[7%] xl:left-[12%] animate-badge-pop" style={{ animationDelay: "1.8s" }}>
              <div className="flex items-center gap-2.5 bg-white/90 dark:bg-[#0f1723]/90 border border-emerald-200 dark:border-emerald-700/40 rounded-2xl shadow-xl px-3.5 py-2.5 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 shrink-0">
                  <Briefcase size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{t('landing.hero.badges.job_title')}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('landing.hero.badges.job_desc')}</p>
                </div>
              </div>
            </div>

            {/* Project shipped */}
            <div className="animate-float absolute bottom-[20%] right-[6%] xl:right-[11%] animate-badge-pop" style={{ animationDelay: "2.1s" }}>
              <div className="flex items-center gap-2.5 bg-white/90 dark:bg-[#0f1723]/90 border border-amber-200 dark:border-amber-700/40 rounded-2xl shadow-xl px-3.5 py-2.5 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 shrink-0">
                  <Star size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{t('landing.hero.badges.project_title')}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('landing.hero.badges.project_desc')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hero content */}
          <div className={`relative text-center max-w-4xl mx-auto transition-all duration-1000 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ zIndex: 10 }}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 text-brand-600 dark:text-brand-300 text-xs font-black uppercase tracking-widest mb-8"
              style={{ animationDelay: "0.2s" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              {t('landing.hero.badge')}
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] mb-6">
              <span className="block text-gray-900 dark:text-white">{t('landing.hero.headline_pre')}</span>
              <span className="block mt-1"><span className="gradient-text inline-block pb-1">{typeText || " "}</span><span className="cursor-blink text-brand-500 font-light">|</span></span>
              <span className="block text-gray-900 dark:text-white">{t('landing.hero.headline_post')}</span>
            </h1>

            {/* Sub */}
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto font-medium leading-relaxed mb-8">
              {t('landing.hero.subtitle')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <Link href={authLink(session, "/dash")}
                className="w-full sm:w-auto group flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-7 py-3.5 rounded-2xl text-sm font-black shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-105 transition-all duration-200">
                {session ? t('landing.hero.cta_dashboard') : t('landing.hero.cta_join')}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/for-institutions"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-900 dark:text-white px-7 py-3.5 rounded-2xl text-sm font-bold hover:scale-105 transition-all duration-200 shadow-sm">
                <Briefcase size={14} className="text-brand-500" /> {t('landing.hero.cta_orgs')}
              </Link>
            </div>

            {/* Trust bar */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-500">
              {["landing.hero.trust.free", "landing.hero.trust.all_professions", "landing.hero.trust.no_spam", "landing.hero.trust.verified", "landing.hero.trust.global"].map((key) => (
                <span key={key} className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />{t(key)}
                </span>
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          <div className={`mt-14 flex flex-col items-center gap-1.5 transition-all duration-1000 delay-1000 ${heroVisible ? "opacity-100" : "opacity-0"}`}>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">{t('landing.hero.scroll')}</p>
            <ChevronRight size={16} className="text-gray-400 dark:text-gray-600 rotate-90 animate-bounce" />
          </div>
        </section>

        {/* ── Stats bar ───────────────────────── */}
        <StatsBar stats={liveStats} pageViews={pageViews} />

        {/* ── Sponsors strip ──────────────────── */}
        <SponsorsStrip sponsors={sponsors} />

        {/* ── What is beoneofus ───────────────── */}
        <WhatIsSection />

        {/* ── Feature bento grid ──────────────── */}
        <FeatureBento features={FEATURES} />

        {/* ── How it works ────────────────────── */}
        <HowItWorksSection steps={STEPS} />

        {/* ── Community ───────────────────────── */}
        <CommunitySection communities={COMMUNITIES} session={session} />

        {/* ── Testimonials ────────────────────── */}
        <TestimonialsSection testimonials={testimonials} session={session} profile={profile} />

        {/* ── Premium CTA ─────────────────────── */}
        <PremiumSection session={session} />

        {/* ── Final CTA ───────────────────────── */}
        <FinalCTA session={session} />

        {/* ── Footer ──────────────────────────── */}
        <Footer session={session} />

        {/* Auth error toast */}
        {authError && (
          <div className="fixed bottom-6 right-4 sm:right-6 z-50 bg-white dark:bg-[#0f1723] border border-red-200 dark:border-red-800/50 shadow-2xl rounded-2xl p-4 max-w-xs flex items-start gap-3 animate-fade-up">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl text-red-600 shrink-0"><AlertTriangle size={18} /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{t('landing.toast.session_notice')}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{authError === "__AUTH_FAILED__" ? t('landing.toast.auth_failed') : authError}</p>
            </div>
            <button onClick={() => setAuthError(null)} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"><X size={15} /></button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Sub-sections ─────────────────────────────────────────── */

function StatsBar({ stats, pageViews }) {
  const { t } = useLanguage();
  const [ref, visible] = useIntersect();
  return (
    <div ref={ref} className="relative z-10 border-y border-gray-200 dark:border-white/5 bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 lg:grid-cols-5 gap-8">
        {stats.map((s, i) => (
          <div key={s.label} className={`text-center reveal ${visible ? "visible" : ""} reveal-delay-${i + 1}`}>
            <p className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
              <AnimatedCounter to={s.value} suffix={s.suffix} />
            </p>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-500 mt-1">{t(s.label)}</p>
          </div>
        ))}
        {/* Live page view counter */}
        <div className={`text-center reveal ${visible ? "visible" : ""} reveal-delay-5`}>
          <p className="text-3xl sm:text-4xl font-black text-brand-600 dark:text-brand-400 tracking-tighter">
            {pageViews != null
              ? <AnimatedCounter to={pageViews} suffix="" />
              : <span className="animate-pulse text-gray-300 dark:text-gray-700">—</span>}
          </p>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-500 mt-1 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            {t('landing.stats.platform_visits')}
          </p>
        </div>
      </div>
    </div>
  );
}

const TIER_LABEL = { gold: "landing.sponsors.tier_gold", silver: "landing.sponsors.tier_silver", bronze: "landing.sponsors.tier_bronze" };
const TIER_COLOR = { gold: "text-yellow-500", silver: "text-slate-400", bronze: "text-orange-500" };
const TIER_ORDER = { gold: 0, silver: 1, bronze: 2 };

function SponsorsStrip({ sponsors }) {
  const { t } = useLanguage();
  const [ref, visible] = useIntersect();
  if (!sponsors.length) return null;

  const sorted = [...sponsors].sort(
    (a, b) => (TIER_ORDER[a.tier] ?? 3) - (TIER_ORDER[b.tier] ?? 3)
  );

  return (
    <section ref={ref} className={`relative z-10 border-b border-gray-200 dark:border-white/5 bg-white/60 dark:bg-white/[0.015] py-12 px-4 reveal ${visible ? "visible" : ""}`}>
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-10">
          {t('landing.sponsors.heading')}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-14">
          {sorted.map((s) => (
            <a
              key={s.id}
              href={s.website || "#"}
              target="_blank"
              rel="noopener noreferrer"
              title={s.company_name}
              className="group flex flex-col items-center gap-2 transition-all duration-200 hover:-translate-y-1"
            >
              {s.logo_url ? (
                <Image
                  src={s.logo_url}
                  alt={s.company_name}
                  width={130}
                  height={44}
                  unoptimized
                  className="h-9 sm:h-11 w-auto max-w-[130px] object-contain opacity-50 dark:opacity-35 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-300"
                />
              ) : (
                <div className="h-10 px-5 flex items-center bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white group-hover:border-gray-300 dark:group-hover:border-white/20 transition-all">
                  {s.company_name}
                </div>
              )}
              <span className={`text-[9px] font-black uppercase tracking-widest ${TIER_COLOR[s.tier] ?? "text-gray-400"}`}>
                {TIER_LABEL[s.tier] ? t(TIER_LABEL[s.tier]) : s.tier}
              </span>
            </a>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/sponsors"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-gray-600 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <Handshake size={12} /> {t('landing.sponsors.become_sponsor')}
          </Link>
        </div>
      </div>
    </section>
  );
}

function WhatIsSection() {
  const { t } = useLanguage();
  const [ref, visible] = useIntersect();
  return (
    <section ref={ref} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
      <div className={`text-center mb-16 reveal ${visible ? "visible" : ""}`}>
        <p className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-3">{t('landing.what_is.eyebrow')}</p>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-gray-900 dark:text-white leading-tight mb-6">
          {t('landing.what_is.title_line1')}<br />
          <span className="text-gray-400 dark:text-gray-600">{t('landing.what_is.title_line2')}</span>
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto font-medium">
          {t('landing.what_is.subtitle')}
        </p>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 reveal ${visible ? "visible" : ""} reveal-delay-2`}>
        {[
          { icon: <TrendingUp size={20} />, title: t('landing.what_is.cards.growth_title'), desc: t('landing.what_is.cards.growth_desc'), c: "text-brand-600 bg-brand-50 dark:bg-brand-900/20" },
          { icon: <Users size={20} />, title: t('landing.what_is.cards.network_title'), desc: t('landing.what_is.cards.network_desc'), c: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
          { icon: <Briefcase size={20} />, title: t('landing.what_is.cards.work_title'), desc: t('landing.what_is.cards.work_desc'), c: "text-violet-600 bg-violet-50 dark:bg-violet-900/20" },
          { icon: <Shield size={20} />, title: t('landing.what_is.cards.safe_title'), desc: t('landing.what_is.cards.safe_desc'), c: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" },
          { icon: <Code2 size={20} />, title: t('landing.what_is.cards.build_title'), desc: t('landing.what_is.cards.build_desc'), c: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
          { icon: <Globe size={20} />, title: t('landing.what_is.cards.global_title'), desc: t('landing.what_is.cards.global_desc'), c: "text-rose-600 bg-rose-50 dark:bg-rose-900/20" },
        ].map((item, i) => (
          <div key={i} className="group flex items-start gap-4 p-5 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl hover:border-brand-300 dark:hover:border-brand-700/50 hover:shadow-lg transition-all duration-300 card-glow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.c} group-hover:scale-110 transition-transform`}>{item.icon}</div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureBento({ features }) {
  const { t } = useLanguage();
  const [ref, visible] = useIntersect();
  return (
    <section className="bg-gray-50 dark:bg-white/[0.015] border-y border-gray-200 dark:border-white/5 py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className={`text-center mb-16 reveal ${visible ? "visible" : ""}`}>
          <p className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-3">{t('landing.features.eyebrow')}</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 dark:text-white mb-4">
            {t('landing.features.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 font-medium max-w-xl mx-auto">{t('landing.features.subtitle')}</p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
          {features.map((f, i) => (
            <FeatureCard key={f.label} feature={f} delay={i * 0.1} parentVisible={visible} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature: f, delay, parentVisible }) {
  const { t } = useLanguage();
  return (
    <div
      className={`group relative bg-white dark:bg-[#0f1723] border ${f.border} rounded-3xl p-6 hover:shadow-xl transition-all duration-500 cursor-default overflow-hidden card-glow reveal ${parentVisible ? "visible" : ""}`}
      style={{ transitionDelay: `${delay}s` }}>

      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-60 group-hover:opacity-100 transition-opacity rounded-3xl`} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${f.icon_bg} group-hover:scale-110 transition-transform`}>
            {f.icon}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${f.tag_color}`}>
            {t(f.tag)}
          </span>
        </div>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">{t(f.label)}</p>
        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 leading-snug">{t(f.title)}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t(f.desc)}</p>

        <div className="mt-5 flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {t('landing.features.explore')} <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}

function HowItWorksSection({ steps }) {
  const { t } = useLanguage();
  const [ref, visible] = useIntersect();
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
      <div ref={ref} className={`text-center mb-16 reveal ${visible ? "visible" : ""}`}>
        <p className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-3">{t('landing.how.eyebrow')}</p>
        <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 dark:text-white mb-4">
          {t('landing.how.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 font-medium">{t('landing.how.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {steps.map((step, i) => (
          <div
            key={step.n}
            className={`relative bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-3xl p-6 hover:border-gray-300 dark:hover:border-white/10 hover:shadow-lg transition-all duration-300 reveal ${visible ? "visible" : ""} reveal-delay-${i + 1}`}>

            {/* Connector line (desktop) */}
            {i < steps.length - 1 && (
              <div className="hidden lg:block absolute top-[52px] right-[-28px] w-7 border-t-2 border-dashed border-gray-200 dark:border-white/10 z-10" />
            )}

            <div className={`w-10 h-10 rounded-2xl ${step.bg} flex items-center justify-center text-white mb-4 shadow-lg`}>
              {step.icon}
            </div>
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">{t('landing.how.step', { n: step.n })}</span>
            <h3 className="text-base font-black text-gray-900 dark:text-white mt-1 mb-2">{t(step.title)}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t(step.desc)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CommunitySection({ communities, session }) {
  const { t } = useLanguage();
  const [ref, visible] = useIntersect();
  return (
    <section className="bg-gray-50 dark:bg-white/[0.015] border-t border-gray-200 dark:border-white/5 py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className={`text-center mb-16 reveal ${visible ? "visible" : ""}`}>
          <p className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-3">{t('landing.community.eyebrow')}</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 dark:text-white mb-4">
            {t('landing.community.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 font-medium">{t('landing.community.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.map((c, i) => (
            <div
              key={c.name}
              className={`group flex items-start gap-5 bg-white dark:bg-[#0f1723] border border-gray-200 dark:border-white/5 rounded-3xl p-6 hover:border-brand-300 dark:hover:border-brand-700/40 hover:shadow-xl transition-all duration-300 cursor-pointer card-glow reveal ${visible ? "visible" : ""} reveal-delay-${Math.min(i + 1, 5)}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${c.color} group-hover:scale-110 transition-transform`}>
                {c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-black text-gray-900 dark:text-white text-base truncate">{t(c.name)}</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t(c.desc)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`text-center mt-10 reveal ${visible ? "visible" : ""} reveal-delay-5`}>
          <Link href={authLink(session, "/dash/groups")} className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-700/50 text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 rounded-2xl font-bold text-sm transition-all shadow-sm hover:shadow-md">
            {t('landing.community.see_all')} <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PremiumSection({ session }) {
  const { t } = useLanguage();
  const [ref, visible] = useIntersect();
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
      <div ref={ref}
        className={`relative bg-gradient-to-br from-brand-600 via-indigo-600 to-violet-700 rounded-[2.5rem] overflow-hidden p-8 sm:p-12 lg:p-16 reveal ${visible ? "visible" : ""}`}>

        {/* bg decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-violet-400/20 rounded-full blur-3xl" />
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-white text-xs font-black uppercase tracking-widest mb-5">
              <Sparkles size={12} /> {t('landing.premium.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter mb-4 leading-tight">
              {t('landing.premium.title_line1')}<br />{t('landing.premium.title_line2')}
            </h2>
            <p className="text-brand-100 font-medium max-w-md leading-relaxed">
              {t('landing.premium.desc')}
            </p>

            <div className="grid grid-cols-2 gap-2.5 mt-6">
              {[
                "landing.premium.perks.jobs",
                "landing.premium.perks.analytics",
                "landing.premium.perks.badge",
                "landing.premium.perks.early",
              ].map((perk) => (
                <div key={perk} className="flex items-center gap-2 text-sm text-brand-100">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  {t(perk)}
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-6 sm:p-8 text-center min-w-[200px]">
            <p className="text-brand-200 text-sm font-semibold mb-1">{t('landing.premium.starting_from')}</p>
            <p className="text-5xl font-black text-white mb-1">$9<span className="text-2xl text-brand-200">.99</span></p>
            <p className="text-brand-300 text-xs font-semibold mb-6">{t('landing.premium.per_month')}</p>
            <Link href={authLink(session, "/dash/premium")}
              className="block w-full bg-white hover:bg-gray-50 text-brand-600 font-black py-3.5 rounded-2xl text-sm transition-all shadow-xl hover:shadow-2xl hover:scale-105">
              {session ? t('landing.premium.upgrade') : t('landing.premium.get_premium')}
            </Link>
            <p className="text-brand-300 text-xs mt-3">{t('landing.premium.cancel_anytime')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ session }) {
  const { t } = useLanguage();
  const [ref, visible] = useIntersect();
  return (
    <section className="border-t border-gray-200 dark:border-white/5 py-24 sm:py-32 bg-white dark:bg-[#080c12]">
      <div ref={ref} className={`max-w-3xl mx-auto px-4 sm:px-6 text-center reveal ${visible ? "visible" : ""}`}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-brand-500/30 bg-gradient-to-br from-brand-500 to-trust-500">
          <svg width="30" height="30" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 9 4 4.5M9 9l5-4.5M9 9v6" stroke="#fff" strokeWidth="1.3" opacity=".85"/>
            <circle cx="9" cy="9" r="2.4" fill="#fff"/>
            <circle cx="4" cy="4.5" r="1.6" fill="#fff" opacity=".92"/>
            <circle cx="14" cy="4.5" r="1.6" fill="#fff" opacity=".92"/>
            <circle cx="9" cy="15" r="1.6" fill="#fff" opacity=".92"/>
          </svg>
        </div>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-gray-900 dark:text-white mb-6">
          {t('landing.final.title_line1')}<br />{t('landing.final.title_line2')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-10 max-w-xl mx-auto">
          {t('landing.final.desc')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={authLink(session, "/dash")}
            className="w-full sm:w-auto group flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-10 py-4 rounded-2xl text-lg font-black shadow-2xl shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-105 transition-all duration-200">
            {session ? t('landing.final.cta_dashboard') : t('landing.final.cta_create')}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <p className="text-gray-400 dark:text-gray-600 text-sm mt-5">{t('landing.final.note')}</p>
      </div>
    </section>
  );
}

const AVATAR_COLORS = [
  "bg-brand-100 dark:bg-brand-900/40 text-brand-600",
  "bg-violet-100 dark:bg-violet-900/40 text-violet-600",
  "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600",
  "bg-amber-100 dark:bg-amber-900/40 text-amber-600",
  "bg-rose-100 dark:bg-rose-900/40 text-rose-600",
  "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600",
];

function avatarColor(id) {
  return AVATAR_COLORS[(id?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

/* ── Mini card used in the marquee ─────────── */
function MarqueeCard({ t }) {
  const initials = t.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colorClass = avatarColor(t.id);
  return (
    <div className="mx-2 w-72 shrink-0 bg-white dark:bg-[#0f1723] border border-gray-100 dark:border-white/5 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-0.5 mb-2">
        {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
          <Star key={i} size={11} className="text-amber-400 fill-amber-400" />
        ))}
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 mb-3">
        &ldquo;{t.content}&rdquo;
      </p>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden relative ${t.avatar_url ? "" : colorClass}`}>
          {t.avatar_url
            ? <Image src={t.avatar_url} alt={t.name} fill className="object-cover" sizes="28px" />
            : initials}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-gray-900 dark:text-white truncate leading-none">{t.name}</p>
          {(t.role || t.company) && (
            <p className="text-[10px] text-gray-400 dark:text-gray-600 truncate mt-0.5">{t.role}{t.company ? ` · ${t.company}` : ""}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TestimonialsSection({ testimonials: initial, session, profile }) {
  const { t } = useLanguage();
  const [sectionRef, visible] = useIntersect();
  const [items, setItems] = useState(initial);
  const [liveCount, setLiveCount] = useState(0);
  const [prevInitial, setPrevInitial] = useState(initial);

  /* sync with incoming server data when it changes (adjust state during render) */
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setItems(initial);
  }

  /* real-time subscription */
  useEffect(() => {
    const channel = supabase
      .channel("testimonials-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "testimonials" },
        (payload) => {
          setItems((prev) => [payload.new, ...prev].slice(0, 12));
          setLiveCount((n) => n + 1);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  /* form state */
  const [content, setContent] = useState("");
  const [role, setRole] = useState(profile?.role ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) { setFormError(t('landing.testimonials.err_empty')); return; }
    setSubmitting(true);
    setFormError("");
    const { error } = await supabase.from("testimonials").insert({
      user_id: session.user.id,
      name: profile?.full_name || profile?.username || "Anonymous",
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      role: role.trim() || null,
      company: company.trim() || null,
      content: content.trim(),
      rating,
      is_featured: false,
    });
    setSubmitting(false);
    if (error) { setFormError(t('landing.testimonials.err_generic')); return; }
    setSubmitted(true);
    setContent(""); setRole(""); setCompany(""); setRating(5);
  };

  /* split for two marquee rows */
  const half = Math.ceil(items.length / 2);
  const rowA = items.slice(0, half);
  const rowB = items.slice(half);

  return (
    <section className="py-24 sm:py-32 overflow-hidden">
      {/* Heading */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={sectionRef} className={`text-center mb-12 reveal ${visible ? "visible" : ""}`}>
          <p className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-3">{t('landing.testimonials.eyebrow')}</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 dark:text-white mb-4">
            {t('landing.testimonials.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 font-medium max-w-xl mx-auto">
            {t('landing.testimonials.subtitle')}
          </p>
          {liveCount > 0 && (
            <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 rounded-full text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('landing.testimonials.new_since', { n: liveCount })}
            </div>
          )}
        </div>
      </div>

      {/* Marquee rows — full bleed */}
      {items.length > 0 ? (
        <div className="space-y-3 mb-16">
          {/* Row 1 — scrolls left */}
          <div className="relative marquee-track">
            <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-[#fafafa] dark:from-[#080c12] to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-[#fafafa] dark:from-[#080c12] to-transparent pointer-events-none" />
            <div className="flex animate-marquee-left will-change-transform">
              {[...rowA, ...rowA].map((t, i) => <MarqueeCard key={`a-${i}`} t={t} />)}
            </div>
          </div>
          {/* Row 2 — scrolls right */}
          {rowB.length > 0 && (
            <div className="relative marquee-track">
              <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-[#fafafa] dark:from-[#080c12] to-transparent pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-[#fafafa] dark:from-[#080c12] to-transparent pointer-events-none" />
              <div className="flex animate-marquee-right will-change-transform">
                {[...rowB, ...rowB].map((t, i) => <MarqueeCard key={`b-${i}`} t={t} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 mb-16 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-5">
            <MessageSquare size={28} className="text-gray-400 dark:text-gray-600" />
          </div>
          <p className="text-lg font-black text-gray-900 dark:text-white mb-2">{t('landing.testimonials.empty_title')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">{t('landing.testimonials.empty_desc')}</p>
        </div>
      )}

      {/* Masonry grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {items.length > 0 && (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 mb-16">
            {items.map((t, i) => (
              <TestimonialCard key={t.id} testimonial={t} delay={i * 0.08} parentVisible={visible} session={session} onDelete={(id) => setItems((prev) => prev.filter((x) => x.id !== id))} onUpdate={(updated) => setItems((prev) => prev.map((x) => x.id === updated.id ? updated : x))} />
            ))}
          </div>
        )}

        {/* Submission form */}
        <div className={`reveal ${visible ? "visible" : ""} reveal-delay-3`}>
          <div className="max-w-2xl mx-auto bg-white dark:bg-[#0f1723] border border-gray-200 dark:border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-100/60 dark:shadow-none">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600">
                <MessageSquare size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">{t('landing.testimonials.form_title')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('landing.testimonials.form_subtitle')}</p>
              </div>
            </div>

            {!session ? (
              <div className="text-center py-8">
                <Lock size={28} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">{t('landing.testimonials.signin_prompt')}</p>
                <Link href="/auth"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-500/25 hover:scale-105">
                  {t('landing.testimonials.sign_in')} <ArrowRight size={14} />
                </Link>
              </div>
            ) : submitted ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4 animate-badge-pop">
                  <CheckCircle2 size={26} className="text-emerald-500" />
                </div>
                <p className="font-black text-gray-900 dark:text-white text-lg mb-1">{t('landing.testimonials.thanks_title')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('landing.testimonials.thanks_desc')}</p>
                <button onClick={() => setSubmitted(false)}
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                  {t('landing.testimonials.submit_another')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Star rating */}
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 block mb-2">{t('landing.testimonials.rating')}</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n} type="button"
                        onMouseEnter={() => setHovered(n)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setRating(n)}
                        className="p-0.5 transition-transform hover:scale-125 active:scale-95">
                        <Star
                          size={24}
                          className={`transition-all duration-150 ${n <= (hovered || rating) ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" : "text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700"}`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold text-gray-400 dark:text-gray-600">
                      {["", t('landing.testimonials.rating_words.poor'), t('landing.testimonials.rating_words.fair'), t('landing.testimonials.rating_words.good'), t('landing.testimonials.rating_words.great'), t('landing.testimonials.rating_words.excellent')][hovered || rating]}
                    </span>
                  </div>
                </div>

                {/* Role + Company */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 block mb-1.5">{t('landing.testimonials.role')}</label>
                    <input
                      type="text" value={role} onChange={(e) => setRole(e.target.value)}
                      placeholder={t('landing.testimonials.role_ph')}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 block mb-1.5">{t('landing.testimonials.company')}</label>
                    <input
                      type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                      placeholder={t('landing.testimonials.company_ph')}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 transition-all"
                    />
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 block mb-1.5">
                    {t('landing.testimonials.story')} <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={content} onChange={(e) => setContent(e.target.value)}
                    rows={4} maxLength={400}
                    placeholder={t('landing.testimonials.story_ph')}
                    className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 transition-all resize-none"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span />
                    <span className={`text-[11px] font-mono transition-colors ${content.length > 360 ? "text-amber-500" : "text-gray-400 dark:text-gray-600"}`}>
                      {content.length}/400
                    </span>
                  </div>
                </div>

                {formError && (
                  <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5 animate-fade-in">
                    <AlertTriangle size={13} /> {formError}
                  </p>
                )}

                <button
                  type="submit" disabled={submitting || !content.trim()}
                  className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl text-sm transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/35 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                  {submitting ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('landing.testimonials.submitting')}</>
                  ) : (
                    <><MessageSquare size={15} /> {t('landing.testimonials.submit')}</>
                  )}
                </button>
                <p className="text-[11px] text-center text-gray-400 dark:text-gray-600">
                  {t('landing.testimonials.reviewed')}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial: t, delay, parentVisible, session, onDelete, onUpdate }) {
  const { t: tr } = useLanguage();
  const initials = t.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colorClass = avatarColor(t.id);
  const isOwner = session?.user?.id && t.user_id === session.user.id;
  const [imgError, setImgError] = useState(false);
  const [prevAvatar, setPrevAvatar] = useState(t.avatar_url);
  /* reset error state when the avatar changes (adjust state during render) */
  if (t.avatar_url !== prevAvatar) {
    setPrevAvatar(t.avatar_url);
    setImgError(false);
  }


  /* edit state */
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(t.content);
  const [editRole, setEditRole] = useState(t.role ?? "");
  const [editCompany, setEditCompany] = useState(t.company ?? "");
  const [editRating, setEditRating] = useState(t.rating ?? 5);
  const [editHovered, setEditHovered] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    const updates = {
      content: editContent.trim(),
      role: editRole.trim() || null,
      company: editCompany.trim() || null,
      rating: editRating,
    };
    const { error } = await supabase.from("testimonials").update(updates).eq("id", t.id);
    setSaving(false);
    if (!error) { onUpdate({ ...t, ...updates }); setEditing(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("testimonials").delete().eq("id", t.id);
    setDeleting(false);
    if (!error) onDelete(t.id);
  };

  return (
    <div
      className={`break-inside-avoid group bg-white dark:bg-[#0f1723] border rounded-3xl p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 card-glow reveal ${editing ? "border-brand-400 dark:border-brand-500/50" : "border-gray-200 dark:border-white/5 hover:border-brand-300 dark:hover:border-brand-700/40"} ${parentVisible ? "visible" : ""}`}
      style={{ transitionDelay: `${delay}s` }}>

      {editing ? (
        /* ── Edit mode ── */
        <div className="space-y-3">
          {/* Star picker */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button"
                onMouseEnter={() => setEditHovered(n)} onMouseLeave={() => setEditHovered(0)}
                onClick={() => setEditRating(n)}
                className="p-0.5 hover:scale-125 transition-transform">
                <Star size={18} className={`transition-colors ${n <= (editHovered || editRating) ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700"}`} />
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={editRole} onChange={(e) => setEditRole(e.target.value)} placeholder={tr('landing.testimonials.role')}
              className="px-3 py-2 text-xs bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            <input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder={tr('landing.testimonials.company')}
              className="px-3 py-2 text-xs bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} maxLength={400}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving || !editContent.trim()}
              className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5">
              {saving ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={13} />}
              {tr('landing.testimonials.save')}
            </button>
            <button onClick={() => setEditing(false)}
              className="flex-1 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all">
              {tr('landing.testimonials.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Stars + owner actions */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
            {isOwner && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all"
                  title={tr('landing.testimonials.edit_title')}>
                  <Pencil size={13} />
                </button>
                {confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button onClick={handleDelete} disabled={deleting}
                      className="px-2 py-1 text-[10px] font-black bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all flex items-center gap-1">
                      {deleting ? <span className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full animate-spin" /> : null}
                      {tr('landing.testimonials.confirm')}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-[10px] font-bold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-lg">
                      {tr('landing.testimonials.no')}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    title={tr('landing.testimonials.delete_title')}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quote */}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-5">
            &ldquo;{t.content}&rdquo;
          </p>

          {/* Author */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden relative ${t.avatar_url && !imgError ? "" : colorClass} group-hover:scale-105 transition-transform`}>
              {t.avatar_url && !imgError
                ? <Image src={t.avatar_url} alt={t.name} fill className="object-cover" sizes="40px" onError={() => setImgError(true)} />
                : initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 dark:text-white truncate">{t.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {t.role}{t.company ? ` · ${t.company}` : ""}
              </p>
            </div>
            {t.username && (
              <span className="ml-auto shrink-0 text-[10px] font-bold text-gray-400 dark:text-gray-600">@{t.username}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Footer({ session }) {
  const { t } = useLanguage();
  const cols = [
    { title: t('landing.footer.platform_heading'), links: [
      { label: t('landing.footer.platform.explore'), href: "/Explore_Projects" },
      { label: t('landing.footer.platform.job_board'), href: authLink(session, "/dash/marketplace") },
      { label: t('landing.footer.platform.projects'), href: authLink(session, "/projects") },
      { label: t('landing.footer.platform.connections'), href: authLink(session, "/dash/connections") },
      { label: t('landing.footer.platform.premium'), href: authLink(session, "/dash/premium") },
    ]},
    { title: t('landing.footer.company_heading'), links: [
      { label: t('landing.footer.company.institutions'), href: "/for-institutions" },
      { label: t('landing.footer.company.education_portal'), href: CORE_URL, external: true },
      { label: t('landing.footer.company.vision'), href: "/vision" },
      { label: t('landing.footer.company.roadmap'), href: "/roadmap" },
      { label: t('landing.footer.company.growth'), href: "/growth" },
      { label: t('landing.footer.company.organizations'), href: "/organizations" },
      { label: t('landing.footer.company.how'), href: "/how_it_works" },
      { label: t('landing.footer.company.partnerships'), href: authLink(session, "/dash/partnerships") },
      { label: t('landing.footer.company.docs'), href: "/docs" },
      { label: t('landing.footer.company.blog'), href: "/blog" },
    ]},
    { title: t('landing.footer.account_heading'), links: [
      { label: t('landing.footer.account.signup'), href: "/auth" },
      { label: t('landing.footer.account.login'), href: "/auth" },
      { label: t('landing.footer.account.premium'), href: authLink(session, "/dash/premium") },
      { label: t('landing.footer.account.dashboard'), href: authLink(session, "/dash") },
    ]},
  ];
  return (
    <footer className="border-t border-gray-200 dark:border-white/5 bg-white dark:bg-[#080c12]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 w-fit">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-brand-500 to-trust-500">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M9 9 4 4.5M9 9l5-4.5M9 9v6" stroke="#fff" strokeWidth="1.3" opacity=".85"/>
                  <circle cx="9" cy="9" r="2.4" fill="#fff"/>
                  <circle cx="4" cy="4.5" r="1.6" fill="#fff" opacity=".92"/>
                  <circle cx="14" cy="4.5" r="1.6" fill="#fff" opacity=".92"/>
                  <circle cx="9" cy="15" r="1.6" fill="#fff" opacity=".92"/>
                </svg>
              </div>
              <span className="font-black text-xl tracking-tight text-gray-900 dark:text-white">
                beone<span className="text-trust-500">of</span>us
              </span>
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-[220px]">
              {t('landing.footer.tagline')}
            </p>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map(({ label, href, external }) => (
                  <li key={label}>
                    {external ? (
                      <a href={href} className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-medium">
                        {label}
                      </a>
                    ) : (
                      <Link href={href} className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-medium">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 dark:text-gray-600 font-mono">
            {t('landing.footer.rights', { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">{t('landing.footer.systems_operational')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
