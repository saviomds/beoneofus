"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Terminal, ArrowLeft, Users, Globe, Cpu, Zap, Code2, MessageSquare,
  Palette, Rocket, TrendingUp, BookOpen, DollarSign, GraduationCap,
  ChevronRight, Star, Search, Hash, Briefcase, Award, ArrowUpRight,
} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "../supabaseClient";
const FloatingAiAssistant = dynamic(() => import("../components/FloatingAiAssistant"), { ssr: false });

function formatCount(n) {
  if (n == null) return "—";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const HUBS = [
  {
    label: "Tech & Engineering",
    href: "/community/tech-engineering",
    color: "blue",
    icon: <Code2 size={26} />,
    desc: "Web dev, systems, cloud, AI/ML, databases, mobile, DevOps, and everything in between.",
    tags: ["React", "Rust", "AI/ML", "DevOps", "Cloud"],
  },
  {
    label: "Design & Creativity",
    href: "/community/design-creativity",
    color: "violet",
    icon: <Palette size={26} />,
    desc: "UI/UX, brand identity, motion design, illustration, 3D, and design-led product thinking.",
    tags: ["Figma", "UI/UX", "Branding", "Motion", "3D"],
  },
  {
    label: "Founders & Startups",
    href: "/community/founders-startups",
    color: "emerald",
    icon: <Rocket size={26} />,
    desc: "Idea validation, fundraising, co-founder matching, growth, and the honest side of building.",
    tags: ["SaaS", "Fundraising", "MVP", "Co-founder", "Revenue"],
  },
  {
    label: "Marketing & Growth",
    href: "/community/marketing-growth",
    color: "amber",
    icon: <TrendingUp size={26} />,
    desc: "SEO, growth hacking, email marketing, paid ads, brand building, and community-led growth.",
    tags: ["SEO", "Growth", "Email", "Social", "Paid Ads"],
  },
  {
    label: "Finance & Business",
    href: "/community/finance-business",
    color: "indigo",
    icon: <DollarSign size={26} />,
    desc: "Investing, personal finance, financial modeling, FinTech, and serious business strategy.",
    tags: ["Investing", "FIRE", "FinTech", "Strategy", "M&A"],
  },
  {
    label: "Education & Research",
    href: "/community/education-research",
    color: "rose",
    icon: <GraduationCap size={26} />,
    desc: "Lifelong learners, researchers, educators, and students sharing knowledge and opportunities.",
    tags: ["EdTech", "Research", "STEM", "Learning", "AI"],
  },
];

const colorMap = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-900/20",    text: "text-blue-600 dark:text-blue-400",    border: "border-blue-100 dark:border-blue-800/40",    hero: "from-blue-600 to-indigo-700",    dot: "bg-blue-500", badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300", btn: "bg-blue-600 hover:bg-blue-700" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400", border: "border-violet-100 dark:border-violet-800/40", hero: "from-violet-600 to-purple-700", dot: "bg-violet-500", badge: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300", btn: "bg-violet-600 hover:bg-violet-700" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-800/40", hero: "from-emerald-600 to-teal-700", dot: "bg-emerald-500", badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300", btn: "bg-emerald-600 hover:bg-emerald-700" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-900/20",  text: "text-amber-600 dark:text-amber-400",  border: "border-amber-100 dark:border-amber-800/40",  hero: "from-amber-500 to-orange-600",  dot: "bg-amber-500",  badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",  btn: "bg-amber-500 hover:bg-amber-600" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-100 dark:border-indigo-800/40", hero: "from-indigo-700 to-slate-800",  dot: "bg-indigo-500", badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300", btn: "bg-indigo-600 hover:bg-indigo-700" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-900/20",    text: "text-rose-600 dark:text-rose-400",    border: "border-rose-100 dark:border-rose-800/40",    hero: "from-rose-600 to-pink-700",    dot: "bg-rose-500",   badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",    btn: "bg-rose-600 hover:bg-rose-700" },
};

export default function CommunityPage() {
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("groups").select("id", { count: "exact", head: true }),
      supabase.from("community_messages").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
    ]).then(([profiles, groups, messages, projects]) => {
      setStats({
        members:  profiles.count  ?? 0,
        groups:   groups.count    ?? 0,
        messages: messages.count  ?? 0,
        projects: projects.count  ?? 0,
      });
    }).catch(() => {});
  }, []);
  const filtered = HUBS.filter(h =>
    h.label.toLowerCase().includes(search.toLowerCase()) ||
    h.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-x-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="font-black text-xl tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100 shrink-0">
            <Terminal className="text-blue-500" size={24} />
            <span>beone<span className="text-blue-600 dark:text-blue-400">of</span>us</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/resources" className="hidden sm:flex text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Resources</Link>
            <Link href="/quick-start" className="hidden md:flex text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Quick Start</Link>
            <Link href="/" className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1.5 transition-colors">
              <ArrowLeft size={14} /> Home
            </Link>
            <Link href="/auth" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
              Join Free
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16 relative z-10">
        {/* Hero */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 relative text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest mb-8">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              {stats ? `${formatCount(stats.members)} members` : "Growing community"} · Join Free
            </div>
            <h1 className="text-4xl sm:text-7xl font-black tracking-tight mb-5 leading-tight">
              6 Communities.<br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                Endless Opportunity.
              </span>
            </h1>
            <p className="text-gray-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
              Find your professional home. Learn from peers, share what works, discover opportunities, and build a career on your terms.
            </p>

            {/* Platform Stats — real data from DB */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-10">
              {[
                { label: "Members",   key: "members",  Icon: Users          },
                { label: "Groups",    key: "groups",   Icon: Hash           },
                { label: "Messages",  key: "messages", Icon: MessageSquare  },
                { label: "Projects",  key: "projects", Icon: Briefcase      },
              ].map(({ label, key, Icon }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <Icon size={16} className="text-gray-400 mb-2" />
                  <p className="text-2xl font-black">{stats ? formatCount(stats[key]) : "—"}</p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search communities, topics, tags..."
                className="w-full pl-10 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Hubs Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black tracking-tight">
              {search ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : "All Communities"}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} hubs</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg font-medium">No communities match &quot;{search}&quot;</p>
              <button onClick={() => setSearch("")} className="mt-4 text-blue-500 text-sm font-bold hover:text-blue-600 transition-colors">Clear search</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map(({ label, href, color, icon, desc, tags }) => {
                const c = colorMap[color] || colorMap.blue;
                return (
                  <Link key={label} href={href}
                    className={`group relative flex flex-col bg-white dark:bg-gray-900 border ${c.border} rounded-3xl p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30 ${c.bg} -translate-y-1/2 translate-x-1/2`} />
                    <div className="mb-5 relative">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${c.bg} ${c.text} shrink-0`}>{icon}</div>
                    </div>
                    <h3 className={`text-lg font-black mb-2 ${c.text} group-hover:opacity-90 transition-opacity`}>{label}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4 flex-1">{desc}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {tags.map(tag => (
                        <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                      <span className={`text-xs font-bold flex items-center gap-1 ${c.text}`}>
                        Explore <ArrowUpRight size={12} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick links bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/quick-start" className="flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl flex items-center justify-center shrink-0"><Zap size={18} /></div>
              <div className="min-w-0">
                <p className="font-black text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">New here? Quick Start Guide</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Get set up in under 10 minutes</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors shrink-0 ml-auto" />
            </Link>
            <Link href="/resources" className="flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="w-10 h-10 bg-violet-50 dark:bg-violet-900/20 text-violet-500 rounded-xl flex items-center justify-center shrink-0"><BookOpen size={18} /></div>
              <div className="min-w-0">
                <p className="font-black text-sm text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Resources & Tools</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Courses, IDE, certificates, docs</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-violet-400 transition-colors shrink-0 ml-auto" />
            </Link>
            <Link href="/dash/more?tool=community" className="flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-xl flex items-center justify-center shrink-0"><MessageSquare size={18} /></div>
              <div className="min-w-0">
                <p className="font-black text-sm text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Open Live Community Hub</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Real-time discussions inside the platform</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-400 transition-colors shrink-0 ml-auto" />
            </Link>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-12 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-black mb-3">Ready to find your community?</h2>
              <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">Create your free account in 60 seconds and get access to all 6 communities, the job board, mentorship network, and more.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/auth" className="px-8 py-3.5 bg-white text-gray-900 font-black rounded-2xl hover:bg-gray-100 transition-colors text-sm shadow-lg">
                  Create Free Account
                </Link>
                <Link href="/quick-start" className="px-8 py-3.5 bg-white/10 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors text-sm">
                  Quick Start Guide
                </Link>
                <Link href="/resources" className="px-8 py-3.5 bg-white/10 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors text-sm">
                  Browse Resources
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-black text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Terminal size={20} className="text-blue-500" /> beone<span className="text-blue-600">of</span>us
          </Link>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { href: "/resources", label: "Resources" },
              { href: "/quick-start", label: "Quick Start" },
              { href: "/Academy", label: "Academy" },
              { href: "/IDEPage", label: "IDE" },
              { href: "/Explore_Projects", label: "Projects" },
              { href: "/blog", label: "Blog" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium">
                {label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} beoneofus</p>
        </div>
      </footer>
      <FloatingAiAssistant />
    </div>
  );
}
