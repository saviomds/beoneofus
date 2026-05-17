"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Crown, CheckCircle2, XCircle, Lock, Award, Users, Calendar,
  BookOpen, Loader2, Sparkles, ShieldCheck, CreditCard, Clock,
  AlertTriangle, X, Check, RefreshCw,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

/* ── Static data ──────────────────────────────────────────────────────────── */
const FEATURES = [
  { label: "Basic Courses",           free: true,  premium: true },
  { label: "Advanced Courses",        free: false, premium: true },
  { label: "Course Certifications",   free: false, premium: true },
  { label: "1-on-1 Coaching",         free: false, premium: true },
  { label: "Early Event Access",      free: false, premium: true },
  { label: "Premium Profile Badge",   free: false, premium: true },
  { label: "AI Assistant",            free: true,  premium: true },
  { label: "Network & Messaging",     free: true,  premium: true },
  { label: "Project Collaboration",   free: true,  premium: true },
];

const PERKS = [
  { icon: BookOpen, title: "Advanced Courses",       desc: "Full catalog including Advanced-tier modules on AI, Security, and System Design.", color: "blue"    },
  { icon: Users,    title: "1-on-1 Coaching",         desc: "Private sessions with senior engineers for code review and career mentorship.",    color: "violet"  },
  { icon: Calendar, title: "Early Event Access",      desc: "Priority registration for hackathons and workshops before free members.",          color: "emerald" },
  { icon: Award,    title: "Verified Certifications", desc: "Earn shareable certificates that prove your skills — exclusive to Premium.",       color: "amber"   },
];

const C = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-500/10",    icon: "text-blue-500 dark:text-blue-400",    border: "border-blue-200 dark:border-blue-500/20"    },
  violet: { bg: "bg-violet-50 dark:bg-violet-500/10", icon: "text-violet-500 dark:text-violet-400", border: "border-violet-200 dark:border-violet-500/20" },
  emerald:{ bg: "bg-emerald-50 dark:bg-emerald-500/10",icon:"text-emerald-500 dark:text-emerald-400",border:"border-emerald-200 dark:border-emerald-500/20" },
  amber:  { bg: "bg-amber-50 dark:bg-amber-500/10",   icon: "text-amber-500 dark:text-amber-400",   border: "border-amber-200 dark:border-amber-500/20"   },
};

const STATUS_META = {
  pending_payment: { label: "Awaiting Payment",  color: "text-gray-500 dark:text-gray-400",   bg: "bg-gray-100 dark:bg-gray-800",         icon: Clock         },
  pending_review:  { label: "Under Review",      color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-500/10",       icon: Loader2       },
  active:          { label: "Active",            color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: CheckCircle2 },
  declined:        { label: "Declined",          color: "text-red-600 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-500/10",         icon: XCircle       },
  cancelled:       { label: "Cancelled",         color: "text-gray-400 dark:text-gray-600",   bg: "bg-gray-100 dark:bg-gray-800",         icon: X             },
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending_payment;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${m.color} ${m.bg}`}>
      <Icon size={11} className={status === 'pending_review' ? 'animate-spin' : ''} />
      {m.label}
    </span>
  );
}

function Toast({ msg, ok }) {
  if (!msg) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-[400] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm border ${
      ok
        ? "bg-white dark:bg-gray-900 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400"
        : "bg-white dark:bg-gray-900 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400"
    }`}>
      {ok ? <Crown size={13} className="shrink-0" /> : <AlertTriangle size={13} className="shrink-0" />}
      {msg}
    </div>
  );
}

/* ══ Main Component ════════════════════════════════════════════════════════ */
export default function PremiumContent() {
  const [profile, setProfile]           = useState(null);
  const [user, setUser]                 = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [paying, setPaying]             = useState(false);
  const [verifying, setVerifying]       = useState(false);
  const [plan, setPlan]                 = useState("monthly");
  const [toast, setToast]               = useState({ msg: "", ok: true });

  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: "", ok: true }), 4000);
  }, []);

  /* Fetch profile + latest subscription */
  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUser(session.user);

      const [profileRes, subRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).single(),
        supabase.from("premium_subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (subRes.data)     setSubscription(subRes.data);
    } catch {
      // show page in degraded state rather than spinning forever
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Auto-verify when Paystack redirects back with ?reference= */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref");
    if (!ref) return;

    const clean = new URL(window.location.href);
    clean.searchParams.delete("reference");
    clean.searchParams.delete("trxref");
    window.history.replaceState({}, "", clean.toString());

    setVerifying(true);
    (async () => {
      try {
        const res = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: ref }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast("Payment confirmed! Awaiting admin review — you'll be notified.");
          await fetchData();
        } else {
          showToast(data.error || "Verification failed. Contact support.", false);
        }
      } catch {
        showToast("Verification failed. Contact support.", false);
      } finally {
        setVerifying(false);
      }
    })();
  }, [fetchData, showToast]);

  /* Real-time subscription updates */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`premium-status-${user.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "premium_subscriptions",
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        setSubscription(payload.new);
        if (payload.new.status === "active") {
          showToast("🎉 Your premium access is now active!");
          setProfile(p => p ? { ...p, is_premium: true } : p);
        } else if (payload.new.status === "declined") {
          showToast("Your request was declined. Check notifications for details.", false);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, showToast]);

  /* ── Paystack redirect payment ────────────────────────────────────────── */
  const handlePay = async () => {
    if (!profile || !user || paying) return;
    setPaying(true);
    try {
      const initRes = await fetch("/api/paystack/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          userId:      user.id,
          email:       user.email,
          callbackUrl: `${window.location.origin}/dash?tool=premium`,
        }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || "Failed to start payment");
      window.location.href = initData.authorization_url;
    } catch (err) {
      showToast(err.message || "Payment failed. Try again.", false);
      setPaying(false);
    }
  };

  /* ── Derived state ─────────────────────────────────────────────────────── */
  if (loading || verifying) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <Loader2 size={22} className="animate-spin text-amber-500" />
      {verifying && <p className="text-sm text-gray-500 dark:text-gray-400">Verifying payment…</p>}
    </div>
  );

  const isPremium  = profile?.is_premium || profile?.is_admin;
  const isAdmin    = profile?.is_admin;
  const subStatus  = subscription?.status;
  const hasPending = subStatus === "pending_review";
  const hasActive  = subStatus === "active";
  const hadDecline = subStatus === "declined";

  const PRICE = plan === "monthly" ? "$9.99" : "$99";
  const PERIOD = plan === "monthly" ? "/mo" : "/yr";

  return (
    <>
      <Toast msg={toast.msg} ok={toast.ok} />

      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

        {/* ── Hero banner ─────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-500/10 dark:via-amber-500/5 dark:to-transparent p-6">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-amber-200/40 dark:bg-amber-500/10" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-orange-200/30 dark:bg-orange-500/5" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Crown size={22} className="text-amber-500" fill="currentColor" strokeWidth={1.5} stroke="white" />
                <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Premium Membership</h1>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium max-w-sm leading-relaxed">
                Advanced courses, 1-on-1 coaching, early event access, and verified certifications.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {subscription && <StatusBadge status={subStatus} />}
              {isPremium && (
                <span className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-black px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-500/30 whitespace-nowrap">
                  <Crown size={11} fill="currentColor" strokeWidth={1.5} stroke="white" />
                  {isAdmin ? "Admin Access" : "Active"}
                </span>
              )}
              {!isPremium && !subscription && (
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-black px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  Free Tier
                </span>
              )}
            </div>
          </div>

          {isPremium && (
            <div className="relative mt-4 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 font-medium">
              <ShieldCheck size={15} className="text-amber-500 shrink-0" />
              {isAdmin
                ? "Admin-level access — all premium features fully unlocked."
                : profile?.premium_expires_at
                  ? `Active until ${new Date(profile.premium_expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                  : "All premium features are active on your account."}
            </div>
          )}
        </div>

        {/* ── Subscription status card ─────────────────────────────────────── */}
        {subscription && !isPremium && (
          <div className={`rounded-2xl border p-5 shadow-sm ${
            hasPending ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" :
            hadDecline ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" :
            "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  {hasPending && <><Loader2 size={14} className="animate-spin text-blue-500" /> Payment Under Review</>}
                  {hadDecline && <><XCircle size={14} className="text-red-500" /> Request Declined</>}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {hasPending && "Your payment was received and is being reviewed by our team. You'll get a notification once it's approved."}
                  {hadDecline && (subscription.review_note
                    ? `Reason: "${subscription.review_note}". You can try again with a new subscription.`
                    : "Check your notifications for details, or contact support.")}
                </p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                  <p>Plan: <span className="font-bold capitalize">{subscription.plan}</span></p>
                  <p>Amount: <span className="font-bold">{subscription.plan === 'monthly' ? '$9.99/mo' : '$99/yr'}</span></p>
                  <p>Submitted: <span className="font-bold">{new Date(subscription.created_at).toLocaleDateString()}</span></p>
                </div>
              </div>
              <button onClick={fetchData} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-gray-400 shrink-0">
                <RefreshCw size={14} />
              </button>
            </div>
            {hadDecline && (
              <button
                onClick={() => setSubscription(null)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold rounded-xl transition-all active:scale-95"
              >
                <Crown size={13} fill="currentColor" strokeWidth={1.5} stroke="white" />
                Try Again
              </button>
            )}
          </div>
        )}

        {/* ── Feature comparison ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1fr_72px_88px] text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
            <span>Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center text-amber-500">Premium</span>
          </div>
          {FEATURES.map((f, i) => (
            <div key={i} className={`grid grid-cols-[1fr_72px_88px] items-center px-4 py-3 ${i < FEATURES.length - 1 ? "border-b border-gray-100 dark:border-gray-800/60" : ""}`}>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{f.label}</span>
              <div className="flex justify-center">
                {f.free ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-gray-200 dark:text-gray-700" />}
              </div>
              <div className="flex justify-center">
                <CheckCircle2 size={16} className="text-amber-500" />
              </div>
            </div>
          ))}
        </div>

        {/* ── Payment CTA ─────────────────────────────────────────────────── */}
        {!isPremium && !hasPending && !hasActive && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-black text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <Sparkles size={15} className="text-amber-500" />
              Upgrade — Secure Card Payment
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Pay securely via Paystack. Your card is processed by Paystack (PCI-DSS Level 1) — we never touch your card details.
            </p>

            {/* Plan toggle */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {[
                { id: "monthly", label: "Monthly", price: "$9.99", period: "/mo",  badge: null       },
                { id: "annual",  label: "Annual",  price: "$99",   period: "/yr",  badge: "SAVE 17%" },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className={`relative p-4 rounded-xl border text-left transition-all ${
                    plan === p.id
                      ? "border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-500/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {p.badge && (
                    <span className="absolute top-2 right-2 text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
                      {p.badge}
                    </span>
                  )}
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">{p.label}</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">
                    {p.price}<span className="text-xs font-normal text-gray-400">{p.period}</span>
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 active:scale-[0.98] text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/25 text-sm"
            >
              {paying ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              {paying ? "Redirecting to payment…" : `Pay ${PRICE}${PERIOD} via Paystack`}
            </button>

            <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-3 flex items-center justify-center gap-1">
              <ShieldCheck size={11} /> Secured by Paystack · PCI-DSS Level 1 · Cancel anytime
            </p>
          </div>
        )}

        {/* ── Perks grid ──────────────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[2px] mb-3">What You Unlock</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PERKS.map(perk => {
              const c = C[perk.color];
              return (
                <div key={perk.title} className={`relative flex flex-col gap-2 p-4 rounded-2xl border ${c.border} ${c.bg}`}>
                  {!isPremium && <Lock size={12} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600" />}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-white/70 dark:bg-gray-900/50 ${c.icon} shadow-sm`}>
                    <perk.icon size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white mb-0.5">{perk.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{perk.desc}</p>
                  </div>
                  {isPremium && (
                    <span className={`self-start flex items-center gap-1 text-[10px] font-bold ${c.icon}`}>
                      <CheckCircle2 size={10} /> Unlocked
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </>
  );
}
