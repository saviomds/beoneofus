"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../supabaseClient";
import { usePlatformVersion } from "../../hooks/usePlatformVersion";
import {
  Search, Menu, X, ChevronRight, ChevronDown,
  ShieldCheck, Zap, BookOpen, ExternalLink,
  LayoutDashboard, MessageSquare, Briefcase, Network,
  Users, Bell, Star, Globe,
  Cpu, Award, FileText, Sparkles, Hash,
  ArrowRight, CheckCircle2, Rss, ShoppingBag,
  UserCircle, GitBranch, ScrollText, BadgeCheck,
  Crown, Plane, GraduationCap, ListChecks, UploadCloud,
  Building2, ClipboardList, LifeBuoy,
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
    group: "Study & Work Abroad",
    icon: Plane,
    links: [
      { id: "study-abroad",   label: "Study Abroad",        icon: GraduationCap },
      { id: "work-abroad",    label: "Work Abroad",         icon: Briefcase },
      { id: "journey",        label: "Application Journey", icon: ListChecks },
      { id: "requirements",   label: "Requirements",        icon: FileText },
      { id: "documents",      label: "Documents & Review",  icon: UploadCloud },
      { id: "advisor",        label: "Your Advisor",        icon: MessageSquare },
    ],
  },
  {
    group: "For Institutions",
    icon: Building2,
    links: [
      { id: "institutions",   label: "Organization Pages",  icon: Building2 },
      { id: "org-verification", label: "Organization Verification", icon: BadgeCheck },
      { id: "programmes",     label: "Programmes & Jobs",   icon: ClipboardList },
    ],
  },
  {
    group: "Dashboard",
    icon: LayoutDashboard,
    links: [
      { id: "home-feed",      label: "Home & Feed",         icon: Rss },
      { id: "profile",        label: "Profile",             icon: UserCircle },
      { id: "notifications",  label: "Notifications",       icon: Bell },
    ],
  },
  {
    group: "Networking",
    icon: Network,
    links: [
      { id: "connections",    label: "Connections",         icon: Users },
      { id: "messaging",      label: "Messaging",           icon: MessageSquare },
    ],
  },
  {
    group: "Community",
    icon: Users,
    links: [
      { id: "community-hubs", label: "Groups & Community",  icon: Cpu },
      { id: "posts-feed",     label: "Posts & Stories",     icon: Rss },
      { id: "blog",           label: "Blog",                icon: ScrollText },
    ],
  },
  {
    group: "Jobs & Earning",
    icon: Briefcase,
    links: [
      { id: "job-matching",   label: "Jobs & Services",     icon: Briefcase },
      { id: "marketplace",    label: "Marketplace",         icon: ShoppingBag },
      { id: "sponsors",       label: "Sponsors",            icon: Star },
    ],
  },
  {
    group: "Account",
    icon: ShieldCheck,
    links: [
      { id: "premium",        label: "Premium",             icon: Crown },
      { id: "verification",   label: "Verification Badge",  icon: BadgeCheck },
      { id: "support",        label: "Help & Support",      icon: LifeBuoy },
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

  type StatKey = "professionals" | "jobs" | "connections";
  const [stats, setStats] = useState<Record<StatKey, string>>({
    professionals: "…",
    jobs:          "…",
    connections:   "…",
  });

  useEffect(() => {
    const fmt = (n: number | null | undefined) =>
      n == null ? "—"
      : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+`
      : `${n}+`;
    // get_public_stats is a SECURITY DEFINER RPC, so signed-out visitors see real
    // totals (direct counts are limited by row-level security).
    supabase.rpc("get_public_stats").single().then(({ data, error }: { data: any; error: any }) => {
      if (!error && data) {
        setStats({ professionals: fmt(data.professionals), jobs: fmt(data.jobs), connections: fmt(data.connections) });
        return;
      }
      Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("connections").select("id", { count: "exact", head: true }).eq("status", "accepted"),
      ]).then(([pr, j, m]) => setStats({ professionals: fmt(pr.count), jobs: fmt(j.count), connections: fmt(m.count) }));
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
            { href: "/dash/jobs",              label: "Jobs",           icon: Briefcase },
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
            <Image src="/logo.svg" alt="beoneofus" width={20} height={20} unoptimized className="shrink-0" />
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
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4 leading-tight">
                beone<span className="text-blue-600 dark:text-blue-400">of</span>us{" "}
                <span className="text-blue-600 dark:text-blue-500">Documentation</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                <strong className="text-gray-900 dark:text-white">
                  beone<span className="text-blue-600 dark:text-blue-400">of</span>us
                </strong>{" "}
                helps graduates and school-leavers from Rwanda study or work abroad in Mauritius. We guide you through
                your application, requirements, documents and review, and give you a professional network,
                jobs and a community to grow with along the way.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {([
                  { label: "Students & graduates", key: "professionals" as StatKey, color: "text-blue-600 dark:text-blue-400" },
                  { label: "Jobs & internships",   key: "jobs"          as StatKey, color: "text-purple-600 dark:text-purple-400" },
                  { label: "Connections",          key: "connections"   as StatKey, color: "text-emerald-600 dark:text-emerald-400" },
                ] as const).map(s => (
                  <div key={s.label} className="p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 text-center">
                    <p className={`text-xl sm:text-2xl font-black tabular-nums ${s.color}`}>{stats[s.key]}</p>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <Callout type="new" title={`Platform ${vTag} — ${vLabel}`}>
                Study Abroad and Work Abroad applications are open, with document review, advisor messaging and final
                documents in your application dashboard.
              </Callout>
            </section>

            <section className="mb-16">
              <SectionHeading id="quick-start" icon={<Zap size={15} />} label="Quick Start" badge={{ text: "5 min", color: "green" }} />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                The fastest way to get going. The full guide is at <InlineCode>/quick-start</InlineCode>.
              </p>
              <StepList steps={[
                { n: 1, title: "Create your account",        desc: "Sign up at /auth with your email or Google, then confirm your email. One account works for everything on beoneofus." },
                { n: 2, title: "Choose Study or Work Abroad", desc: "Go to /apply and pick the journey that fits you. You can see what each needs at /requirements first." },
                { n: 3, title: "Send your initial application", desc: "Fill in your personal details and submit. Our team reviews it — you don't need to do anything while it's under review." },
                { n: 4, title: "Complete your full application", desc: "Once confirmed, add your education or work history, then upload each required document." },
                { n: 5, title: "Build your profile and network", desc: "Complete your profile, connect with people and follow jobs in the dashboard at /dash while your application moves forward." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="architecture" icon={<Globe size={15} />} label="What We Offer" />
              <p className="text-gray-600 dark:text-gray-400 mb-5 leading-relaxed text-sm sm:text-base">
                One account gives you a guided path abroad and a place to grow your career.
              </p>
              <FeatureGrid items={[
                { icon: <GraduationCap size={13} />, title: "Study Abroad",             desc: "Apply to study in Mauritius — from certificates to PhDs — with an advisor guiding your application." },
                { icon: <Plane size={13} />,         title: "Work Abroad",              desc: "Apply for jobs and work placements in Mauritius, with every document checked along the way." },
                { icon: <ListChecks size={13} />,    title: "A clear, tracked journey",  desc: "Your application dashboard always shows your current stage, what's missing and what happens next." },
                { icon: <Users size={13} />,         title: "Network & community",      desc: "Connect with people, join groups and events, and share updates in the feed." },
                { icon: <Briefcase size={13} />,     title: "Jobs & opportunities",     desc: "Browse jobs, internships and remote work, and apply with your profile." },
                { icon: <Building2 size={13} />,     title: "For institutions",         desc: "Schools, universities, employers and programmes create verified pages to open opportunities." },
              ]} />
            </section>

            {/* ════ STUDY & WORK ABROAD ════ */}

            <section className="mb-16">
              <SectionHeading id="study-abroad" icon={<GraduationCap size={15} />} label="Study Abroad" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Study in Mauritius at certificate, diploma, bachelor&apos;s, master&apos;s or PhD level, or on a short course.
                Tell us your preferred field, programme, institution and intake when you apply — your advisor confirms what
                is realistic for your background once your application is confirmed. Start at <InlineCode>/apply?type=study</InlineCode>.
              </p>
              <Callout type="tip" title="Before you apply">
                Have a valid passport (or one in progress), your latest academic transcript, proof of funds and a short
                statement of purpose ready. See <Link href="/study-abroad" className="text-blue-600 dark:text-blue-400 hover:underline">Study Abroad</Link> for details.
              </Callout>
            </section>

            <section className="mb-16">
              <SectionHeading id="work-abroad" icon={<Briefcase size={15} />} label="Work Abroad" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Apply for roles and work placements in Mauritius across technology, hospitality, finance and more. Your
                advisor reviews your application and requirements with you, and every document is checked before
                approval. Start at <InlineCode>/apply?type=work</InlineCode>.
              </p>
            </section>

            <section className="mb-16">
              <SectionHeading id="journey" icon={<ListChecks size={15} />} label="Application Journey" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Every application follows the same clear stages. You can follow yours at <InlineCode>/apply/dashboard</InlineCode>.
              </p>
              <StepList steps={[
                { n: 1, title: "Create your account",          desc: "Already on beoneofus? Your existing account works — no need to sign up again." },
                { n: 2, title: "Start your application",       desc: "Choose Study Abroad or Work Abroad and complete the initial application with your personal details." },
                { n: 3, title: "Under review",                 desc: "Our team reviews your initial submission. Nothing else is needed from you at this stage." },
                { n: 4, title: "Application confirmed",        desc: "The next stage unlocks: your full application, personalised requirements and documents." },
                { n: 5, title: "Complete your full application", desc: "Add your education or employment history and travel information." },
                { n: 6, title: "Upload your documents",        desc: "Upload each required document and track the status of every one." },
                { n: 7, title: "Document review",              desc: "Each document is approved, or you are told exactly what to correct and why." },
                { n: 8, title: "Approval & final documents",   desc: "Once everything is approved and processed, your final document package is ready to download." },
              ]} />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                See the illustrated version at <Link href="/how-it-works" className="text-blue-600 dark:text-blue-400 hover:underline">How It Works</Link>.
              </p>
            </section>

            <section className="mb-16">
              <SectionHeading id="requirements" icon={<FileText size={15} />} label="Requirements" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                These are the general requirements. Your personalised list appears in your application once it is confirmed.
              </p>
              <FeatureGrid items={[
                { icon: <GraduationCap size={13} />, title: "Study Abroad", desc: "Valid passport (12+ months), official academic transcript, proof of funds, statement of purpose. English test (IELTS/TOEFL) if your prior education was not in English." },
                { icon: <Briefcase size={13} />,     title: "Work Abroad",  desc: "Valid passport (12+ months), police clearance (last 6 months), up-to-date CV, proof of work experience. An employment contract draft or medical certificate may also be needed." },
              ]} />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Full list: <Link href="/requirements" className="text-blue-600 dark:text-blue-400 hover:underline">Requirements</Link>.
              </p>
            </section>

            <section className="mb-16">
              <SectionHeading id="documents" icon={<UploadCloud size={15} />} label="Documents & Review" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Upload documents from the Documents tab of your application. PDF, JPG and PNG files up to 10 MB are accepted.
                Each document shows its own status, so you always know what is approved and what still needs work.
              </p>
              <FeatureGrid items={[
                { icon: <UploadCloud size={13} />,  title: "Upload & replace",   desc: "Upload each required document, and re-upload any time a correction is requested." },
                { icon: <CheckCircle2 size={13} />, title: "Per-document status", desc: "See which documents are pending, approved or need changes." },
                { icon: <MessageSquare size={13} />,title: "Clear feedback",     desc: "If something needs fixing, the reviewer explains exactly what and why." },
                { icon: <Award size={13} />,        title: "Final documents",    desc: "When your application is complete, download your final document package from the application." },
              ]} />
              <Callout type="info" title="Your documents are private">
                Application documents are stored privately and are only visible to you and the beoneofus team reviewing your application.
              </Callout>
            </section>

            <section className="mb-16">
              <SectionHeading id="advisor" icon={<MessageSquare size={15} />} label="Your Advisor" />
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                Every application has its own conversation with the beoneofus team, in the Messages tab of your application.
                Ask questions, get updates and receive guidance there. You are also notified whenever your application
                status or a document changes.
              </p>
            </section>

            {/* ════ FOR INSTITUTIONS ════ */}

            <section className="mb-16">
              <SectionHeading id="institutions" icon={<Building2 size={15} />} label="Organization Pages" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Schools and universities in Rwanda and Mauritius, employers, and scholarship or placement programmes can
                create a free organization page at <InlineCode>/organizations/new</InlineCode>. Each page has its own
                console for your team. Learn more at <Link href="/for-institutions" className="text-blue-600 dark:text-blue-400 hover:underline">For Institutions</Link>.
              </p>
              <FeatureGrid items={[
                { icon: <Building2 size={13} />, title: "Public page",  desc: "Your organization's profile, what you offer and how to reach you." },
                { icon: <Users size={13} />,     title: "Team access",  desc: "Invite colleagues as admins, recruiters or programme managers." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="org-verification" icon={<BadgeCheck size={15} />} label="Organization Verification" />
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                Request verification from your organization console. The beoneofus team reviews your information and, once
                approved, a verified badge appears on your page so students, workers and partners know you are genuine.
              </p>
            </section>

            <section className="mb-16">
              <SectionHeading id="programmes" icon={<ClipboardList size={15} />} label="Programmes & Jobs" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Run intakes, cohorts, scholarships or placement programmes from your console, and add participants to track
                their progress. Employers can post jobs, internships and placements — every post is reviewed before it goes live.
              </p>
              <FeatureGrid items={[
                { icon: <ClipboardList size={13} />, title: "Programmes & participants", desc: "Create programmes and keep each participant's status up to date." },
                { icon: <Briefcase size={13} />,     title: "Job posts",                 desc: "Publish opportunities that appear on the Jobs board once approved." },
                { icon: <Star size={13} />,          title: "Outcomes",                  desc: "See enrolment, completion and placement figures from your own data, with suggested next actions." },
              ]} />
            </section>

            {/* ════ DASHBOARD ════ */}

            <section className="mb-16">
              <SectionHeading id="home-feed" icon={<Rss size={15} />} label="Home & Feed" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                <InlineCode>/dash/home</InlineCode> shows your connections, unread messages and notifications at a glance, with
                quick actions and a getting-started checklist. The feed at <InlineCode>/dash/feed</InlineCode> shows posts and stories
                from the community, updated live.
              </p>
            </section>

            <section className="mb-16">
              <SectionHeading id="profile" icon={<UserCircle size={15} />} label="Profile" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Edit your profile at <InlineCode>/dash/profile</InlineCode>. Your public profile lives at <InlineCode>/u/[username]</InlineCode>.
              </p>
              <FeatureGrid items={[
                { icon: <UserCircle size={13} />, title: "Profile strength",   desc: "Add your photo, bio, location, skills and links — the home page shows what is still missing." },
                { icon: <Star size={13} />,       title: "Skill endorsements", desc: "Connections can endorse your skills on your public profile." },
                { icon: <BadgeCheck size={13} />, title: "Verified badge",     desc: "Verified accounts show a blue checkmark across the platform." },
                { icon: <GitBranch size={13} />,  title: "GitHub activity",    desc: "Optionally link GitHub to show your contributions." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="notifications" icon={<Bell size={15} />} label="Notifications" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Connection requests, messages, application updates and post activity reach you instantly at{" "}
                <InlineCode>/dash/notifications</InlineCode>. You can also turn on browser push notifications in Settings.
              </p>
            </section>

            {/* ════ NETWORKING ════ */}

            <section className="mb-16">
              <SectionHeading id="connections" icon={<Users size={15} />} label="Connections" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Connections are mutual — nobody can message you unless you accept their request.
              </p>
              <StepList steps={[
                { n: 1, title: "Find someone",       desc: "Use search, suggestions on the right of the dashboard, or visit their profile at /u/[username]." },
                { n: 2, title: "Send a request",     desc: 'Click "Connect". It shows as pending until they respond.' },
                { n: 3, title: "Start talking",      desc: "Once accepted, you can message each other directly." },
                { n: 4, title: "Manage connections", desc: "See and remove connections any time at /dash/connections." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="messaging" icon={<MessageSquare size={15} />} label="Messaging" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Message your connections at <InlineCode>/dash/messages</InlineCode>. Conversations are private and update in real time.
              </p>
              <FeatureGrid items={[
                { icon: <CheckCircle2 size={13} />, title: "Read receipts",     desc: "See when your message has been read." },
                { icon: <MessageSquare size={13} />,title: "Typing indicators", desc: "See when the other person is typing." },
                { icon: <Star size={13} />,         title: "Reactions",         desc: "React to individual messages." },
                { icon: <FileText size={13} />,     title: "Images & files",    desc: "Share images and files inside the conversation." },
              ]} />
            </section>

            {/* ════ COMMUNITY ════ */}

            <section className="mb-16">
              <SectionHeading id="community-hubs" icon={<Cpu size={15} />} label="Groups & Community" />
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                Join or create groups at <InlineCode>/dash/groups</InlineCode>, find events at <InlineCode>/dash/events</InlineCode>, and
                talk with the wider community in the Community Hub at <InlineCode>/dash/more?tool=community</InlineCode>.
              </p>
            </section>

            <section className="mb-16">
              <SectionHeading id="posts-feed" icon={<Rss size={15} />} label="Posts & Stories" />
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                Share updates, questions and photos in the feed. Stories — photo or text — appear at the top of the feed and
                disappear after 24 hours. You can report any post that breaks the rules.
              </p>
            </section>

            <section className="mb-16">
              <SectionHeading id="blog" icon={<ScrollText size={15} />} label="Blog" />
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                Articles, guides and news from the beone<span className="text-blue-600 dark:text-blue-400">of</span>us team and
                community at <InlineCode>/blog</InlineCode>. Members can write and publish from <InlineCode>/dash/blog</InlineCode>.
              </p>
            </section>

            {/* ════ JOBS & EARNING ════ */}

            <section className="mb-16">
              <SectionHeading id="job-matching" icon={<Briefcase size={15} />} label="Jobs & Services" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Browse jobs and internships at <InlineCode>/dash/jobs</InlineCode>, remote work at <InlineCode>/dash/freelance</InlineCode>,
                and companies at <InlineCode>/dash/companies</InlineCode>. You can also offer your own services at <InlineCode>/dash/services</InlineCode>.
              </p>
              <FeatureGrid items={[
                { icon: <Briefcase size={13} />,    title: "Apply with your profile", desc: "Apply to openings and follow each application's status." },
                { icon: <CheckCircle2 size={13} />, title: "Reviewed listings",       desc: "Job posts and company pages are reviewed before they appear." },
              ]} />
            </section>

            <section className="mb-16">
              <SectionHeading id="marketplace" icon={<ShoppingBag size={15} />} label="Marketplace" />
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                The Marketplace at <InlineCode>/dash/marketplace</InlineCode> lets members list and buy digital products and
                services. Paid purchases are processed securely through Paystack.
              </p>
            </section>

            <section className="mb-16">
              <SectionHeading id="sponsors" icon={<Star size={15} />} label="Sponsors" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Organizations can support beone<span className="text-blue-600 dark:text-blue-400">of</span>us and its students at{" "}
                <InlineCode>/sponsors</InlineCode>. Applications are reviewed by our team, and active sponsors appear on the platform
                with their own sponsor dashboard.
              </p>
              <FeatureGrid items={[
                { icon: <Star size={13} />,  title: "Bronze", desc: "Listed on the sponsors page." },
                { icon: <Zap size={13} />,   title: "Silver", desc: "Greater visibility across the platform." },
                { icon: <Award size={13} />, title: "Gold",   desc: "Our most prominent sponsor placement." },
              ]} />
            </section>

            {/* ════ ACCOUNT ════ */}

            <section className="mb-16">
              <SectionHeading id="premium" icon={<Crown size={15} />} label="Premium" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                Premium is an optional monthly or annual membership at <InlineCode>/dash/premium</InlineCode>. It adds a premium badge
                to your profile and posts and gives you more visibility across the platform. Payment is handled securely by Paystack.
              </p>
              <Callout type="tip" title="Applying abroad is not a Premium feature">
                You can create an account and start a Study Abroad or Work Abroad application without paying for Premium.
              </Callout>
            </section>

            <section className="mb-16">
              <SectionHeading id="verification" icon={<BadgeCheck size={15} />} label="Verification Badge" />
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm sm:text-base">
                The blue checkmark shows your account has been reviewed by the beone<span className="text-blue-600 dark:text-blue-400">of</span>us team.
              </p>
              <Callout type="info" title="How to get verified">
                Complete your profile, then go to <InlineCode>/dash/settings</InlineCode> and choose <em>Request verification</em>.
                The team reviews your request and grants the badge.
              </Callout>
            </section>

            <section className="mb-16">
              <SectionHeading id="support" icon={<LifeBuoy size={15} />} label="Help & Support" />
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                Questions about your application? Use the Messages tab inside it. For anything else, open a support ticket at{" "}
                <InlineCode>/dash/more?tool=support</InlineCode> or reach us through the <Link href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">contact page</Link>.
              </p>
            </section>

            {/* Footer nav */}
            <div className="flex flex-wrap items-center justify-between pt-8 mt-4 border-t border-gray-200 dark:border-gray-800 gap-3">
              <Link href="/how-it-works" className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
                <ChevronRight size={14} className="rotate-180" /> How It Works
              </Link>
              <div className="flex items-center gap-3">
                <Link href="/resources" className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  Resources <ChevronRight size={14} />
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
                  { href: "/dash/jobs",              label: "Jobs",      icon: Briefcase },
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
