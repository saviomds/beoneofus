"use client";

import { useTheme } from "next-themes";
import {
  Moon, Sun, Monitor, Palette, Check, AlertTriangle, Trash2, X,
  Loader2, BadgeCheck, Shield, Volume2, VolumeX, Users, Crown,
  UserCheck, Activity, TrendingUp, Bell, Settings,
  ChevronRight, BarChart3, Zap, Lock, Globe, RefreshCw, Eye, EyeOff,
  UserPlus, ShieldCheck, Award, Smartphone, Copy, KeyRound,
  LogOut, Fingerprint, Clock, CheckCircle2, XCircle,
  Camera, User, Link2, AtSign, Mail, Send, ChevronDown,
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

const AVATAR_COLORS = [
  "bg-blue-600","bg-violet-600","bg-emerald-600","bg-rose-600",
  "bg-amber-500","bg-cyan-600","bg-pink-600","bg-indigo-600",
];
function avatarColor(username = "") {
  const i = (username.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

function RoleBadge({ role }) {
  const cfg = {
    founder: { bg: "bg-amber-500",  label: "Founder", icon: Crown },
    admin:   { bg: "bg-violet-600", label: "Admin",   icon: Shield },
    member:  { bg: "bg-blue-600",   label: "Member",  icon: Users },
  };
  const { bg, label, icon: Icon } = cfg[role] || cfg.member;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white ${bg}`}>
      <Icon size={10} /> {label}
    </span>
  );
}

function StatusBadge({ is_verified, verification_status }) {
  if (verification_status === "pending")
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-white"><Clock size={10} /> Pending</span>;
  if (is_verified)
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white"><BadgeCheck size={10} /> Verified</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-500 text-white"><Users size={10} /> Standard</span>;
}

function RecentUsersTable({ users, loading }) {
  if (loading) return (
    <div className="flex items-center justify-center py-12 gap-2 text-gray-500 dark:text-gray-400">
      <Loader2 size={20} className="animate-spin" /> Loading users…
    </div>
  );
  if (users.length === 0) return (
    <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">No users found.</div>
  );
  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors">
          {/* Avatar */}
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${avatarColor(u.username)} flex items-center justify-center text-sm font-black text-white shrink-0 overflow-hidden`}>
            {u.avatar_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
              : (u.username || "?")[0].toUpperCase()}
          </div>

          {/* Name + email — takes remaining space, truncates */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-1">
              @{u.username || "—"}
              {u.is_verified && <BadgeCheck size={12} className="text-blue-500 shrink-0" />}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email || "—"}</p>
          </div>

          {/* Badges — hidden on very small screens, shown from sm up */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <RoleBadge role={u.role} />
            <StatusBadge is_verified={u.is_verified} verification_status={u.verification_status} />
          </div>

          {/* Mobile: single compact badge */}
          <div className="flex sm:hidden shrink-0">
            <RoleBadge role={u.role} />
          </div>

          {/* Joined date + time */}
          <div className="shrink-0 hidden sm:flex flex-col items-end gap-0.5">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {u.created_at
                ? new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "—"}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {u.created_at
                ? new Date(u.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  const [settingsSection, setSettingsSection] = useState("profile");

  // Profile & prefs
  const [profile, setProfile] = useState(null);
  const [editProfile, setEditProfile] = useState({ username: "", status: "", website: "", github: "", work_status: "None" });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
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

  // Email change
  const [userEmail, setUserEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailNew, setEmailNew] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailChanging, setEmailChanging] = useState(false);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwChanging, setPwChanging] = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  // Create user modal (admin)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ email: "", username: "", role: "member", password: "", sendInvite: true });
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState("");
  const [showCreatePw, setShowCreatePw] = useState(false);

  // Broadcast email (admin)
  const [broadcastForm, setBroadcastForm]   = useState({ audience: "all", subject: "", message: "" });
  const [broadcastCount, setBroadcastCount] = useState(null);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult]   = useState(null); // { sent, failed, total }
  const [broadcastConfirm, setBroadcastConfirm] = useState(false);

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
      setUserEmail(session.user.email || "");
      const [profileRes] = await Promise.all([
        supabase.from("profiles").select("username, status, website, github, work_status, avatar_url, is_verified, verification_status, role").eq("id", session.user.id).single(),
      ]);
      if (profileRes.data) {
        const p = profileRes.data;
        setProfile(p);
        setIsAdmin(p.role === "admin" || p.role === "founder");
        setAvatarUrl(p.avatar_url || "");
        setEditProfile({
          username:    p.username    || "",
          status:      p.status      || "",
          website:     p.website     || "",
          github:      p.github      || "",
          work_status: p.work_status || "None",
        });
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
        .select("id, username, email, role, is_verified, verification_status, created_at, avatar_url")
        .order("created_at", { ascending: false })
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

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated.");
      const { error } = await supabase.from("profiles").update({
        username:    editProfile.username.trim(),
        status:      editProfile.status.trim(),
        website:     editProfile.website.trim(),
        github:      editProfile.github.trim(),
        work_status: editProfile.work_status,
      }).eq("id", session.user.id);
      if (error) throw error;
      setProfile(p => ({ ...p, username: editProfile.username.trim() }));
      showToast("Profile saved!");
    } catch (e) {
      showToast(e.message || "Failed to save profile.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast("Image must be under 2 MB.", "error"); return; }
    setAvatarUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated.");
      const ext = file.name.split(".").pop();
      const path = `${session.user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = urlData.publicUrl + `?t=${Date.now()}`;
      const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", session.user.id);
      if (updateErr) throw updateErr;
      setAvatarUrl(url);
      showToast("Profile photo updated!");
    } catch (e) {
      showToast(e.message || "Upload failed.", "error");
    } finally {
      setAvatarUploading(false);
    }
  };

  // Sticker options — emoji + gradient background pairs
  const STICKER_OPTIONS = [
    { emoji: "🦊", bg: "#f97316,#ea580c" }, { emoji: "🐺", bg: "#8b5cf6,#7c3aed" },
    { emoji: "🐱", bg: "#ec4899,#db2777" }, { emoji: "🐸", bg: "#22c55e,#16a34a" },
    { emoji: "🦋", bg: "#3b82f6,#2563eb" }, { emoji: "🐼", bg: "#6b7280,#4b5563" },
    { emoji: "🦄", bg: "#a855f7,#9333ea" }, { emoji: "🐯", bg: "#f59e0b,#d97706" },
    { emoji: "🦁", bg: "#eab308,#ca8a04" }, { emoji: "🐧", bg: "#0ea5e9,#0284c7" },
    { emoji: "🦊", bg: "#ef4444,#dc2626" }, { emoji: "🐙", bg: "#f43f5e,#e11d48" },
    { emoji: "🦅", bg: "#78716c,#57534e" }, { emoji: "🐬", bg: "#06b6d4,#0891b2" },
    { emoji: "🦖", bg: "#84cc16,#65a30d" }, { emoji: "🦉", bg: "#92400e,#78350f" },
    { emoji: "🐉", bg: "#dc2626,#b91c1c" }, { emoji: "🦝", bg: "#64748b,#475569" },
    { emoji: "🐨", bg: "#94a3b8,#64748b" }, { emoji: "🦭", bg: "#38bdf8,#0ea5e9" },
  ];

  const [showStickerPicker, setShowStickerPicker] = useState(false);

  const handlePickSticker = async ({ emoji, bg }) => {
    setAvatarUploading(true);
    setShowStickerPicker(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated.");
      const [c1, c2] = bg.split(",");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
        <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
        </linearGradient></defs>
        <rect width="128" height="128" rx="28" fill="url(#g)"/>
        <text x="64" y="90" font-size="68" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji}</text>
      </svg>`;
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const path = `${session.user.id}/avatar.svg`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/svg+xml" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = urlData.publicUrl + `?t=${Date.now()}`;
      const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", session.user.id);
      if (updateErr) throw updateErr;
      setAvatarUrl(url);
      showToast("Avatar sticker applied!");
    } catch (e) {
      showToast(e.message || "Failed to apply sticker.", "error");
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Handle profile verification status ──────────────────────────────────────
  const sendNotif = async (type, userId) => {
    const target = recentUsers.find(u => u.id === userId);
    if (!target?.email) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ type, email: target.email, name: target.username || 'there' }),
    }).catch(() => {});
  };

  const handleApproveVerification = async (userId) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified: true, verification_status: "approved" })
        .eq("id", userId);
      if (error) throw error;
      sendNotif('verification_approved', userId);
      showToast("User verified successfully!");
      fetchRecentUsers();
      fetchAdminStats();
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleRejectVerification = async (userId) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ verification_status: "rejected" })
        .eq("id", userId);
      if (error) throw error;
      sendNotif('verification_rejected', userId);
      showToast("Verification request rejected.", "error");
      fetchRecentUsers();
      fetchAdminStats();
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  // ── Broadcast helpers ──────────────────────────────────────────────────────
  const fetchBroadcastCount = useCallback(async (audience) => {
    setBroadcastCount(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`/api/admin/broadcast?audience=${audience}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      setBroadcastCount(json.count ?? 0);
    } catch { setBroadcastCount(0); }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchBroadcastCount(broadcastForm.audience);
  }, [isAdmin, broadcastForm.audience, fetchBroadcastCount]);

  const handleBroadcast = async () => {
    const { audience, subject, message } = broadcastForm;
    if (!subject.trim() || !message.trim()) {
      showToast("Subject and message are required.", "error");
      return;
    }
    setBroadcastSending(true);
    setBroadcastConfirm(false);
    setBroadcastResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ audience, subject: subject.trim(), message: message.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Broadcast failed');
      setBroadcastResult(json);
      showToast(`Broadcast sent to ${json.sent} recipient${json.sent !== 1 ? 's' : ''}!`);
      setBroadcastForm(f => ({ ...f, subject: '', message: '' }));
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBroadcastSending(false);
    }
  };

  // ── Email change handlers ───────────────────────────────────────────────────
  const handleSendEmailCode = async () => {
    if (!emailNew || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNew)) {
      showToast("Enter a valid email address.", "error");
      return;
    }
    if (emailNew.toLowerCase() === userEmail.toLowerCase()) {
      showToast("New email must differ from your current email.", "error");
      return;
    }
    setEmailSending(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNew }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code.");
      setEmailCodeSent(true);
      showToast("Verification code sent to new email!");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setEmailSending(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!emailCode || emailCode.length !== 6) {
      showToast("Enter the 6-digit code.", "error");
      return;
    }
    setEmailChanging(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated.");
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: emailNew, code: emailCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update email.");
      setUserEmail(emailNew);
      setShowEmailForm(false);
      setEmailNew("");
      setEmailCode("");
      setEmailCodeSent(false);
      showToast("Email updated successfully!");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setEmailChanging(false);
    }
  };

  const resetEmailForm = () => {
    setShowEmailForm(false);
    setEmailNew("");
    setEmailCode("");
    setEmailCodeSent(false);
  };

  const resetPasswordForm = () => {
    setShowPasswordForm(false);
    setPwCurrent("");
    setPwNew("");
    setPwConfirm("");
  };

  const handleChangePassword = async () => {
    if (pwNew.length < 8) {
      showToast("New password must be at least 8 characters.", "error");
      return;
    }
    if (pwNew !== pwConfirm) {
      showToast("New passwords don't match.", "error");
      return;
    }
    setPwChanging(true);
    try {
      // Verify current password before updating
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: pwCurrent,
      });
      if (signInErr) throw new Error("Current password is incorrect.");
      const { error: updateErr } = await supabase.auth.updateUser({ password: pwNew });
      if (updateErr) throw updateErr;
      resetPasswordForm();
      showToast("Password changed successfully!");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setPwChanging(false);
    }
  };

  // ── Admin: create user ──────────────────────────────────────────────────────
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    const arr = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(arr).map(x => chars[x % chars.length]).join("");
  };

  const handleCreateUser = async () => {
    const { email, username, role, password, sendInvite } = createUserForm;
    if (!email || !username || !password) {
      setCreateUserError("Email, username and password are required.");
      return;
    }
    if (password.length < 8) {
      setCreateUserError("Password must be at least 8 characters.");
      return;
    }
    setCreateUserLoading(true);
    setCreateUserError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated.");
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, username, role, password, sendInvite }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user.");
      setShowCreateUserModal(false);
      setCreateUserForm({ email: "", username: "", role: "member", password: "", sendInvite: true });
      showToast(`User @${username} created successfully!`);
      fetchRecentUsers();
      fetchAdminStats();
    } catch (e) {
      setCreateUserError(e.message);
    } finally {
      setCreateUserLoading(false);
    }
  };

  // ── Handle profile work status ──────────────────────────────────────────────
  const handleWorkStatusChange = async (newStatus) => {
    setEditProfile((p) => ({ ...p, work_status: newStatus }));
    // Note: This state update is persisted when handleSaveProfile is called
  };

  // ── Handle profile website and github ───────────────────────────────────────
  const handleWebsiteChange = (e) => setEditProfile((p) => ({ ...p, website: e.target.value }));
  const handleGithubChange = (e) => setEditProfile((p) => ({ ...p, github: e.target.value.replace(/^@/, "") }));

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

  const SETTINGS_NAV = [
    { id: "profile",       label: "Profile",       icon: User      },
    { id: "appearance",    label: "Appearance",    icon: Palette   },
    { id: "notifications", label: "Notifications", icon: Bell      },
    { id: "security",      label: "Security",      icon: Lock      },
    { id: "verification",  label: "Verification",  icon: BadgeCheck},
    { id: "account",       label: "Account",       icon: Settings  },
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
          <div className="flex gap-6 items-start">

            {/* ── Left sidebar nav (desktop) ── */}
            <nav className="hidden sm:flex flex-col w-44 shrink-0 sticky top-4">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[2.5px] px-3 mb-2">Sections</p>
              {SETTINGS_NAV.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSettingsSection(s.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-left transition-all ${
                    settingsSection === s.id
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  <s.icon size={15} className="shrink-0" />
                  {s.label}
                </button>
              ))}
            </nav>

            {/* ── Right content area ── */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Mobile horizontal tabs */}
              <div className="sm:hidden flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {SETTINGS_NAV.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSettingsSection(s.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                      settingsSection === s.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    <s.icon size={11} />
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Right content area - sections */}
              <div className="flex-1 min-w-0 space-y-5">
                {/* ── PROFILE ── */}
                {settingsSection === "profile" && (
                  <Card>
                    <SectionHeader icon={User} title="Profile" subtitle="Update your public profile information." accent="blue" />

                    {/* Avatar */}
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 p-[2px] shadow-md">
                          <div className="w-full h-full rounded-[14px] bg-white dark:bg-gray-900 overflow-hidden flex items-center justify-center text-gray-700 dark:text-gray-300 text-lg font-black uppercase">
                            {avatarUrl
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                              : (editProfile.username?.substring(0, 2) || "??")}
                          </div>
                        </div>
                        {avatarUploading && (
                          <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                            <Loader2 size={18} className="animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-500/20 transition-all">
                            <Camera size={13} />
                            {avatarUploading ? "Uploading…" : "Upload Photo"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={avatarUploading}
                              onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowStickerPicker(v => !v)}
                            disabled={avatarUploading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 hover:bg-violet-500/20 transition-all disabled:opacity-50"
                          >
                            🎨 Pick Sticker
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400">Photo: JPG, PNG or GIF · Max 2 MB · Or pick a sticker avatar</p>

                        {/* Sticker picker panel */}
                        {showStickerPicker && (
                          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Choose your avatar sticker</p>
                            <div className="grid grid-cols-10 gap-1.5">
                              {STICKER_OPTIONS.map(({ emoji, bg }, i) => {
                                const [c1, c2] = bg.split(",");
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => handlePickSticker({ emoji, bg })}
                                    title={emoji}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-transform shadow-sm"
                                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Form fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Username</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold select-none">@</span>
                          <input
                            type="text"
                            value={editProfile.username}
                            onChange={(e) => setEditProfile((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                            placeholder="yourhandle"
                            className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Bio / Status</label>
                        <textarea
                          rows={2}
                          value={editProfile.status}
                          onChange={(e) => setEditProfile((p) => ({ ...p, status: e.target.value }))}
                          placeholder="e.g. Full-stack developer · building in public · open to work"
                          className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">{editProfile.status.length}/120 characters</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Website</label>
                        <div className="relative">
                          <Link2 size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="url"
                            value={editProfile.website}
                            onChange={handleWebsiteChange}
                            placeholder="https://yoursite.com"
                            className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">GitHub</label>
                        <div className="relative">
                          <AtSign size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={editProfile.github}
                            onChange={handleGithubChange}
                            placeholder="githubhandle"
                            className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Work Status</label>
                        <select
                          value={editProfile.work_status}
                        onChange={(e) => handleWorkStatusChange(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        >
                          <option value="None">Not specified</option>
                          <option value="Open to Work">Open to Work</option>
                          <option value="Hiring">Hiring</option>
                          <option value="Freelancing">Freelancing</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                      <button
                        onClick={handleSaveProfile}
                        disabled={profileSaving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-all shadow-sm shadow-blue-500/20 active:scale-95"
                      >
                        {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {profileSaving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </Card>
                )}

                {/* ── APPEARANCE ── */}
                {settingsSection === "appearance" && (
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
                )}

                {/* ── NOTIFICATIONS ── */}
                {settingsSection === "notifications" && (
                  <Card>
                    <SectionHeader icon={Bell} title="Notifications" subtitle="Control alerts and sounds." accent="purple" />
                    <RowItem title="Notification Sounds" desc="Play audio alerts for messages and calls.">
                      <button
                        onClick={toggleMute}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all
                          ${isMuted
                            ? "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"}`}
                      >
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        {isMuted ? "Muted" : "Enabled"}
                      </button>
                    </RowItem>
                  </Card>
                )}

                {/* ── SECURITY ── */}
                {settingsSection === "security" && (
                  <Card>
                    <SectionHeader icon={Lock} title="Security" subtitle="Manage your account security settings." accent="emerald" />
                    <div className="space-y-3">

                      {/* Change Email */}
                      <div className="flex flex-col gap-2">
                        <RowItem title="Email Address" desc={userEmail ? `Current: ${userEmail}` : "Manage your sign-in email."}>
                          <button
                            onClick={() => showEmailForm ? resetEmailForm() : setShowEmailForm(true)}
                            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                          >
                            <AtSign size={15} /> {showEmailForm ? "Cancel" : "Change "}
                          </button>
                        </RowItem>

                        {showEmailForm && (
                          <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-xl p-4 space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Email Address</label>
                              <div className="flex gap-2">
                                <input
                                  type="email"
                                  value={emailNew}
                                  onChange={(e) => setEmailNew(e.target.value)}
                                  placeholder="new@email.com"
                                  disabled={emailCodeSent || emailSending}
                                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                                />
                                <button
                                  onClick={handleSendEmailCode}
                                  disabled={emailSending || emailCodeSent}
                                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                                >
                                  {emailSending
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : emailCodeSent
                                      ? <CheckCircle2 size={13} />
                                      : null}
                                  {emailCodeSent ? "Code Sent" : emailSending ? "Sending…" : "Send Code"}
                                </button>
                              </div>
                            </div>

                            {emailCodeSent && (
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Verification Code</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={emailCode}
                                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                                    placeholder="000000"
                                    className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-widest text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                  />
                                  <button
                                    onClick={handleChangeEmail}
                                    disabled={emailChanging || emailCode.length !== 6}
                                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                                  >
                                    {emailChanging ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                    {emailChanging ? "Updating…" : "Verify & Update"}
                                  </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1.5">Enter the 6-digit code sent to <strong>{emailNew}</strong></p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Change Password */}
                      <div className="flex flex-col gap-2">
                        <RowItem title="Password" desc="Change your account sign-in password.">
                          <button
                            onClick={() => showPasswordForm ? resetPasswordForm() : setShowPasswordForm(true)}
                            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                          >
                            <KeyRound size={15} /> {showPasswordForm ? "Cancel" : "Change"}
                          </button>
                        </RowItem>

                        {showPasswordForm && (
                          <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-xl p-4 space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Current Password</label>
                              <div className="relative">
                                <input
                                  type={showPwCurrent ? "text" : "password"}
                                  value={pwCurrent}
                                  onChange={(e) => setPwCurrent(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 pr-11 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPwCurrent((s) => !s)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                  {showPwCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Password</label>
                              <div className="relative">
                                <input
                                  type={showPwNew ? "text" : "password"}
                                  value={pwNew}
                                  onChange={(e) => setPwNew(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 pr-11 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPwNew((s) => !s)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                  {showPwNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type={showPwConfirm ? "text" : "password"}
                                    value={pwConfirm}
                                    onChange={(e) => setPwConfirm(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 pr-11 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPwConfirm((s) => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                  >
                                    {showPwConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                                <button
                                  onClick={handleChangePassword}
                                  disabled={pwChanging || !pwCurrent || !pwNew || !pwConfirm}
                                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                                >
                                  {pwChanging ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                  {pwChanging ? "Updating…" : "Update"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <RowItem title="Two-Factor Authentication" desc="Require a one-time code from your authenticator app on sign-in.">
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
                      <RowItem title="Active Sessions" desc="View and manage devices currently signed in to your account.">
                        <button
                          onClick={() => setShowSessionsModal(true)}
                          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                        >
                          <Eye size={14} /> View Sessions
                        </button>
                      </RowItem>
                    </div>
                  </Card>
                )}

                {/* ── VERIFICATION ── */}
                {settingsSection === "verification" && (
                  <Card>
                    <SectionHeader icon={BadgeCheck} title="Account Verification" subtitle="Get the verified badge on your profile." accent="blue" />
                    <RowItem title="Verified Node Status" desc="Official verification issued by beoneofus.">
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
                )}

                {/* ── ACCOUNT ── */}
                {settingsSection === "account" && (
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
                )}
              </div>

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ADMIN TAB */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "admin" && isAdmin && (
          <div className="space-y-6">

            {/* ── Top action bar ── */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Admin Dashboard</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage users, verifications, and platform health.</p>
              </div>
              <button
                onClick={() => { setCreateUserError(""); setShowCreateUserModal(true); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md active:scale-95"
              >
                <UserPlus size={15} /> Add User
              </button>
            </div>

            {/* ── Stats grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Users,     label: "Total Users",   value: stats.total,    sub: "All registrations",     bg: "bg-blue-600",   text: "text-white" },
                { icon: Crown,     label: "Founders",      value: stats.founders, sub: "Founder accounts",      bg: "bg-amber-500",  text: "text-white" },
                { icon: UserCheck, label: "Members",       value: stats.members,  sub: "Standard accounts",     bg: "bg-violet-600", text: "text-white" },
                { icon: Award,     label: "Verified",      value: stats.verified, sub: "Badge-verified nodes",  bg: "bg-emerald-600",text: "text-white" },
              ].map(({ icon: Icon, label, value, sub, bg, text }) => (
                <div key={label} className={`${bg} rounded-2xl p-5 shadow-md`}>
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs font-bold text-white/70 uppercase tracking-widest">{label}</p>
                    <Icon size={16} className="text-white/70" />
                  </div>
                  <p className="text-3xl font-black text-white tabular-nums">
                    {value === null ? <Loader2 size={22} className="animate-spin inline" /> : value}
                  </p>
                  <p className="text-xs text-white/60 mt-1 font-medium">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── Secondary stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Pending Reviews</p>
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <Zap size={13} className="text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">
                  {stats.pending === null ? <Loader2 size={20} className="animate-spin inline text-gray-400" /> : stats.pending}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Awaiting admin review</p>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Verification Rate</p>
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <TrendingUp size={13} className="text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">
                  {stats.total && stats.verified !== null
                    ? `${Math.round((stats.verified / stats.total) * 100)}%`
                    : <Loader2 size={20} className="animate-spin inline text-gray-400" />}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Of total users verified</p>
              </div>

              <button
                onClick={() => { fetchAdminStats(); fetchRecentUsers(); showToast("Data refreshed!"); }}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <RefreshCw size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:text-blue-500 transition-colors">Refresh Data</span>
              </button>
            </div>

            {/* ── Quick actions ── */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Quick Actions</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => { setCreateUserError(""); setShowCreateUserModal(true); }}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <UserPlus size={20} /> Create User
                </button>
                <button
                  onClick={() => {
                    const pending = recentUsers.filter(u => u.verification_status === "pending");
                    if (pending.length) { pending.forEach(u => handleApproveVerification(u.id)); }
                    else showToast("No pending requests.", "error");
                  }}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <ShieldCheck size={20} /> Approve Pending
                </button>
                <button
                  onClick={() => { fetchAdminStats(); fetchRecentUsers(); showToast("Data refreshed!"); }}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <Activity size={20} /> Refresh Stats
                </button>
                <button
                  onClick={() => document.getElementById('broadcast-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <Send size={20} /> Broadcast
                </button>
              </div>
            </div>

            {/* ── Broadcast Email ── */}
            <div id="broadcast-panel" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <Send size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Broadcast Email</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Send a message to a specific group of users</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Audience selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Audience</label>
                  <div className="relative">
                    <select
                      value={broadcastForm.audience}
                      onChange={e => setBroadcastForm(f => ({ ...f, audience: e.target.value }))}
                      className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-10 text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    >
                      <option value="all">All Users</option>
                      <option value="verified">Verified Users only</option>
                      <option value="premium">Premium Members only</option>
                      <option value="member">Members only</option>
                      <option value="admin">Admins &amp; Founders only</option>
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                  </div>
                  {/* Recipient count badge */}
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {broadcastCount === null
                      ? <span className="inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Counting…</span>
                      : <span><span className="font-bold text-gray-900 dark:text-white">{broadcastCount.toLocaleString()}</span> recipient{broadcastCount !== 1 ? 's' : ''} will receive this email</span>}
                  </p>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. New feature available!"
                    value={broadcastForm.subject}
                    onChange={e => setBroadcastForm(f => ({ ...f, subject: e.target.value }))}
                    maxLength={120}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Message</label>
                  <textarea
                    placeholder={"Write your announcement here…\n\nYou can use line breaks for paragraphs."}
                    value={broadcastForm.message}
                    onChange={e => setBroadcastForm(f => ({ ...f, message: e.target.value }))}
                    rows={6}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none"
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">{broadcastForm.message.length} chars</p>
                </div>

                {/* Result banner */}
                {broadcastResult && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Sent to <strong>{broadcastResult.sent}</strong> of <strong>{broadcastResult.total}</strong> recipients
                      {broadcastResult.failed > 0 && ` · ${broadcastResult.failed} failed`}
                    </p>
                  </div>
                )}

                {/* Send / Confirm */}
                {broadcastConfirm ? (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700 rounded-xl">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex-1">
                      Send <strong>"{broadcastForm.subject || 'this email'}"</strong> to <strong>{broadcastCount?.toLocaleString() ?? '…'}</strong> users?
                    </p>
                    <button
                      onClick={handleBroadcast}
                      disabled={broadcastSending}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-60 shrink-0"
                    >
                      {broadcastSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      {broadcastSending ? 'Sending…' : 'Confirm Send'}
                    </button>
                    <button
                      onClick={() => setBroadcastConfirm(false)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (!broadcastForm.subject.trim() || !broadcastForm.message.trim()) {
                        showToast("Fill in subject and message first.", "error"); return;
                      }
                      setBroadcastConfirm(true);
                      setBroadcastResult(null);
                    }}
                    disabled={broadcastSending || !broadcastForm.subject.trim() || !broadcastForm.message.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all active:scale-[0.98]"
                  >
                    <Send size={15} /> Send Broadcast Email
                  </button>
                )}
              </div>
            </div>

            {/* ── Recent users table ── */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Recent Users</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Last 10 registered accounts</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setCreateUserError(""); setShowCreateUserModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
                  >
                    <UserPlus size={13} /> Add User
                  </button>
                  <button
                    onClick={fetchRecentUsers}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all"
                  >
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
              </div>
              <RecentUsersTable users={recentUsers} loading={usersLoading} />
            </div>

            {/* ── Pending verifications ── */}
            {stats.pending > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                    <Shield size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Pending Verifications</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Users awaiting badge approval</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {recentUsers.filter(u => u.verification_status === "pending").map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <div className={`w-9 h-9 rounded-xl ${avatarColor(u.username)} flex items-center justify-center text-sm font-black text-white shrink-0 overflow-hidden`}>
                        {u.avatar_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                          : (u.username || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">@{u.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email || u.role || "member"}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveVerification(u.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectVerification(u.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create User Modal (admin) ── */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-500/50 dark:bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateUserModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-7 animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowCreateUserModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <UserPlus size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">Create User</h3>
                <p className="text-xs text-gray-500 mt-0.5">Account is pre-verified and can sign in immediately</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={createUserForm.email}
                    onChange={e => setCreateUserForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold select-none">@</span>
                  <input
                    type="text"
                    value={createUserForm.username}
                    onChange={e => setCreateUserForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                    placeholder="handle"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "member", label: "Member", icon: User, desc: "Standard access", color: "blue" },
                    { value: "admin",  label: "Admin",  icon: Crown, desc: "Full admin access", color: "amber" },
                  ].map(({ value, label, icon: Icon, desc, color }) => {
                    const active = createUserForm.role === value;
                    const colors = {
                      blue:  { ring: "border-blue-500 bg-blue-50 dark:bg-blue-900/20", icon: "text-blue-500", dot: "bg-blue-500" },
                      amber: { ring: "border-amber-500 bg-amber-50 dark:bg-amber-900/20", icon: "text-amber-500", dot: "bg-amber-500" },
                    };
                    const c = colors[color];
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCreateUserForm(f => ({ ...f, role: value }))}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${active ? c.ring : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
                      >
                        <Icon size={16} className={active ? c.icon : "text-gray-400"} />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold ${active ? "" : "text-gray-600 dark:text-gray-400"}`}>{label}</p>
                          <p className="text-[10px] text-gray-400 truncate">{desc}</p>
                        </div>
                        {active && <div className={`ml-auto w-2 h-2 rounded-full shrink-0 ${c.dot}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Temporary Password</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showCreatePw ? "text" : "password"}
                      value={createUserForm.password}
                      onChange={e => setCreateUserForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min. 8 characters"
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-10 py-2.5 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateUserForm(f => ({ ...f, password: generatePassword() }))}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                  >
                    <RefreshCw size={12} /> Generate
                  </button>
                </div>
              </div>

              {/* Send invite toggle */}
              <div
                onClick={() => setCreateUserForm(f => ({ ...f, sendInvite: !f.sendInvite }))}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-xl cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Mail size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Send invitation email</p>
                    <p className="text-[10px] text-gray-500">Include credentials in an email to the user</p>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full transition-all shrink-0 relative ${createUserForm.sendInvite ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-700"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${createUserForm.sendInvite ? "left-4" : "left-0.5"}`} />
                </div>
              </div>

              {/* Error */}
              {createUserError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  {createUserError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCreateUserModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={createUserLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-all shadow-sm shadow-blue-500/20"
                >
                  {createUserLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {createUserLoading ? "Creating…" : "Create User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
