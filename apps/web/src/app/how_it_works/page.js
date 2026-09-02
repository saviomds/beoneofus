"use client";

import Link from "next/link";
import {
  UserPlus, Users, Briefcase, TrendingUp,
  ArrowRight, CheckCircle2, Globe, MessageSquare,
} from "lucide-react";

const STEPS = [
  {
    n: "01",
    title: "Create Your Profile",
    desc: "Sign up in under 60 seconds. Build a professional profile that showcases your skills, experience, portfolio, and career goals — visible to the entire beoneofus network.",
    icon: <UserPlus size={28} />,
    color: "from-blue-500 to-indigo-600",
    light: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
    features: ["Skill tags & endorsements", "Portfolio & project links", "Public /u/username profile"],
  },
  {
    n: "02",
    title: "Connect with Professionals",
    desc: "Discover and connect with engineers, designers, founders, marketers, and educators from every field. Join groups, follow conversations, and build relationships that matter.",
    icon: <Users size={28} />,
    color: "from-violet-500 to-purple-600",
    light: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
    features: ["Global professional network", "Interest-based groups", "Direct messaging"],
  },
  {
    n: "03",
    title: "Find Opportunities",
    desc: "Browse curated job listings and freelance projects posted directly by companies and professionals in the network.",
    icon: <Briefcase size={28} />,
    color: "from-emerald-500 to-teal-600",
    light: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    features: ["Remote & hybrid roles", "Freelance & contract work", "One-click applications"],
  },
  {
    n: "04",
    title: "Follow Your Pathway",
    desc: "Map a clear route from where you are to where you want to be — a first job, working or studying abroad, or your own business — and track every step with a network that gives you a push.",
    icon: <TrendingUp size={28} />,
    color: "from-amber-500 to-orange-600",
    light: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    features: ["Career pathways to your goal", "Mentors & alumni in your field", "Progress you can see"],
  },
];

const PERKS = [
  { icon: <Globe size={20} />, label: "Global Network", desc: "Professionals from every country and industry" },
  { icon: <Briefcase size={20} />, label: "Jobs & Internships", desc: "Real openings, matched to your profile" },
  { icon: <MessageSquare size={20} />, label: "Real Conversations", desc: "Groups, DMs, and community feeds" },
  { icon: <TrendingUp size={20} />, label: "Career Pathways", desc: "A clear route to the goal that's yours" },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Hero */}
      <section className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20" />
        <div className="relative max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-widest rounded-full mb-6">
            How it Works
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-5 leading-tight">
            Your career, connected<br />
            <span className="text-blue-600 dark:text-blue-400">and powered by AI</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto leading-relaxed mb-8">
            beoneofus is a professional network designed for every professional — not just tech.
            Build your profile, grow your network, find opportunities, and get AI-powered career support.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/25 text-sm"
          >
            Get Started Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-8">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="relative rounded-3xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 flex flex-col gap-5"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${step.light}`}>
                    {step.icon}
                  </div>
                  <span className="text-4xl font-black text-gray-100 dark:text-gray-800 select-none">{step.n}</span>
                </div>
                <div>
                  <h2 className="text-xl font-black mb-2">{step.title}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
                <ul className="space-y-1.5 mt-auto">
                  {step.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-semibold">
                      <CheckCircle2 size={14} className="text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="py-16 px-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-black mb-3">Everything in one place</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No more switching between five apps to manage your professional life.</p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PERKS.map((p) => (
            <div key={p.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 text-center flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                {p.icon}
              </div>
              <p className="text-sm font-black">{p.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-black mb-4">Ready to get started?</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
            Join professionals from every field building their careers on beoneofus.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth" className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/25 text-sm flex items-center justify-center gap-2">
              Create Free Account <ArrowRight size={15} />
            </Link>
            <Link href="/dash" className="px-6 py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-2xl transition-all text-sm">
              Explore the Platform
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
