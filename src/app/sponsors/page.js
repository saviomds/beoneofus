"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Terminal, Award, Star, Shield, Crown, CheckCircle2,
  Building2, Globe, Mail, ArrowRight, Loader2, Check,
  Users, BarChart3, Handshake, Sparkles, TrendingUp,
} from "lucide-react";
import { supabase } from "../supabaseClient";

function fmtCount(n) {
  if (n == null) return "—";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k+";
  return String(n);
}

const TIERS = [
  {
    id: "bronze",
    name: "Bronze",
    price: "$500/mo",
    color: "from-orange-100 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10",
    border: "border-orange-300 dark:border-orange-700/50",
    badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700/50",
    icon: Shield,
    iconColor: "text-orange-500",
    perks: [
      "Logo displayed on all certificates",
      "Listed on our sponsors page",
      "Monthly impression summary",
      "BeOneOfUs partner badge",
    ],
  },
  {
    id: "silver",
    name: "Silver",
    price: "$1,500/mo",
    color: "from-slate-100 to-gray-50 dark:from-slate-800/40 dark:to-gray-800/20",
    border: "border-slate-400 dark:border-slate-500/50",
    badge: "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-400 dark:border-slate-500/50",
    icon: Star,
    iconColor: "text-slate-500 dark:text-slate-300",
    highlight: true,
    perks: [
      "Everything in Bronze",
      "Logo + tagline on certificates",
      "AI-generated user spotlight story",
      "Monthly engagement report",
      "Dedicated sponsors page profile",
    ],
  },
  {
    id: "gold",
    name: "Gold",
    price: "$3,000/mo",
    color: "from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/10",
    border: "border-yellow-400 dark:border-yellow-600/50",
    badge: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-400 dark:border-yellow-600/50",
    icon: Crown,
    iconColor: "text-yellow-500",
    perks: [
      "Everything in Silver",
      "Full branded section on certificates",
      "Real-time sponsor ROI dashboard",
      "Custom AI spotlight: user success stories",
      "Co-branded events & webinar badge",
      "Priority support & quarterly strategy call",
    ],
  },
];

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState([]);
  const [form, setForm] = useState({ company_name: "", contact_email: "", website: "", tier: "silver", description: "", tagline: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [platformStats, setPlatformStats] = useState(null);

  useEffect(() => {
    supabase.from("profiles").select("id", { count: "exact", head: true })
      .then(({ count }) => setPlatformStats({ members: count ?? 0 }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/sponsors")
      .then(r => r.json())
      .then(d => setSponsors(d.sponsors || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.company_name.trim() || !form.contact_email.trim()) {
      setError("Company name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-lg tracking-tighter flex items-center gap-2">
            <Terminal className="text-blue-500" size={20} />
            beone<span className="text-blue-500">of</span>us
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sponsor-dashboard" className="text-sm font-bold text-gray-400 hover:text-white transition-colors">
              Sponsor Login
            </Link>
            <a href="#apply" className="flex items-center gap-1.5 text-sm font-bold bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition-all">
              Apply Now <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </nav>

      <main className="pt-24">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-bold mb-8">
            <Handshake size={14} /> Strategic Partnerships
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tighter mb-6 leading-tight">
            Reach <span className="text-blue-500">Global</span><br />Professionals
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Partner with BeOneOfUs and connect your brand with thousands of ambitious professionals across industries. Get your logo on every certificate we issue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#apply" className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-2xl shadow-blue-500/20">
              Become a Sponsor <ArrowRight size={18} />
            </a>
            <a href="#tiers" className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-2xl font-bold text-lg transition-all">
              View Packages
            </a>
          </div>

          {/* Stats — real member count from DB */}
          <div className="grid grid-cols-1 gap-6 max-w-xs mx-auto mt-16">
            {[
              { label: "Platform Members", value: platformStats ? fmtCount(platformStats.members) : "—" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black text-white mb-1">{s.value}</p>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tier Cards */}
        <section id="tiers" className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black tracking-tighter mb-4">Partnership Packages</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Choose the tier that fits your goals. All packages include logo placement on certificates issued to our global community.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              return (
                <div
                  key={tier.id}
                  className={`relative rounded-3xl border p-8 bg-gradient-to-br ${tier.color} ${tier.border} ${tier.highlight ? "ring-2 ring-blue-500/30" : ""}`}
                >
                  {tier.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                      Most Popular
                    </div>
                  )}
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider mb-6 ${tier.badge}`}>
                    <Icon size={12} /> {tier.name}
                  </div>
                  <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">{tier.price}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-8">billed monthly · cancel anytime</p>
                  <ul className="space-y-3 mb-8">
                    {tier.perks.map(perk => (
                      <li key={perk} className="flex items-start gap-2.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-500" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#apply"
                    onClick={() => setForm(f => ({ ...f, tier: tier.id }))}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all bg-gray-900 dark:bg-white/10 hover:bg-gray-800 dark:hover:bg-white/20 text-white border border-white/10"
                  >
                    Apply for {tier.name} <ArrowRight size={14} />
                  </a>
                </div>
              );
            })}
          </div>
        </section>

        {/* What sponsors get on certificates */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="bg-gray-900 rounded-3xl border border-gray-800 p-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-xs font-bold mb-6">
                  <Award size={12} /> Certificate Exposure
                </div>
                <h3 className="text-3xl font-black tracking-tight mb-4">Your Brand on Every Certificate</h3>
                <p className="text-gray-400 leading-relaxed mb-6">
                  Every certificate earned on BeOneOfUs is shared on LinkedIn, downloaded, and viewed by hiring managers and peers. Your logo travels with each achievement.
                </p>
                <div className="space-y-3">
                  {[
                    { icon: Shield, text: "Bronze: Logo in certificate footer", color: "text-orange-400" },
                    { icon: Star, text: "Silver: Logo + tagline, prominently placed", color: "text-slate-400" },
                    { icon: Crown, text: "Gold: Full branded section with spotlight", color: "text-yellow-400" },
                  ].map(({ icon: Icon, text, color }) => (
                    <div key={text} className="flex items-center gap-3">
                      <Icon size={16} className={color} />
                      <span className="text-sm font-medium text-gray-300">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-blue-600" />
                    <span className="font-black text-gray-900 text-sm">beone<span className="text-blue-600">of</span>us</span>
                  </div>
                  <Award size={14} className="text-amber-500" />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-400 text-center mb-1">Certificate of Completion</p>
                  <p className="font-black text-gray-900 text-center text-sm">Jane Smith</p>
                  <p className="text-xs text-center text-gray-500 mt-1">JavaScript Mastery Course</p>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-[9px] text-gray-400 text-center uppercase tracking-widest mb-2">Proudly supported by</p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Active Sponsors */}
        {sponsors.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-16">
            <h3 className="text-center text-sm font-black text-gray-500 uppercase tracking-widest mb-8">Current Partners</h3>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {sponsors.map(s => (
                <a
                  key={s.id}
                  href={s.website || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-2"
                >
                  {s.logo_url ? (
                    <Image src={s.logo_url} alt={s.company_name} width={120} height={40} unoptimized className="h-10 w-auto object-contain opacity-60 group-hover:opacity-100 transition-opacity filter grayscale group-hover:grayscale-0" />
                  ) : (
                    <div className="h-10 px-4 flex items-center bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-gray-400 group-hover:text-white transition-colors">
                      {s.company_name}
                    </div>
                  )}
                  <span className={`text-[9px] font-black uppercase tracking-widest ${s.tier === "gold" ? "text-yellow-500" : s.tier === "silver" ? "text-slate-400" : "text-orange-500"}`}>
                    {s.tier}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Application Form */}
        <section id="apply" className="max-w-2xl mx-auto px-4 py-20">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black tracking-tighter mb-4">Apply to Partner</h2>
            <p className="text-gray-400">Fill in your details and we&apos;ll reach out within 48 hours to discuss the best package for your goals.</p>
          </div>

          {submitted ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black mb-2">Application Received!</h3>
              <p className="text-gray-400">We&apos;ll review your application and reach out to {form.contact_email} within 48 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-3xl p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Company Name *</label>
                  <input
                    value={form.company_name}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="Acme Corp"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Contact Email *</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                    placeholder="partnerships@acme.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://acme.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Tagline (shown on certificates)</label>
                <input
                  value={form.tagline}
                  onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                  placeholder="Empowering the next generation of developers"
                  maxLength={100}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Preferred Tier</label>
                <div className="grid grid-cols-3 gap-3">
                  {TIERS.map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, tier: t.id }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border font-bold text-xs transition-all ${
                          form.tier === t.id
                            ? "border-blue-500 bg-blue-500/10 text-blue-400"
                            : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                        }`}
                      >
                        <Icon size={16} className={form.tier === t.id ? "text-blue-400" : t.iconColor} />
                        {t.name}
                        <span className="text-[9px] font-normal text-gray-500">{t.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Tell us about your brand</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="What does your company do and who are you trying to reach?"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm font-bold bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 text-sm"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Handshake size={16} />}
                {submitting ? "Submitting…" : "Submit Partnership Application"}
              </button>
              <p className="text-center text-xs text-gray-600">We&apos;ll respond within 48 hours. No commitment required.</p>
            </form>
          )}
        </section>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center">
        <p className="text-sm text-gray-600">
          <Link href="/" className="hover:text-gray-400 transition-colors">BeOneOfUs</Link>
          {" · "}
          <Link href="/sponsor-dashboard" className="hover:text-gray-400 transition-colors">Sponsor Dashboard</Link>
        </p>
      </footer>
    </div>
  );
}
