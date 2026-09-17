import Link from 'next/link';
import {
  ArrowRight, ShieldCheck, BarChart3, Network, CheckCircle2,
} from 'lucide-react';
import { orgMeta, ORG_TYPE_ORDER } from '../../lib/orgTypes';

export const metadata = {
  title: 'For Institutions — beoneofus',
  description:
    'Businesses, governments, schools, healthcare providers, and NGOs reach a verified population intelligently — post, hire, and engage at scale on one AI-native graph.',
};

const VALUE = [
  { icon: Network,    title: 'One verified channel', desc: 'Post, hire, and engage at scale — reaching individuals through a single AI-native identity instead of a dozen disconnected tools.' },
  { icon: BarChart3,  title: 'Insight, not guesswork', desc: 'AI-generated insight into talent pools, engagement, and demand — so decisions are grounded in the graph, not intuition.' },
  { icon: ShieldCheck,title: 'Trust built in', desc: 'Identity verification, credential checks, and reputation signals are part of the core — so every interaction is accountable.' },
];

export default function ForInstitutionsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-ink text-gray-900 dark:text-gray-100">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-ink/85 backdrop-blur-xl border-b border-gray-100 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-brand-500 to-trust-500">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M9 9 4 4.5M9 9l5-4.5M9 9v6" stroke="#fff" strokeWidth="1.3" opacity=".85" />
                <circle cx="9" cy="9" r="2.4" fill="#fff" />
                <circle cx="4" cy="4.5" r="1.6" fill="#fff" opacity=".92" />
                <circle cx="14" cy="4.5" r="1.6" fill="#fff" opacity=".92" />
                <circle cx="9" cy="15" r="1.6" fill="#fff" opacity=".92" />
              </svg>
            </span>
            <span className="font-black text-lg tracking-tight text-gray-900 dark:text-white">
              beone<span className="text-trust-500">of</span>us
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm font-semibold text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Sign in</Link>
            <Link href="/organizations/new" className="text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl transition-colors shadow-sm shadow-brand-500/30">
              Create organization
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-gray-100 dark:border-white/10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-0 w-[420px] h-[420px] rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-premium-500/10 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-premium-600 dark:text-premium-500">
            <span className="w-1.5 h-1.5 rounded-full bg-premium-500" /> For institutions
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-[1.05] max-w-3xl">
            Reach a verified population,<br className="hidden sm:block" /> intelligently.
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
            Businesses, governments, schools, healthcare providers, and NGOs get a dedicated presence on one AI-native graph — with the same intelligent access individuals get, shaped to how each institution actually operates.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/organizations/new" className="group inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-7 py-3.5 rounded-2xl text-sm font-black shadow-xl shadow-brand-500/25 transition-all hover:scale-[1.02]">
              Create your organization
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="mailto:partners@beoneofus.work" className="inline-flex items-center justify-center gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-900 dark:text-white px-7 py-3.5 rounded-2xl text-sm font-bold transition-all">
              Talk to partnerships
            </a>
          </div>
        </div>
      </section>

      {/* ── Institution types ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <div className="max-w-2xl mb-14">
          <p className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-3">Every institution type</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Built for how your institution actually operates.</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ORG_TYPE_ORDER.map((t) => {
            const m = orgMeta(t);
            const Icon = m.icon;
            return (
              <Link
                key={t}
                href={`/organizations/new?category=${t}`}
                className={`group p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] ${m.accent.ring} hover:shadow-lg transition-all block`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform ${m.accent.icon}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  {m.label}
                  <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{m.blurb}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Value props ── */}
      <section className="border-y border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.015]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {VALUE.map(({ icon: Icon, title, desc }) => (
              <div key={title}>
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-trust-500 mb-5 shadow-sm">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust callout ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <div className="rounded-3xl bg-ink text-white p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 60% at 85% 15%, rgba(23,195,166,.18), transparent 60%)' }} />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-trust-500">
              <ShieldCheck size={14} /> Trust &amp; verification
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight">Connecting sensitive domains means trust can&apos;t be optional.</h2>
            <ul className="mt-7 space-y-3">
              {[
                'Identity verification for institutions before sensitive interactions',
                'Credential checks validated against issuing sources where possible',
                'Portable reputation built from verified outcomes and feedback',
                'AI-assisted moderation for fraud and misrepresentation',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm text-gray-200">
                  <CheckCircle2 size={18} className="text-trust-500 shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-gray-100 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">Put your institution on the graph.</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg">Create your organization in minutes — free to start.</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/organizations/new" className="group inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-2xl text-base font-black shadow-xl shadow-brand-500/25 transition-all hover:scale-[1.02]">
              Create your organization
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/" className="inline-flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-8 py-4 rounded-2xl text-base font-bold transition-colors">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
