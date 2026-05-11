"use client";

import { useTheme } from "next-themes";
import {
  Moon, Sun, Monitor, Palette, Check, AlertTriangle, Trash2, X,
  Loader2, BadgeCheck, Shield, Volume2, VolumeX, Users, Crown,
  UserCheck, Activity, TrendingUp, Bell, BellOff, Settings,
  ChevronRight, BarChart3, Zap, Lock, Globe, RefreshCw, Eye,
  UserPlus, ShieldCheck, Award, Smartphone, Copy, KeyRound,
  LogOut, Fingerprint, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent }) {
  const colors = {
    blue:   { bg: "from-blue-500/20 to-blue-600/5",   border: "border-blue-500/20",   text: "text-blue-400",   val: "text-blue-300" },
    purple: { bg: "from-purple-500/20 to-purple-600/5", border: "border-purple-500/20", text: "text-purple-400", val: "text-purple-300" },
    amber:  { bg: "from-amber-500/20 to-amber-600/5",  border: "border-amber-500/20",  text: "text-amber-400",  val: "text-amber-300" },
    emerald:{ bg: "from-emerald-500/20 to-emerald-600/5", border: "border-emerald-500/20", text: "text-emerald-400", val: "text-emerald-300" },
  };
  const c = colors[accent] || colors.blue;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} p-5 backdrop-blur-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <p className={`text-3xl font-black ${c.val} tabular-nums`}>
            {value === null ? <Loader2 size={22} className="animate-spin inline" /> : value}
          </p>
          {sub && <p className="text-[11px] text-gray-500 mt-1 font-medium">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.text} bg-white/5`}>
          <Icon size={20} />
        </div>
      </div>
      {/* decorative glow */}
      <div className={`absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-10 blur-2xl ${c.text} bg-current`} />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, accent = "blue" }) {
  const colors = {
    blue:   "bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/10 text-purple-400",
    amber:  "bg-amber-500/10 text-amber-400",
    red:    "bg-red-500/10 text-red-400",
    emerald:"bg-emerald-500/10 text-emerald-400",
  };
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[accent]}`}>
        <Icon size={20} />
      </div>
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800/80 rounded-2xl p-6 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function RowItem({ title, desc, children }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-500/5 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 rounded-xl">
      <div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Toast({ message, type }) {
  if (!message) return null;
  return (
    <div className={`fixed bottom-8 right-8 z-[300] flex items-center gap-3 bg-white dark:bg-gray-900 border px-5 py-3 rounded-2xl shadow-2xl
      animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm
      ${type === "error" ? "border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400" : "border-emerald-200 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400"}`}>
      {type === "error"
        ? <AlertTriangle size={16} className="shrink-0" />
        : <Check size={16} className="shrink-0" />}
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
}

// ─── Recent Users Table ───────────────────────────────────────────────────────

function RecentUsersTable({ users, loading }) {
  return (
    <div className="overflow-x-auto">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 size={22} className="animate-spin mr-2" /> Loading users…
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-sm">No users found.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              {["User", "Role", "Status", "Joined", ""].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-widest pb-3 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800/60">
            {users.map((u) => (
              <tr key={u.id} className="group hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 shrink-0">
                      {(u.username || u.full_name || "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-xs flex items-center gap-1">
                        {u.username || u.full_name || "—"}
                        {u.is_verified && <BadgeCheck size={12} className="text-blue-400 fill-blue-400" />}
                      </p>
                      <p className="text-[10px] text-gray-500">{u.email || ""}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide
                    ${u.role === "founder"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-gray-700/50 text-gray-400 border border-gray-700"}`}>
                    {u.role === "founder" ? <Crown size={9} /> : <Users size={9} />}
                    {u.role || "member"}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold
                    ${u.verification_status === "pending"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : u.is_verified
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-gray-700/40 text-gray-500 border border-gray-700"}`}>
                    {u.verification_status === "pending" ? "Pending" : u.is_verified ? "Verified" : "Standard"}
                  </span>
                </td>
                <td className="py-3 pr-4 text-[11px] text-gray-500">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </td>
                <td className="py-3 text-right">
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <Eye size={11} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");

  // Profile & prefs
  const [profile, setProfile] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [requestingVerification, setRequestingVerification] = useState(false);

  // 2FA state
  const [mfaEnabled, setMfaEnabled]       = useState(false);
  const [mfaLoading, setMfaLoading]       = useState(true);
  const [showMFAModal, setShowMFAModal]   = useState(false);
  const [mfaStep, setMfaStep]             = useState("enroll"); // "enroll" | "verify" | "done"
  const [mfaFactorId, setMfaFactorId]     = useState(null);
  const [mfaQR, setMfaQR]                 = useState("");
  const [mfaSecret, setMfaSecret]         = useState("");
  const [mfaCode, setMfaCode]             = useState("");
  const [mfaVerifying, setMfaVerifying]   = useState(false);
  const [mfaCopied, setMfaCopied]         = useState(false);
  const [mfaDisabling, setMfaDisabling]   = useState(false);

  // Sessions state
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [sessionInfo, setSessionInfo]             = useState(null);
  const [revokingOthers, setRevokingOthers]       = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Admin stats
  const [stats, setStats] = useState({ total: null, founders: null, members: null, verified: null, pending: null });
  const [recentUsers, setRecentUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const parseUA = (ua = "") => {
    const mobile  = /Mobi|Android/i.test(ua);
    const tablet  = /iPad|Tablet/i.test(ua);
    const os      = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : /Android/.test(ua) ? "Android" : /iOS|iPhone|iPad/.test(ua) ? "iOS" : "Unknown OS";
    const browser = /Edg\//.test(ua) ? "Edge" : /OPR|Opera/.test(ua) ? "Opera" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Browser";
    const device  = tablet ? "Tablet" : mobile ? "Mobile" : "Desktop";
    return { os, browser, device };
  };

  const showToast = useCallback((msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3500);
  }, []);

  // ── Fetch current user profile ──────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const raw = typeof window !== "undefined" ? localStorage.getItem("beoneofus_muted") : null;
    setIsMuted(raw === "true");

    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [profileRes] = await Promise.all([
        supabase.from("profiles").select("username, is_verified, verification_status, role").eq("id", session.user.id).single(),
      ]);
      if (profileRes.data) {
        setProfile(profileRes.data);
        setIsAdmin(profileRes.data.role === "admin" || profileRes.data.role === "founder");
      }

      // Check 2FA status
      try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verified = factors?.totp?.filter(f => f.status === "verified") ?? [];
        setMfaEnabled(verified.length > 0);
        if (verified.length > 0) setMfaFactorId(verified[0].id);
      } catch { /* MFA not available */ } finally {
        setMfaLoading(false);
      }

      // Prefill session info
      const { device, browser, os } = parseUA(typeof navigator !== "undefined" ? navigator.userAgent : "");
      setSessionInfo({ device, browser, os, created_at: session.user.created_at, expires_at: new Date(session.expires_at * 1000).toISOString() });
    };
    fetchProfile();
  }, []);

  // ── Fetch admin stats ───────────────────────────────────────────────────────
  const fetchAdminStats = useCallback(async () => {
    if (!isAdmin) return;
    setStatsLoading(true);
    try {
      // Parallel queries for each count
      const [totalRes, foundersRes, membersRes, verifiedRes, pendingRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "founder"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
      ]);
      setStats({
        total: totalRes.count ?? 0,
        founders: foundersRes.count ?? 0,
        members: membersRes.count ?? 0,
        verified: verifiedRes.count ?? 0,
        pending: pendingRes.count ?? 0,
      });
    } catch (e) {
      console.error("Stats fetch error:", e);
    } finally {
      setStatsLoading(false);
    }
  }, [isAdmin]);

  const fetchRecentUsers = useCallback(async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, email, role, is_verified, verification_status")
        .limit(10);
      if (error) throw error;
      setRecentUsers(data || []);
    } catch (e) {
      console.error("Users fetch error:", e);
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && activeTab === "admin") {
      fetchAdminStats();
      fetchRecentUsers();
    }
  }, [isAdmin, activeTab, fetchAdminStats, fetchRecentUsers]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteInput !== `delete ${profile?.username}`) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session.");

      const { error: rpcError } = await supabase.rpc("delete_user");
      if (rpcError) {
        // Fallback: attempt direct profile delete
        const { error: profileError } = await supabase
          .from("profiles").delete().eq("id", session.user.id);
        if (profileError) throw new Error("Could not delete account. Please contact support.");
      }
      await supabase.auth.signOut();
      window.location.href = "/auth";
    } catch (error) {
      setDeleteError(error.message);
      setIsDeleting(false);
    }
  };

  const handleRequestVerification = async () => {
    setRequestingVerification(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated.");
      const { error } = await supabase
        .from("profiles")
        .update({ verification_status: "pending" })
        .eq("id", session.user.id);
      if (error) throw error;
      setProfile((p) => ({ ...p, verification_status: "pending" }));
      showToast("Verification request sent!", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setRequestingVerification(false);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (typeof window !== "undefined") localStorage.setItem("beoneofus_muted", next.toString());
    showToast(next ? "Notification sounds muted" : "Notification sounds enabled");
  };

  const handleOpen2FA = async () => {
    if (mfaEnabled) { setShowMFAModal(true); setMfaStep("enabled"); return; }
    setShowMFAModal(true);
    setMfaStep("enroll");
    setMfaCode("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "beoneofus" });
      if (error) throw error;
      setMfaFactorId(data.id);
      setMfaQR(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
    } catch (e) {
      showToast(e.message || "Could not start 2FA setup", "error");
      setShowMFAModal(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!mfaCode || mfaCode.length !== 6 || !mfaFactorId) return;
    setMfaVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode });
      if (error) throw error;
      setMfaEnabled(true);
      setMfaStep("done");
      showToast("Two-factor authentication enabled!");
    } catch (e) {
      showToast(e.message || "Invalid code. Please try again.", "error");
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!mfaFactorId) return;
    setMfaDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
      if (error) throw error;
      setMfaEnabled(false);
      setMfaFactorId(null);
      setShowMFAModal(false);
      showToast("Two-factor authentication removed.");
    } catch (e) {
      showToast(e.message || "Could not disable 2FA.", "error");
    } finally {
      setMfaDisabling(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setRevokingOthers(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      showToast("All other sessions revoked.");
    } catch (e) {
      showToast(e.message || "Could not revoke sessions.", "error");
    } finally {
      setRevokingOthers(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(mfaSecret);
    setMfaCopied(true);
    setTimeout(() => setMfaCopied(false), 2000);
  };

  const closeDeleteModal = () => { setShowDeleteModal(false); setDeleteInput(""); setDeleteError(""); };

  if (!mounted) return null;

  // ── Theme options ────────────────────────────────────────────────────────────
  const themeOptions = [
    { id: "light", label: "Light", icon: Sun, desc: "Clean & bright" },
    { id: "dark",  label: "Dark",  icon: Moon, desc: "Easy on eyes" },
    { id: "system", label: "System", icon: Monitor, desc: "Matches device" },
  ];

  const tabs = [
    { id: "settings", label: "Settings", icon: Settings },
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: BarChart3 }] : []),
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0f] text-gray-900 dark:text-gray-100 font-sans">
      {/* Background grid texture */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* ── Page header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-3 font-medium">
            <Globe size={12} /> beoneofus
            <ChevronRight size={10} />
            <span className="text-gray-400">{activeTab === "admin" ? "Admin Dashboard" : "Settings"}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white leading-none">
                {activeTab === "admin" ? "Admin Dashboard" : "Settings"}
              </h1>
              <p className="text-gray-500 text-sm mt-2 font-medium">
                {activeTab === "admin"
                  ? "Platform overview, user management & analytics"
                  : "Manage your preferences and account."}
              </p>
            </div>
            {/* Tab switcher */}
            {tabs.length > 1 && (
              <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl p-1 self-start sm:self-auto">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 
                      ${activeTab === t.id
                        ? "bg-white/10 text-white shadow"
                        : "text-gray-500 hover:text-gray-300"}`}
                  >
                    <t.icon size={13} />
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* SETTINGS TAB */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <div className="space-y-6">

            {/* ── Appearance ── */}
            <Card>
              <SectionHeader icon={Palette} title="Appearance" subtitle="Choose how the app looks to you." accent="blue" />
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map((t) => {
                  const Icon = t.icon;
                  const active = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id); showToast(`Theme set to ${t.label}`); }}
                      className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border transition-all duration-200 
                        ${active
                          ? "bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/50 text-blue-600 dark:text-blue-300"
                          : "bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700/50 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300"}`}
                    >
                      {active && (
                        <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check size={10} strokeWidth={3} className="text-white" />
                        </div>
                      )}
                      <Icon size={24} />
                      <div className="text-center">
                        <p className="text-xs font-bold">{t.label}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* ── App Preferences ── */}
            <Card>
              <SectionHeader icon={Bell} title="Notifications" subtitle="Control alerts and sounds." accent="purple" />
              <RowItem
                title="Notification Sounds"
                desc="Play audio alerts for messages and calls."
              >
                <button
                  onClick={toggleMute}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all 
                    ${isMuted
                      ? "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"}`}
                >
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  {isMuted ? "Muted" : "Enabled"}
                </button>
              </RowItem>
            </Card>

            {/* ── Verification ── */}
            <Card>
              <SectionHeader icon={BadgeCheck} title="Account Verification" subtitle="Get the verified badge on your profile." accent="blue" />
              <RowItem
                title="Verified Node Status"
                desc="Official verification issued by beoneofus."
              >
                {profile?.is_verified ? (
                  <div className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <BadgeCheck size={14} /> Verified
                  </div>
                ) : profile?.verification_status === "pending" ? (
                  <div className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Loader2 size={14} className="animate-spin" /> Pending Review
                  </div>
                ) : (
                  <button
                    onClick={handleRequestVerification}
                    disabled={requestingVerification}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                  >
                    {requestingVerification ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                    Request Verification
                  </button>
                )}
              </RowItem>
            </Card>

            {/* ── Security ── */}
            <Card>
              <SectionHeader icon={Lock} title="Security" subtitle="Manage your account security settings." accent="emerald" />
              <div className="space-y-3">

                {/* 2FA row */}
                <RowItem
                  title="Two-Factor Authentication"
                  desc="Require a one-time code from your authenticator app on sign-in."
                >
                  <div className="flex items-center gap-2 shrink-0">
                    {mfaLoading ? (
                      <Loader2 size={14} className="animate-spin text-gray-400" />
                    ) : mfaEnabled ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={13} /> Active
                      </span>
                    ) : null}
                    <button
                      onClick={handleOpen2FA}
                      disabled={mfaLoading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${
                        mfaEnabled
                          ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                      }`}
                    >
                      {mfaEnabled ? <><XCircle size={14} /> Disable 2FA</> : <><Fingerprint size={14} /> Enable 2FA</>}
                    </button>
                  </div>
                </RowItem>

                {/* Active Sessions row */}
                <RowItem
                  title="Active Sessions"
                  desc="View and manage devices currently signed in to your account."
                >
                  <button
                    onClick={() => setShowSessionsModal(true)}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                  >
                    <Eye size={14} /> View Sessions
                  </button>
                </RowItem>

              </div>
            </Card>

            {/* ── Danger Zone ── */}
            <div className="bg-white/80 dark:bg-gray-900/80 border border-red-200 dark:border-red-900/30 rounded-2xl p-6 backdrop-blur-sm">
              <SectionHeader icon={AlertTriangle} title="Danger Zone" subtitle="These actions are permanent and cannot be undone." accent="red" />
              <RowItem title="Delete Account" desc="Permanently delete your account and all associated data.">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={14} /> Delete Account
                </button>
              </RowItem>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ADMIN TAB */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "admin" && isAdmin && (
          <div className="space-y-6">

            {/* ── Stats grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users}     label="Total Users"   value={stats.total}    sub="All time registrations" accent="blue" />
              <StatCard icon={Crown}     label="Founders"      value={stats.founders} sub="Founder-role accounts"  accent="amber" />
              <StatCard icon={UserCheck} label="Members"       value={stats.members}  sub="Standard member accounts" accent="purple" />
              <StatCard icon={Award}     label="Verified"      value={stats.verified} sub="Badge-verified nodes"   accent="emerald" />
            </div>

            {/* ── Secondary stats + refresh ── */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Card className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pending Verifications</p>
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Zap size={13} />
                  </div>
                </div>
                <p className="text-3xl font-black text-amber-300 tabular-nums">
                  {stats.pending === null ? <Loader2 size={20} className="animate-spin inline" /> : stats.pending}
                </p>
                <p className="text-[11px] text-gray-600 mt-1">Awaiting admin review</p>
              </Card>

              <Card className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Verification Rate</p>
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <TrendingUp size={13} />
                  </div>
                </div>
                <p className="text-3xl font-black text-blue-300 tabular-nums">
                  {stats.total && stats.verified !== null
                    ? `${Math.round((stats.verified / stats.total) * 100)}%`
                    : <Loader2 size={20} className="animate-spin inline" />}
                </p>
                <p className="text-[11px] text-gray-600 mt-1">Of total users verified</p>
              </Card>

              <div className="flex items-stretch">
                <button
                  onClick={() => { fetchAdminStats(); fetchRecentUsers(); showToast("Data refreshed!"); }}
                  className="flex flex-col items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700 text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-all text-xs font-bold"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            {/* ── Quick actions ── */}
            <Card>
              <SectionHeader icon={Zap} title="Quick Actions" subtitle="Common admin tasks at a glance." accent="amber" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Invite User",       icon: UserPlus,   accent: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/15" },
                  { label: "Approve Pending",   icon: ShieldCheck, accent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15" },
                  { label: "View Activity",     icon: Activity,   accent: "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/15" },
                  { label: "Platform Health",   icon: BarChart3,  accent: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15" },
                ].map(({ label, icon: Icon, accent }) => (
                  <button key={label} className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-xs font-bold transition-all ${accent}`}>
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
            </Card>

            {/* ── Recent users table ── */}
            <Card>
              <div className="flex items-center justify-between mb-6">
                <SectionHeader icon={Users} title="Recent Users" subtitle="Last 10 registered accounts." accent="blue" />
                <button
                  onClick={fetchRecentUsers}
                  className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-gray-600 hover:text-gray-400 transition-colors -mt-6"
                >
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>
              <RecentUsersTable users={recentUsers} loading={usersLoading} />
            </Card>

            {/* ── Pending verifications ── */}
            {stats.pending > 0 && (
              <Card>
                <SectionHeader icon={Shield} title="Pending Verification Requests" subtitle="Users awaiting badge approval." accent="amber" />
                <div className="space-y-2 ">
                  {recentUsers.filter(u => u.verification_status === "pending").map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-black">
                          {(u.username || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-200">{u.username}</p>
                          <p className="text-[10px] text-gray-500">{u.role || "member"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const { error } = await supabase
                              .from("profiles").update({ is_verified: true, verification_status: "approved" }).eq("id", u.id);
                            if (!error) { fetchRecentUsers(); fetchAdminStats(); showToast(`${u.username} verified!`); }
                            else showToast(error.message, "error");
                          }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            const { error } = await supabase
                              .from("profiles").update({ verification_status: "rejected" }).eq("id", u.id);
                            if (!error) { fetchRecentUsers(); fetchAdminStats(); showToast(`${u.username} rejected`, "error"); }
                            else showToast(error.message, "error");
                          }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                  {recentUsers.filter(u => u.verification_status === "pending").length === 0 && (
                    <p className="text-center text-xs text-gray-600 py-6">No pending requests in the last 10 users.</p>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-500/50 dark:bg-black/70 backdrop-blur-sm" onClick={closeDeleteModal} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-7 text-center animate-in fade-in zoom-in duration-200">
            <button onClick={closeDeleteModal} className="absolute top-4 right-4 text-gray-600 hover:text-gray-300 transition-colors">
              <X size={18} />
            </button>
            <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={26} />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Delete Account?</h3>
            <p className="text-gray-500 text-xs mb-6 leading-relaxed">
              This is permanent. All posts, messages, and data will be removed.
              <br /><br />
              Type <span className="font-bold text-red-500 dark:text-red-400 select-all">delete {profile?.username}</span> to confirm.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && deleteInput === `delete ${profile?.username}`) handleDeleteAccount(); }}
                placeholder={`delete ${profile?.username}`}
                className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-red-500/50 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-700 outline-none transition-all text-center"
              />
              {deleteError && (
                <div className="bg-red-950/50 border border-red-900/50 text-red-400 text-xs p-3 rounded-xl text-left">
                  <span className="font-bold">Error:</span> {deleteError}
                </div>
              )}
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== `delete ${profile?.username}` || isDeleting}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : "Permanently Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2FA Modal ── */}
      {showMFAModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-500/50 dark:bg-black/70 backdrop-blur-sm" onClick={() => { setShowMFAModal(false); setMfaCode(""); }} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-7 animate-in fade-in zoom-in duration-200">
            <button onClick={() => { setShowMFAModal(false); setMfaCode(""); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Fingerprint size={22} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  {mfaStep === "enabled" ? "Disable 2FA" : mfaStep === "done" ? "2FA Enabled!" : "Set Up Two-Factor Auth"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {mfaStep === "enabled" ? "Remove authenticator app requirement" : mfaStep === "done" ? "Your account is now more secure" : "Use an authenticator app like Google Authenticator"}
                </p>
              </div>
            </div>

            {/* Step: enroll — show QR + secret */}
            {mfaStep === "enroll" && (
              <div className="space-y-5">
                {mfaQR ? (
                  <>
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mfaQR} alt="2FA QR Code" className="w-44 h-44" />
                      </div>
                      <p className="text-xs text-center text-gray-500">Scan this QR code with your authenticator app</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Manual entry key</p>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all select-all">{mfaSecret}</code>
                        <button onClick={copySecret} className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500">
                          {mfaCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Enter the 6-digit code from your app</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={mfaCode}
                        onChange={e => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={e => { if (e.key === "Enter") handleVerify2FA(); }}
                        placeholder="000000"
                        className="w-full text-center text-2xl font-black tracking-[0.5em] bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-emerald-500/50 rounded-xl py-3 px-4 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-700 outline-none transition-all"
                      />
                    </div>

                    <button
                      onClick={handleVerify2FA}
                      disabled={mfaCode.length !== 6 || mfaVerifying}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm"
                    >
                      {mfaVerifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      {mfaVerifying ? "Verifying…" : "Verify & Enable"}
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-emerald-400" />
                  </div>
                )}
              </div>
            )}

            {/* Step: done — success */}
            {mfaStep === "done" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Two-factor authentication is active</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">You'll be asked for a code from your authenticator app each time you sign in.</p>
                </div>
                <button
                  onClick={() => setShowMFAModal(false)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all text-sm"
                >
                  Done
                </button>
              </div>
            )}

            {/* Step: enabled — disable confirm */}
            {mfaStep === "enabled" && (
              <div className="space-y-5">
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                    Disabling 2FA will make your account less secure. Anyone with your password could sign in without a second check.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowMFAModal(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDisable2FA}
                    disabled={mfaDisabling}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white transition-all"
                  >
                    {mfaDisabling ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                    {mfaDisabling ? "Removing…" : "Disable 2FA"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Active Sessions Modal ── */}
      {showSessionsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-500/50 dark:bg-black/70 backdrop-blur-sm" onClick={() => setShowSessionsModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-7 animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowSessionsModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Smartphone size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">Active Sessions</h3>
                <p className="text-xs text-gray-500 mt-0.5">Devices signed in to your account</p>
              </div>
            </div>

            {/* Current session card */}
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  {sessionInfo?.device === "Mobile" ? <Smartphone size={17} className="text-blue-400" /> : <Monitor size={17} className="text-blue-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-gray-900 dark:text-white">
                      {sessionInfo?.browser} on {sessionInfo?.os}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg shrink-0">
                      Current
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{sessionInfo?.device} device</p>
                  {sessionInfo?.expires_at && (
                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1.5">
                      <Clock size={9} />
                      Session expires {new Date(sessionInfo.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Supabase manages session tokens per device. Use the button below to invalidate all other active sessions — they will need to sign in again.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleRevokeOtherSessions}
                disabled={revokingOthers}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 transition-all"
              >
                {revokingOthers ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                {revokingOthers ? "Revoking…" : "Revoke All Other Sessions"}
              </button>
              <button
                onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                <LogOut size={15} /> Sign Out Everywhere
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toastMessage} type={toastType} />
    </div>
  );
}
