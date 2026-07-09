"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2, Share2, Users, Globe, Target, Handshake,
  Sparkles, ArrowRight, ArrowLeft, TrendingUp, TrendingDown, RefreshCw, Cpu,
} from "lucide-react";
import {
  GROWTH_META, GROWTH_STAGES, GROWTH_CYCLE, AI_IMPROVEMENTS, GROWTH_METRICS,
} from "../../lib/growthData";

/* ── Accent tokens (full literal classes for Tailwind JIT) ── */
const ACCENT = {
  brand:   { grad: "from-brand-500 to-brand-700",        text: "text-brand-600 dark:text-brand-400",     soft: "bg-brand-50 dark:bg-brand-500/10",   border: "border-brand-200 dark:border-brand-500/25",   dot: "bg-brand-500",   glow: "bg-brand-500/25" },
  trust:   { grad: "from-trust-500 to-trust-600",        text: "text-trust-600 dark:text-trust-500",      soft: "bg-trust-50 dark:bg-trust-500/10",   border: "border-trust-100 dark:border-trust-500/25",   dot: "bg-trust-500",   glow: "bg-trust-500/25" },
  premium: { grad: "from-premium-500 to-premium-600",    text: "text-premium-600 dark:text-premium-500",  soft: "bg-premium-50 dark:bg-premium-500/10",border: "border-premium-100 dark:border-premium-500/25",dot: "bg-premium-500", glow: "bg-premium-500/25" },
  violet:  { grad: "from-fuchsia-500 via-violet-500 to-indigo-500", text: "text-violet-600 dark:text-violet-400", soft: "bg-violet-50 dark:bg-violet-500/10", border: "border-violet-200 dark:border-violet-500/25", dot: "bg-violet-500", glow: "bg-violet-500/25" },
  sky:     { grad: "from-sky-500 to-cyan-600",           text: "text-sky-600 dark:text-sky-400",          soft: "bg-sky-50 dark:bg-sky-500/10",       border: "border-sky-200 dark:border-sky-500/25",       dot: "bg-sky-500",     glow: "bg-sky-500/25" },
  rose:    { grad: "from-rose-500 to-pink-600",          text: "text-rose-600 dark:text-rose-400",        soft: "bg-rose-50 dark:bg-rose-500/10",     border: "border-rose-200 dark:border-rose-500/25",     dot: "bg-rose-500",    glow: "bg-rose-500/25" },
};
const ICONS = { building: Building2, network: Share2, community: Users, globe: Globe, target: Target, handshake: Handshake };

/* ── Scroll-reveal ── */
function useInView(opts = { threshold: 0.15 }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); obs.unobserve(e.target); } }, opts);
    obs.observe(el);
    return () => obs.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, seen];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, seen] = useInView();
  return (
    <div ref={ref} className={className}
      style={{ opacity: seen ? 1 : 0, transform: seen ? "none" : "translateY(24px)", transition: `opacity .7s ease, transform .7s cubic-bezier(.22,1,.36,1)`, transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── Metric card ── */
function StatCard({ m, i, value }) {
  const display = value == null ? "—" : Number(value).toLocaleString();
  return (
    <Reveal delay={i * 45}>
      <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5
        transition-all hover:-translate-y-0.5 hover:shadow-xl">
        <div className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 rounded-full bg-brand-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <p className="text-2xl sm:text-3xl font-black tabular-nums bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
          {display}
        </p>
        <p className="mt-1 text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 leading-snug">{m.label}</p>
      </div>
    </Reveal>
  );
}

/* ── Stage detail card ── */
function StageDetail({ stage }) {
  const a = ACCENT[stage.accent];
  const Icon = ICONS[stage.icon] || Building2;
  return (
    <div className={`relative overflow-hidden rounded-3xl border ${a.border} bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 shadow-xl`}>
      <div className={`pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl ${a.glow}`} />
      <div className="relative">
        <div className="flex items-start gap-4">
          <div className={`relative shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${a.grad} flex items-center justify-center shadow-lg`}>
            <Icon size={24} className="text-white" />
            <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-white dark:bg-[#0d1226] border border-gray-200 dark:border-white/10 text-[11px] font-black flex items-center justify-center text-gray-900 dark:text-white shadow-sm">
              {String(stage.number).padStart(2, "0")}
            </span>
          </div>
          <div className="min-w-0">
            <span className={`text-[10px] font-black uppercase tracking-[0.14em] px-2.5 py-1 rounded-full ${a.soft} ${a.text}`}>
              Stage {String(stage.number).padStart(2, "0")}
            </span>
            <h3 className="mt-2 text-2xl sm:text-[26px] font-black tracking-tight text-gray-900 dark:text-white leading-tight text-balance">{stage.title}</h3>
          </div>
        </div>

        <p className="mt-4 text-sm sm:text-[15px] leading-relaxed text-gray-500 dark:text-gray-400 max-w-3xl">{stage.description}</p>

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stage.sections.map((s) => (
            <div key={s.label}>
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">{s.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {s.items.map((it) => (
                  <span key={it} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${a.border} ${a.soft} text-gray-700 dark:text-gray-200 transition-transform hover:-translate-y-0.5`}>
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GrowthPage() {
  const stages = GROWTH_STAGES;
  const [active, setActive] = useState(0);

  // Real, live platform counts (no fabricated investor figures).
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/platform-stats")
      .then((r) => r.json())
      .then((d) => { if (alive) setStats(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white dark:from-[#0b0f1e] dark:via-[#0a0e1c] dark:to-[#0b0f1e] text-gray-900 dark:text-gray-100">
      <style>{`@media (prefers-reduced-motion: reduce){*{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}}`}</style>

      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-24 w-[36rem] h-[36rem] rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-[34rem] h-[34rem] rounded-full bg-trust-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[30rem] h-[30rem] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-lg tracking-tighter">beone<span className="text-brand-500">of</span>us</Link>
          <div className="flex items-center gap-4 text-sm font-bold">
            <Link href="/roadmap" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Roadmap</Link>
            <Link href="/dash/home" className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              <ArrowLeft size={15} /> App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-6">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 rounded-full">
            <Sparkles size={12} /> {GROWTH_META.kicker}
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-black tracking-tighter leading-[1.03] text-balance max-w-4xl">
            {GROWTH_META.title}
          </h1>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300 max-w-3xl">{GROWTH_META.subtitle}</p>
          <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-gray-500 dark:text-gray-400 max-w-3xl">{GROWTH_META.supporting}</p>
        </Reveal>
      </section>

      {/* Investor Metrics Dashboard */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Reveal className="mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-brand-500 to-trust-500" />
            <h2 className="text-xl font-black tracking-tight">Live Platform Metrics</h2>
          </div>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">Real figures pulled live from the platform — no projections. They grow as the community grows.</p>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {GROWTH_METRICS.map((m, i) => <StatCard key={m.key} m={m} i={i} value={stats?.[m.key]} />)}
        </div>
      </section>

      {/* Growth timeline */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Reveal className="mb-8">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-premium-500 to-violet-500" />
            <h2 className="text-xl font-black tracking-tight">The Compounding Growth Cycle</h2>
          </div>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">Six reinforcing engines — each strengthens the next, and AI amplifies every stage.</p>
        </Reveal>

        {/* Desktop: horizontal stepper + detail */}
        <div className="hidden lg:block">
          <div className="relative mb-8">
            {/* connecting line */}
            <div aria-hidden className="absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-500/40 via-premium-500/40 to-rose-500/40" />
            <div className="relative grid grid-cols-6 gap-2">
              {stages.map((s, i) => {
                const a = ACCENT[s.accent];
                const on = i === active;
                const Icon = ICONS[s.icon] || Building2;
                return (
                  <button key={s.id} onClick={() => setActive(i)} aria-pressed={on}
                    className="group flex flex-col items-center text-center focus:outline-none">
                    <span className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border
                      ${on ? `bg-gradient-to-br ${a.grad} border-transparent shadow-lg scale-110` : "bg-white dark:bg-[#0d1226] border-gray-200 dark:border-white/10 group-hover:scale-105"}`}>
                      <Icon size={18} className={on ? "text-white" : "text-gray-400 dark:text-gray-500"} />
                    </span>
                    <span className={`mt-3 text-[11px] font-black uppercase tracking-wider ${on ? a.text : "text-gray-400"}`}>0{s.number}</span>
                    <span className={`text-xs font-bold leading-tight ${on ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>{s.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div key={active} className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            <StageDetail stage={stages[active]} />
          </div>
        </div>

        {/* Mobile / tablet: stacked cards with left connector */}
        <div className="lg:hidden relative space-y-6">
          <div aria-hidden className="absolute left-[27px] top-4 bottom-4 w-px bg-gradient-to-b from-brand-500/40 via-premium-500/40 to-rose-500/40" />
          {stages.map((s) => (
            <div key={s.id} className="relative pl-0">
              <Reveal><StageDetail stage={s} /></Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* AI Compounding Growth Engine */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-[#0b0f1e] to-[#12183a] text-white p-6 sm:p-10 shadow-2xl">
            <div aria-hidden className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/3 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white/70 bg-white/10 px-3 py-1.5 rounded-full">
                  <Cpu size={12} /> AI Compounding Growth Engine
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-balance max-w-3xl">Every interaction makes the whole ecosystem smarter</h2>

              {/* Cycle chain */}
              <div className="mt-8 flex flex-wrap items-center gap-x-1.5 gap-y-3">
                {GROWTH_CYCLE.map((node, i) => (
                  <span key={node} className="inline-flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold px-3 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm hover:bg-white/15 transition-colors">
                      {node}
                    </span>
                    {i < GROWTH_CYCLE.length - 1 && <ArrowRight size={14} className="text-white/40 shrink-0" />}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-trust-400 px-3 py-2 rounded-xl bg-trust-500/10 border border-trust-500/25">
                  <RefreshCw size={13} /> loops back &amp; compounds
                </span>
              </div>

              {/* AI improves */}
              <div className="mt-10">
                <p className="text-[11px] font-black uppercase tracking-wider text-white/50 mb-3">AI continuously improves</p>
                <div className="flex flex-wrap gap-2">
                  {AI_IMPROVEMENTS.map((x) => (
                    <span key={x} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-white/[0.08] to-white/[0.03] border border-white/10 text-white/85">
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Closing CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-brand-600 via-brand-600 to-violet-700 p-8 sm:p-12 text-white shadow-2xl">
            <div aria-hidden className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
            <div className="relative max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-balance">Network effects, engineered</h2>
              <p className="mt-3 text-white/80 leading-relaxed">Trusted institutions bring verified people. AI turns that trust into compounding growth. Partner with us early.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/for-institutions" className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold text-sm px-5 py-3 rounded-2xl hover:bg-white/90 transition-all active:scale-95">
                  Partner with us <ArrowRight size={16} />
                </Link>
                <Link href="/roadmap" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-bold text-sm px-5 py-3 rounded-2xl hover:bg-white/20 transition-all">
                  See the roadmap
                </Link>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">BeOneOfUs — The Global Opportunity Ecosystem</p>
        </Reveal>
      </section>
    </main>
  );
}
