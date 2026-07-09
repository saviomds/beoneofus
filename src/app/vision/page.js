"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  motion, useInView, useReducedMotion, animate, useScroll, useTransform,
} from "framer-motion";
import {
  Sparkles, ArrowRight, ArrowLeft, ChevronDown, Fingerprint, Brain, Plug, Globe,
  ShieldCheck, Network, Cpu, Play,
} from "lucide-react";
import {
  VISION_META, PILLARS, FUTURE_MILESTONES, IMPACT_METRICS,
} from "../../lib/visionData";

const HeroNetwork = dynamic(() => import("../components/vision/HeroNetwork"), { ssr: false });
const EcosystemGraph = dynamic(() => import("../components/vision/EcosystemGraph"), {
  ssr: false,
  loading: () => <div className="h-[420px] flex items-center justify-center text-white/30 text-sm">Loading ecosystem…</div>,
});

/* ── accent tokens ── */
const AC = {
  blue:    { grad: "from-blue-500 to-blue-700",       text: "text-blue-600 dark:text-blue-400",     soft: "bg-blue-50 dark:bg-blue-500/10",     border: "border-blue-200 dark:border-blue-500/25",     dot: "bg-blue-500",    glow: "bg-blue-500/25" },
  violet:  { grad: "from-violet-500 to-fuchsia-600",  text: "text-violet-600 dark:text-violet-400",  soft: "bg-violet-50 dark:bg-violet-500/10", border: "border-violet-200 dark:border-violet-500/25", dot: "bg-violet-500",  glow: "bg-violet-500/25" },
  emerald: { grad: "from-emerald-500 to-teal-600",    text: "text-emerald-600 dark:text-emerald-400",soft: "bg-emerald-50 dark:bg-emerald-500/10",border:"border-emerald-200 dark:border-emerald-500/25",dot: "bg-emerald-500", glow: "bg-emerald-500/25" },
  cyan:    { grad: "from-cyan-500 to-sky-600",        text: "text-cyan-600 dark:text-cyan-400",      soft: "bg-cyan-50 dark:bg-cyan-500/10",     border: "border-cyan-200 dark:border-cyan-500/25",     dot: "bg-cyan-500",    glow: "bg-cyan-500/25" },
};
const MILESTONE_ICON = { id: Fingerprint, brain: Brain, plug: Plug, globe: Globe };
const PILLAR_ICON = { ai: Cpu, growth: Network, trust: ShieldCheck };

/* ── primitives ── */
function Reveal({ children, y = 24, delay = 0, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

function SectionHeader({ kicker, title, description, center }) {
  return (
    <div className={center ? "text-center max-w-3xl mx-auto" : "max-w-3xl"}>
      {kicker && (
        <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-3 py-1.5 rounded-full">
          <Sparkles size={12} /> {kicker}
        </span>
      )}
      <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tighter leading-[1.05] text-balance">{title}</h2>
      {description && <p className="mt-4 text-base sm:text-lg leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
  );
}

function AnimatedCounter({ value, prefix = "", suffix = "", format = "int" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration: reduce ? 0 : 1.7, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setN(v) });
    return () => c.stop();
  }, [inView, value, reduce]);
  const shown = format === "dec" ? n.toFixed(1) : Math.round(n).toLocaleString();
  return <span ref={ref} className="tabular-nums">{prefix}{shown}{suffix}</span>;
}

/* mini pillar visual */
function PillarVisual({ kind, a }) {
  if (kind === "neural") {
    return (
      <svg viewBox="0 0 120 80" className="w-full h-24">
        {[[20, 20], [20, 40], [20, 60], [60, 30], [60, 55], [100, 40]].map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="4" className={a.text} fill="currentColor">
            <animate attributeName="opacity" values="0.4;1;0.4" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {[[20, 20, 60, 30], [20, 40, 60, 30], [20, 40, 60, 55], [20, 60, 60, 55], [60, 30, 100, 40], [60, 55, 100, 40]].map((l, i) => (
          <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="currentColor" className={a.text} strokeWidth="0.8" opacity="0.4" />
        ))}
      </svg>
    );
  }
  if (kind === "map") {
    return (
      <svg viewBox="0 0 120 80" className="w-full h-24">
        <ellipse cx="60" cy="40" rx="52" ry="30" fill="none" stroke="currentColor" className={a.text} strokeWidth="0.8" opacity="0.3" />
        <ellipse cx="60" cy="40" rx="30" ry="30" fill="none" stroke="currentColor" className={a.text} strokeWidth="0.8" opacity="0.3" />
        {[[30, 30], [90, 28], [45, 60], [80, 58], [60, 22]].map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="currentColor" className={a.text}>
            <animate attributeName="r" values="2;4;2" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 80" className="w-full h-24">
      <path d="M60 12 L88 22 V44 C88 60 60 70 60 70 C60 70 32 60 32 44 V22 Z" fill="none" stroke="currentColor" className={a.text} strokeWidth="1.4" opacity="0.7" />
      <path d="M60 24 L78 31 V45 C78 55 60 61 60 61 C60 61 42 55 42 45 V31 Z" fill="none" stroke="currentColor" className={a.text} strokeWidth="1" opacity="0.35">
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.4s" repeatCount="indefinite" />
      </path>
      <path d="M52 42 l6 6 l12 -14" fill="none" stroke="currentColor" className={a.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function VisionPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroFade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const [openM, setOpenM] = useState(0);

  // Real, live platform counts (no fabricated numbers).
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
    <main className="relative bg-white dark:bg-[#0B1020] text-gray-900 dark:text-gray-100 overflow-x-hidden">
      <style>{`@media (prefers-reduced-motion: reduce){*{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}}`}</style>

      {/* top bar */}
      <header className="absolute top-0 inset-x-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-lg tracking-tighter text-white">beone<span className="text-cyan-400">of</span>us</Link>
          <div className="flex items-center gap-4 text-sm font-bold">
            <Link href="/roadmap" className="text-white/70 hover:text-white transition-colors">Roadmap</Link>
            <Link href="/growth" className="text-white/70 hover:text-white transition-colors">Growth</Link>
            <Link href="/dash/home" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"><ArrowLeft size={15} /> App</Link>
          </div>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section ref={heroRef} className="relative min-h-[100svh] flex items-center overflow-hidden bg-[#0B1020]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(124,58,237,0.35),transparent),radial-gradient(50%_50%_at_80%_60%,rgba(34,211,238,0.22),transparent),radial-gradient(50%_50%_at_10%_70%,rgba(37,99,235,0.28),transparent)]" />
          <HeroNetwork />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B1020]" />
        </div>

        <motion.div style={{ y: heroY, opacity: heroFade }} className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 w-full">
          <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur">
            <Sparkles size={12} /> {VISION_META.hero.kicker}
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.02] text-white max-w-4xl text-balance">
            Building the Connective Infrastructure for Global Opportunity
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.22 }}
            className="mt-6 text-lg sm:text-xl leading-relaxed text-white/70 max-w-2xl">
            {VISION_META.hero.subtitle}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.34 }}
            className="mt-9 flex flex-wrap gap-3">
            <a href="#raise" className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold text-sm px-6 py-3.5 rounded-2xl hover:bg-white/90 transition-all active:scale-95 shadow-xl">
              Explore Vision <ArrowRight size={16} />
            </a>
            <Link href="/roadmap" className="inline-flex items-center gap-2 bg-white/5 border border-white/15 text-white font-bold text-sm px-6 py-3.5 rounded-2xl hover:bg-white/10 transition-all backdrop-blur">
              <Play size={15} /> Watch Platform Future
            </Link>
          </motion.div>
        </motion.div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 z-10">
          <ChevronDown size={22} className="animate-bounce" />
        </div>
      </section>

      {/* ══ SECTION 1 — Why we raise ══ */}
      <section id="raise" className="relative py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal><SectionHeader kicker={VISION_META.raise.kicker} title={VISION_META.raise.title} description={VISION_META.raise.description} /></Reveal>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {PILLARS.map((p, i) => {
              const a = AC[p.accent];
              const Icon = PILLAR_ICON[p.id] || Cpu;
              return (
                <Reveal key={p.id} delay={i * 0.1}>
                  <motion.div whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className={`group relative h-full overflow-hidden rounded-3xl border ${a.border} bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 shadow-xl`}>
                    <div className={`pointer-events-none absolute -top-20 -right-14 w-56 h-56 rounded-full blur-3xl ${a.glow} opacity-70 group-hover:opacity-100 transition-opacity`} />
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${a.grad} flex items-center justify-center shadow-lg`}>
                        <Icon size={22} className="text-white" />
                      </div>
                      <h3 className="mt-4 text-xl font-black tracking-tight">{p.tag}</h3>
                      <div className="mt-3 rounded-2xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.06] p-2">
                        <PillarVisual kind={p.visual} a={a} />
                      </div>
                      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{p.blurb}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {p.items.map((it) => (
                          <span key={it} className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${a.border} ${a.soft} text-gray-700 dark:text-gray-200`}>{it}</span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ SECTION 2 — Quote divider ══ */}
      <section className="relative py-20 bg-gradient-to-b from-transparent via-violet-50/40 to-transparent dark:via-violet-500/[0.04]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Reveal>
            <p className="text-2xl sm:text-4xl font-black tracking-tight leading-snug text-balance">
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500 dark:from-blue-400 dark:via-violet-400 dark:to-cyan-400 bg-clip-text text-transparent">
                “{VISION_META.quote1}”
              </span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══ SECTION 3 — Future roadmap ══ */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal><SectionHeader kicker={VISION_META.future.kicker} title={VISION_META.future.title} /></Reveal>

          {/* desktop markers */}
          <div className="hidden lg:block mt-14">
            <div className="relative">
              <div aria-hidden className="absolute top-7 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/50 via-violet-500/50 to-emerald-500/50" />
              <div className="relative grid grid-cols-4 gap-4">
                {FUTURE_MILESTONES.map((m, i) => {
                  const a = AC[m.accent]; const on = openM === i; const Icon = MILESTONE_ICON[m.icon] || Globe;
                  return (
                    <button key={m.id} onClick={() => setOpenM(i)} aria-pressed={on} className="group flex flex-col items-center text-center focus:outline-none">
                      <span className={`relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 ${on ? `bg-gradient-to-br ${a.grad} border-transparent shadow-lg scale-110` : "bg-white dark:bg-[#111a33] border-gray-200 dark:border-white/10 group-hover:scale-105"}`}>
                        <Icon size={20} className={on ? "text-white" : "text-gray-400"} />
                      </span>
                      <span className={`mt-3 text-xs font-black ${on ? a.text : "text-gray-400"}`}>{m.number}</span>
                      <span className={`text-sm font-bold ${on ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>{m.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <motion.div key={openM} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-10">
              <MilestoneDetail m={FUTURE_MILESTONES[openM]} />
            </motion.div>
          </div>

          {/* mobile accordion */}
          <div className="lg:hidden mt-10 space-y-4">
            {FUTURE_MILESTONES.map((m, i) => {
              const a = AC[m.accent]; const on = openM === i; const Icon = MILESTONE_ICON[m.icon] || Globe;
              return (
                <Reveal key={m.id}>
                  <div className={`rounded-3xl border ${a.border} bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl overflow-hidden`}>
                    <button onClick={() => setOpenM(on ? -1 : i)} aria-expanded={on} className="w-full flex items-center gap-4 p-5 text-left">
                      <span className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${a.grad} flex items-center justify-center shadow-md shrink-0`}><Icon size={18} className="text-white" /></span>
                      <span className="flex-1 min-w-0">
                        <span className={`text-[11px] font-black ${a.text}`}>{m.number}</span>
                        <span className="block font-black tracking-tight">{m.title}</span>
                      </span>
                      <ChevronDown size={18} className={`transition-transform ${on ? "rotate-180" : ""}`} />
                    </button>
                    <div className="grid transition-all duration-400" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
                      <div className="overflow-hidden"><div className="px-5 pb-5"><MilestoneBody m={m} /></div></div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ SECTION 4 — Ecosystem ══ */}
      <section className="relative py-24 sm:py-32 bg-[#0B1020] text-white overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(124,58,237,0.18),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"><Network size={12} /> The living network</span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tighter text-balance">One intelligent core, every domain of opportunity</h2>
            <p className="mt-4 text-white/60">Hover any node to see how BeOneOfUs AI connects it to the whole ecosystem.</p>
          </Reveal>
          <div className="mt-12"><EcosystemGraph /></div>
        </div>
      </section>

      {/* ══ SECTION 5 — Live platform metrics (REAL data) ══ */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal><SectionHeader center kicker="Live platform metrics" title="Real numbers, growing every day" description="These figures are pulled live from the platform — not projections. They update as the community grows." /></Reveal>
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {IMPACT_METRICS.map((m, i) => (
              <Reveal key={m.key} delay={i * 0.05}>
                <div className="rounded-3xl border border-gray-200 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 text-center">
                  <p className="text-3xl sm:text-4xl font-black bg-gradient-to-br from-blue-600 via-violet-600 to-cyan-500 dark:from-blue-400 dark:via-violet-400 dark:to-cyan-400 bg-clip-text text-transparent">
                    <AnimatedCounter value={stats?.[m.key] ?? 0} format="int" />
                  </p>
                  <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{m.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-[11px] text-gray-400 dark:text-gray-600">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle animate-pulse" />
            Live from the BeOneOfUs database
          </p>
        </div>
      </section>

      {/* ══ SECTION 6 — Vision statement ══ */}
      <section className="relative py-28 sm:py-40 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(124,58,237,0.16),transparent)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Reveal>
            <p className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.08] text-balance">
              {VISION_META.vision.line1}
              <span className="block mt-3 bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500 dark:from-blue-400 dark:via-violet-400 dark:to-cyan-400 bg-clip-text text-transparent">
                {VISION_META.vision.line2}
              </span>
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/for-institutions" className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm px-6 py-3.5 rounded-2xl hover:opacity-90 transition-all active:scale-95">
                Partner with us <ArrowRight size={16} />
              </Link>
              <Link href="/roadmap" className="inline-flex items-center gap-2 border border-gray-300 dark:border-white/15 font-bold text-sm px-6 py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                Explore the roadmap
              </Link>
            </div>
            <p className="mt-12 text-xs text-gray-400 dark:text-gray-600">BeOneOfUs — The Global Opportunity Ecosystem</p>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

/* ── milestone renderers ── */
function MilestoneBody({ m }) {
  const a = AC[m.accent];
  return (
    <>
      <p className="text-sm sm:text-[15px] leading-relaxed text-gray-500 dark:text-gray-400">{m.description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {m.chips.map((c) => (
          <span key={c} className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${a.border} ${a.soft} text-gray-700 dark:text-gray-200`}>{c}</span>
        ))}
      </div>
    </>
  );
}

function MilestoneDetail({ m }) {
  const a = AC[m.accent];
  const Icon = MILESTONE_ICON[m.icon] || Globe;
  return (
    <div className={`relative overflow-hidden rounded-3xl border ${a.border} bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-8 shadow-xl`}>
      <div className={`pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl ${a.glow}`} />
      <div className="relative flex items-start gap-5">
        <div className={`shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${a.grad} flex items-center justify-center shadow-lg`}>
          <Icon size={28} className="text-white" />
        </div>
        <div className="min-w-0">
          <span className={`text-xs font-black ${a.text}`}>{m.number}</span>
          <h3 className="text-2xl font-black tracking-tight">{m.title}</h3>
          <div className="mt-3"><MilestoneBody m={m} /></div>
        </div>
      </div>
    </div>
  );
}
