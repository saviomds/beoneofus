"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Terminal, Award, BarChart3, Eye, TrendingUp, Loader2,
  Shield, Star, Crown, ArrowLeft, Calendar, Hash,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const TIER_META = {
  bronze: { label: "Bronze", icon: Shield, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
  silver: { label: "Silver", icon: Star,   color: "text-slate-400",  bg: "bg-slate-500/10 border-slate-500/20" },
  gold:   { label: "Gold",   icon: Crown,  color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20" },
};

function groupByDay(impressions) {
  const map = {};
  impressions.forEach(imp => {
    const day = imp.viewed_at?.slice(0, 10);
    if (day) map[day] = (map[day] || 0) + 1;
  });
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: map[key] || 0 });
  }
  return days;
}

export default function SponsorDashboard() {
  const [user, setUser] = useState(null);
  const [sponsor, setSponsor] = useState(null);
  const [impressions, setImpressions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      setUser(session.user);

      const email = session.user.email;
      const res = await fetch(`/api/sponsors?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (!data.sponsor) { setNotFound(true); setLoading(false); return; }
      setSponsor(data.sponsor);

      if (data.sponsor.status === "active") {
        const statsRes = await fetch(`/api/sponsors?sponsorId=${data.sponsor.id}`);
        const statsData = await statsRes.json();
        setImpressions(statsData.impressions || []);
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <Terminal size={40} className="text-blue-500 mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Sponsor Login Required</h1>
        <p className="text-gray-400 mb-6 max-w-sm">Sign in with the email address you used to apply as a sponsor.</p>
        <Link href="/auth" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-all">
          Sign In
        </Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={40} className="text-amber-500 mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">No Sponsor Account Found</h1>
        <p className="text-gray-400 mb-2 max-w-sm">We couldn't find a sponsor record linked to <strong className="text-white">{user.email}</strong>.</p>
        <p className="text-gray-500 text-sm mb-6">If you've applied, your application may still be under review.</p>
        <Link href="/sponsors#apply" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-all">
          Apply as a Sponsor
        </Link>
      </div>
    );
  }

  const tier = TIER_META[sponsor.tier] || TIER_META.bronze;
  const TierIcon = tier.icon;
  const days = groupByDay(impressions);
  const maxCount = Math.max(...days.map(d => d.count), 1);
  const totalImpressions = impressions.length;
  const thisMonth = impressions.filter(i => i.viewed_at?.slice(0, 7) === new Date().toISOString().slice(0, 7)).length;
  const lastMonth = impressions.filter(i => i.viewed_at?.slice(0, 7) === new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7)).length;
  const uniqueCerts = new Set(impressions.map(i => i.certificate_id)).size;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-lg tracking-tighter flex items-center gap-2">
            <Terminal className="text-blue-500" size={18} />
            beone<span className="text-blue-500">of</span>us
          </Link>
          <Link href="/sponsors" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Sponsors page
          </Link>
        </div>
      </nav>

      <main className="pt-24 pb-20 max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider mb-3 ${tier.bg} ${tier.color}`}>
              <TierIcon size={12} /> {tier.label} Partner
            </div>
            <h1 className="text-3xl font-black tracking-tight">{sponsor.company_name}</h1>
            {sponsor.tagline && <p className="text-gray-400 mt-1">{sponsor.tagline}</p>}
          </div>
          {sponsor.logo_url && (
            <img src={sponsor.logo_url} alt={sponsor.company_name} className="h-12 object-contain" />
          )}
        </div>

        {/* Status banner */}
        {sponsor.status !== "active" && (
          <div className={`mb-8 p-4 rounded-2xl border flex items-center gap-3 ${
            sponsor.status === "pending"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            <AlertCircle size={16} />
            <div>
              <p className="font-bold text-sm capitalize">{sponsor.status === "pending" ? "Application Under Review" : "Application Not Approved"}</p>
              {sponsor.status === "pending" && <p className="text-xs opacity-75 mt-0.5">We'll email you at {sponsor.contact_email} once reviewed.</p>}
            </div>
          </div>
        )}

        {sponsor.status === "active" && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Impressions", value: totalImpressions, icon: Eye, color: "text-blue-400" },
                { label: "This Month", value: thisMonth, icon: Calendar, color: "text-emerald-400",
                  sub: lastMonth > 0 ? `${lastMonth} last month` : undefined },
                { label: "Certificates Reached", value: uniqueCerts, icon: Award, color: "text-amber-400" },
                { label: "Tier", value: tier.label, icon: TierIcon, color: tier.color },
              ].map(({ label, value, icon: Icon, color, sub }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{label}</p>
                    <Icon size={14} className={color} />
                  </div>
                  <p className="text-2xl font-black text-white">{typeof value === "number" ? value.toLocaleString() : value}</p>
                  {sub && <p className="text-[10px] text-gray-600 mt-1">{sub}</p>}
                </div>
              ))}
            </div>

            {/* 30-day bar chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-black text-sm uppercase tracking-wider text-gray-400">Impressions — Last 30 Days</h2>
                <span className="text-xs text-gray-600 font-bold">{totalImpressions} total</span>
              </div>
              <div className="flex items-end gap-1 h-28">
                {days.map(({ date, count }) => (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full bg-blue-600/80 hover:bg-blue-500 rounded-sm transition-all"
                      style={{ height: `${Math.max((count / maxCount) * 100, count > 0 ? 8 : 2)}%` }}
                    />
                    {count > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 text-[9px] font-bold text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {count} · {date.slice(5)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[9px] text-gray-700 font-bold">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </div>

            {/* Recent impressions */}
            {impressions.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="font-black text-sm uppercase tracking-wider text-gray-400 mb-4">Recent Certificate Views</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {impressions.slice(0, 50).map((imp, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <div className="flex items-center gap-2">
                        <Award size={12} className="text-amber-500" />
                        <span className="text-xs font-bold text-gray-400">
                          {imp.certificate_id ? `Cert ${imp.certificate_id.slice(0, 8).toUpperCase()}` : "Certificate view"}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-600">
                        {imp.viewed_at ? new Date(imp.viewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {impressions.length === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <Eye size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="font-bold text-gray-500">No impressions yet</p>
                <p className="text-sm text-gray-600 mt-1">Impressions appear when users view certificates that display your brand.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
