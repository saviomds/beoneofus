"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Terminal, ArrowLeft, Users, TrendingUp, MessageSquare, Hash,
  BarChart3, DollarSign, Globe, Briefcase, ChevronRight,
  BookOpen, Award, Shield, PieChart, Building2, CreditCard,
  Target, Layers, Star, Bell, ShoppingBag, Trophy, Compass, GitBranch,
} from "lucide-react";
import dynamic from "next/dynamic";
const FloatingAiAssistant = dynamic(() => import("../../components/FloatingAiAssistant"), { ssr: false });

function fmtCount(n) {
  if (n == null) return "—";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const TOPICS = [
  { icon: <PieChart size={18} />, label: "Personal Finance", color: "indigo", desc: "Budgeting, investing, FIRE movement, net worth tracking", href: "/dash/groups" },
  { icon: <BarChart3 size={18} />, label: "Investing & Markets", color: "blue", desc: "Stocks, ETFs, crypto, real estate, portfolio strategy", href: "/dash/groups" },
  { icon: <Building2 size={18} />, label: "Corporate Finance", color: "violet", desc: "Financial modeling, M&A, valuation, capital markets", href: "/dash/groups" },
  { icon: <Globe size={18} />, label: "Global Economics", color: "emerald", desc: "Macro trends, inflation, monetary policy, geopolitics", href: "/dash/groups" },
  { icon: <CreditCard size={18} />, label: "FinTech & Banking", color: "rose", desc: "Neobanks, open banking, payment rails, DeFi applications", href: "/dash/groups" },
  { icon: <DollarSign size={18} />, label: "Business Strategy", color: "amber", desc: "Revenue models, competitive strategy, unit economics", href: "/dash/groups" },
  { icon: <Shield size={18} />, label: "Tax & Compliance", color: "gray", desc: "Tax optimization, international business, regulatory", href: "/dash/groups" },
  { icon: <Target size={18} />, label: "Accounting & CFO", color: "teal", desc: "Management accounting, financial reporting, CFO skills", href: "/dash/groups" },
];

const PLATFORM_FEATURES = [
  { icon: <MessageSquare size={18} />, label: "Live Community", desc: "Real-time discussions with 8.6k+ finance pros", href: "/dash/more?tool=community", color: "indigo" },
  { icon: <Users size={18} />, label: "Finance Groups", desc: "Topic groups on investing, CFO skills & more", href: "/dash/groups", color: "blue" },
  { icon: <Briefcase size={18} />, label: "Job Board", desc: "Finance, banking & business strategy roles", href: "/dash/more", color: "emerald" },
  { icon: <Star size={18} />, label: "Mentorship", desc: "1:1 sessions with CFOs, analysts & investors", href: "/dash/mentorship", color: "violet" },
  { icon: <Bell size={18} />, label: "Events", desc: "Finance webinars, market summits, workshops", href: "/dash/events", color: "rose" },
  { icon: <Trophy size={18} />, label: "Leaderboard", desc: "Top contributors & finance challenge winners", href: "/dash/leaderboard", color: "amber" },
  { icon: <ShoppingBag size={18} />, label: "Marketplace", desc: "Hire fractional CFOs or offer finance services", href: "/dash/marketplace", color: "teal" },
  { icon: <Compass size={18} />, label: "Pathways", desc: "Structured paths from analyst to CFO", href: "/dash/pathways", color: "orange" },
];

const INCOME_PATHS = [
  { title: "Investment Analyst / Portfolio Mgr", range: "$80k–$300k+/yr", note: "Finance industry, hedge funds, family offices", icon: <BarChart3 size={20} />, color: "indigo", href: "/dash/more" },
  { title: "CFO / VP Finance at Startup", range: "$130k–$250k + equity", note: "High demand as companies scale", icon: <Building2 size={20} />, color: "blue", href: "/dash/more" },
  { title: "Finance Content Creator", range: "$50k–$400k/yr", note: "YouTube, newsletter, courses, affiliates", icon: <Star size={20} />, color: "amber", href: "/dash/services" },
  { title: "Financial Consultant", range: "$100–$400/hr", note: "Corporate advisory, fractional CFO work", icon: <Briefcase size={20} />, color: "violet", href: "/dash/marketplace" },
  { title: "FinTech Founder", range: "Equity + salary", note: "Building the future of financial services", icon: <DollarSign size={20} />, color: "emerald", href: "/community/founders-startups" },
];

const RESOURCES = [
  { title: "Financial Modeling Masterclass", type: "Course", link: "/Academy", icon: <BookOpen size={14} /> },
  { title: "Business Finance Fundamentals", type: "Course", link: "/Academy", icon: <BarChart3 size={14} /> },
  { title: "Finance Case Studies", type: "Blog", link: "/blog", icon: <Layers size={14} /> },
  { title: "Finance & Business Jobs", type: "Jobs", link: "/dash/more", icon: <Briefcase size={14} /> },
  { title: "Earn Finance Certificate", type: "Certificate", link: "/dash/more", icon: <Award size={14} /> },
  { title: "Connect with Finance Pros", type: "Network", link: "/dash/connections", icon: <Users size={14} /> },
];

const QUICK_ACTIONS = [
  { label: "Open Live Hub", href: "/dash/more?tool=community", icon: <MessageSquare size={14} /> },
  { label: "Browse Groups", href: "/dash/groups", icon: <Users size={14} /> },
  { label: "Finance Jobs", href: "/dash/more", icon: <Briefcase size={14} /> },
  { label: "Hire a Consultant", href: "/dash/marketplace", icon: <ShoppingBag size={14} /> },
  { label: "Book a Mentor", href: "/dash/mentorship", icon: <Star size={14} /> },
  { label: "Upcoming Events", href: "/dash/events", icon: <Bell size={14} /> },
  { label: "Finance Pathways", href: "/dash/pathways", icon: <Compass size={14} /> },
  { label: "All Resources", href: "/resources", icon: <BookOpen size={14} /> },
];

const OTHER_HUBS = [
  { label: "Tech & Engineering", href: "/community/tech-engineering" },
  { label: "Design & Creativity", href: "/community/design-creativity" },
  { label: "Founders & Startups", href: "/community/founders-startups" },
  { label: "Marketing & Growth", href: "/community/marketing-growth" },
  { label: "Education & Research", href: "/community/education-research" },
];

const colorMap = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-900/20",    text: "text-blue-600 dark:text-blue-400",    border: "border-blue-100 dark:border-blue-800/30",    badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400", border: "border-violet-100 dark:border-violet-800/30", badge: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-800/30", badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-900/20",  text: "text-amber-600 dark:text-amber-400",  border: "border-amber-100 dark:border-amber-800/30",  badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-100 dark:border-indigo-800/30", badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-900/20",    text: "text-rose-600 dark:text-rose-400",    border: "border-rose-100 dark:border-rose-800/30",    badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" },
  gray:    { bg: "bg-gray-100 dark:bg-gray-800/50",   text: "text-gray-600 dark:text-gray-400",    border: "border-gray-100 dark:border-gray-700/30",    badge: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
  teal:    { bg: "bg-teal-50 dark:bg-teal-900/20",    text: "text-teal-600 dark:text-teal-400",    border: "border-teal-100 dark:border-teal-800/30",    badge: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-100 dark:border-orange-800/30", badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
};

export default function FinanceBusinessCommunity() {
  const [activeTab, setActiveTab] = useState("trending");

  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("groups").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
    ]).then(([profiles, groups, projects]) => {
      setStats({ members: profiles.count ?? 0, groups: groups.count ?? 0, projects: projects.count ?? 0 });
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

      {/* Nav */}
      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/community" className="text-sm font-semibold text-gray-500 hover:text-indigo-600 flex items-center gap-1.5 shrink-0 transition-colors"><ArrowLeft size={15} /> Community</Link>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">Finance & Business</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dash/more?tool=community" className="hidden sm:flex items-center gap-2 px-4 py-2 border border-indigo-200 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">Open Hub</Link>
            <Link href="/auth" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors"><Users size={14} /> Join Free</Link>
            <Link href="/" className="flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><Terminal size={16} className="text-blue-500" /><span className="hidden sm:inline">beoneofus</span></Link>
          </div>
        </div>
      </nav>

      <main className="pt-16 relative z-10">
        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest mb-6">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> {stats ? `${fmtCount(stats.members)} members` : "Growing community"} · Join Free
                </div>
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 leading-tight">Finance &<br />Business</h1>
                <p className="text-indigo-200 text-lg sm:text-xl max-w-2xl leading-relaxed">
                  Where finance professionals, investors, and business strategists connect. From personal wealth building to corporate M&A — this is where serious money conversations happen.
                </p>
                <div className="flex flex-wrap gap-3 mt-8">
                  <Link href="/dash/more?tool=community" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors text-sm shadow-lg shadow-indigo-900/30"><MessageSquare size={16} /> Open Live Hub</Link>
                  <Link href="/auth" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/30 text-white font-bold rounded-xl hover:bg-white/20 transition-colors text-sm"><Users size={16} /> Join Free</Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:w-72 shrink-0">
                {[
                  { label: "Members",  key: "members",  Icon: Users },
                  { label: "Groups",   key: "groups",   Icon: Hash },
                  { label: "Projects", key: "projects", Icon: GitBranch },
                  { label: "Live Hub", key: null,       Icon: MessageSquare },
                ].map(({ label, key, Icon }) => (
                  <div key={label} className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-sm">
                    <Icon size={18} className="text-indigo-200 mb-2" />
                    <p className="text-2xl font-black">{key ? (stats ? fmtCount(stats[key]) : "—") : "Open"}</p>
                    <p className="text-[11px] text-indigo-200 font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-10">

              {/* Sub-Communities */}
              <section>
                <h2 className="text-xl font-black tracking-tight mb-1 flex items-center gap-2"><Hash size={18} className="text-indigo-500" /> Sub-Communities</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Go deep on a financial discipline or business domain.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TOPICS.map(({ icon, label, color, desc, href }) => {
                    const c = colorMap[color] || colorMap.indigo;
                    return (
                      <Link key={label} href={href} className={`flex items-start gap-4 p-4 rounded-2xl border ${c.border} bg-white dark:bg-gray-900 hover:shadow-md transition-all group`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>{icon}</div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed truncate">{desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Inside the Platform */}
              <section>
                <h2 className="text-xl font-black tracking-tight mb-1 flex items-center gap-2"><Layers size={18} className="text-indigo-500" /> Inside the Platform</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Every tool finance professionals get on beoneofus.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PLATFORM_FEATURES.map(({ icon, label, desc, href, color }) => {
                    const c = colorMap[color] || colorMap.indigo;
                    return (
                      <Link key={label} href={href} className={`flex flex-col gap-3 p-4 rounded-2xl border ${c.border} bg-white dark:bg-gray-900 hover:shadow-md transition-all group`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg} ${c.text}`}>{icon}</div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Live Community Hub CTA */}
              <section>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-6 text-center">
                  <MessageSquare size={28} className="text-blue-500 mx-auto mb-3" />
                  <h2 className="text-lg font-black text-gray-900 dark:text-white mb-2">Real discussions happen inside</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">Join the live community hub to see and participate in real conversations from real members.</p>
                  <Link href="/dash/more?tool=community" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors">
                    <MessageSquare size={14} /> Open Community Hub
                  </Link>
                </div>
              </section>

              {/* Career & Income Paths */}
              <section>
                <h2 className="text-xl font-black tracking-tight mb-2 flex items-center gap-2"><DollarSign size={18} className="text-indigo-500" /> Career & Income Paths</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Income opportunities for finance and business professionals on the platform.</p>
                <div className="space-y-3">
                  {INCOME_PATHS.map(({ title, range, note, icon, color, href }) => {
                    const c = colorMap[color] || colorMap.indigo;
                    return (
                      <Link key={title} href={href} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-md transition-all group">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>{icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{title}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{note}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${c.badge}`}>{range}</span>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-indigo-700 to-slate-800 rounded-2xl p-6 text-white">
                <h3 className="font-black text-lg mb-2">Join the Community</h3>
                <p className="text-indigo-200 text-sm mb-4 leading-relaxed">Investment discussions, financial modeling resources, career paths, and a network of serious professionals.</p>
                <Link href="/dash/more?tool=community" className="block text-center py-2.5 bg-white text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-50 transition-colors mb-2">Open Live Hub</Link>
                <Link href="/auth" className="block text-center py-2.5 bg-white/10 border border-white/30 text-white font-bold rounded-xl text-sm hover:bg-white/20 transition-colors">Create Free Account</Link>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Quick Actions</h3>
                <div className="space-y-1">
                  {QUICK_ACTIONS.map(({ label, href, icon }) => (
                    <Link key={label} href={href} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/10 group transition-colors">
                      <div className="w-6 h-6 text-indigo-500 group-hover:text-indigo-600 transition-colors shrink-0">{icon}</div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</span>
                      <ChevronRight size={12} className="text-gray-300 group-hover:text-indigo-400 transition-colors ml-auto shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Resources */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Resources</h3>
                <div className="space-y-2">
                  {RESOURCES.map(({ title, type, link, icon }) => (
                    <Link key={title} href={link} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 group transition-colors">
                      <div className="w-7 h-7 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-lg flex items-center justify-center shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{title}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{type}</p>
                      </div>
                      <ChevronRight size={12} className="text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
                <Link href="/resources" className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">All Resources <ChevronRight size={11} /></Link>
              </div>

              {/* Other Hubs */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Other Hubs</h3>
                <div className="space-y-1.5">
                  {OTHER_HUBS.map(({ label, href }) => (
                    <Link key={label} href={href} className="flex items-center px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/community" className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">All Communities <ChevronRight size={11} /></Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-8 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="font-black text-lg flex items-center gap-2"><Terminal size={20} className="text-blue-500" /> beone<span className="text-blue-600">of</span>us</Link>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/community" className="hover:text-indigo-600 transition-colors font-medium">Community</Link>
              <Link href="/resources" className="hover:text-indigo-600 transition-colors font-medium">Resources</Link>
              <Link href="/Academy" className="hover:text-indigo-600 transition-colors font-medium">Academy</Link>
              <Link href="/Explore_Projects" className="hover:text-indigo-600 transition-colors font-medium">Projects</Link>
              <Link href="/blog" className="hover:text-indigo-600 transition-colors font-medium">Blog</Link>
            </div>
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} beoneofus</p>
          </div>
        </div>
      </footer>
      <FloatingAiAssistant />
    </div>
  );
}
