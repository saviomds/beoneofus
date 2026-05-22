"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Handshake, Send, Loader2, CheckCircle2, AlertTriangle, Briefcase,
  Globe, Mail, Sparkles, Building, Check, X, Clock,
  ShieldCheck, Crown, Camera, FileText, History,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const PARTNERSHIP_TYPES = [
  { id: "sponsored_content", label: "Sponsored Content",      icon: Sparkles,  desc: "Articles, tutorials, or newsletters reaching our developers" },
  { id: "service_ads",       label: "Service Advertisement",  icon: Briefcase, desc: "List your dev-focused services to the community" },
  { id: "event_sponsor",     label: "Event Sponsorship",      icon: Globe,     desc: "Sponsor hackathons, meetups, or webinars" },
  { id: "other",             label: "Other Collaboration",    icon: Handshake, desc: "Propose a unique way to align with our members" },
];

const STATUS_COLORS = {
  pending:  "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  accepted: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  declined: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
};

export default function PartnershipsContent() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState("");
  const [isProcessing, setIsProcessing] = useState(null);

  const [activeTab, setActiveTab]   = useState("submit");
  const [adminFilter, setAdminFilter] = useState("pending");

  const [form, setForm] = useState({
    company_name:    "",
    type:            "sponsored_content",
    proposal:        "",
    target_audience: "",
    budget_range:    "",
    contact_email:   "",
  });

  const [proposals, setProposals]       = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  const [myProposals, setMyProposals]   = useState([]);
  const [loadingMine, setLoadingMine]   = useState(false);

  // ── Data fetchers ───────────────────────────────────────────────────
  const fetchProposals = useCallback(async () => {
    setLoadingProposals(true);
    const { data, error: err } = await supabase
      .from("partnerships")
      .select("*, profiles:user_id(username, avatar_url, is_verified, email)")
      .order("created_at", { ascending: false });
    if (!err && data) setProposals(data);
    setLoadingProposals(false);
  }, []);

  const fetchMyProposals = useCallback(async (uid) => {
    if (!uid) return;
    setLoadingMine(true);
    const { data } = await supabase
      .from("partnerships")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (data) setMyProposals(data);
    setLoadingMine(false);
  }, []);

  // ── Init + real-time ────────────────────────────────────────────────
  useEffect(() => {
    let adminChannel = null;
    let userChannel  = null;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const uid = session.user.id;
      setUser(session.user);
      setForm(f => ({ ...f, contact_email: session.user.email || "" }));

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, role, is_verified, is_premium, status, bio")
        .eq("id", uid)
        .single();
      if (prof) setProfile(prof);

      // Every logged-in user watches their own proposals live
      fetchMyProposals(uid);
      userChannel = supabase
        .channel(`user-partnerships-${uid}-${Date.now()}`)
        .on("postgres_changes", {
          event:  "*",
          schema: "public",
          table:  "partnerships",
          filter: `user_id=eq.${uid}`,
        }, () => fetchMyProposals(uid))
        .subscribe();

      // Admins / founders also watch all proposals
      if (prof?.role === "admin" || prof?.role === "founder") {
        setIsAdmin(true);
        fetchProposals();
        adminChannel = supabase
          .channel(`admin-partnerships-${uid}-${Date.now()}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "partnerships" }, fetchProposals)
          .subscribe();
      }
    };

    init();
    return () => {
      if (userChannel)  supabase.removeChannel(userChannel);
      if (adminChannel) supabase.removeChannel(adminChannel);
    };
  }, [fetchProposals, fetchMyProposals]);

  // ── Admin: accept / decline ─────────────────────────────────────────
  const handleStatusUpdate = async (proposal, newStatus) => {
    setIsProcessing(proposal.id);
    try {
      const { error: updateErr } = await supabase
        .from("partnerships")
        .update({ status: newStatus })
        .eq("id", proposal.id);
      if (updateErr) throw updateErr;

      // In-app notification to proposer
      await supabase.from("notifications").insert({
        receiver_id: proposal.user_id,
        actor_id:    user.id,
        type:        "partnership_update",
        content:     `Your partnership proposal for "${proposal.company_name}" has been ${newStatus}.`,
      });

      // Email notification (fire-and-forget)
      if (proposal.profiles?.email) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          fetch("/api/notifications/send", {
            method:  "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              type:  `partnership_${newStatus}`,
              email: proposal.profiles.email,
              name:  proposal.profiles.username || "there",
              extra: { companyName: proposal.company_name },
            }),
          }).catch(() => {});
        }
      }

      // Optimistic local update
      setProposals(prev =>
        prev.map(p => p.id === proposal.id ? { ...p, status: newStatus } : p)
      );
    } catch (err) {
      console.error("handleStatusUpdate:", err);
    } finally {
      setIsProcessing(null);
    }
  };

  // ── User: submit proposal ───────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError("");
    try {
      const typeLabel = PARTNERSHIP_TYPES.find(t => t.id === form.type)?.label || form.type;
      const { error: dbErr } = await supabase.from("partnerships").insert({
        user_id:         user.id,
        company_name:    form.company_name,
        type:            typeLabel,
        proposal:        form.proposal,
        target_audience: form.target_audience,
        budget_range:    form.budget_range,
        contact_email:   form.contact_email,
        status:          "pending",
      });
      if (dbErr) throw dbErr;
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to submit proposal.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all";

  // ── Success screen ──────────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center text-center gap-4 py-12 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Proposal Received!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Thank you for reaching out. Our team will review your proposal and contact you at{" "}
          <strong>{form.contact_email}</strong> shortly.
        </p>
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => { setSuccess(false); setActiveTab("mine"); }}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            View My Proposals →
          </button>
          <button
            onClick={() => {
              setSuccess(false);
              setActiveTab("submit");
              setForm(f => ({ ...f, company_name: "", proposal: "", target_audience: "", budget_range: "" }));
            }}
            className="text-sm font-bold text-gray-400 hover:underline"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  // ── Main layout ─────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300 pb-10">

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-transparent p-8">

        {/* Tab switcher */}
        {user && (
          <div className="absolute top-4 right-4">
            <div className="flex bg-white/50 dark:bg-gray-900/50 backdrop-blur-md p-1 rounded-xl border border-white/20 dark:border-white/5">
              <button
                onClick={() => setActiveTab("submit")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "submit" ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
              >
                Submit
              </button>
              <button
                onClick={() => setActiveTab("mine")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "mine" ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
              >
                Mine{myProposals.length > 0 ? ` (${myProposals.length})` : ""}
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "admin" ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                >
                  Review ({proposals.filter(p => p.status === "pending").length})
                </button>
              )}
            </div>
          </div>
        )}

        <div className="relative z-10 pt-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Handshake size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Partnerships & Sponsorships
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed max-w-lg">
            Align your brand or services with the beoneofus community. Propose sponsored content, tutorials, or advertise developer-focused tools.
          </p>
        </div>
      </div>

      {/* ── SUBMIT TAB ──────────────────────────────────────────────── */}
      {activeTab === "submit" && (
        <>
          {/* Profile completeness warning */}
          {user && !profile?.avatar_url && !(profile?.status || profile?.bio) && (
            <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-black text-gray-900 dark:text-white text-sm">Complete your profile to submit a proposal</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">A strong profile helps us evaluate proposals faster and builds trust.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { icon: Camera,   label: "Profile photo",       done: !!profile?.avatar_url },
                  { icon: FileText, label: "Bio / status filled", done: !!(profile?.status || profile?.bio) },
                ].map(({ icon: Icon, label, done }) => (
                  <div key={label} className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold ${done ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500"}`}>
                    {done ? <Check size={13} className="text-emerald-500 shrink-0" /> : <Icon size={13} className="shrink-0 opacity-40" />}
                    {label}
                  </div>
                ))}
              </div>
              <Link href="/dash/profile" className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all">
                Go to Profile →
              </Link>
            </div>
          )}

          {/* Privilege banners */}
          {profile?.is_verified && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl">
              <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">Verified member — your proposal gets priority review</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Verified proposals are reviewed within 24 hours and shown first to the team.</p>
              </div>
            </div>
          )}
          {(profile?.is_premium || ["admin", "founder"].includes(profile?.role)) && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
              <Crown size={18} className="text-amber-500 shrink-0" fill="currentColor" strokeWidth={1} />
              <div>
                <p className="text-sm font-black text-amber-700 dark:text-amber-400">Premium member — top-priority partnership review</p>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Premium proposals are escalated directly to founders for faster decisions.</p>
              </div>
            </div>
          )}

          {/* Submit form */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl">
                <AlertTriangle size={14} className="text-red-500 shrink-0" />
                <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Partner / Company Name</label>
                <div className="relative">
                  <Building size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    value={form.company_name}
                    onChange={e => setForm({ ...form, company_name: e.target.value })}
                    placeholder="e.g. Acme Stack"
                    className={inputCls + " pl-10"}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Contact Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    type="email"
                    value={form.contact_email}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })}
                    placeholder="hello@company.com"
                    className={inputCls + " pl-10"}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Collaboration Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PARTNERSHIP_TYPES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.id })}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${form.type === t.id ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500" : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}
                  >
                    <div className={`p-2 rounded-lg ${form.type === t.id ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-700 text-gray-400"}`}>
                      <t.icon size={16} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${form.type === t.id ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>{t.label}</p>
                      <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Alignment & Proposal</label>
              <textarea
                required
                rows={5}
                value={form.proposal}
                onChange={e => setForm({ ...form, proposal: e.target.value })}
                placeholder="How does your service align with our members' goals? Describe your proposed content or advertisement..."
                className={inputCls + " resize-none"}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-xl text-sm transition-all shadow-lg active:scale-95"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {submitting ? "Transmitting..." : "Send Proposal"}
            </button>
          </form>
        </>
      )}

      {/* ── MINE TAB ────────────────────────────────────────────────── */}
      {activeTab === "mine" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">My Proposals</h3>
            <span className="text-[10px] font-bold text-gray-400">{myProposals.length} total</span>
          </div>

          {loadingMine ? (
            <div className="py-20 flex justify-center">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : myProposals.length === 0 ? (
            <div className="py-20 text-center bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl space-y-3">
              <History size={28} className="mx-auto text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-bold text-gray-400">No proposals submitted yet.</p>
              <button onClick={() => setActiveTab("submit")} className="text-xs font-bold text-blue-500 hover:underline">
                Submit your first proposal →
              </button>
            </div>
          ) : (
            myProposals.map(prop => (
              <div
                key={prop.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{prop.company_name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(prop.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className={`shrink-0 flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${STATUS_COLORS[prop.status]}`}>
                    {prop.status === "accepted" && <Check size={10} />}
                    {prop.status === "declined" && <X size={10} />}
                    {prop.status === "pending"  && <Clock size={10} />}
                    {prop.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Type</p>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{prop.type}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact</p>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{prop.contact_email}</p>
                  </div>
                </div>

                {prop.status === "pending" && (
                  <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                    <Clock size={12} className="text-amber-500 shrink-0" />
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      Under review — you'll be notified when a decision is made.
                    </p>
                  </div>
                )}
                {prop.status === "accepted" && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                    <Check size={12} className="text-emerald-500 shrink-0" />
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      Accepted! Our team will reach out to coordinate next steps.
                    </p>
                  </div>
                )}
                {prop.status === "declined" && (
                  <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                    <X size={12} className="text-red-500 shrink-0" />
                    <p className="text-[11px] font-bold text-red-600 dark:text-red-400">
                      This proposal was not accepted. You&apos;re welcome to submit a revised one.
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ADMIN TAB ───────────────────────────────────────────────── */}
      {activeTab === "admin" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Review Submissions</h3>
            <div className="flex gap-1">
              {["pending", "accepted", "declined"].map(f => (
                <button
                  key={f}
                  onClick={() => setAdminFilter(f)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${adminFilter === f ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loadingProposals ? (
            <div className="py-20 flex justify-center">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : proposals.filter(p => p.status === adminFilter).length === 0 ? (
            <div className="py-20 text-center bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
              <p className="text-sm font-bold text-gray-400">No {adminFilter} proposals.</p>
            </div>
          ) : (
            proposals.filter(p => p.status === adminFilter).map(prop => (
              <div
                key={prop.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
              >
                {/* Proposer */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-black text-blue-600 dark:text-blue-400 overflow-hidden">
                      {prop.profiles?.avatar_url
                        ? <Image src={prop.profiles.avatar_url} alt="" fill className="object-cover" />
                        : prop.profiles?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">@{prop.profiles?.username}</p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock size={10} /> {new Date(prop.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${STATUS_COLORS[prop.status]}`}>
                    {prop.status}
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Company</p>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{prop.company_name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Type</p>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{prop.type}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact Email</p>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{prop.contact_email}</p>
                  </div>
                </div>

                {/* Proposal text */}
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Proposal</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">&quot;{prop.proposal}&quot;</p>
                </div>

                {/* Actions */}
                {prop.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleStatusUpdate(prop, "declined")}
                      disabled={isProcessing === prop.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-xl text-[11px] font-black hover:bg-red-100 transition-all uppercase disabled:opacity-50"
                    >
                      {isProcessing === prop.id ? <Loader2 size={12} className="animate-spin" /> : <X size={14} />}
                      Decline
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(prop, "accepted")}
                      disabled={isProcessing === prop.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-xl text-[11px] font-black hover:bg-emerald-500 transition-all uppercase shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                    >
                      {isProcessing === prop.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                      Accept
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
