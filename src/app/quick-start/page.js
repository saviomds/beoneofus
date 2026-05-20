"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Terminal, ArrowLeft, CheckCircle2, Circle, Users, User, Settings,
  Globe, Briefcase, BookOpen, MessageSquare, Award, Zap, ChevronRight,
  Code2, Star, Bell, Search, TrendingUp, Laptop, Hash,
} from "lucide-react";
import dynamic from "next/dynamic";
const FloatingAiAssistant = dynamic(() => import("../components/FloatingAiAssistant"), { ssr: false });

const STEPS = [
  {
    step: 1,
    title: "Create Your Account",
    time: "1 min",
    icon: <User size={20} />,
    color: "blue",
    desc: "Sign up for free with your email or Google account. No credit card required — ever.",
    actions: [
      { label: "Sign up with email", href: "/auth" },
      { label: "Continue with Google", href: "/auth" },
    ],
    tips: [
      "Use your professional email for better networking credibility",
      "You can always upgrade to Premium later",
      "Your account is free for life — no surprise charges",
    ],
  },
  {
    step: 2,
    title: "Complete Your Profile",
    time: "3–5 min",
    icon: <Settings size={20} />,
    color: "violet",
    desc: "A complete profile gets 8x more visibility. Add your skills, experience, and a professional bio.",
    actions: [
      { label: "Edit your profile", href: "/dash/profile" },
    ],
    tips: [
      "Add your current role and top 5 skills",
      "Upload a professional headshot — profiles with photos get 4x more views",
      "Write a short bio that says who you are and what you're building",
      "Add your GitHub, LinkedIn, or portfolio links",
    ],
  },
  {
    step: 3,
    title: "Join a Community Hub",
    time: "1 min",
    icon: <Hash size={20} />,
    color: "emerald",
    desc: "Pick the community that matches your profession. Join discussions, ask questions, and share what you know.",
    actions: [
      { label: "Browse all hubs", href: "/community" },
      { label: "Tech & Engineering", href: "/community/tech-engineering" },
      { label: "Founders & Startups", href: "/community/founders-startups" },
    ],
    tips: [
      "You can participate in multiple communities",
      "Introduce yourself in the #introductions channel",
      "Trending discussions update daily — check them regularly",
    ],
  },
  {
    step: 4,
    title: "Build Your Network",
    time: "2–3 min",
    icon: <Users size={20} />,
    color: "amber",
    desc: "Connect with professionals in your field. Your network unlocks opportunities, mentorship, and collaborations.",
    actions: [
      { label: "Find connections", href: "/dash/connections" },
      { label: "Explore profiles", href: "/Explore_Projects" },
    ],
    tips: [
      "Send a personalized note with every connection request",
      "Connect with people whose work you admire or want to learn from",
      "Engage with their posts before sending a request",
    ],
  },
  {
    step: 5,
    title: "Explore Opportunities",
    time: "Ongoing",
    icon: <Briefcase size={20} />,
    color: "rose",
    desc: "Browse jobs, contracts, mentorship, coaching, partnerships, and sponsorships tailored to your profile.",
    actions: [
      { label: "View job board", href: "/dash/more" },
      { label: "Find a mentor", href: "/dash/mentorship" },
      { label: "Marketplace", href: "/dash/marketplace" },
    ],
    tips: [
      "Premium members see 5x more job opportunities",
      "Contracts can be short-term gigs or long-term engagements",
      "Set up job alerts for roles that match your skill set",
    ],
  },
];

const FEATURES = [
  { icon: <Code2 size={18} />, label: "Browser IDE", desc: "Code without setup", href: "/IDEPage", color: "emerald" },
  { icon: <BookOpen size={18} />, label: "Academy", desc: "200+ courses", href: "/Academy", color: "blue" },
  { icon: <Award size={18} />, label: "Certificates", desc: "Verified credentials", href: "/dash/more", color: "amber" },
  { icon: <Globe size={18} />, label: "Projects", desc: "Portfolio & open source", href: "/Explore_Projects", color: "violet" },
  { icon: <TrendingUp size={18} />, label: "Analytics", desc: "Track your growth", href: "/dash/analytics", color: "indigo" },
  { icon: <Zap size={18} />, label: "AI Assistant", desc: "Powered by Claude", href: "/dash", color: "rose" },
];

const colorMap = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-900/20",    text: "text-blue-600 dark:text-blue-400",    border: "border-blue-200 dark:border-blue-800/50",    num: "bg-blue-600",    badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400", border: "border-violet-200 dark:border-violet-800/50", num: "bg-violet-600",  badge: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800/50", num: "bg-emerald-600", badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-900/20",  text: "text-amber-600 dark:text-amber-400",  border: "border-amber-200 dark:border-amber-800/50",  num: "bg-amber-500",   badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-900/20",    text: "text-rose-600 dark:text-rose-400",    border: "border-rose-200 dark:border-rose-800/50",    num: "bg-rose-600",    badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800/50", num: "bg-indigo-600",  badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" },
};

export default function QuickStartPage() {
  const [completed, setCompleted] = useState(new Set());

  const toggle = (step) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step); else next.add(step);
      return next;
    });
  };

  const progress = Math.round((completed.size / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-x-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/resources" className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 flex items-center gap-1.5 shrink-0 transition-colors"><ArrowLeft size={15} /> Resources</Link>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">Quick Start</span>
          </div>
          <div className="flex items-center gap-3">
            {completed.size > 0 && (
              <span className="hidden sm:block text-xs font-bold text-emerald-600 dark:text-emerald-400">{completed.size}/{STEPS.length} done</span>
            )}
            <Link href="/auth" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">Get Started</Link>
          </div>
        </div>
      </nav>

      <main className="pt-16 relative z-10">
        {/* Hero */}
        <div className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 relative">
            <div className="flex flex-col sm:flex-row sm:items-center gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest mb-6">
                  <Zap size={11} className="text-yellow-300" /> 5 steps · under 10 minutes
                </div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
                  Quick Start Guide
                </h1>
                <p className="text-gray-300 text-lg leading-relaxed max-w-xl">
                  Everything you need to go from zero to a fully set-up professional profile on beoneofus. Follow these 5 steps and you'll be ready.
                </p>
              </div>
              {/* Progress widget */}
              <div className="bg-white/10 border border-white/20 rounded-2xl p-6 sm:w-52 text-center backdrop-blur-sm shrink-0">
                <div className="relative w-24 h-24 mx-auto mb-3">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#3b82f6" strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                      strokeLinecap="round" className="transition-all duration-500" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-black">{progress}%</span>
                </div>
                <p className="text-sm font-bold text-white">{completed.size} of {STEPS.length} steps</p>
                <p className="text-xs text-gray-400 mt-0.5">Check off as you go</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Steps */}
            <div className="lg:col-span-2 space-y-5">
              {STEPS.map(({ step, title, time, icon, color, desc, actions, tips }) => {
                const c = colorMap[color] || colorMap.blue;
                const done = completed.has(step);
                return (
                  <div key={step}
                    className={`relative bg-white dark:bg-gray-900 border rounded-2xl p-6 transition-all duration-200 ${done ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-900/5" : `border-gray-100 dark:border-gray-800 hover:shadow-md`}`}>
                    {/* Step number & check */}
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggle(step)}
                        className="mt-0.5 shrink-0 transition-transform hover:scale-110 active:scale-95"
                        title={done ? "Mark incomplete" : "Mark complete"}
                      >
                        {done
                          ? <CheckCircle2 size={24} className="text-emerald-500" />
                          : <Circle size={24} className="text-gray-300 dark:text-gray-600" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.bg} ${c.text} shrink-0`}>{icon}</div>
                          <h3 className={`text-lg font-black ${done ? "line-through text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-white"}`}>{title}</h3>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ml-auto ${c.badge}`}>{time}</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">{desc}</p>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {actions.map(({ label, href }) => (
                            <Link key={label} href={href}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white ${c.num} hover:opacity-90 transition-opacity`}>
                              {label} <ChevronRight size={12} />
                            </Link>
                          ))}
                        </div>

                        {/* Tips */}
                        <div className="space-y-1.5">
                          {tips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className={`w-1 h-1 rounded-full mt-2 shrink-0 ${c.text.includes("text-") ? c.num : "bg-gray-400"}`} />
                              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{tip}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Completion message */}
              {completed.size === STEPS.length && (
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white text-center">
                  <p className="text-3xl mb-2">🎉</p>
                  <h3 className="text-xl font-black mb-2">You're all set!</h3>
                  <p className="text-emerald-100 text-sm mb-4">Your profile is ready. Time to explore the community and make your first connection.</p>
                  <Link href="/dash" className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-emerald-700 font-bold rounded-xl text-sm hover:bg-emerald-50 transition-colors">
                    Go to Dashboard <ChevronRight size={14} />
                  </Link>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Progress */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Your Progress</h3>
                <div className="space-y-3">
                  {STEPS.map(({ step, title, color }) => {
                    const c = colorMap[color] || colorMap.blue;
                    const done = completed.has(step);
                    return (
                      <button key={step} onClick={() => toggle(step)}
                        className="flex items-center gap-3 w-full text-left group">
                        {done
                          ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          : <div className={`w-4 h-4 rounded-full border-2 ${done ? "border-emerald-500" : "border-gray-300 dark:border-gray-600"} shrink-0 group-hover:border-gray-400 transition-colors`} />
                        }
                        <span className={`text-sm font-semibold ${done ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300"} group-hover:text-gray-900 dark:group-hover:text-white transition-colors`}>{title}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Progress</span><span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              {/* Key Features */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Platform Features</h3>
                <div className="space-y-2">
                  {FEATURES.map(({ icon, label, desc, href, color }) => {
                    const c = colorMap[color] || colorMap.blue;
                    return (
                      <Link key={label} href={href}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 group transition-colors">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>{icon}</div>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold group-hover:${c.text} transition-colors text-gray-800 dark:text-gray-200`}>{label}</p>
                          <p className="text-[10px] text-gray-400">{desc}</p>
                        </div>
                        <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors ml-auto shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Need Help */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-5">
                <h3 className="font-black text-sm text-blue-900 dark:text-blue-100 mb-2">Need help?</h3>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-3 leading-relaxed">Our support team and community are always available to help you get started.</p>
                <Link href="/dash/more?tool=support" className="block text-center py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors">
                  Open Support Ticket
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-black text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Terminal size={20} className="text-blue-500" /> beone<span className="text-blue-600">of</span>us
          </Link>
          <div className="flex flex-wrap justify-center gap-4">
            {[{ label: "Resources", href: "/resources" }, { label: "Community", href: "/community" }, { label: "Academy", href: "/Academy" }, { label: "Docs", href: "/docs" }].map(({ label, href }) => (
              <Link key={label} href={href} className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium">{label}</Link>
            ))}
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} beoneofus</p>
        </div>
      </footer>
      <FloatingAiAssistant />
    </div>
  );
}
