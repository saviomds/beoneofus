"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle2, Circle, User, ClipboardList, FileText, UserCircle, Users,
  ChevronRight, GraduationCap, Plane, Briefcase, MessageSquare, LifeBuoy,
} from "lucide-react";
import { PublicHeader } from "../_study-work/components/PublicHeader";
import { PublicFooter } from "../_study-work/components/PublicFooter";

const STORAGE_KEY = "quickstart_done_v1";

const STEPS = [
  {
    step: 1,
    title: "Create your account",
    time: "1 min",
    icon: User,
    desc: "Sign up free with your email, Google or GitHub. One account works for your application, your profile and the whole platform.",
    actions: [{ label: "Create free account", href: "/auth?mode=sign-up" }],
    tips: [
      "Confirm your email from the link we send you",
      "Already have a beoneofus account? Just sign in — you don't need a new one",
    ],
  },
  {
    step: 2,
    title: "Check the requirements",
    time: "3 min",
    icon: ClipboardList,
    desc: "See what you'll need for Study Abroad or Work Abroad, so you can start gathering documents early.",
    actions: [{ label: "View requirements", href: "/requirements" }],
    tips: [
      "Your passport should be valid for at least 12 months from your travel date",
      "Study Abroad needs a transcript, proof of funds and a statement of purpose",
      "Work Abroad needs a CV, police clearance and proof of work experience",
    ],
  },
  {
    step: 3,
    title: "Start your application",
    time: "5 min",
    icon: FileText,
    desc: "Choose Study Abroad or Work Abroad and send your initial application with your personal details.",
    actions: [
      { label: "Apply to study", href: "/apply?type=study" },
      { label: "Apply to work", href: "/apply?type=work" },
    ],
    tips: [
      "Our team reviews your initial application — you don't need to do anything while it's under review",
      "Once confirmed, you'll add your history and upload each required document",
      "Follow every stage at any time from your application dashboard",
    ],
  },
  {
    step: 4,
    title: "Complete your profile",
    time: "3 min",
    icon: UserCircle,
    desc: "Add a photo, a short bio, your location and your skills. Your home dashboard shows exactly what's still missing.",
    actions: [{ label: "Edit your profile", href: "/dash/profile" }],
    tips: [
      "Write one or two sentences about who you are and where you want to go",
      "When your profile is complete, request a verified badge from Settings",
    ],
  },
  {
    step: 5,
    title: "Connect and explore",
    time: "Ongoing",
    icon: Users,
    desc: "Connect with people, join groups, and browse jobs and internships while your application moves forward.",
    actions: [
      { label: "Find people", href: "/dash/connections" },
      { label: "Browse jobs", href: "/dash/jobs" },
      { label: "Join groups", href: "/dash/groups" },
    ],
    tips: [
      "Add a short personal note when you send a connection request",
      "Only people you accept can send you messages",
    ],
  },
];

const FEATURES = [
  { icon: GraduationCap, label: "Study Abroad",   desc: "Study in Mauritius",             href: "/study-abroad" },
  { icon: Plane,         label: "Work Abroad",    desc: "Jobs & placements in Mauritius", href: "/work-abroad" },
  { icon: Briefcase,     label: "Jobs",           desc: "Jobs, internships & remote work", href: "/dash/jobs" },
  { icon: Users,         label: "Network",        desc: "Connections, groups & events",   href: "/dash/connections" },
];

export default function QuickStartPage() {
  const [completed, setCompleted] = useState(() => new Set());

  // Restore checked steps after mount (localStorage isn't available during SSR).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only storage; reading it during render would mismatch SSR
      if (Array.isArray(saved) && saved.length) setCompleted(new Set(saved));
    } catch { /* ignore */ }
  }, []);

  const toggle = (step) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step); else next.add(step);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  const progress = Math.round((completed.size / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <PublicHeader />

      <main>
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 pb-10 sm:pt-20">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Quick start · 5 steps</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">Get started with beoneofus</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
            From creating your account to sending your Study or Work Abroad application — follow these steps and tick
            them off as you go. Your progress is saved on this device.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Steps */}
          <ol className="lg:col-span-2 space-y-4">
            {STEPS.map(({ step, title, time, icon: Icon, desc, actions, tips }) => {
              const done = completed.has(step);
              return (
                <li
                  key={step}
                  className={`rounded-2xl border p-5 sm:p-6 transition-colors ${
                    done ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-900/10" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      onClick={() => toggle(step)}
                      aria-pressed={done}
                      aria-label={done ? `Mark "${title}" as not done` : `Mark "${title}" as done`}
                      className="mt-0.5 shrink-0 rounded-full"
                    >
                      {done ? <CheckCircle2 size={24} className="text-emerald-500" /> : <Circle size={24} className="text-gray-300 dark:text-gray-600 hover:text-gray-400" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Icon size={17} />
                        </span>
                        <h2 className={`text-lg font-semibold ${done ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-900 dark:text-white"}`}>
                          <span className="text-gray-400 dark:text-gray-500 font-medium mr-1.5">{step}.</span>{title}
                        </h2>
                        <span className="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{time}</span>
                      </div>
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {actions.map(({ label, href }, i) => (
                          <Link
                            key={href}
                            href={href}
                            className={`inline-flex items-center gap-1 h-9 px-3.5 rounded-lg text-sm font-semibold transition-colors ${
                              i === 0
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                            }`}
                          >
                            {label} <ChevronRight size={14} />
                          </Link>
                        ))}
                      </div>

                      <ul className="mt-4 space-y-1.5">
                        {tips.map((tip) => (
                          <li key={tip} className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            <span className="w-1 h-1 rounded-full bg-gray-400 mt-2 shrink-0" /> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              );
            })}

            {completed.size === STEPS.length && (
              <li className="rounded-2xl bg-emerald-600 p-6 text-white text-center list-none">
                <h2 className="text-xl font-semibold">You&apos;re all set</h2>
                <p className="mt-1.5 text-sm text-emerald-50">Your account and application are underway. Keep an eye on your dashboard for updates.</p>
                <Link href="/apply/dashboard" className="mt-4 inline-flex items-center gap-1.5 h-10 px-5 bg-white text-emerald-700 font-semibold rounded-lg text-sm hover:bg-emerald-50 transition-colors">
                  Open my application <ChevronRight size={14} />
                </Link>
              </li>
            )}
          </ol>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Your progress</h2>
                <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <ul className="space-y-2.5">
                {STEPS.map(({ step, title }) => {
                  const done = completed.has(step);
                  return (
                    <li key={step}>
                      <button type="button" onClick={() => toggle(step)} className="flex items-center gap-2.5 w-full text-left">
                        {done ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> : <Circle size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />}
                        <span className={`text-sm ${done ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>{title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Explore</h2>
              <ul className="space-y-1">
                {FEATURES.map(({ icon: Icon, label, desc, href }) => (
                  <li key={href}>
                    <Link href={href} className="group flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"><Icon size={16} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">{label}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">{desc}</span>
                      </span>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 p-5">
              <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2"><LifeBuoy size={16} /> Need help?</h2>
              <p className="mt-2 text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                Questions about your application? Message our team from the Messages tab inside it.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/docs" className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                  <MessageSquare size={14} /> Read the docs
                </Link>
                <Link href="/contact" className="inline-flex items-center justify-center h-9 rounded-lg border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-200 text-sm font-semibold hover:bg-white/60 dark:hover:bg-white/5 transition-colors">
                  Contact us
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
