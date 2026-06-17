/**
 * PART 2: HERO SECTION + STATS + PROBLEM + HOW IT WORKS
 * ─────────────────────────────────────────────────────────────
 * Hero: Magnetic headline, CTA, animated background
 * Stats: Live platform metrics with counters
 * Problems: 6 key hiring/career problems we solve
 * How It Works: 4-step journey visualization
 */

import { useEffect, useState, useRef } from "react";
import {
  ArrowRight, ChevronDown, Code2, Users, Zap, Bot,
  AlertTriangle, FileText, BookOpen, GraduationCap,
  GitBranch, Building2, Briefcase, TrendingUp, CheckCircle2,
  Users2, Trophy, Star, Play, Search, Layers,
} from "lucide-react";

/**
 * ─────────────────────────────────────────────────────────────
 * HERO SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * Features:
 * - Magnetic headline that captures the vision
 * - Animated background with floating elements
 * - Clear dual CTA (Sign up / See platform)
 * - Trust indicators (stats or badges)
 */
export function HeroSection() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 overflow-hidden pt-20"
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.2)_25%,rgba(68,68,68,.2)_50%,transparent_50%,transparent_75%,rgba(68,68,68,.2)_75%,rgba(68,68,68,.2))] bg-[100px_100px] animate-pulse opacity-20" />
        
        {/* Floating orbs - parallax effect */}
        <div
          className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-3xl opacity-20"
          style={{
            transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`,
            transition: "transform 0.3s ease-out",
          }}
        />
        <div
          className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-full blur-3xl opacity-15"
          style={{
            transform: `translate(${-mousePos.x * 20}px, ${-mousePos.y * 20}px)`,
            transition: "transform 0.3s ease-out",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 hover:border-blue-400/60 transition-colors cursor-pointer">
            <Zap size={16} />
            <span className="text-sm font-medium">The Future of Developer Hiring is Here</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-white">
            Build Your Career
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Before Companies Hire You
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join 45,000+ developers building real projects, getting AI mentoring, and landing jobs at top companies.
            <br className="hidden sm:block" />
            <span className="text-slate-400">No fake resume needed.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/40"
            >
              Get Started Free
              <ArrowRight size={20} />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border border-slate-600 text-slate-200 font-semibold hover:border-slate-400 hover:text-white transition-colors"
            >
              See How It Works
              <ChevronDown size={20} />
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8 border-t border-slate-700/50 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Users2 size={18} className="text-emerald-400" />
              <span>45K+ Active Developers</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              <span>92% Hire Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <Star size={18} className="text-blue-400" />
              <span>4.9/5 Rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <span className="text-sm font-medium">Scroll to explore</span>
          <ChevronDown size={20} />
        </div>
      </div>
    </section>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * STATISTICS SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * Animated counters for key metrics
 * Builds credibility and shows platform scale
 */
export function StatsSection({ stats }) {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-800 to-slate-900 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Trusted by Developers Worldwide
          </h2>
          <p className="text-lg text-slate-300">
            Real metrics from a real platform building the future of hiring
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="group relative p-8 rounded-xl border border-slate-700/50 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-800 transition-all duration-300"
              >
                {/* Gradient background on hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none" />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${stat.color} mb-4 text-white`}>
                    <Icon size={24} />
                  </div>

                  {/* Value */}
                  <div className="text-4xl font-bold text-white mb-2">
                    <AnimatedCounterComponent to={stat.value} suffix={stat.suffix} />
                  </div>

                  {/* Label */}
                  <p className="text-slate-400 font-medium">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * PROBLEMS SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * The real problems we're solving
 * Shows deep understanding of market pain points
 */
export function ProblemsSection({ problems }) {
  const [expandedIdx, setExpandedIdx] = useState(0);

  return (
    <section className="py-20 bg-slate-900 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            The Current State of Hiring is Broken
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Developers struggle to get experience. Companies struggle to find talent.
            <br className="hidden sm:block" />
            There's a better way.
          </p>
        </div>

        {/* Problems grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {problems.map((problem, idx) => {
            const IconComponent = problem.icon;
            const isExpanded = expandedIdx === idx;

            return (
              <div
                key={idx}
                onClick={() => setExpandedIdx(isExpanded ? -1 : idx)}
                className={`relative p-6 rounded-xl border cursor-pointer transition-all duration-300 ${
                  isExpanded
                    ? `border-slate-500 bg-slate-800/80 shadow-lg shadow-slate-900/50`
                    : `border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/50`
                }`}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 rounded-xl opacity-0 transition-opacity ${problem.color}`} />

                <div className="relative z-10">
                  {/* Icon & title */}
                  <div className="flex items-start gap-4 mb-3">
                    <div className={`flex-shrink-0 p-2 rounded-lg ${problem.color}`}>
                      <IconComponent size={24} className={problem.textColor} />
                    </div>
                    <h3 className="text-lg font-semibold text-white pt-1">
                      {problem.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-slate-300">{problem.description}</p>

                  {/* Solution hint */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <p className="text-sm text-emerald-400 font-medium flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        We solve this with real projects and AI mentoring
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * HOW IT WORKS SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * 4-step journey: Identity → Projects → AI → Hiring
 * Clear progression that shows value at each step
 */
export function HowItWorksSection({ steps }) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-b from-slate-900 to-slate-800 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            How BeOneOfUs Works
          </h2>
          <p className="text-lg text-slate-300">
            From zero to hero in 4 steps
          </p>
        </div>

        {/* Mobile: Vertical timeline */}
        <div className="block lg:hidden space-y-8">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <div key={idx} className="relative">
                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div className="absolute left-6 top-20 w-1 h-12 bg-gradient-to-b from-blue-500 to-transparent opacity-50" />
                )}

                {/* Step card */}
                <div className="relative pl-20">
                  {/* Step number circle */}
                  <div className="absolute left-0 top-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {step.step}
                  </div>

                  {/* Content */}
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${step.gradient} text-white`}>
                        <StepIcon size={20} />
                      </div>
                      <h3 className="text-xl font-semibold text-white">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-slate-300 mb-4">{step.description}</p>
                    <ul className="space-y-2">
                      {step.features.map((feature, fidx) => (
                        <li
                          key={fidx}
                          className="flex items-start gap-2 text-slate-400 text-sm"
                        >
                          <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-emerald-400" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Horizontal flow */}
        <div className="hidden lg:flex items-stretch justify-between gap-4 mb-8">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = activeStep === idx;

            return (
              <div key={idx} className="flex-1">
                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div className="absolute left-1/2 top-24 w-[calc(200%-2rem)] h-1 bg-gradient-to-r from-blue-600 to-transparent opacity-30 pointer-events-none" />
                )}

                {/* Step card */}
                <div
                  onClick={() => setActiveStep(idx)}
                  className={`relative p-6 rounded-xl border transition-all duration-300 cursor-pointer h-full flex flex-col ${
                    isActive
                      ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                      : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
                  }`}
                >
                  {/* Step number */}
                  <div className="inline-flex w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold items-center justify-center mb-4 text-lg">
                    {step.step}
                  </div>

                  {/* Icon */}
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${step.gradient} text-white w-fit mb-4`}>
                    <StepIcon size={24} />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-300 text-sm mb-4 flex-grow">
                    {step.description}
                  </p>

                  {/* Features - expanded view */}
                  {isActive && (
                    <div className="mt-4 pt-4 border-t border-blue-400/20 space-y-2">
                      {step.features.map((feature, fidx) => (
                        <div
                          key={fidx}
                          className="flex items-start gap-2 text-slate-300 text-sm animate-fadeIn"
                        >
                          <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5 text-emerald-400" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/40"
          >
            Start Your Journey
            <ArrowRight size={20} />
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * Helper component: Animated counter
 */
function AnimatedCounterComponent({ to, suffix = "" }) {
  const [val, setVal] = useState(0);
  const [ref, visible] = useIntersect();

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min((now - start) / 2000, 1);
      setVal(Math.floor(p * to));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [visible, to]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/**
 * Helper hook: useIntersect
 */
function useIntersect(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    }, { threshold: 0.15, ...options });

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, visible];
}
