"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Terminal, ArrowLeft, BookOpen, Award, Laptop, Globe, FileText, Zap,
  Shield, CheckCircle2, MessageSquare, Users, ChevronRight, Search,
  Code2, Play, Layers, Star, TrendingUp, Briefcase, Hash,
  GraduationCap, Database, ArrowUpRight, Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
const FloatingAiAssistant = dynamic(() => import("../components/FloatingAiAssistant"), { ssr: false });

const LEARN_RESOURCES = [
  {
    icon: <BookOpen size={22} />,
    label: "Academy",
    desc: "200+ structured courses across engineering, design, business, and more. Learn at your own pace with project-based curriculum.",
    href: "/Academy",
    color: "blue",
    badge: "200+ Courses",
    tags: ["Self-paced", "Certificates", "Project-based"],
  },
  {
    icon: <Award size={22} />,
    label: "Certificates",
    desc: "Earn verified, shareable credentials from courses and assessments. Add them to your profile and LinkedIn.",
    href: "/dash/more",
    color: "amber",
    badge: "Verified Credentials",
    tags: ["Shareable", "LinkedIn", "Industry-recognized"],
  },
  {
    icon: <Laptop size={22} />,
    label: "In-Browser IDE",
    desc: "A fully-featured code editor in your browser. Practice problems, prototype projects, and run code without setup.",
    href: "/IDEPage",
    color: "emerald",
    badge: "Zero Setup",
    tags: ["JavaScript", "Python", "TypeScript", "Go"],
  },
  {
    icon: <Globe size={22} />,
    label: "Explore Projects",
    desc: "Browse open source and portfolio projects from community members. Find collaborators, get inspired, or contribute.",
    href: "/Explore_Projects",
    color: "violet",
    badge: "Open Source",
    tags: ["Portfolios", "Open Source", "Collaboration"],
  },
];

const DOC_RESOURCES = [
  {
    icon: <FileText size={22} />,
    label: "Documentation",
    desc: "Complete reference guide for every feature on the platform — from profiles to the marketplace.",
    href: "/docs",
    color: "gray",
    badge: "Full Reference",
    tags: ["API", "Platform", "Features"],
  },
  {
    icon: <Zap size={22} />,
    label: "Quick Start Guide",
    desc: "Get your account set up and your first connection made in under 5 minutes. The essential onboarding guide.",
    href: "/quick-start",
    color: "yellow",
    badge: "5 min read",
    tags: ["Onboarding", "Setup", "Getting Started"],
  },
  {
    icon: <Shield size={22} />,
    label: "Premium Guide",
    desc: "Everything included in the premium tier — jobs, contracts, advanced analytics, mentorship, and more.",
    href: "/dash/premium",
    color: "rose",
    badge: "Premium",
    tags: ["Features", "Pricing", "Benefits"],
  },
  {
    icon: <CheckCircle2 size={22} />,
    label: "How It Works",
    desc: "A clear overview of the platform's architecture, community structure, and the value it creates for professionals.",
    href: "/how_it_works",
    color: "teal",
    badge: "Platform Overview",
    tags: ["Overview", "Community", "Platform"],
  },
];

const SUPPORT_RESOURCES = [
  {
    icon: <MessageSquare size={22} />,
    label: "Support Ticket",
    desc: "Can't find what you need? Our team responds within 24 hours on all plans, faster for premium members.",
    href: "/dash/more?tool=support",
    color: "blue",
    badge: "24h Response",
    tags: ["Help", "Bug Reports", "Account"],
  },
  {
    icon: <Users size={22} />,
    label: "Community Forum",
    desc: "Get answers from 91k+ peers across all 6 community hubs. Often the fastest way to get unstuck.",
    href: "/community",
    color: "emerald",
    badge: "91k+ Members",
    tags: ["Peer Help", "Discussions", "Q&A"],
  },
];

const TOOL_HIGHLIGHTS = [
  { icon: <Code2 size={18} />, label: "In-Browser IDE", desc: "Code without installing anything", href: "/IDEPage", color: "emerald" },
  { icon: <Hash size={18} />, label: "Community Hubs", desc: "6 professional communities", href: "/community", color: "blue" },
  { icon: <GraduationCap size={18} />, label: "Academy Courses", desc: "200+ structured learning paths", href: "/Academy", color: "violet" },
  { icon: <Briefcase size={18} />, label: "Job Board", desc: "Remote-first opportunities", href: "/dash/more", color: "amber" },
  { icon: <Database size={18} />, label: "Project Showcase", desc: "Build your public portfolio", href: "/Explore_Projects", color: "rose" },
  { icon: <Sparkles size={18} />, label: "AI Assistant", desc: "Built-in AI for every page", href: "/dash", color: "indigo" },
];

const colorMap = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-900/20",    text: "text-blue-600 dark:text-blue-400",    border: "border-blue-100 dark:border-blue-800/30",    badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",    icon: "bg-blue-50 dark:bg-blue-900/20 text-blue-500" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400", border: "border-violet-100 dark:border-violet-800/30", badge: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300", icon: "bg-violet-50 dark:bg-violet-900/20 text-violet-500" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-800/30", badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300", icon: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-900/20",  text: "text-amber-600 dark:text-amber-400",  border: "border-amber-100 dark:border-amber-800/30",  badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",  icon: "bg-amber-50 dark:bg-amber-900/20 text-amber-500" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-100 dark:border-indigo-800/30", badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300", icon: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-900/20",    text: "text-rose-600 dark:text-rose-400",    border: "border-rose-100 dark:border-rose-800/30",    badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",    icon: "bg-rose-50 dark:bg-rose-900/20 text-rose-500" },
  gray:    { bg: "bg-gray-50 dark:bg-gray-800/50",    text: "text-gray-600 dark:text-gray-400",    border: "border-gray-100 dark:border-gray-700/30",    badge: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",    icon: "bg-gray-100 dark:bg-gray-800 text-gray-500" },
  yellow:  { bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-100 dark:border-yellow-800/30", badge: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300", icon: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500" },
  teal:    { bg: "bg-teal-50 dark:bg-teal-900/20",    text: "text-teal-600 dark:text-teal-400",    border: "border-teal-100 dark:border-teal-800/30",    badge: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",    icon: "bg-teal-50 dark:bg-teal-900/20 text-teal-500" },
};

function ResourceCard({ item }) {
  const c = colorMap[item.color] || colorMap.blue;
  return (
    <Link href={item.href}
      className={`group flex flex-col bg-white dark:bg-gray-900 border ${c.border} rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${c.bg} ${c.text} shrink-0`}>{item.icon}</div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${c.badge}`}>{item.badge}</span>
      </div>
      <h3 className={`text-lg font-black mb-2 ${c.text}`}>{item.label}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4 flex-1">{item.desc}</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {item.tags.map(tag => (
          <span key={tag} className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{tag}</span>
        ))}
      </div>
      <div className={`flex items-center gap-1.5 text-sm font-bold ${c.text} mt-auto`}>
        Get started <ArrowUpRight size={14} />
      </div>
    </Link>
  );
}

export default function ResourcesPage() {
  const [search, setSearch] = useState("");
  const allResources = [...LEARN_RESOURCES, ...DOC_RESOURCES, ...SUPPORT_RESOURCES];
  const filtered = search
    ? allResources.filter(r =>
        r.label.toLowerCase().includes(search.toLowerCase()) ||
        r.desc.toLowerCase().includes(search.toLowerCase()) ||
        r.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-x-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="font-black text-xl tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100 shrink-0">
            <Terminal className="text-blue-500" size={24} /> beone<span className="text-blue-600 dark:text-blue-400">of</span>us
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/community" className="hidden sm:flex text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Community</Link>
            <Link href="/quick-start" className="hidden md:flex text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Quick Start</Link>
            <Link href="/" className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1.5 transition-colors">
              <ArrowLeft size={14} /> Home
            </Link>
            <Link href="/auth" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16 relative z-10">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles size={12} className="text-yellow-300" /> Everything you need to level up
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-5 leading-tight">
              Resources & Tools
            </h1>
            <p className="text-blue-100 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
              Courses, guides, documentation, a browser IDE, certificates, and community support — all in one place.
            </p>
            <div className="relative max-w-md mx-auto">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search resources..."
                className="w-full pl-10 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-300 text-sm font-medium focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Tool Highlights */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 overflow-x-auto">
            <div className="flex gap-3 min-w-max sm:min-w-0 sm:grid sm:grid-cols-3 md:grid-cols-6">
              {TOOL_HIGHLIGHTS.map(({ icon, label, desc, href, color }) => {
                const c = colorMap[color] || colorMap.blue;
                return (
                  <Link key={label} href={href}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 group transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700 min-w-[160px] sm:min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>{icon}</div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${c.text} truncate`}>{label}</p>
                      <p className="text-[10px] text-gray-400 truncate">{desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          {filtered ? (
            <div>
              <h2 className="text-xl font-black mb-6">{filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"</h2>
              {filtered.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-gray-400">No resources match that search.</p>
                  <button onClick={() => setSearch("")} className="mt-4 text-blue-500 text-sm font-bold hover:text-blue-600">Clear</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map(item => <ResourceCard key={item.label} item={item} />)}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-14">
              {/* Learn */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl flex items-center justify-center"><BookOpen size={16} /></div>
                  <div>
                    <h2 className="text-xl font-black">Learn</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Courses, hands-on tools, and project exploration</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {LEARN_RESOURCES.map(item => <ResourceCard key={item.label} item={item} />)}
                </div>
              </section>

              {/* Documentation */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl flex items-center justify-center"><FileText size={16} /></div>
                  <div>
                    <h2 className="text-xl font-black">Documentation</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Guides, references, and platform overviews</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {DOC_RESOURCES.map(item => <ResourceCard key={item.label} item={item} />)}
                </div>
              </section>

              {/* Support */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-xl flex items-center justify-center"><MessageSquare size={16} /></div>
                  <div>
                    <h2 className="text-xl font-black">Support</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get help from our team or the community</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
                  {SUPPORT_RESOURCES.map(item => <ResourceCard key={item.label} item={item} />)}
                </div>
              </section>

              {/* Join CTA */}
              <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="relative flex flex-col sm:flex-row items-center gap-8">
                  <div className="flex-1">
                    <h2 className="text-2xl sm:text-3xl font-black mb-3">Unlock everything with a free account</h2>
                    <p className="text-gray-300 leading-relaxed">Full access to all resources, the community, job board, mentorship, and your own professional profile.</p>
                  </div>
                  <div className="flex flex-col gap-3 shrink-0">
                    <Link href="/auth" className="px-8 py-3.5 bg-white text-gray-900 font-black rounded-2xl hover:bg-gray-100 transition-colors text-sm text-center shadow-lg">
                      Create Free Account
                    </Link>
                    <Link href="/quick-start" className="px-8 py-3.5 bg-white/10 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors text-sm text-center">
                      Quick Start Guide <ChevronRight size={14} className="inline" />
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-black text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Terminal size={20} className="text-blue-500" /> beone<span className="text-blue-600">of</span>us
          </Link>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { href: "/community", label: "Community" },
              { href: "/quick-start", label: "Quick Start" },
              { href: "/Academy", label: "Academy" },
              { href: "/IDEPage", label: "IDE" },
              { href: "/docs", label: "Docs" },
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
