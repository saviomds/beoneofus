'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { Bot, ArrowRight, Briefcase, GraduationCap, BookOpen, Sparkles, Loader2, Search } from 'lucide-react';

const MODULE = {
  job:    { label: 'Job',    icon: Briefcase,     accent: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' },
  mentor: { label: 'Mentor', icon: GraduationCap, accent: 'text-trust-600 dark:text-trust-500 bg-trust-50 dark:bg-trust-500/15' },
  course: { label: 'Course', icon: BookOpen,      accent: 'text-premium-600 dark:text-premium-500 bg-premium-50 dark:bg-premium-500/15' },
};

const CHIPS = ['Find a remote design job', 'Become a senior React developer', 'Match me a mentor in AI', 'Learn cloud & land a job'];

function scoreColor(s) {
  if (s >= 85) return 'text-trust-600 dark:text-trust-500 bg-trust-50 dark:bg-trust-500/15';
  if (s >= 70) return 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15';
  return 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5';
}

export default function MatchesContent() {
  const router = useRouter();
  const [goal, setGoal] = useState('');
  const [matches, setMatches] = useState([]);
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [engine, setEngine] = useState(null);

  const run = useCallback(async (q) => {
    const query = (q ?? goal).trim();
    if (!query) return;
    setGoal(query);
    setState('loading');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth?next=/dash/matches'); return; }
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ goal: query }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Match failed');
      setMatches(data.matches || []);
      setEngine(data.engine || null);
      setState('done');
    } catch {
      setState('error');
    }
  }, [goal, router]);

  // Pick up a goal handed over from the dashboard AI bar
  useEffect(() => {
    let q = '';
    try { q = sessionStorage.getItem('match_goal') || ''; sessionStorage.removeItem('match_goal'); } catch {}
    if (q) run(q);
  }, [run]);

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
          <Sparkles size={13} /> AI Matching
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-gray-100">Get matched across everything.</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">Describe a goal in plain language — the engine ranks jobs, mentors, and courses by real fit, not keywords.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); run(); }}>
        <div className="flex items-center gap-2 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-800 rounded-2xl p-2 pl-4 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
          <Bot size={18} className="text-brand-500 shrink-0" />
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. I want a remote React job and a mentor to level up"
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 min-w-0"
          />
          <button type="submit" disabled={state === 'loading'} className="shrink-0 inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors active:scale-95">
            {state === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <>Match <ArrowRight size={13} /></>}
          </button>
        </div>
      </form>

      {state === 'idle' && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {CHIPS.map((c) => (
            <button key={c} onClick={() => run(c)} className="text-[11px] font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-500/15 hover:text-brand-600 dark:hover:text-brand-300 transition-colors">
              {c}
            </button>
          ))}
        </div>
      )}

      {state === 'loading' && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 animate-pulse" />)}
        </div>
      )}

      {state === 'error' && (
        <div className="mt-6 text-center py-10 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
          <p className="text-sm text-gray-500 dark:text-gray-400">Couldn&apos;t run matching just now. Try again.</p>
        </div>
      )}

      {state === 'done' && (
        <div className="mt-6">
          {matches.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
              <Search size={26} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No matches yet — as more jobs, mentors, and courses join, results improve.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">{matches.length} matches</p>
                {engine === 'ai' && <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 rounded-full">AI-ranked</span>}
              </div>
              <div className="space-y-3">
                {matches.map((m, i) => {
                  const meta = MODULE[m.module] || MODULE.job;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={`${m.module}-${m.id}-${i}`}
                      onClick={() => router.push(m.href || '/dash/home')}
                      className="group w-full text-left flex items-center gap-4 bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-zinc-800/80 hover:border-brand-300 dark:hover:border-brand-700 rounded-2xl p-4 transition-all active:scale-[0.99]"
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.accent}`}><Icon size={20} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.accent}`}>{meta.label}</span>
                          <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{m.title}</p>
                        </div>
                        {m.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{m.subtitle}</p>}
                        {m.reason && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">“{m.reason}”</p>}
                      </div>
                      <div className={`shrink-0 text-sm font-black tabular-nums px-2.5 py-1 rounded-lg ${scoreColor(m.score)}`}>{m.score}%</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
