"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Terminal, ArrowLeft, Users, Code2, Cpu, Zap, Globe, Server,
  TrendingUp, BookOpen, Briefcase, Star, ChevronRight, Shield,
  GitBranch, Database, Cloud, Layers, Monitor, Award,
  MessageSquare, Hash, Play, CheckCircle2, ArrowUpRight,
} from "lucide-react";

function fmtCount(n) {
  if (n == null) return "—";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const TOPICS = [
  { icon: <Code2 size={18} />, label: "Web Development",     color: "blue",    desc: "React, Next.js, Vue, full-stack architectures, APIs",              href: "/dash/groups" },
  { icon: <Cpu size={18} />,   label: "Systems & Low-Level", color: "gray",    desc: "Rust, C++, OS internals, memory management, compilers",            href: "/dash/groups" },
  { icon: <Cloud size={18} />, label: "Cloud & DevOps",      color: "sky",     desc: "AWS, GCP, Azure, Kubernetes, CI/CD, IaC",                          href: "/dash/groups" },
  { icon: <Database size={18} />, label: "Databases & Storage", color: "emerald", desc: "PostgreSQL, Redis, MongoDB, query optimization",                href: "/dash/groups" },
  { icon: <Globe size={18} />, label: "AI & Machine Learning", color: "violet", desc: "LLMs, PyTorch, MLOps, prompt engineering, deployment",            href: "/dash/groups" },
  { icon: <Shield size={18} />, label: "Cybersecurity",       color: "red",    desc: "AppSec, pentesting, threat modeling, secure coding",               href: "/dash/groups" },
  { icon: <Server size={18} />, label: "Backend Engineering", color: "indigo", desc: "Microservices, gRPC, message queues, distributed systems",          href: "/dash/groups" },
  { icon: <Monitor size={18} />, label: "Mobile Development", color: "rose",   desc: "React Native, Flutter, Swift, Kotlin, cross-platform",             href: "/dash/groups" },
];


const PLATFORM_FEATURES = [
  { icon: <MessageSquare size={16} />, label: "Live Community", desc: "Real-time discussions with 31k engineers", href: "/dash/more?tool=community", color: "blue" },
  { icon: <Users size={16} />, label: "Groups", desc: "Topic-specific engineering groups", href: "/dash/groups", color: "indigo" },
  { icon: <Briefcase size={16} />, label: "Job Board", desc: "Remote & on-site tech roles", href: "/dash/more", color: "amber" },
  { icon: <Award size={16} />, label: "Mentorship", desc: "1-on-1 with senior engineers", href: "/dash/connections", color: "violet" },
  { icon: <Zap size={16} />, label: "Events", desc: "Tech talks & live workshops", href: "/dash/events", color: "emerald" },
  { icon: <TrendingUp size={16} />, label: "Leaderboard", desc: "Top contributors this month", href: "/dash/leaderboard", color: "rose" },
  { icon: <GitBranch size={16} />, label: "Open Source", desc: "Showcase & contribute projects", href: "/Explore_Projects", color: "gray" },
  { icon: <Layers size={16} />, label: "Pathways", desc: "Structured career roadmaps", href: "/dash/pathways", color: "sky" },
];

const INCOME_PATHS = [
  { title: "Senior Software Engineer", range: "$120k–$250k/yr", note: "Remote-first, equity common at startups", icon: <Code2 size={20} />, color: "blue", href: "/dash/more" },
  { title: "Freelance Contract Developer", range: "$80–$200/hr", note: "Contracts & marketplace on the platform", icon: <Briefcase size={20} />, color: "violet", href: "/dash/marketplace" },
  { title: "Open Source Maintainer", range: "GitHub Sponsors + grants", note: "Sustain what you love building", icon: <GitBranch size={20} />, color: "emerald", href: "/Explore_Projects" },
  { title: "Technical Educator / Creator", range: "$50k–$300k/yr", note: "Courses, YouTube, paid newsletters", icon: <Play size={20} />, color: "amber", href: "/resources" },
  { title: "Startup Founding Engineer", range: "Equity + salary", note: "High risk, life-changing upside", icon: <Zap size={20} />, color: "rose", href: "/community/founders-startups" },
];

const RESOURCES = [
  { title: "Roadmap: Full-Stack Engineer 2025", type: "Guide", link: "/resources", icon: <BookOpen size={14} /> },
  { title: "System Design Interview Prep", type: "Course", link: "/resources", icon: <Layers size={14} /> },
  { title: "Open Source Project Showcase", type: "Projects", link: "/Explore_Projects", icon: <GitBranch size={14} /> },
  { title: "Tech & Engineering Job Board", type: "Jobs", link: "/dash/more", icon: <Briefcase size={14} /> },
  { title: "Code in the Browser — Free IDE", type: "Tool", link: "/IDEPage", icon: <Terminal size={14} /> },
  { title: "Earn a Verified Tech Certificate", type: "Certificate", link: "/dash/more?tool=community", icon: <Award size={14} /> },
];

const OTHER_HUBS = [
  { label: "Design & Creativity",   href: "/community/design-creativity",  color: "violet" },
  { label: "Founders & Startups",   href: "/community/founders-startups",  color: "emerald" },
  { label: "Marketing & Growth",    href: "/community/marketing-growth",   color: "amber" },
  { label: "Finance & Business",    href: "/community/finance-business",   color: "indigo" },
  { label: "Education & Research",  href: "/community", color: "rose" },
];

const colorMap = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-900/20",    text: "text-blue-600 dark:text-blue-400",    border: "border-blue-100 dark:border-blue-800/30",    badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400", border: "border-violet-100 dark:border-violet-800/30", badge: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-800/30", badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-900/20",  text: "text-amber-600 dark:text-amber-400",  border: "border-amber-100 dark:border-amber-800/30",  badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-100 dark:border-indigo-800/30", badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-900/20",    text: "text-rose-600 dark:text-rose-400",    border: "border-rose-100 dark:border-rose-800/30",    badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" },
  sky:     { bg: "bg-sky-50 dark:bg-sky-900/20",      text: "text-sky-600 dark:text-sky-400",      border: "border-sky-100 dark:border-sky-800/30",      badge: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300" },
  gray:    { bg: "bg-gray-50 dark:bg-gray-800/50",    text: "text-gray-600 dark:text-gray-400",    border: "border-gray-100 dark:border-gray-700/30",    badge: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
  red:     { bg: "bg-red-50 dark:bg-red-900/20",      text: "text-red-600 dark:text-red-400",      border: "border-red-100 dark:border-red-800/30",      badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" },
};

export default function TechEngineeringCommunity() {
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

      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/community" className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 shrink-0 transition-colors">
              <ArrowLeft size={15} /> Community
            </Link>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">Tech & Engineering</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dash/more?tool=community" className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
              <MessageSquare size={14} /> Open Hub
            </Link>
            <Link href="/auth" className="flex items-center gap-2 px-4 py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-bold rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <Users size={14} /> Join Free
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16 relative z-10">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest mb-6">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  {stats ? `${fmtCount(stats.members)} members` : "Growing community"} · Join Free
                </div>
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 leading-tight">Tech &<br />Engineering</h1>
                <p className="text-blue-100 text-lg sm:text-xl max-w-2xl leading-relaxed">
                  The largest professional community for engineers on the platform. From systems programming to AI, cloud architecture to open source — grow your career, find collaborators, and ship great software.
                </p>
                <div className="flex flex-wrap gap-3 mt-8">
                  <Link href="/dash/more?tool=community" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors text-sm shadow-lg shadow-blue-900/20">
                    <MessageSquare size={16} /> Enter Community Hub
                  </Link>
                  <Link href="/Explore_Projects" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/30 text-white font-bold rounded-xl hover:bg-white/20 transition-colors text-sm">
                    <GitBranch size={16} /> Explore Projects
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:w-72 shrink-0">
                {[
                  { label: "Members",  key: "members",  Icon: Users      },
                  { label: "Groups",   key: "groups",   Icon: Hash       },
                  { label: "Projects", key: "projects", Icon: GitBranch  },
                  { label: "Live Hub", key: null,       Icon: MessageSquare },
                ].map(({ label, key, Icon }) => (
                  <div key={label} className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-sm">
                    <Icon size={18} className="text-blue-200 mb-2" />
                    <p className="text-2xl font-black">{key ? (stats ? fmtCount(stats[key]) : "—") : "Open"}</p>
                    <p className="text-[11px] text-blue-200 font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-10">

              {/* Sub-communities → /dash/groups */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-black tracking-tight flex items-center gap-2"><Hash size={18} className="text-blue-500" /> Sub-Communities</h2>
                  <Link href="/dash/groups" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">All groups <ChevronRight size={12} /></Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TOPICS.map(({ icon, label, color, desc, href }) => {
                    const c = colorMap[color] || colorMap.blue;
                    return (
                      <Link key={label} href={href}
                        className={`flex items-start gap-4 p-4 rounded-2xl border ${c.border} bg-white dark:bg-gray-900 hover:shadow-md transition-all group`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>{icon}</div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
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

              {/* Inside the Platform */}
              <section>
                <h2 className="text-xl font-black tracking-tight mb-2 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-blue-500" /> Inside the Platform
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Every tool available to Tech & Engineering hub members — all interconnected.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PLATFORM_FEATURES.map(({ icon, label, desc, href, color }) => {
                    const c = colorMap[color] || colorMap.blue;
                    return (
                      <Link key={label} href={href}
                        className={`flex flex-col gap-2.5 p-4 rounded-2xl border ${c.border} bg-white dark:bg-gray-900 hover:shadow-md transition-all group`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg} ${c.text}`}>{icon}</div>
                        <div>
                          <p className={`font-bold text-sm text-gray-900 dark:text-white group-hover:${c.text} transition-colors`}>{label}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">{desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Career & Income Paths — each links to the real relevant section */}
              <section>
                <h2 className="text-xl font-black tracking-tight mb-2 flex items-center gap-2">
                  <Briefcase size={18} className="text-blue-500" /> Career & Income Paths
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Industry salary ranges for engineers. Click any path to explore opportunities on the platform.</p>
                <div className="space-y-3">
                  {INCOME_PATHS.map(({ title, range, note, icon, color, href }) => {
                    const c = colorMap[color] || colorMap.blue;
                    return (
                      <Link key={title} href={href}
                        className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900/30 transition-all group">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>{icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{note}</p>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${c.badge}`}>{range}</span>
                          <ArrowUpRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
                <h3 className="font-black text-lg mb-2">Join the Tech Community</h3>
                <p className="text-blue-100 text-sm mb-4 leading-relaxed">Live discussions, job board, mentorship, code reviews, and a network that ships.</p>
                <Link href="/auth" className="block text-center py-2.5 bg-white text-blue-700 font-bold rounded-xl text-sm hover:bg-blue-50 transition-colors">Create Free Account</Link>
                <Link href="/dash/more?tool=community" className="block text-center py-2 text-blue-200 text-xs font-semibold mt-2 hover:text-white transition-colors">Already a member? Open hub →</Link>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Resources</h3>
                <div className="space-y-2">
                  {RESOURCES.map(({ title, type, link, icon }) => (
                    <Link key={title} href={link}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 group transition-colors">
                      <div className="w-7 h-7 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg flex items-center justify-center shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{title}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{type}</p>
                      </div>
                      <ChevronRight size={12} className="text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />
                    </Link>
                  ))}
                  <Link href="/resources" className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    All Resources <ChevronRight size={11} />
                  </Link>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Quick Actions</h3>
                <div className="space-y-1.5">
                  {[
                    { label: "Live Community Hub",   href: "/dash/more?tool=community", icon: <MessageSquare size={14} /> },
                    { label: "Browse Tech Jobs",      href: "/dash/more",                icon: <Briefcase size={14} /> },
                    { label: "Join Groups",           href: "/dash/groups",              icon: <Users size={14} /> },
                    { label: "Explore Open Source",   href: "/Explore_Projects",         icon: <GitBranch size={14} /> },
                    { label: "Take a Course",         href: "/resources",                  icon: <BookOpen size={14} /> },
                    { label: "Open Browser IDE",      href: "/IDEPage",                  icon: <Terminal size={14} /> },
                    { label: "Find a Mentor",         href: "/dash/connections",          icon: <Award size={14} /> },
                    { label: "View Career Pathways",  href: "/dash/pathways",            icon: <Layers size={14} /> },
                  ].map(({ label, href, icon }) => (
                    <Link key={label} href={href}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all font-medium group">
                      <span className="text-gray-400 group-hover:text-blue-500 transition-colors">{icon}</span> {label}
                      <ChevronRight size={12} className="ml-auto text-gray-300 group-hover:text-blue-400 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Other Hubs</h3>
                <div className="space-y-1.5">
                  {OTHER_HUBS.map(({ label, href, color }) => {
                    const c = colorMap[color] || colorMap.blue;
                    return (
                      <Link key={label} href={href}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                        <span className={`w-2 h-2 rounded-full ${c.text.split(" ")[0].replace("text-","bg-")}`} />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-8 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-black text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Terminal size={20} className="text-blue-500" /> beone<span className="text-blue-600">of</span>us
          </Link>
          <div className="flex flex-wrap justify-center gap-4">
            {[{ l: "Community", h: "/community" }, { l: "Resources", h: "/resources" }, { l: "Academy", h: "/resources" }, { l: "IDE", h: "/IDEPage" }, { l: "Projects", h: "/Explore_Projects" }, { l: "Blog", h: "/blog" }].map(({ l, h }) => (
              <Link key={l} href={h} className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium">{l}</Link>
            ))}
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} beoneofus</p>
        </div>
      </footer>
    </div>
  );
}
