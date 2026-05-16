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
  Play, Shield, ChevronRight, Award, Cpu, Pencil, Trash2,
} from "lucide-react";
import FloatingAiAssistant from "./components/FloatingAiAssistant";

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
    icon: <Bot size={22} />,
    label: "AI Assistant",
    title: "Your 24/7 Career & Code Partner",
    desc: "Get instant code reviews, interview prep, system design help, and career guidance from beoneofus AI — powered by GPT-4o and Groq.",
    color: "from-violet-500/10 to-violet-600/5",
    border: "border-violet-200 dark:border-violet-800/40",
    icon_bg: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
    tag: "Always On",
    tag_color: "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-700/40",
    size: "lg",
  },
  {
    icon: <Briefcase size={22} />,
    label: "Jobs Board",
    title: "Find Your Next Role",
    desc: "Browse curated dev jobs from verified companies. Apply in one click with your beoneofus profile.",
    color: "from-blue-500/10 to-blue-600/5",
    border: "border-blue-200 dark:border-blue-800/40",
    icon_bg: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    tag: "300+ Openings",
    tag_color: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700/40",
    size: "sm",
  },
  {
    icon: <GraduationCap size={22} />,
    label: "Mentorship",
    title: "Learn From Real Engineers",
    desc: "Book 1-on-1 sessions with senior engineers and founders. Premium members get unlimited bookings.",
    color: "from-emerald-500/10 to-emerald-600/5",
    border: "border-emerald-200 dark:border-emerald-800/40",
    icon_bg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    tag: "Premium",
    tag_color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/40",
    size: "sm",
  },
  {
    icon: <BookOpen size={22} />,
    label: "Courses",
    title: "AI-Generated Learning Paths",
    desc: "Take AI-built courses tailored to your skill level. Each lesson generated fresh with hands-on exams.",
    color: "from-amber-500/10 to-amber-600/5",
    border: "border-amber-200 dark:border-amber-800/40",
    icon_bg: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    tag: "Self-paced",
    tag_color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700/40",
    size: "sm",
  },
  {
    icon: <Handshake size={22} />,
    label: "Connections",
    title: "Build Your Network the Right Way",
    desc: "Mutual-consent DMs, developer profiles with GitHub links, skill endorsements, and verified identities.",
    color: "from-indigo-500/10 to-indigo-600/5",
    border: "border-indigo-200 dark:border-indigo-800/40",
    icon_bg: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
    tag: "Private & Safe",
    tag_color: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700/40",
    size: "lg",
  },
  {
    icon: <Award size={22} />,
    label: "Coaching",
    title: "Structured Coaching Sessions",
    desc: "Request coaching on any topic — from React architecture to salary negotiation. Scheduled, tracked, and actionable.",
    color: "from-rose-500/10 to-rose-600/5",
    border: "border-rose-200 dark:border-rose-800/40",
    icon_bg: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
    tag: "On Demand",
    tag_color: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-700/40",
    size: "sm",
  },
];

const STEPS = [
  { n: "01", icon: <UserPlus size={20} />, title: "Build Your Profile", desc: "Add your stack, link GitHub, get verified. Your profile IS your resume.", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-600" },
  { n: "02", icon: <Handshake size={20} />, title: "Connect & Collaborate", desc: "Send connection requests. Once accepted, a secure DM channel opens.", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-600" },
  { n: "03", icon: <Briefcase size={20} />, title: "Apply & Get Hired", desc: "Browse dev jobs tailored to your stack. One-click apply with your profile.", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-600" },
  { n: "04", icon: <Bot size={20} />, title: "Grow With AI", desc: "Ask the AI for code reviews, career advice, or a quick interview drill.", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500" },
];

const COMMUNITIES = [
  { name: "Systems & Rust", members: "12.4k", icon: <Cpu size={20} />, desc: "Low-level programming, memory safety, and perf optimization.", color: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" },
  { name: "Frontend Architecture", members: "24.1k", icon: <Code2 size={20} />, desc: "React, Next.js, component patterns, and modern CSS.", color: "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400" },
  { name: "Indie Hackers", members: "8.9k", icon: <Zap size={20} />, desc: "Solo founders building SaaS, sharing MRR, growth tactics.", color: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400" },
  { name: "AI & Machine Learning", members: "18.2k", icon: <Globe size={20} />, desc: "LLMs, prompt engineering, and neural networks.", color: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" },
];

const FALLBACK_STATS = [
  { label: "Developers", value: 48200, suffix: "+" },
  { label: "Jobs Posted", value: 3100, suffix: "+" },
  { label: "Mentors", value: 420, suffix: "+" },
  { label: "Courses", value: 280, suffix: "+" },
];

const FALLBACK_TESTIMONIALS = [
  {
    id: "1",
    name: "Sarah Chen",
    username: "sarah_dev",
    role: "Senior Frontend Engineer",
    company: "Stripe",
    content: "beoneofus helped me land my dream role at Stripe. The AI mock interviews were spot on and the mentor I connected with gave me exactly the feedback I needed.",
    rating: 5,
    avatar_url: null,
  },
  {
    id: "2",
    name: "Marcus Osei",
    username: "m_osei",
    role: "Full-Stack Engineer",
    company: "Notion",
    content: "I went from freelancing to a $150k role in 4 months. The job board actually has real listings, not the same recycled postings you see everywhere else.",
    rating: 5,
    avatar_url: null,
  },
  {
    id: "3",
    name: "Priya Nair",
    username: "priya_builds",
    role: "Software Engineer",
    company: "Figma",
    content: "The AI courses are wild — each lesson is generated fresh and the exams actually test what you learned. It feels like having a personal tutor available 24/7.",
    rating: 5,
    avatar_url: null,
  },
  {
    id: "4",
    name: "James Whitfield",
    username: "jwhitfield",
    role: "Tech Lead",
    company: "Linear",
    content: "Best developer community I've been part of. No spam, no cold DMs. Everyone here is serious about their craft and the mutual-consent system actually works.",
    rating: 5,
    avatar_url: null,
  },
  {
    id: "5",
    name: "Aisha Mwangi",
    username: "aisha_code",
    role: "Backend Engineer",
    company: "Vercel",
    content: "Connected with a senior engineer who reviewed my system design. One session and I completely rethought my architecture. Worth every penny of premium.",
    rating: 5,
    avatar_url: null,
  },
  {
    id: "6",
    name: "Diego Reyes",
    username: "dreyes_dev",
    role: "Indie Hacker",
    company: "Bootstrapped",
    content: "Found two co-founders and a contractor through beoneofus. The project collaboration tools are exactly what the indie hacker community needed.",
    rating: 5,
    avatar_url: null,
  },
];

/* ─── Helpers ───────────────────────────────────────────────── */
function authLink(session, dest) {
  if (session) return dest;
  return `/auth?next=${encodeURIComponent(dest)}`;
}

/* ─── Component ─────────────────────────────────────────────── */
export default function LandingPage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [pageViews, setPageViews] = useState(null);
  const [liveStats, setLiveStats] = useState(FALLBACK_STATS);
  const [testimonials, setTestimonials] = useState(FALLBACK_TESTIMONIALS);
  const [heroVisible, setHeroVisible] = useState(false);
  const [typeText, setTypeText] = useState("");
  const words = ["developers.", "builders.", "engineers.", "founders.", "hackers."];
  const wordIndex = useRef(0);
  const charIndex = useRef(0);
  const deleting = useRef(false);

  /* auth */
  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const { data: { session: s }, error } = await supabase.auth.getSession();
        if (error) {
          if (error.message.includes("Refresh Token") || error.message.includes("Invalid Refresh")) {
            await supabase.auth.signOut().catch(() => {});
          } else if (isMounted) setAuthError(error.message);
        }
        if (isMounted) setSession(s);
        if (s) {
          const { data } = await supabase.from("profiles").select("username, avatar_url, full_name, role, company").eq("id", s.user.id).single();
          if (isMounted) setProfile(data);
        }
      } catch { if (isMounted) setAuthError("Auth check failed. Please try again."); }
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
        { count: mentorCount },
        { count: courseCount },
        { data: viewData },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("mentors").select("user_id", { count: "exact", head: true }),
        supabase.from("learn_content").select("id", { count: "exact", head: true }),
        supabase.rpc("increment_page_views"),
      ]);

      setLiveStats([
        { label: "Developers", value: devCount ?? 48200, suffix: "+" },
        { label: "Jobs Posted", value: jobCount ?? 3100, suffix: "+" },
        { label: "Mentors", value: mentorCount ?? 420, suffix: "+" },
        { label: "Courses", value: courseCount ?? 280, suffix: "+" },
      ]);
      if (viewData) setPageViews(viewData);
    };
    fetchStats();
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

  /* typewriter */
  useEffect(() => {
    const tick = () => {
      const word = words[wordIndex.current];
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
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6);
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
        <nav className="fixed top-0 w-full z-50 border-b border-gray-200/80 dark:border-white/5 bg-white/75 dark:bg-[#080c12]/80 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <Terminal size={16} className="text-white" />
              </div>
              <span className="font-black text-xl tracking-tight text-gray-900 dark:text-white">
                beone<span className="text-blue-600">of</span>us
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {[
                { href: "/Explore_Projects", label: "Explore" },
                { href: "/LearnPage", label: "Learn" },
                { href: "/how_it_works", label: "How It Works" },
              ].map(({ href, label }) => (
                <Link key={href} href={href}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all">
                  {label}
                </Link>
              ))}
            </div>

            {/* Auth area */}
            <div className="flex items-center gap-2 sm:gap-3">
              {loading ? (
                <div className="w-32 sm:w-48 h-9 bg-gray-100 dark:bg-white/5 animate-pulse rounded-xl" />
              ) : session ? (
                <>
                  <Link href="/dash" className="relative text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 transition-colors shrink-0">
                    <Bell size={19} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#080c12]" />
                  </Link>
                  <Link href="/dash"
                    className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 pl-1.5 pr-1.5 sm:pl-2 sm:pr-3 py-1 sm:py-1.5 rounded-full transition-all shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black overflow-hidden shadow-sm shrink-0">
                      {(profile?.avatar_url || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture)
                        ? <img src={profile?.avatar_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture} alt="av" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        : (profile?.username?.[0] || session?.user?.email?.[0] || "U").toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-bold text-gray-700 dark:text-gray-300">Dash</span>
                    <ChevronDown size={14} className="text-gray-400 hidden lg:block" />
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth" className="px-3 sm:px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Login
                  </Link>
                  <Link href="/auth"
                    className="hidden sm:block px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105">
                    Join
                  </Link>
                </>
              )}

              {/* Mobile toggle */}
              <button
                className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="px-4 pb-6 pt-2 border-t border-gray-100 dark:border-white/5 space-y-1">
              {session && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl mb-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                    {(profile?.avatar_url || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture)
                      ? <img src={profile?.avatar_url || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture} alt="av" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : (profile?.username?.[0] || session?.user?.email?.[0] || "U").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">@{profile?.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Active member</p>
                  </div>
                </div>
              )}
              {[
                { href: "/Explore_Projects", label: "Explore" },
                { href: "/LearnPage", label: "Learn" },
                { href: "/how_it_works", label: "How It Works" },
                ...(session ? [{ href: "/dash", label: "Dashboard" }, { href: "/projects", label: "My Projects" }] : []),
              ].map(({ href, label }) => (
                <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all">
                  {label}
                </Link>
              ))}
              <div className="pt-3 flex flex-col gap-2">
                {!session && (
                  <Link href="/auth" onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-bold rounded-xl text-sm border border-gray-200 dark:border-white/10">
                    Sign in
                  </Link>
                )}
                <Link href={session ? "/dash" : "/auth"} onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                  {session ? "Open Dashboard" : "Get Started Free"} <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* ── Hero ────────────────────────────── */}
        <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden">

          {/* Orbs — decorative, never clip content */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
            <div className="animate-orb1 absolute -top-20 left-[5%] w-[500px] h-[500px] rounded-full bg-blue-400/20 dark:bg-blue-500/10 blur-[100px]" />
            <div className="animate-orb2 absolute top-[10%] right-0 w-[400px] h-[400px] rounded-full bg-violet-400/20 dark:bg-violet-500/10 blur-[100px]" />
            <div className="animate-orb3 absolute bottom-0 left-[30%] w-[350px] h-[350px] rounded-full bg-indigo-400/15 dark:bg-indigo-500/8 blur-[120px]" />
          </div>

          {/* Floating badges — xl only so they never cover the centered text */}
          <div className="absolute inset-0 pointer-events-none hidden xl:block" style={{ zIndex: 0 }}>
            {/* Connection request */}
            <div className="animate-float absolute top-[22%] left-[6%] xl:left-[10%] animate-badge-pop" style={{ animationDelay: "1.2s" }}>
              <div className="flex items-center gap-2.5 bg-white/90 dark:bg-[#0f1723]/90 border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl px-3.5 py-2.5 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 shrink-0">
                  <UserPlus size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">New connection</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">@sarah_dev accepted</p>
                </div>
              </div>
            </div>

            {/* AI response */}
            <div className="animate-float2 absolute top-[35%] right-[5%] xl:right-[9%] animate-badge-pop" style={{ animationDelay: "1.5s" }}>
              <div className="flex items-center gap-2.5 bg-white/90 dark:bg-[#0f1723]/90 border border-violet-200 dark:border-violet-700/40 rounded-2xl shadow-xl px-3.5 py-2.5 backdrop-blur-sm max-w-[200px]">
                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 shrink-0">
                  <Bot size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">AI Review</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">No vulnerabilities found ✓</p>
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
                  <p className="text-xs font-bold text-gray-900 dark:text-white">98% match</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Senior React role</p>
                </div>
              </div>
            </div>

            {/* Mentor booked */}
            <div className="animate-float absolute bottom-[20%] right-[6%] xl:right-[11%] animate-badge-pop" style={{ animationDelay: "2.1s" }}>
              <div className="flex items-center gap-2.5 bg-white/90 dark:bg-[#0f1723]/90 border border-amber-200 dark:border-amber-700/40 rounded-2xl shadow-xl px-3.5 py-2.5 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 shrink-0">
                  <Star size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Session booked</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">w/ @alex_principal</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hero content */}
          <div className={`relative text-center max-w-4xl mx-auto transition-all duration-1000 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ zIndex: 10 }}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest mb-8"
              style={{ animationDelay: "0.2s" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              The Developer Network
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] mb-6">
              <span className="block text-gray-900 dark:text-white">Where the world's</span>
              <span className="block mt-1"><span className="gradient-text">{typeText || " "}</span><span className="cursor-blink text-blue-500 font-light">|</span></span>
              <span className="block text-gray-900 dark:text-white">actually meet.</span>
            </h1>

            {/* Sub */}
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto font-medium leading-relaxed mb-8">
              Jobs. Mentorship. AI coaching. Courses. Connections — everything a developer needs, in one place.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <Link href={authLink(session, "/dash")}
                className="w-full sm:w-auto group flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-2xl text-sm font-black shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200">
                {session ? "Go to Dashboard" : "Join Free — No Credit Card"}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/how_it_works"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-900 dark:text-white px-7 py-3.5 rounded-2xl text-sm font-bold hover:scale-105 transition-all duration-200 shadow-sm">
                <Play size={14} className="text-blue-600" /> See how it works
              </Link>
            </div>

            {/* Trust bar */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-500">
              {["Free to join", "Verified developers", "No spam ever", "AI-powered"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />{t}
                </span>
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          <div className={`mt-14 flex flex-col items-center gap-1.5 transition-all duration-1000 delay-1000 ${heroVisible ? "opacity-100" : "opacity-0"}`}>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">Scroll to explore</p>
            <ChevronRight size={16} className="text-gray-400 dark:text-gray-600 rotate-90 animate-bounce" />
          </div>
        </section>

        {/* ── Stats bar ───────────────────────── */}
        <StatsBar stats={liveStats} pageViews={pageViews} />

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
              <p className="text-sm font-bold text-gray-900 dark:text-white">Session Notice</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{authError}</p>
            </div>
            <button onClick={() => setAuthError(null)} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"><X size={15} /></button>
          </div>
        )}

        <FloatingAiAssistant />
      </div>
    </>
  );
}

/* ─── Sub-sections ─────────────────────────────────────────── */

function StatsBar({ stats, pageViews }) {
  const [ref, visible] = useIntersect();
  return (
    <div ref={ref} className="relative z-10 border-y border-gray-200 dark:border-white/5 bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 lg:grid-cols-5 gap-8">
        {stats.map((s, i) => (
          <div key={s.label} className={`text-center reveal ${visible ? "visible" : ""} reveal-delay-${i + 1}`}>
            <p className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
              <AnimatedCounter to={s.value} suffix={s.suffix} />
            </p>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
        {/* Live page view counter */}
        <div className={`text-center reveal ${visible ? "visible" : ""} reveal-delay-5`}>
          <p className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">
            {pageViews != null
              ? <AnimatedCounter to={pageViews} suffix="" />
              : <span className="animate-pulse text-gray-300 dark:text-gray-700">—</span>}
          </p>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-500 mt-1 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            Platform Visits
          </p>
        </div>
      </div>
    </div>
  );
}

function WhatIsSection() {
  const [ref, visible] = useIntersect();
  return (
    <section ref={ref} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
      <div className={`text-center mb-16 reveal ${visible ? "visible" : ""}`}>
        <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">What is beoneofus?</p>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-gray-900 dark:text-white leading-tight mb-6">
          Everything you need.<br />
          <span className="text-gray-400 dark:text-gray-600">Nothing you don't.</span>
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto font-medium">
          beoneofus is where developers grow careers — not just follow each other. Real jobs, real mentors, real AI tools.
        </p>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 reveal ${visible ? "visible" : ""} reveal-delay-2`}>
        {[
          { icon: <TrendingUp size={20} />, title: "Career Growth", desc: "Job board, mentorship, and coaching all in one place.", c: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
          { icon: <Users size={20} />, title: "Real Network", desc: "Mutual-consent connections. No spam, no cold outreach abuse.", c: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
          { icon: <Bot size={20} />, title: "AI-First Tools", desc: "Code reviews, lesson generation, and career advice built-in.", c: "text-violet-600 bg-violet-50 dark:bg-violet-900/20" },
          { icon: <Shield size={20} />, title: "Verified & Safe", desc: "Verified identities, RLS-protected data, secure messaging.", c: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" },
          { icon: <BookOpen size={20} />, title: "Learn Every Day", desc: "AI-generated courses with exams, tailored to your level.", c: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
          { icon: <Sparkles size={20} />, title: "Premium Perks", desc: "Unlimited mentorship, priority coaching, and more.", c: "text-rose-600 bg-rose-50 dark:bg-rose-900/20" },
        ].map((item, i) => (
          <div key={i} className="group flex items-start gap-4 p-5 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl hover:border-blue-300 dark:hover:border-blue-700/50 hover:shadow-lg transition-all duration-300 card-glow">
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
  const [ref, visible] = useIntersect();
  return (
    <section className="bg-gray-50 dark:bg-white/[0.015] border-y border-gray-200 dark:border-white/5 py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className={`text-center mb-16 reveal ${visible ? "visible" : ""}`}>
          <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">Platform Features</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 dark:text-white mb-4">
            Six ways to level up.
          </h2>
          <p className="text-gray-600 dark:text-gray-400 font-medium max-w-xl mx-auto">All tools are live, connected, and built for developers who are serious about their careers.</p>
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
            {f.tag}
          </span>
        </div>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">{f.label}</p>
        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 leading-snug">{f.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.desc}</p>

        <div className="mt-5 flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          Explore <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}

function HowItWorksSection({ steps }) {
  const [ref, visible] = useIntersect();
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
      <div ref={ref} className={`text-center mb-16 reveal ${visible ? "visible" : ""}`}>
        <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">Getting Started</p>
        <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 dark:text-white mb-4">
          Up and running in minutes.
        </h2>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Four steps from zero to an active developer on the network.</p>
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
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Step {step.n}</span>
            <h3 className="text-base font-black text-gray-900 dark:text-white mt-1 mb-2">{step.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CommunitySection({ communities, session }) {
  const [ref, visible] = useIntersect();
  return (
    <section className="bg-gray-50 dark:bg-white/[0.015] border-t border-gray-200 dark:border-white/5 py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className={`text-center mb-16 reveal ${visible ? "visible" : ""}`}>
          <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">Community</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 dark:text-white mb-4">
            Your people are here.
          </h2>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Specialized spaces for every kind of developer. Join the conversation.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {communities.map((c, i) => (
            <div
              key={c.name}
              className={`group flex items-start gap-5 bg-white dark:bg-[#0f1723] border border-gray-200 dark:border-white/5 rounded-3xl p-6 hover:border-blue-300 dark:hover:border-blue-700/40 hover:shadow-xl transition-all duration-300 cursor-pointer card-glow reveal ${visible ? "visible" : ""} reveal-delay-${i + 1}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${c.color} group-hover:scale-110 transition-transform`}>
                {c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-black text-gray-900 dark:text-white text-base truncate">{c.name}</h4>
                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800/40">
                    <Users size={10} />{c.members}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`text-center mt-10 reveal ${visible ? "visible" : ""} reveal-delay-5`}>
          <Link href={authLink(session, "/dash/groups")} className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700/50 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl font-bold text-sm transition-all shadow-sm hover:shadow-md">
            See all communities <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PremiumSection({ session }) {
  const [ref, visible] = useIntersect();
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
      <div ref={ref}
        className={`relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-[2.5rem] overflow-hidden p-8 sm:p-12 lg:p-16 reveal ${visible ? "visible" : ""}`}>

        {/* bg decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-violet-400/20 rounded-full blur-3xl" />
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-white text-xs font-black uppercase tracking-widest mb-5">
              <Sparkles size={12} /> Premium Membership
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter mb-4 leading-tight">
              Unlock your full<br />potential.
            </h2>
            <p className="text-blue-100 font-medium max-w-md leading-relaxed">
              Unlimited mentorship bookings, priority AI responses, exclusive job listings, premium coaching, and a verified badge.
            </p>

            <div className="grid grid-cols-2 gap-2.5 mt-6">
              {[
                "Unlimited mentor sessions",
                "Priority AI assistance",
                "Exclusive job listings",
                "Premium coaching access",
                "Verified premium badge",
                "Early feature access",
              ].map((perk) => (
                <div key={perk} className="flex items-center gap-2 text-sm text-blue-100">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  {perk}
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-6 sm:p-8 text-center min-w-[200px]">
            <p className="text-blue-200 text-sm font-semibold mb-1">Starting from</p>
            <p className="text-5xl font-black text-white mb-1">$9<span className="text-2xl text-blue-200">.99</span></p>
            <p className="text-blue-300 text-xs font-semibold mb-6">per month</p>
            <Link href={authLink(session, "/dash/premium")}
              className="block w-full bg-white hover:bg-gray-50 text-blue-600 font-black py-3.5 rounded-2xl text-sm transition-all shadow-xl hover:shadow-2xl hover:scale-105">
              {session ? "Upgrade Now" : "Get Premium"}
            </Link>
            <p className="text-blue-300 text-xs mt-3">Cancel anytime</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ session }) {
  const [ref, visible] = useIntersect();
  return (
    <section className="border-t border-gray-200 dark:border-white/5 py-24 sm:py-32 bg-white dark:bg-[#080c12]">
      <div ref={ref} className={`max-w-3xl mx-auto px-4 sm:px-6 text-center reveal ${visible ? "visible" : ""}`}>
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-500/30">
          <Terminal size={28} className="text-white" />
        </div>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-gray-900 dark:text-white mb-6">
          Ready to be<br />one of us?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-10 max-w-xl mx-auto">
          Join 48,000+ developers who are already building careers, not just profiles.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={authLink(session, "/dash")}
            className="w-full sm:w-auto group flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl text-lg font-black shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200">
            {session ? "Go to Dashboard" : "Create Free Account"}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <p className="text-gray-400 dark:text-gray-600 text-sm mt-5">Free forever. No credit card. No noise.</p>
      </div>
    </section>
  );
}

const AVATAR_COLORS = [
  "bg-blue-100 dark:bg-blue-900/40 text-blue-600",
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
  const [sectionRef, visible] = useIntersect();
  const [items, setItems] = useState(initial);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => { setItems(initial); }, [initial]);

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
    if (!content.trim()) { setFormError("Please write something."); return; }
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
    if (error) { setFormError("Something went wrong. Try again."); return; }
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
          <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">Testimonials</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 dark:text-white mb-4">
            Developers love it here.
          </h2>
          <p className="text-gray-600 dark:text-gray-400 font-medium max-w-xl mx-auto">
            Real stories from real developers who found jobs, mentors, and community on beoneofus.
          </p>
          {liveCount > 0 && (
            <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 rounded-full text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {liveCount} new since you arrived
            </div>
          )}
        </div>
      </div>

      {/* Marquee rows — full bleed */}
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

      {/* Masonry grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 mb-16">
          {items.map((t, i) => (
            <TestimonialCard key={t.id} testimonial={t} delay={i * 0.08} parentVisible={visible} session={session} onDelete={(id) => setItems((prev) => prev.filter((x) => x.id !== id))} onUpdate={(updated) => setItems((prev) => prev.map((x) => x.id === updated.id ? updated : x))} />
          ))}
        </div>

        {/* Submission form */}
        <div className={`reveal ${visible ? "visible" : ""} reveal-delay-3`}>
          <div className="max-w-2xl mx-auto bg-white dark:bg-[#0f1723] border border-gray-200 dark:border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-100/60 dark:shadow-none">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                <MessageSquare size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">Share your story</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Help other developers find their community</p>
              </div>
            </div>

            {!session ? (
              <div className="text-center py-8">
                <Lock size={28} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">Sign in to share your experience</p>
                <Link href="/auth"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:scale-105">
                  Sign in <ArrowRight size={14} />
                </Link>
              </div>
            ) : submitted ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4 animate-badge-pop">
                  <CheckCircle2 size={26} className="text-emerald-500" />
                </div>
                <p className="font-black text-gray-900 dark:text-white text-lg mb-1">Thank you!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Your testimonial is under review and will appear soon.</p>
                <button onClick={() => setSubmitted(false)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  Submit another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Star rating */}
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 block mb-2">Rating</label>
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
                      {["", "Poor", "Fair", "Good", "Great", "Excellent"][hovered || rating]}
                    </span>
                  </div>
                </div>

                {/* Role + Company */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 block mb-1.5">Role</label>
                    <input
                      type="text" value={role} onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Senior Engineer"
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 block mb-1.5">Company</label>
                    <input
                      type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Stripe"
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 block mb-1.5">
                    Your story <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={content} onChange={(e) => setContent(e.target.value)}
                    rows={4} maxLength={400}
                    placeholder="What did beoneofus help you achieve?"
                    className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all resize-none"
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
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                  {submitting ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
                  ) : (
                    <><MessageSquare size={15} /> Submit testimonial</>
                  )}
                </button>
                <p className="text-[11px] text-center text-gray-400 dark:text-gray-600">
                  Reviewed by the team before going live.
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
  const initials = t.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colorClass = avatarColor(t.id);
  const isOwner = session?.user?.id && t.user_id === session.user.id;
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgError(false); // Reset error state when testimonial changes (e.g., new data)
  }, [t.avatar_url]);


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
      className={`break-inside-avoid group bg-white dark:bg-[#0f1723] border rounded-3xl p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 card-glow reveal ${editing ? "border-blue-400 dark:border-blue-500/50" : "border-gray-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-700/40"} ${parentVisible ? "visible" : ""}`}
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
            <input value={editRole} onChange={(e) => setEditRole(e.target.value)} placeholder="Role"
              className="px-3 py-2 text-xs bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
            <input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Company"
              className="px-3 py-2 text-xs bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
          </div>
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} maxLength={400}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving || !editContent.trim()}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5">
              {saving ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={13} />}
              Save
            </button>
            <button onClick={() => setEditing(false)}
              className="flex-1 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all">
              Cancel
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
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  title="Edit">
                  <Pencil size={13} />
                </button>
                {confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button onClick={handleDelete} disabled={deleting}
                      className="px-2 py-1 text-[10px] font-black bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all flex items-center gap-1">
                      {deleting ? <span className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full animate-spin" /> : null}
                      Confirm
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-[10px] font-bold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-lg">
                      No
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    title="Delete">
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
  const cols = [
    { title: "Platform", links: [
      { label: "Explore Projects", href: "/Explore_Projects" },
      { label: "Job Board", href: authLink(session, "/dash/marketplace") },
      { label: "My Projects", href: authLink(session, "/projects") },
      { label: "Mentorship", href: authLink(session, "/dash/mentorship") },
      { label: "Courses", href: "/LearnPage" },
      { label: "Coaching", href: authLink(session, "/dash/coaching") },
    ]},
    { title: "Company", links: [
      { label: "How It Works", href: "/how_it_works" },
      { label: "Partnerships", href: authLink(session, "/dash/partnerships") },
      { label: "Docs", href: "/docs" },
      { label: "Blog", href: "/blog" },
    ]},
    { title: "Account", links: [
      { label: "Sign Up", href: "/auth" },
      { label: "Login", href: "/auth" },
      { label: "Premium", href: authLink(session, "/dash/premium") },
      { label: "Dashboard", href: authLink(session, "/dash") },
    ]},
  ];
  return (
    <footer className="border-t border-gray-200 dark:border-white/5 bg-white dark:bg-[#080c12]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 w-fit">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Terminal size={16} className="text-white" />
              </div>
              <span className="font-black text-xl tracking-tight text-gray-900 dark:text-white">
                beone<span className="text-blue-600">of</span>us
              </span>
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-[220px]">
              The developer network built for real career growth.
            </p>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 dark:text-gray-600 font-mono">
            © {new Date().getFullYear()} beoneofus. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
