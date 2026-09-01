"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../supabaseClient";
import { usePlatformVersion } from "../../hooks/usePlatformVersion";
import {
  Terminal, Search, Menu, X, ChevronRight, ChevronDown,
  ShieldCheck, Zap, Bot, BookOpen, ExternalLink,
  LayoutDashboard, MessageSquare, Briefcase, Network,
  Code2, GraduationCap, Users, Bell, Star, Globe,
  Cpu, Award, FileText, Sparkles, Hash, TrendingUp,
  ArrowRight, CheckCircle2, Lock, Rss, ShoppingBag,
  UserCircle, GitBranch, Laptop, ScrollText, BadgeCheck,
  Crown, CalendarDays
} from "lucide-react";

// ─── Navigation tree ───────────────────────────────────────────────────────

const NAV = [
  {
    group: "Overview",
    icon: BookOpen,
    links: [
      { id: "introduction",   label: "Introduction",        icon: Hash },
      { id: "quick-start",    label: "Quick Start",         icon: Zap },
      { id: "architecture",   label: "What We Offer",       icon: Globe },
    ],
  },
  {
    group: "Dashboard",
    icon: LayoutDashboard,
    links: [
      { id: "home-feed",      label: "Home Feed",           icon: Rss },
      { id: "profile",        label: "Profile & Resume",    icon: UserCircle },
      { id: "notifications",  label: "Notifications",       icon: Bell },
    ],
  },
  {
    group: "Networking",
    icon: Network,
    links: [
      { id: "connections",    label: "Connections",         icon: Users },
      { id: "messaging",      label: "Smart Messaging",     icon: MessageSquare },
    ],
  },
  {
    group: "Academy",
    icon: GraduationCap,
    links: [
      { id: "courses",        label: "Courses & Lessons",   icon: BookOpen },
      { id: "exams",          label: "Exams & Certificates",icon: Award },
    ],
  },
  {
    group: "Projects & Code",
    icon: Code2,
    links: [
      { id: "projects",       label: "Project Management",  icon: GitBranch },
      { id: "ide",            label: "In-Browser IDE",      icon: Laptop },
      { id: "explore",        label: "Explore Projects",    icon: Globe },
    ],
  },
  {
    group: "Community",
    icon: Users,
    links: [
      { id: "community-hubs", label: "Community Hubs",     icon: Cpu },
      { id: "posts-feed",     label: "Posts & Feed",        icon: Rss },
      { id: "blog",           label: "Blog",                icon: ScrollText },
    ],
  },
  {
    group: "AI Features",
    icon: Bot,
    links: [
      { id: "ai-assistant",   label: "AI Assistant",        icon: Sparkles },
      { id: "cv-analysis",    label: "CV Analysis",         icon: FileText },
    ],
  },
  {
    group: "Career & Business",
    icon: Briefcase,
    links: [
      { id: "job-matching",   label: "Jobs & Services",     icon: Briefcase },
      { id: "mentorship",     label: "Mentorship & Coaching",icon: Users },
      { id: "founder-dash",   label: "Founder Dashboard",   icon: Crown },
      { id: "member-dash",    label: "Member Dashboard",    icon: ShieldCheck },
      { id: "sponsors",       label: "Sponsors",            icon: Star },
    ],
  },
  {
    group: "Account",
    icon: ShieldCheck,
    links: [
      { id: "premium",        label: "Premium Tier",        icon: Crown },
      { id: "verification",   label: "Verification Badge",  icon: BadgeCheck },
      { id: "marketplace",    label: "Marketplace",         icon: ShoppingBag },
    ],
  },
];

const ALL_LINKS = NAV.flatMap((g) => g.links);

// ─── Brand name with blue "of" ───────────────────────────────────────────────

function BrandName({ size = "base" }: { size?: "sm" | "base" | "lg" }) {
  const cls = size === "lg" ? "text-lg" : size === "sm" ? "text-sm" : "text-base";
  return (
    <span className={`font-black tracking-tighter ${cls}`}>
      beone<span className="text-blue-600 dark:text-blue-400">of</span>us
    </span>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Pill({ label, color = "blue" }: { label: string; color?: string }) {
  const map: Record<string, string> = {
    blue:   "bg-blue-50   dark:bg-blue-900/20   text-blue-600   dark:text-blue-400   border-blue-200   dark:border-blue-800/50",
    green:  "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
    amber:  "bg-amber-50  dark:bg-amber-900/20  text-amber-600  dark:text-amber-400  border-amber-200  dark:border-amber-800/50",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50",
    gray:   "bg-gray-100  dark:bg-gray-800      text-gray-600   dark:text-gray-400   border-gray-200   dark:border-gray-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${map[color]}`}>
      {label}
    </span>
  );
}

function Callout({ type = "info", title, children }: { type?: "info" | "warn" | "tip" | "new"; title: string; children: React.ReactNode }) {
  const styles = {
    info: { wrap: "border-blue-200   dark:border-blue-800/60   bg-blue-50   dark:bg-blue-900/10",   txt: "text-blue-500",    el: <Hash size={14} /> },
    warn: { wrap: "border-amber-200  dark:border-amber-800/60  bg-amber-50  dark:bg-amber-900/10",  txt: "text-amber-500",   el: <Zap size={14} /> },
    tip:  { wrap: "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/10", txt: "text-emerald-500", el: <CheckCircle2 size={14} /> },
    new:  { wrap: "border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-900/10", txt: "text-purple-500",  el: <Sparkles size={14} /> },
  };
  const s = styles[type];
  return (
    <div className={`rounded-xl border ${s.wrap} p-4 my-5`}>
      <div className={`flex items-center gap-2 font-bold text-sm mb-1.5 ${s.txt}`}>{s.el} {title}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{children}</div>
    </div>
  );
}

function FeatureGrid({ items }: { items: { icon: React.ReactNode; title: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-6">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700 transition-colors min-w-0">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug">{item.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed break-words">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHeading({ id, icon, label, badge }: { id: string; icon: React.ReactNode; label: string; badge?: { text: string; color: string } }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-2 sm:gap-3">
      <span className="shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">{icon}</span>
      <span className="flex-1 min-w-0">{label}</span>
      {badge && <Pill label={badge.text} color={badge.color} />}
    </h2>
  );
}

function StepList({ steps }: { steps: { n: number | string; title: string; desc: string }[] }) {
  return (
    <ol className="space-y-5 my-6 pl-2">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-4">
          <span className="shrink-0 w-6 h-6 mt-0.5 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs font-black">
            {step.n}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{step.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
      {children}
    </code>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [activeId,   setActiveId]     = useState("introduction");
  const [openGroups, setOpenGroups]   = useState<Record<string, boolean>>(
    () => Object.fromEntries(NAV.map(g => [g.group, true]))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [headerSearchFocused, setHeaderSearchFocused] = useState(false);
  const { versionData } = usePlatformVersion();
  const vTag   = versionData?.version ? `v${versionData.version}` : "v1.2";
  const vLabel = versionData?.label   ?? "Core";
  const vDate  = versionData?.date    ?? "May 2026";

  type StatKey = "professionals" | "jobs" | "connections" | "projects";
  const [stats, setStats] = useState<Record<StatKey, string>>({
    professionals: "…",
    jobs:          "…",
    connections:   "…",
    projects:      "…",
  });

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("id", { count: "exact", head: true }),
      supabase.from("connections").select("id", { count: "exact", head: true }).eq("status", "accepted"),
      supabase.from("projects").select("id", { count: "exact", head: true }),
    ]).then(([p, j, m, c]) => {
      const fmt = (n: number | null) =>
        n == null ? "—"
        : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+`
        : `${n}+`;
      setStats({
        professionals: fmt(p.count),
        jobs:          fmt(j.count),
        connections:   fmt(m.count),
        projects:      fmt(c.count),
      });
    });
  }, []);

  const filteredGroups = searchQuery.trim()
    ? NAV.map(g => ({
        ...g,
        links: g.links.filter(l => l.label.toLowerCase().includes(searchQuery.toLowerCase())),
      })).filter(g => g.links.length > 0)
    : NAV;

  useEffect(() => {
    const onScroll = () => {
      let current = "introduction";
      for (const { id } of ALL_LINKS) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) current = id;
      }
      setActiveId(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 88, behavior: "smooth" });
  };

  const toggleGroup = (group: string) =>
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));

  function SidebarContent() {
    return (
      <div className="p-4 pb-20">
        {/* filter input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter sections…"
            className="w-full bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-blue-500 rounded-lg py-2 pl-8 pr-3 text-sm focus:outline-none transition-colors"
          />
        </div>

        {/* nav groups */}
        <nav className="space-y-0.5">
          {filteredGroups.map(group => (
            <div key={group.group}>
              <button
                onClick={() => toggleGroup(group.group)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all mt-2"
              >
                <span className="flex items-center gap-1.5">
                  <group.icon size={11} />
                  {group.group}
                </span>
                <ChevronDown size={11} className={`transition-transform shrink-0 ${openGroups[group.group] ? "rotate-180" : ""}`} />
              </button>
              {openGroups[group.group] && (
                <ul className="ml-3 border-l border-gray-200 dark:border-gray-800 pl-3 space-y-0.5 mt-1 mb-2">
                  {group.links.map(link => (
                    <li key={link.id}>
                      <button
                        onClick={() => scrollTo(link.id)}
                        className={`flex items-center gap-2 w-full text-left text-sm py-1.5 px-2 rounded-md transition-all ${
                          activeId === link.id
                            ? "text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        <link.icon size={12} className="shrink-0 opacity-60" />
                        <span className="truncate">{link.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>

        {/* quick links */}
        <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 px-2">Resources</p>
          {[
            { href: "/dash",                   label: "Dashboard",      icon: LayoutDashboard },
            { href: "/resources",                label: "Academy",        icon: GraduationCap },
            { href: "/Explore_Projects",       label: "Explore",        icon: Globe },
            { href: "/dash/more?tool=support", label: "Support Ticket", icon: ExternalLink },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1.5 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50">
              <Icon size={12} className="opacity-70 shrink-0" /> {label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#080808] text-gray-900 dark:text-gray-100 selection:bg-blue-500/30">

      {/* ── Top bar ── */}
      <header className="fixed top-0 left-0 right-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-[#080808]/90 backdrop-blur-xl z-50 flex items-center justify-between px-4 sm:px-6 gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <Terminal className="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
            <BrandName size="base" />
          </Link>
          <span className="hidden sm:block text-gray-300 dark:text-gray-700 select-none">/</span>
          <span className="hidden sm:block text-sm font-semibold text-gray-500 dark:text-gray-400">docs</span>
          <Pill label={vTag} color="blue" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setHeaderSearchFocused(true)}
              onBlur={() => setTimeout(() => setHeaderSearchFocused(false), 150)}
              placeholder="Search docs…"
              className="w-44 lg:w-52 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-blue-500 rounded-lg py-1.5 pl-9 pr-3 text-sm focus:outline-none transition-colors"
            />
            {/* Search results dropdown */}
            {headerSearchFocused && searchQuery.trim() && (
              <div className="absolute top-full left-0 mt-1.5 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-[60] overflow-hidden">
                {filteredGroups.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">No results for &ldquo;{searchQuery}&rdquo;</p>
                ) : (
                  <ul className="max-h-72 overflow-y-auto py-1">
                    {filteredGroups.flatMap(g => g.links.map(link => (
                      <li key={link.id}>
                        <button
                          onMouseDown={() => { scrollTo(link.id); setSearchQuery(""); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                        >
                          <link.icon size={13} className="shrink-0 text-gray-400 dark:text-gray-500" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{link.label}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">{g.group}</p>
                          </div>
                          <ChevronRight size={12} className="shrink-0 text-gray-300 dark:text-gray-600 ml-auto" />
                        </button>
                      </li>
                    )))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <Link href="/dash" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-lg whitespace-nowrap">
            Dashboard <ArrowRight size={12} />
          </Link>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile overlay — below sidebar (z-[39]) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[39] md:hidden bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Three-column wrapper ── */}
      <div className="flex max-w-[1400px] mx-auto pt-14">

        {/* Left sidebar (fixed) */}
        <aside className={`fixed top-14 bottom-0 left-0 z-40 w-64 bg-white dark:bg-[#080808] border-r border-gray-200 dark:border-gray-800 overflow-y-auto no-scrollbar transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
          {SidebarContent()}
        </aside>

        {/* Center content */}
        <main className="flex-1 min-w-0 md:ml-64 px-4 sm:px-6 md:px-10 xl:px-14 py-10 sm:py-12">
          <div className="max-w-[740px] mx-auto w-full">

            {/* ════ OVERVIEW ════ */}

            <section id="introduction" className="mb-16 scroll-mt-24">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <Pill label="Documentation" color="gray" />
                <Pill label={`${vTag} — ${vDate}`} color="purple" />
                <Pill label="Updated" color="green" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4 leading-tight">
                beone<span className="text-blue-600 dark:text-blue-400">of</span>us{" "}
                <span className="text-blue-600 dark:text-blue-500">Documentation</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                Everything you need to know about{" "}
                <strong className="text-gray-900 dark:text-white">
                  beone<span className="text-blue-600 dark:text-blue-400">of</span>us
                </strong>{" "}
                — the professional network open to everyone. Whether you are a developer, designer, marketer, founder, or finance professional, this is where you grow your skills, build income, and connect with the right people.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {([
                  { label: "Professionals", key: "professionals" as StatKey, color: "text-blue-600 dark:text-blue-400" },
                  { label: "Jobs Posted",   key: "jobs"          as StatKey, color: "text-purple-600 dark:text-purple-400" },
                  { label: "Connections",   key: "connections"   as StatKey, color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Projects",      key: "projects"      as StatKey, color: "text-amber-600 dark:text-amber-400" },
                ] as const).map(s => (
                  <div key={s.label} className="p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 text-center">
                    <p className={`text-xl sm:text-2xl font-black tabular-nums ${s.color}`}>{stats[s.key]}</p>
                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
              <Callout type="new" title={`Platform ${vTag} — ${vLabel}`}>
                Public profiles, shareable resumes, 1-on-1 mentorship booking, course certificates, premium membership, Marketplace, in-browser IDE, and sponsor partnerships are now live and open to all members.
              </Callout>
            </section>

            <section className="mb-16">
              <SectionHeading id="quick-start" icon={<Zap size={15} />} label="Quick Start" badge={{ text: "5 min", color: "green" }} />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Go from new account to active member in under five minutes.
              </p>
              <StepList steps={[
                { n: 1, title: "Create an account",           desc: "Sign up at /auth with your email and click the verification link. Takes about 30 seconds." },
                { n: 2, title: "Build your profile",          desc: "Add your avatar, bio, skills, and field. A strong profile puts you in front of recruiters, mentors, and collaborators." },
                { n: 3, title: "Explore the feed",            desc: "Head to /dash/home to see what people in your field are building, sharing, and discussing right now." },
                { n: 4, title: "Connect with someone",        desc: "Visit any public profile at /u/[username] and hit Connect. Once accepted, you can message each other directly." },
                { n: 5, title: "Learn, work, or earn",        desc: "Take a course in the Academy, apply for a job, book a mentor, or list your services in the Marketplace." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="architecture" icon={<Globe size={15} />} label="What We Offer" />
              <p className="text-gray-600 dark:text-gray-400 mb-5 leading-relaxed text-sm sm:text-base">
                beone<span className="text-blue-600 dark:text-blue-400">of</span>us is open to every professional — developers, designers, marketers, founders, finance experts, educators, and more. Every feature is built to help you grow your career, earn more, and connect with the right people.
              </p>
              <FeatureGrid items={[
                { icon: <GraduationCap size={13} />, title: "Learn and upskill",      desc: "Structured courses and AI-generated learning paths tailored to your field and level. Learn at your own pace, earn verified certificates." },
                { icon: <Briefcase size={13} />,     title: "Find work",              desc: "Browse jobs across all industries and post freelance services. One-click apply with your profile — no CV upload needed." },
                { icon: <Users size={13} />,         title: "Mentorship & coaching",  desc: "Book 1-on-1 sessions with experienced professionals. Get guidance on career pivots, salary negotiation, or specific skills." },
                { icon: <ShoppingBag size={13} />,   title: "Earn from your skills",  desc: "Sell services, consulting, and templates in the Marketplace. Set your rates and get paid directly through the platform." },
                { icon: <Bot size={13} />,           title: "AI career partner",      desc: "Your AI assistant helps with job matching, CV analysis, skill coaching, interview prep, and messaging — 24/7." },
                { icon: <Star size={13} />,          title: "Get discovered",         desc: "A verified public profile, portfolio projects, and certificates make you visible to recruiters and collaborators worldwide." },
              ]} />
            </section>

            {/* ════ DASHBOARD ════ */}

            <section className="mb-16">
              <SectionHeading id="home-feed" icon={<Rss size={15} />} label="Home Feed" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Your home feed at <InlineCode>/dash/home</InlineCode> keeps you up to date with posts, project launches, and updates from the people you follow — new content appears instantly, no refresh needed.
              </p>
              <FeatureGrid items={[
                { icon: <Rss size={13} />,     title: "Live feed",           desc: "New posts appear instantly without a page reload." },
                { icon: <Code2 size={13} />,   title: "Code posts",          desc: "Share code snippets with full syntax highlighting." },
                { icon: <Star size={13} />,    title: "Reactions & replies", desc: "React with emoji and nest threaded replies on any post." },
                { icon: <Network size={13} />, title: "Spotlight sidebar",   desc: "Right panel surfaces verified users, trending projects, and suggestions." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="profile" icon={<UserCircle size={15} />} label="Profile & Resume" badge={{ text: "New", color: "purple" }} />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Every user has a private settings profile at <InlineCode>/dash/profile</InlineCode>, a public profile at <InlineCode>/u/[username]</InlineCode>, and a shareable resume at <InlineCode>/resume/[username]</InlineCode>.
              </p>
              <FeatureGrid items={[
                { icon: <GitBranch size={13} />,  title: "GitHub stats",       desc: "Live contribution graphs, top languages, and repo count from the GitHub API." },
                { icon: <Award size={13} />,      title: "Certificates",       desc: "Academy certificates earned are pinned to the public profile automatically." },
                { icon: <FileText size={13} />,   title: "AI CV import",       desc: "Paste your resume — AI extracts skills, experience years, and improvement tips." },
                { icon: <BadgeCheck size={13} />, title: "Verified badge",     desc: "Verified accounts show a blue checkmark across all platform surfaces." },
                { icon: <Crown size={13} />,      title: "Premium badge",      desc: "Premium members get a gold crown badge on their profile and every post." },
                { icon: <Star size={13} />,       title: "Skill endorsements", desc: "Connections can endorse your skills, adding social proof to your profile." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="notifications" icon={<Bell size={15} />} label="Notifications" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Stay on top of everything that matters. Every connection, message, job update, and post interaction reaches you instantly at <InlineCode>/dash/notifications</InlineCode>, grouped so you can act fast.
              </p>
              <FeatureGrid items={[
                { icon: <Users size={13} />,        title: "Connection events", desc: "Instant alerts when someone sends or accepts your connection request." },
                { icon: <MessageSquare size={13} />,title: "Message previews",  desc: "New messages appear as cards with a direct link to the conversation." },
                { icon: <Briefcase size={13} />,    title: "Job status",        desc: "Notified when an application changes (Pending → Accepted / Rejected)." },
                { icon: <Star size={13} />,         title: "Post interactions", desc: "Alerts for reactions, comments, and reposts on your content." },
              ]} />
            </section>

            {/* ════ NETWORKING ════ */}

            <section className="mb-16">
              <SectionHeading id="connections" icon={<Users size={15} />} label="Connections" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Every connection on beone<span className="text-blue-600 dark:text-blue-400">of</span>us is mutual — no one can reach out to you unless you accept. This keeps your network quality high and your inbox free of unsolicited messages, regardless of your profession.
              </p>
              <StepList steps={[
                { n: 1, title: "Find a user",       desc: "Visit their public profile at /u/[username] or find them through Explore or Spotlight." },
                { n: 2, title: "Send a request",    desc: 'Click "Connect". They receive a notification. Your status shows Pending until they respond.' },
                { n: 3, title: "Request accepted",  desc: "Once accepted, a secure direct-message channel opens between you." },
                { n: 4, title: "Manage connections",desc: "View all connections from /dash/connections. You can remove one at any time." },
              ]} />
              <Callout type="info" title="Connection privacy">
                Only connected users can initiate direct messages. Public profiles are visible to everyone without login.
              </Callout>
            </section>

            <section className="mb-16">
              <SectionHeading id="messaging" icon={<MessageSquare size={15} />} label="Smart Messaging" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Message any connection directly at <InlineCode>/dash/messages</InlineCode>. Conversations are instant, private, and packed with tools to help you communicate faster and smarter.
              </p>
              <FeatureGrid items={[
                { icon: <Sparkles size={13} />,    title: "AI suggested replies",  desc: "Stuck on what to say? One tap generates a smart, context-aware reply for you." },
                { icon: <CheckCircle2 size={13} />,title: "Read receipts",         desc: "Double-check marks appear once your message has been read." },
                { icon: <MessageSquare size={13} />,title: "Typing indicators",    desc: 'Live "typing…" indicator while the other user composes a message.' },
                { icon: <Star size={13} />,        title: "Emoji reactions",       desc: "React to any individual message — reactions sync in real-time." },
                { icon: <Code2 size={13} />,       title: "Code sharing",          desc: "Inline code snippets with language-aware syntax highlighting." },
                { icon: <FileText size={13} />,    title: "Image sharing",         desc: "Upload images inline — full lightbox viewer included." },
              ]} />
            </section>

            {/* ════ ACADEMY ════ */}

            <section className="mb-16">
              <SectionHeading id="courses" icon={<BookOpen size={15} />} label="Courses & Lessons" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                The Academy (<InlineCode>/Academy</InlineCode>) is your shortcut to skills that actually land jobs — structured courses across Frontend, Backend, AI, Networking, and Security taught by practitioners, not textbooks.
              </p>
              <FeatureGrid items={[
                { icon: <GraduationCap size={13} />,title: "Structured curriculum",desc: "Step-by-step lessons from Beginner to Advanced. Know exactly where you stand and what's next." },
                { icon: <Search size={13} />,       title: "Find the right course",desc: "Search by topic, skill, or goal. Filter by category to go straight to what you need." },
                { icon: <Code2 size={13} />,        title: "Learn by doing",       desc: "Every lesson includes real code examples you can copy, run, and adapt for your own projects." },
                { icon: <Award size={13} />,        title: "Earn as you learn",    desc: "Complete a course, pass the exam, and earn a shareable certificate that adds credibility to your profile." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="exams" icon={<Award size={15} />} label="Exams & Certificates" badge={{ text: "New", color: "purple" }} />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Finish a course and take the final exam. Pass and you get a real, verifiable certificate — one recruiters and employers can check for themselves. No fluff, no participation trophies.
              </p>
              <FeatureGrid items={[
                { icon: <FileText size={13} />,    title: "Quick exam",           desc: "Short, focused assessment that tests what you actually learned — graded instantly." },
                { icon: <Award size={13} />,       title: "Verified certificate", desc: "Your certificate has a unique public link. Share it on LinkedIn, your resume, or your profile." },
                { icon: <CheckCircle2 size={13} />,title: "Anyone can verify it", desc: "Employers can confirm your certificate is real at /verify/[hash] — no account needed." },
                { icon: <UserCircle size={13} />,  title: "Profile showcase",     desc: "All your certificates display on your public profile, visible to recruiters at a glance." },
              ]} />
            </section>

            {/* ════ PROJECTS & CODE ════ */}

            <section className="mb-16">
              <SectionHeading id="projects" icon={<GitBranch size={15} />} label="Project Management" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Your projects are your proof of work. Publish them at <InlineCode>/projects</InlineCode> and let the community — and potential employers — see exactly what you&apos;ve built.
              </p>
              <FeatureGrid items={[
                { icon: <FileText size={13} />, title: "Full project page",   desc: "Add a description, tech stack, live demo URL, and GitHub link. Tell the story of what you built." },
                { icon: <Globe size={13} />,    title: "Get discovered",      desc: "Public projects show up in Explore and in the Spotlight sidebar seen by thousands of members." },
                { icon: <Laptop size={13} />,   title: "Code in the browser", desc: "Jump into the In-Browser IDE from any project and start editing without any local setup." },
                { icon: <Star size={13} />,     title: "Community recognition",desc: "Other members can star your work. Stars signal quality and push your project up the Explore rankings." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="ide" icon={<Laptop size={15} />} label="In-Browser IDE" badge={{ text: "New", color: "purple" }} />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                No local setup, no installs. The In-Browser IDE at <InlineCode>/IDEPage</InlineCode> gives you a full code editor right in your browser — open any project and start building immediately.
              </p>
              <Callout type="tip" title="Zero setup required">
                Open any project and click &quot;Open in IDE&quot; to jump straight into editing. Your work saves automatically so you never lose progress.
              </Callout>
            </section>

            <section className="mb-16">
              <SectionHeading id="explore" icon={<Globe size={15} />} label="Explore Projects" />
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                Browse thousands of community-built projects at <InlineCode>/Explore_Projects</InlineCode>. Filter by tech stack, sort by stars, get inspired, find collaborators, or hire directly from a project card.
              </p>
            </section>

            {/* ════ COMMUNITY ════ */}

            <section className="mb-16">
              <SectionHeading id="community-hubs" icon={<Cpu size={15} />} label="Community Hubs" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Join topic rooms at <InlineCode>/community</InlineCode> to discuss real challenges, share wins, and grow alongside people who do what you do. Every hub has thousands of active members.
              </p>
              <FeatureGrid items={[
                { icon: <Code2 size={13} />,  title: "Tech & Engineering",     desc: "Software engineers, data scientists, DevOps, and all things technology. 31.5k members." },
                { icon: <Sparkles size={13} />,title: "Design & Creativity",   desc: "UI/UX designers, brand strategists, illustrators, and visual creators. 19.7k members." },
                { icon: <Zap size={13} />,    title: "Founders & Startups",    desc: "Entrepreneurs and bootstrappers sharing growth, funding, and lessons learned. 14.2k members." },
                { icon: <TrendingUp size={13} />,title: "Marketing & Growth",  desc: "Performance marketers, content creators, SEO specialists, and growth hackers. 11.3k members." },
                { icon: <Briefcase size={13} />,title: "Finance & Business",   desc: "Finance professionals, analysts, consultants, and business strategists. 8.6k members." },
                { icon: <GraduationCap size={13} />,title: "Education & Research",desc: "Academics, educators, researchers, and lifelong learners sharing knowledge globally. 6.4k members." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="posts-feed" icon={<Rss size={15} />} label="Posts & Feed" />
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                Share knowledge, ask for help, or show off what you built. Any member can post text, code snippets, or images. Your posts reach your followers instantly and live at a shareable public link.
              </p>
            </section>

            <section className="mb-16">
              <SectionHeading id="blog" icon={<ScrollText size={15} />} label="Blog" />
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                In-depth articles, tutorials, and insights from the beone<span className="text-blue-600 dark:text-blue-400">of</span>us team and verified contributors. Stay informed, learn new approaches, and get ahead in your career — all at <InlineCode>/blog</InlineCode>.
              </p>
            </section>

            {/* ════ AI FEATURES ════ */}

            <section className="mb-16">
              <SectionHeading id="ai-assistant" icon={<Sparkles size={15} />} label="AI Assistant" badge={{ text: "Always on", color: "purple" }} />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Your personal AI assistant is available on every page, around the clock. Whether you need help with code, writing a message, or deciding what to learn next — it&apos;s one click away.
              </p>
              <FeatureGrid items={[
                { icon: <Sparkles size={13} />, title: "Understands context",  desc: "Ask about a course you&apos;re viewing, a project you&apos;re building, or your own profile — it knows what page you&apos;re on." },
                { icon: <Zap size={13} />,      title: "Instant answers",      desc: "Responses arrive in under a second so you stay in flow without waiting." },
                { icon: <Code2 size={13} />,    title: "Debug & review code",  desc: "Paste any snippet and get a plain-English explanation, bug fix, or refactor suggestion." },
                { icon: <Globe size={13} />,    title: "Never out of reach",   desc: "The floating button lives in the bottom-right corner on every page — open it any time." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="cv-analysis" icon={<FileText size={15} />} label="AI CV Analysis" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Paste your resume into the CV Analyzer in your profile settings. The AI reads it, pulls out your skills and experience, and tells you exactly how to make it stronger — in seconds.
              </p>
              <FeatureGrid items={[
                { icon: <Zap size={13} />,      title: "Instant experience read",desc: "Calculates your total years of experience automatically from your work history." },
                { icon: <Star size={13} />,     title: "Skills auto-saved",      desc: "Your top skills are identified and added to your profile — no manual tagging." },
                { icon: <FileText size={13} />, title: "Honest improvement tips",desc: "Get specific, actionable advice on what to add, remove, or reword to stand out." },
                { icon: <Briefcase size={13} />,title: "Higher job match scores", desc: "Better profile data means the platform surfaces more relevant job opportunities for you." },
              ]} />
            </section>

            {/* ════ CAREER & BUSINESS ════ */}

            <section className="mb-16">
              <SectionHeading id="job-matching" icon={<Briefcase size={15} />} label="Jobs & Services" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Stop scrolling through listings that don&apos;t fit. The platform matches your profile to active jobs across all industries and shows you the roles where you&apos;re most qualified — ranked by compatibility. You can also post your own freelance services and get hired by clients directly.
              </p>
              <FeatureGrid items={[
                { icon: <Zap size={13} />,         title: "Match score (%)",      desc: "Each listing shows a percentage compatibility score against your skills." },
                { icon: <FileText size={13} />,    title: "Match reason",         desc: "Plain-English explanation of why you're a good fit for each role." },
                { icon: <CheckCircle2 size={13} />,title: "Application tracking", desc: "Dashboard view with live status updates (Pending / Accepted / Rejected)." },
                { icon: <MessageSquare size={13} />,title: "Employer messages",   desc: "Accepted applications include direct messages and next steps." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="mentorship" icon={<Users size={15} />} label="Mentorship & Coaching" badge={{ text: "1-on-1", color: "green" }} />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Get direct access to experienced professionals who have already done what you are trying to do. Book a session, bring your questions, and leave with a clear path forward.
              </p>
              <FeatureGrid items={[
                { icon: <Users size={13} />,       title: "1-on-1 Mentorship",       desc: "Book private sessions with verified mentors in your field — tech, design, business, marketing, finance, and more." },
                { icon: <Star size={13} />,        title: "Career coaching",          desc: "Get guidance on career pivots, promotions, salary negotiation, interview prep, and long-term planning." },
                { icon: <CalendarDays size={13} />,title: "Scheduled sessions",       desc: "Pick a time that works for you. Sessions are tracked on your dashboard so you can review notes and action items." },
                { icon: <CheckCircle2 size={13} />,title: "Actionable outcomes",      desc: "Every session focuses on concrete next steps — not generic advice. Walk away knowing exactly what to do next." },
                { icon: <TrendingUp size={13} />,  title: "Skill gap analysis",       desc: "Your mentor helps you identify exactly which skills are holding you back and builds a plan to close the gap." },
                { icon: <Award size={13} />,       title: "Become a mentor",          desc: "Experienced professionals can apply to become mentors, offer sessions at their own rate, and earn from their expertise." },
              ]} />
              <Callout type="tip" title="Premium feature">
                Mentorship sessions are available to Premium members. Upgrade from your profile settings to unlock 1-on-1 bookings.
              </Callout>
            </section>

            <section className="mb-16">
              <SectionHeading id="founder-dash" icon={<Crown size={15} />} label="Founder Dashboard" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                The Founder Dashboard (<InlineCode>/founder-dashboard</InlineCode>) is gated to accepted co-founders and provides team management, applicant review, billing, and platform-wide controls.
              </p>
              <Callout type="info" title="Access requirements">
                Submit a founder application at <InlineCode>/member/application</InlineCode> with role <em>co-founder</em> and get approved by an existing admin.
              </Callout>
              <FeatureGrid items={[
                { icon: <Users size={13} />,       title: "Team management",       desc: "View all members, co-founders, and pending applicants in one place." },
                { icon: <ShieldCheck size={13} />, title: "Verification controls", desc: "Grant or revoke verification badges for any user on the platform." },
                { icon: <Star size={13} />,        title: "Billing overview",      desc: "Track premium subscribers, sponsor contracts, and revenue metrics." },
                { icon: <Bell size={13} />,        title: "Platform alerts",       desc: "High-priority system notifications visible only to founders and admins." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="member-dash" icon={<ShieldCheck size={15} />} label="Member Dashboard" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                The Member Dashboard (<InlineCode>/member-dashboard</InlineCode>) surfaces tasks, notifications, and activity assigned by the founding team.
              </p>
              <Callout type="info" title="Access requirements">
                Submit an application at <InlineCode>/member/application</InlineCode> with role <em>member</em> and wait for founder approval.
              </Callout>
            </section>

            <section className="mb-16">
              <SectionHeading id="sponsors" icon={<Star size={15} />} label="Sponsors" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Companies can sponsor beone<span className="text-blue-600 dark:text-blue-400">of</span>us at <InlineCode>/sponsors</InlineCode> to put their brand in front of thousands of active developers, promote job openings, and hire directly from a curated talent pool.
              </p>
              <FeatureGrid items={[
                { icon: <Star size={13} />,  title: "Bronze",   desc: "Logo placement in the footer and sponsor listing page." },
                { icon: <Zap size={13} />,   title: "Silver",   desc: "Feed banner and job postings promoted to matched candidates." },
                { icon: <Award size={13} />, title: "Gold",     desc: "Featured sponsor card on the home feed with priority job matching." },
                { icon: <Crown size={13} />, title: "Platinum", desc: "Dedicated profile page, newsletter inclusion, and direct candidate outreach." },
              ]} />
            </section>

            {/* ════ ACCOUNT ════ */}

            <section className="mb-16">
              <SectionHeading id="premium" icon={<Crown size={15} />} label="Premium Tier" badge={{ text: "New", color: "amber" }} />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Premium unlocks the full beone<span className="text-blue-600 dark:text-blue-400">of</span>us experience — more visibility, faster AI responses, and access to the Marketplace where you can earn from your skills.
              </p>
              <FeatureGrid items={[
                { icon: <Crown size={13} />,       title: "Gold crown badge",        desc: "Stand out with a gold crown next to your name on your profile, posts, and in every conversation." },
                { icon: <Zap size={13} />,         title: "Faster AI responses",     desc: "Skip the line — Premium members get priority access to the AI assistant for quicker answers." },
                { icon: <Star size={13} />,        title: "More profile visibility", desc: "Premium profiles appear more often in Spotlight, getting seen by more recruiters and collaborators." },
                { icon: <ShoppingBag size={13} />, title: "Marketplace access",      desc: "Offer your services — code reviews, consulting, templates — and get paid directly through the platform." },
              ]} />
              <Callout type="tip" title="How to go Premium">
                Request Premium from your profile settings page. The team reviews and activates it — usually within 24 hours.
              </Callout>
            </section>

            <section className="mb-16">
              <SectionHeading id="verification" icon={<BadgeCheck size={15} />} label="Verification Badge" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                The blue checkmark tells the community your identity and skills have been reviewed by the beone<span className="text-blue-600 dark:text-blue-400">of</span>us team. Verified developers get more visibility in Spotlight and rank higher in job matching results.
              </p>
              <Callout type="info" title="How to get verified">
                Open a support ticket at <InlineCode>/dash/more?tool=support</InlineCode> with a brief note about who you are and what you build. The team reviews and grants your badge.
              </Callout>
            </section>

            <section className="mb-16">
              <SectionHeading id="marketplace" icon={<ShoppingBag size={15} />} label="Marketplace" />
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                The Marketplace at <InlineCode>/dash/marketplace</InlineCode> is where developers turn skills into income. Offer code reviews, 1-on-1 consulting sessions, starter templates, or any service you can deliver. Buyers find you, you set the price, and payment flows through the platform. Requires Premium membership to list or purchase.
              </p>
            </section>

            {/* Footer nav */}
            <div className="flex flex-wrap items-center justify-between pt-8 mt-4 border-t border-gray-200 dark:border-gray-800 gap-3">
              <Link href="/how_it_works" className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
                <ChevronRight size={14} className="rotate-180" /> How It Works
              </Link>
              <div className="flex items-center gap-3">
                <Link href="/resources" className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  Academy <ChevronRight size={14} />
                </Link>
                <Link href="/dash" className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-500/20 whitespace-nowrap">
                  Open Dashboard <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </main>

        {/* Right TOC sidebar (in flex flow — no mr offset needed on main) */}
        <aside className="hidden lg:block w-56 xl:w-60 shrink-0 py-10 pr-4 xl:pr-6">
          <div className="sticky top-20 overflow-y-auto max-h-[calc(100vh-6rem)] no-scrollbar">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 px-2">On this page</p>
            <ul className="space-y-0.5 border-l border-gray-200 dark:border-gray-800 pl-3">
              {ALL_LINKS.map(link => (
                <li key={`toc-${link.id}`}>
                  <button
                    onClick={() => scrollTo(link.id)}
                    className={`text-xs text-left w-full py-1 px-2 rounded-md transition-all truncate ${
                      activeId === link.id
                        ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    }`}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-5 border-t border-gray-200 dark:border-gray-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 px-2">Quick links</p>
              <ul className="space-y-1">
                {[
                  { href: "/dash",                   label: "Dashboard", icon: LayoutDashboard },
                  { href: "/resources",                label: "Academy",   icon: GraduationCap },
                  { href: "/Explore_Projects",       label: "Explore",   icon: Globe },
                  { href: "/dash/more?tool=support", label: "Support",   icon: ExternalLink },
                ].map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50">
                      <Icon size={12} className="opacity-70 shrink-0" /> {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
