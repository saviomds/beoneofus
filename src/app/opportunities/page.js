'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase, ShoppingBag, FileSignature, HeartHandshake, Handshake,
  ChevronRight, TrendingUp, ArrowLeft, Moon, Sun,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTheme } from 'next-themes';

const ITEMS = [
  {
    id: 'marketplace',
    label: 'Jobs',
    desc: 'Browse job listings across every industry. One-click apply with your beoneofus profile — no CV upload needed.',
    icon: Briefcase,
    iconBg: 'bg-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800/40',
    text: 'text-blue-600 dark:text-blue-400',
    tag: 'All Industries',
    tagStyle: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    dest: '/dash/marketplace',
  },
  {
    id: 'services',
    label: 'Services',
    desc: 'Post and hire freelance services. Offer your skills to the global network and get paid for your work.',
    icon: ShoppingBag,
    iconBg: 'bg-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    tag: 'Freelance',
    tagStyle: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    dest: '/dash/services',
  },
  {
    id: 'contracts',
    label: 'Contracts',
    desc: 'Manage signed agreements, active contracts, and deliverables between you and your clients or employers.',
    icon: FileSignature,
    iconBg: 'bg-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-200 dark:border-rose-800/40',
    text: 'text-rose-600 dark:text-rose-400',
    tag: 'Secured',
    tagStyle: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    dest: '/dash/contracts',
  },
  {
    id: 'mentorship',
    label: 'Mentorship',
    desc: 'Book 1-on-1 sessions with experienced professionals. Give or receive structured guidance in your field.',
    icon: HeartHandshake,
    iconBg: 'bg-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-200 dark:border-violet-800/40',
    text: 'text-violet-600 dark:text-violet-400',
    tag: 'Premium',
    tagStyle: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    dest: '/dash/mentorship',
  },
  {
    id: 'partnerships',
    label: 'Partnership',
    desc: 'Collaborate on projects, co-found startups, and build ventures together with aligned professionals.',
    icon: Handshake,
    iconBg: 'bg-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-teal-200 dark:border-teal-800/40',
    text: 'text-teal-600 dark:text-teal-400',
    tag: 'Collaborate',
    tagStyle: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
    dest: '/dash/partnerships',
  },
];

export default function OpportunitiesPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth?next=/opportunities');
      else setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Top nav ───────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/dash/home"
            className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <TrendingUp size={13} className="text-white" />
            </div>
            <span className="text-sm font-black text-gray-900 dark:text-gray-100">Opportunities</span>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Page header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <TrendingUp size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Opportunities</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Find work, hire talent, and build partnerships that move you forward.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 shrink-0">
              {ITEMS.length} sections
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.dest)}
                className={`group text-left p-6 rounded-2xl border ${item.bg} ${item.border} transition-all duration-200 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 ${item.iconBg} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${item.tagStyle}`}>
                    {item.tag}
                  </span>
                </div>

                <h3 className={`text-base font-black ${item.text} mb-2`}>{item.label}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-5">{item.desc}</p>

                <span className={`inline-flex items-center gap-1.5 text-[11px] font-black ${item.text}`}>
                  Open {item.label}
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            );
          })}
        </div>

      </main>
    </div>
  );
}
