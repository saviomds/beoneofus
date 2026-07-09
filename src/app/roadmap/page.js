"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Rocket, Building2, Landmark, Sparkles, Check, CheckCircle2, Clock,
  ChevronDown, ArrowRight, ArrowLeft, Target, ListChecks, Trophy, Cpu,
  Rows3, Columns3, Layers, Circle,
} from "lucide-react";
import {
  ROADMAP_META, ROADMAP_PHASES, overallProgress,
} from "../../lib/roadmapData";

/* ── Design tokens per accent (full literal classes so Tailwind JIT keeps them) ── */
const ACCENT = {
  brand: {
    grad: "from-brand-500 to-brand-700", text: "text-brand-600 dark:text-brand-400",
    soft: "bg-brand-50 dark:bg-brand-500/10", border: "border-brand-200 dark:border-brand-500/25",
    bar: "bg-brand-500", glow: "bg-brand-500/25", dot: "bg-brand-500", ringSoft: "ring-brand-500/20",
  },
  trust: {
    grad: "from-trust-500 to-trust-600", text: "text-trust-600 dark:text-trust-500",
    soft: "bg-trust-50 dark:bg-trust-500/10", border: "border-trust-100 dark:border-trust-500/25",
    bar: "bg-trust-500", glow: "bg-trust-500/25", dot: "bg-trust-500", ringSoft: "ring-trust-500/20",
  },
  premium: {
    grad: "from-premium-500 to-premium-600", text: "text-premium-600 dark:text-premium-500",
    soft: "bg-premium-50 dark:bg-premium-500/10", border: "border-premium-100 dark:border-premium-500/25",
    bar: "bg-premium-500", glow: "bg-premium-500/25", dot: "bg-premium-500", ringSoft: "ring-premium-500/20",
  },
  ai: {
    grad: "from-fuchsia-500 via-violet-500 to-indigo-500", text: "text-violet-600 dark:text-violet-400",
    soft: "bg-violet-50 dark:bg-violet-500/10", border: "border-violet-200 dark:border-violet-500/25",
    bar: "bg-gradient-to-r from-fuchsia-500 to-indigo-500", glow: "bg-violet-500/25", dot: "bg-violet-500", ringSoft: "ring-violet-500/20",
  },
};

const PHASE_ICON = { foundation: Rocket, institutional: Building2, ecosystem: Landmark, intelligence: Sparkles };

const STATUS = {
  completed:   { label: "Shipped",      cls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25", Icon: CheckCircle2 },
  in_progress: { label: "In progress",  cls: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/25", Icon: Clock },
  planned:     { label: "Planned",      cls: "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10", Icon: Circle },
};

const TABS = [
  { id: "objectives", label: "Objectives", Icon: Target },
  { id: "features",   label: "Features",   Icon: Layers },
  { id: "success",    label: "Success",    Icon: Trophy },
  { id: "technical",  label: "Technical",  Icon: Cpu },
];

/* ── Scroll-reveal hook (respects reduced motion via CSS) ── */
function useInView(options = { threshold: 0.15 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.unobserve(e.target); }
    }, options);
    obs.observe(el);
    return () => obs.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, inView];
}

/* ── Circular progress ring ── */
function Ring({ value, size = 116, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" role="img" aria-label={`${value}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
        className="stroke-gray-200 dark:stroke-white/10" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
        stroke="url(#ringGrad)" strokeDasharray={c} strokeDashoffset={off}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1)" }} />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4c5ff5" />
          <stop offset="55%" stopColor="#17c3a6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Slim progress bar ── */
function Bar({ value, accent }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
      <div className={`h-full rounded-full ${accent.bar}`}
        style={{ width: inView ? `${value}%` : "0%", transition: "width 1.2s cubic-bezier(.22,1,.36,1)" }} />
    </div>
  );
}

/* ── One phase card ── */
function PhaseCard({ phase, open, onToggle, tab, onTab, cardRef }) {
  const a = ACCENT[phase.accent];
  const s = STATUS[phase.status];
  const Icon = PHASE_ICON[phase.id] || Rocket;
  const [revRef, inView] = useInView();

  return (
    <article
      ref={cardRef}
      id={`phase-${phase.id}`}
      className="scroll-mt-28"
    >
      <div
        ref={revRef}
        className={`group relative overflow-hidden rounded-3xl border ${a.border}
          bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl
          shadow-[0_1px_0_rgba(255,255,255,.6)_inset,0_20px_50px_-30px_rgba(10,16,36,.35)]
          transition-all duration-700 will-change-transform
          ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        {/* accent glow */}
        <div className={`pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl ${a.glow}`} />
        <div className="relative p-6 sm:p-8">
          {/* Header row */}
          <div className="flex items-start gap-4 sm:gap-5">
            <div className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${a.grad}
              flex items-center justify-center shadow-lg`}>
              <Icon size={26} className="text-white" />
              <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-white dark:bg-[#0d1226] border border-gray-200 dark:border-white/10
                text-[11px] font-black flex items-center justify-center text-gray-900 dark:text-white shadow-sm">
                {phase.number}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-[0.14em] px-2.5 py-1 rounded-full ${a.soft} ${a.text}`}>
                  {phase.tag}
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${s.cls}`}>
                  <s.Icon size={11} /> {s.label}
                </span>
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">{phase.timeline}</span>
              </div>
              <h3 className="mt-2 text-2xl sm:text-[28px] font-black tracking-tight text-gray-900 dark:text-white leading-tight text-balance">
                {phase.title}
              </h3>
              <p className="mt-2 text-sm sm:text-[15px] leading-relaxed text-gray-500 dark:text-gray-400 max-w-2xl">
                {phase.description}
              </p>
            </div>

            {/* progress % */}
            <div className="hidden sm:flex flex-col items-end shrink-0">
              <span className={`text-3xl font-black tabular-nums ${a.text}`}>{phase.progress}<span className="text-lg">%</span></span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">complete</span>
            </div>
          </div>

          {/* progress bar */}
          <div className="mt-5"><Bar value={phase.progress} accent={a} /></div>

          {/* KPI grid */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {phase.kpis.map((k) => (
              <div key={k.label}
                className="rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-gray-50/70 dark:bg-white/[0.02] px-4 py-3">
                <p className={`text-xl sm:text-2xl font-black tabular-nums ${a.text}`}>{k.value}</p>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Expand toggle */}
          <button
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={`detail-${phase.id}`}
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200
              hover:text-gray-900 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-lg px-1 -mx-1"
          >
            {open ? "Hide details" : "Explore this phase"}
            <ChevronDown size={16} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </button>

          {/* Detail */}
          <div
            id={`detail-${phase.id}`}
            className="grid transition-all duration-500 ease-out"
            style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
          >
            <div className="overflow-hidden">
              <div className="pt-6">
                {/* Tabs */}
                <div className="flex gap-1.5 flex-wrap p-1 rounded-2xl bg-gray-100 dark:bg-white/[0.04] w-fit">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onTab(t.id)}
                      aria-pressed={tab === t.id}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        tab === t.id
                          ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      }`}
                    >
                      <t.Icon size={13} /> {t.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5">
                  {tab === "objectives" && (
                    <ul className="grid sm:grid-cols-2 gap-2.5">
                      {phase.objectives.map((o) => (
                        <li key={o} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                          <span className={`mt-0.5 shrink-0 w-5 h-5 rounded-full ${a.soft} ${a.text} flex items-center justify-center`}>
                            <Check size={12} />
                          </span>
                          {o}
                        </li>
                      ))}
                    </ul>
                  )}

                  {tab === "features" && (
                    <div className="space-y-5">
                      {phase.featureGroups.map((g) => (
                        <div key={g.group}>
                          <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">{g.group}</p>
                          <div className="flex flex-wrap gap-2">
                            {g.items.map((it) => (
                              <span key={it}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border ${a.border} ${a.soft} text-gray-700 dark:text-gray-200
                                  transition-transform hover:-translate-y-0.5`}>
                                {it}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === "success" && (
                    <ul className="grid sm:grid-cols-2 gap-2.5">
                      {phase.successMetrics.map((m) => (
                        <li key={m} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                          <Trophy size={15} className={`mt-0.5 shrink-0 ${a.text}`} /> {m}
                        </li>
                      ))}
                    </ul>
                  )}

                  {tab === "technical" && (
                    <ul className="grid sm:grid-cols-2 gap-2.5">
                      {phase.technicalGoals.map((t) => (
                        <li key={t} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                          <ListChecks size={15} className={`mt-0.5 shrink-0 ${a.text}`} /> {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function RoadmapPage() {
  const phases = ROADMAP_PHASES;
  const overall = overallProgress(phases);
  const [view, setView] = useState("vertical");   // 'vertical' | 'horizontal'
  const [openIds, setOpenIds] = useState({ foundation: true });
  const [tabById, setTabById] = useState({});
  const [active, setActive] = useState(phases[0].id);
  const cardRefs = useRef({});

  const toggleOpen = (id) => setOpenIds((s) => ({ ...s, [id]: !s[id] }));
  const setTab = (id, t) => setTabById((s) => ({ ...s, [id]: t }));

  // Track which phase is in view for the sticky nav.
  useEffect(() => {
    if (view !== "vertical") return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.dataset.id); });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    Object.values(cardRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [view]);

  const jumpTo = useCallback((id) => {
    const el = cardRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white dark:from-[#0b0f1e] dark:via-[#0a0e1c] dark:to-[#0b0f1e] text-gray-900 dark:text-gray-100">
      {/* WCAG: honor reduced-motion — kill reveals/animations for those who ask */}
      <style>{`@media (prefers-reduced-motion: reduce){*{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}}`}</style>
      {/* Ambient gradient blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[38rem] h-[38rem] rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-[34rem] h-[34rem] rounded-full bg-trust-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[30rem] h-[30rem] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-lg tracking-tighter">
            beone<span className="text-brand-500">of</span>us
          </Link>
          <Link href="/dash/home"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={15} /> Back to app
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-8">
        <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400
              bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 rounded-full">
              <Sparkles size={12} /> {ROADMAP_META.kicker}
            </span>
            <h1 className="mt-4 text-4xl sm:text-6xl font-black tracking-tighter leading-[1.02] text-balance">
              {ROADMAP_META.title}
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-gray-500 dark:text-gray-400 max-w-2xl">
              {ROADMAP_META.subtitle}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={() => jumpTo(phases[0].id)}
                className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm px-5 py-3 rounded-2xl
                  hover:opacity-90 transition-all active:scale-95 shadow-lg">
                Explore the phases <ArrowRight size={16} />
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {phases.filter((p) => p.status !== "planned").length} of {phases.length} phases underway
              </div>
            </div>
          </div>

          {/* Overall progress */}
          <div className="relative rounded-3xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 flex items-center gap-5 shadow-xl">
            <div className="relative">
              <Ring value={overall} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black tabular-nums">{overall}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">overall</span>
              </div>
            </div>
            <div className="space-y-2">
              {phases.map((p) => {
                const a = ACCENT[p.accent];
                return (
                  <div key={p.id} className="flex items-center gap-2.5 text-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${a.dot}`} />
                    <span className="font-semibold text-gray-600 dark:text-gray-300 w-28 truncate">{p.title}</span>
                    <span className="tabular-nums font-bold text-gray-400">{p.progress}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky phase nav */}
      <nav className="sticky top-0 z-30 border-y border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-[#0b0f1e]/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {phases.map((p) => {
              const a = ACCENT[p.accent];
              const on = active === p.id && view === "vertical";
              return (
                <button key={p.id} onClick={() => jumpTo(p.id)}
                  aria-current={on ? "true" : undefined}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    on ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${on ? "bg-white dark:bg-gray-900" : a.dot}`} />
                  <span className="hidden sm:inline">P{p.number} · {p.title}</span>
                  <span className="sm:hidden">P{p.number}</span>
                </button>
              );
            })}
          </div>
          {/* View toggle */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/5 shrink-0">
            <button onClick={() => setView("vertical")} aria-pressed={view === "vertical"}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${view === "vertical" ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-400"}`}>
              <Rows3 size={13} /> Vertical
            </button>
            <button onClick={() => setView("horizontal")} aria-pressed={view === "horizontal"}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${view === "horizontal" ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-400"}`}>
              <Columns3 size={13} /> Horizontal
            </button>
          </div>
        </div>
      </nav>

      {/* Timeline */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {view === "vertical" ? (
          <div className="relative">
            {/* vertical rail */}
            <div aria-hidden className="hidden md:block absolute left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-brand-500/40 via-trust-500/40 to-violet-500/40" />
            <div className="space-y-8 sm:space-y-10">
              {phases.map((p) => {
                const a = ACCENT[p.accent];
                return (
                  <div key={p.id} className="relative md:pl-20"
                    ref={(el) => { cardRefs.current[p.id] = el; if (el) el.dataset.id = p.id; }}>
                    {/* rail node */}
                    <div aria-hidden className="hidden md:flex absolute left-0 top-6 w-14 h-14 rounded-2xl items-center justify-center
                      bg-white dark:bg-[#0d1226] border border-gray-200 dark:border-white/10 shadow-sm">
                      <span className={`w-3.5 h-3.5 rounded-full ${a.dot} ${p.status === "in_progress" ? "animate-pulse" : ""}`} />
                    </div>
                    <PhaseCard
                      phase={p}
                      open={!!openIds[p.id]}
                      onToggle={() => toggleOpen(p.id)}
                      tab={tabById[p.id] || "objectives"}
                      onTab={(t) => setTab(p.id, t)}
                      cardRef={() => {}}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 custom-scrollbar">
            {phases.map((p) => (
              <div key={p.id} className="snap-start shrink-0 w-[86vw] sm:w-[560px]"
                ref={(el) => { cardRefs.current[p.id] = el; if (el) el.dataset.id = p.id; }}>
                <PhaseCard
                  phase={p}
                  open={!!openIds[p.id]}
                  onToggle={() => toggleOpen(p.id)}
                  tab={tabById[p.id] || "objectives"}
                  onTab={(t) => setTab(p.id, t)}
                  cardRef={() => {}}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Closing CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-brand-600 via-brand-600 to-violet-700 p-8 sm:p-12 text-white shadow-2xl">
          <div aria-hidden className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-balance">Building the world&apos;s opportunity ecosystem</h2>
            <p className="mt-3 text-white/80 leading-relaxed">
              From a global MVP to planetary-scale intelligence — one deliberate phase at a time. Partner with us early.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/for-institutions" className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold text-sm px-5 py-3 rounded-2xl hover:bg-white/90 transition-all active:scale-95">
                Partner with us <ArrowRight size={16} />
              </Link>
              <Link href="/dash/home" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-bold text-sm px-5 py-3 rounded-2xl hover:bg-white/20 transition-all">
                Enter the platform
              </Link>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
          BeOneOfUs — The Global Opportunity Ecosystem
        </p>
      </section>
    </main>
  );
}
