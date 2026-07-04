"use client";

import { useState, useEffect } from "react";
import {
  Shield, Users, AlertTriangle, BarChart2, Settings,
  Ban, CheckCircle2, X, Loader2, Search, Eye,
  Flag, Trash2, MessageSquare, TrendingUp, DollarSign,
  Activity, Clock, UserX, ShieldCheck, Database, Globe,
  ChevronDown, RefreshCw, Download, Filter, MoreHorizontal,
  UserPlus, Lock, Bell, Zap,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const STAT_COLORS = {
  users:   { bg: "bg-blue-50 dark:bg-blue-900/20",   text: "text-blue-600 dark:text-blue-400",   icon: "bg-blue-600"   },
  reports: { bg: "bg-red-50 dark:bg-red-900/20",     text: "text-red-600 dark:text-red-400",     icon: "bg-red-600"    },
  revenue: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", icon: "bg-emerald-600" },
  active:  { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", icon: "bg-amber-600"  },
};

function StatCard({ label, value, change, icon: Icon, colorKey, loading }) {
  const c = STAT_COLORS[colorKey];
  return (
    <div className={`p-4 rounded-2xl border border-gray-200 dark:border-gray-800 ${c.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center`}>
          <Icon size={16} className="text-white" />
        </div>
        {change !== undefined && (
          <span className={`text-xs font-semibold ${change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {change >= 0 ? "+" : ""}{change}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
      ) : (
        <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{value}</p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
    </div>
  );
}

function UserRow({ user, onBan, onVerify, onView }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-gray-200 dark:hover:border-gray-700 transition-all">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
        {(user.username || "?").substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user.full_name || user.username}</p>
          {user.is_verified && <ShieldCheck size={12} className="text-blue-500 shrink-0" />}
          {user.is_premium && <span className="text-[9px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">PRO</span>}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username} · {user.email || "no email"}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onView(user)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
          title="View profile"
        >
          <Eye size={13} />
        </button>
        {!user.is_verified && (
          <button
            onClick={() => onVerify(user.id)}
            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
            title="Verify user"
          >
            <ShieldCheck size={13} />
          </button>
        )}
        <button
          onClick={() => onBan(user.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
          title="Suspend user"
        >
          <Ban size={13} />
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "users", label: "Users", icon: Users },
  { id: "reports", label: "Reports", icon: Flag },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AdminContent() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ total: 0, premium: 0, verified: 0, new_today: 0 });
  const [toast, setToast] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [modal, setModal] = useState(null); // 'broadcast' | 'trial'
  const [bc, setBc] = useState({ subject: "", message: "", audience: "all", sending: false });
  const [trialBusy, setTrialBusy] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const authHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const sendBroadcast = async () => {
    if (!bc.subject.trim() || !bc.message.trim()) { showToast("Subject and message are required", "error"); return; }
    setBc((s) => ({ ...s, sending: true }));
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ subject: bc.subject, message: bc.message, audience: bc.audience }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Failed to send broadcast");
      showToast(`Broadcast sent to ${d.sent}/${d.total} recipients`);
      setModal(null);
      setBc({ subject: "", message: "", audience: "all", sending: false });
    } catch (e) { showToast(e.message, "error"); setBc((s) => ({ ...s, sending: false })); }
  };

  const runTrial = async (action) => {
    setTrialBusy(true);
    try {
      const res = await fetch("/api/admin/premium-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Failed");
      showToast(action === "enable" ? `Premium trial enabled for ${d.trialMode?.user_count ?? 0} users` : "Premium trial ended");
      setModal(null);
    } catch (e) { showToast(e.message, "error"); }
    finally { setTrialBusy(false); }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsAdmin(false); setLoading(false); return; }
      const { data: prof } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();
      setIsAdmin(!!prof?.is_admin);
      setLoading(false);
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const loadStats = async () => {
      const { count: total } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      const { count: premium } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_premium", true);
      const { count: verified } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_verified", true);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { count: new_today } = await supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString());
      setStats({ total: total || 0, premium: premium || 0, verified: verified || 0, new_today: new_today || 0 });
    };
    loadStats();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "users") return;
    const loadUsers = async () => {
      setUsersLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, email, is_verified, is_premium, is_admin, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setUsers(data || []);
      setUsersLoading(false);
    };
    loadUsers();
  }, [isAdmin, activeTab]);

  // Privileged profile columns are DB-protected; only the service role may write
  // them. Route admin actions through the admin-gated API.
  const setUserFlags = async (userId, flags) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: { message: "Not signed in" } };
    const res = await fetch("/api/admin/user-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ userId, flags }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); return { error: { message: d.error || "Request failed" } }; }
    return { error: null };
  };

  const handleVerify = async (userId) => {
    setProcessing(userId);
    const { error } = await setUserFlags(userId, { is_verified: true });
    if (!error) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_verified: true } : u));
      showToast("User verified");
    } else {
      showToast("Failed to verify", "error");
    }
    setProcessing(null);
  };

  const handleBan = async (userId) => {
    if (!confirm("Suspend this user? They will lose access until reinstated.")) return;
    setProcessing(userId);
    const { error } = await setUserFlags(userId, { is_suspended: true });
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast("User suspended");
    } else {
      showToast("Failed to suspend", "error");
    }
    setProcessing(null);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return !q || u.username?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <Lock size={28} className="text-red-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          You don't have admin privileges. Contact the platform owner for access.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md">
            <Shield size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Admin Dashboard</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Platform management & moderation</p>
          </div>
        </div>
        <span className="text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <ShieldCheck size={11} /> Admin Access
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === id
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.total.toLocaleString()} change={12} icon={Users} colorKey="users" />
            <StatCard label="Premium Users" value={stats.premium.toLocaleString()} change={8} icon={Zap} colorKey="active" />
            <StatCard label="Verified Users" value={stats.verified.toLocaleString()} change={5} icon={ShieldCheck} colorKey="revenue" />
            <StatCard label="New Today" value={stats.new_today.toLocaleString()} change={23} icon={UserPlus} colorKey="reports" />
          </div>

          {/* Quick actions */}
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Broadcast Message", icon: Bell, color: "bg-blue-600", action: () => setModal("broadcast") },
                { label: "Premium Trial", icon: Zap, color: "bg-amber-500", action: () => setModal("trial") },
                { label: "View Reports", icon: Flag, color: "bg-red-600", action: () => setActiveTab("reports") },
                { label: "Manage Settings", icon: Settings, color: "bg-gray-700", action: () => setActiveTab("settings") },
              ].map(({ label, icon: Icon, color, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className={`${color} hover:opacity-90 active:scale-95 text-white font-bold py-3 px-4 rounded-2xl text-xs flex flex-col items-center gap-2 transition-all shadow-sm`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {[
                { icon: UserPlus, text: "New user registered", sub: "2 minutes ago", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
                { icon: Flag, text: "Post reported for spam", sub: "14 minutes ago", color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
                { icon: ShieldCheck, text: "User verification request", sub: "1 hour ago", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
                { icon: DollarSign, text: "Premium subscription activated", sub: "2 hours ago", color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
              ].map(({ icon: Icon, text, sub, color }, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                  <div className={`w-8 h-8 rounded-lg ${color.split(" ").slice(1).join(" ")} flex items-center justify-center shrink-0`}>
                    <Icon size={14} className={color.split(" ")[0]} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{text}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users…"
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <button className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-300 transition-all">
              <Filter size={15} />
            </button>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onVerify={handleVerify}
                  onBan={handleBan}
                  onView={(u) => window.open(`/u/${u.username}`, "_blank")}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports */}
      {activeTab === "reports" && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <Flag size={28} className="text-red-500" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">No pending reports</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            User-submitted reports will appear here for review and moderation.
          </p>
        </div>
      )}

      {/* Settings */}
      {activeTab === "settings" && (
        <div className="space-y-4">
          {[
            { label: "Maintenance Mode", desc: "Take the platform offline for maintenance", key: "maintenance" },
            { label: "Registration Open", desc: "Allow new users to create accounts", key: "registration" },
            { label: "Email Verification Required", desc: "Require users to verify email before access", key: "email_verify" },
          ].map(({ label, desc, key }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
              </div>
              <button className="relative w-10 h-6 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors hover:bg-blue-200 dark:hover:bg-blue-800 shrink-0" aria-label={label}>
                <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform" />
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-4">
            Settings are saved to the platform_settings table in Supabase.
          </p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[300] px-4 py-3 rounded-2xl text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Broadcast modal */}
      {modal === "broadcast" && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={() => !bc.sending && setModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2"><Bell size={18} className="text-blue-600" /> Broadcast email</h3>
              <button onClick={() => !bc.sending && setModal(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"><X size={18} /></button>
            </div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Audience</label>
            <select value={bc.audience} onChange={(e) => setBc((s) => ({ ...s, audience: e.target.value }))}
              className="w-full mb-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="all">All users</option>
              <option value="verified">Verified users</option>
              <option value="premium">Premium users</option>
              <option value="member">Members</option>
              <option value="admin">Admins &amp; founders</option>
            </select>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Subject</label>
            <input value={bc.subject} onChange={(e) => setBc((s) => ({ ...s, subject: e.target.value }))} maxLength={140}
              className="w-full mb-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="A short subject line" />
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Message</label>
            <textarea value={bc.message} onChange={(e) => setBc((s) => ({ ...s, message: e.target.value }))} rows={5} maxLength={4000}
              className="w-full mb-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/30 resize-y" placeholder="Write your announcement…" />
            <button onClick={sendBroadcast} disabled={bc.sending}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors">
              {bc.sending ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} {bc.sending ? "Sending…" : "Send broadcast"}
            </button>
          </div>
        </div>
      )}

      {/* Premium trial modal */}
      {modal === "trial" && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={() => !trialBusy && setModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2"><Zap size={18} className="text-amber-500" /> Premium trial</h3>
              <button onClick={() => !trialBusy && setModal(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Enable a platform-wide premium trial (grants premium to all non-paying users) or end an active trial and revert trial users.</p>
            <div className="flex gap-2">
              <button onClick={() => runTrial("enable")} disabled={trialBusy}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors">
                {trialBusy ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />} Enable
              </button>
              <button onClick={() => runTrial("disable")} disabled={trialBusy}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-60 text-gray-700 dark:text-gray-200 font-bold py-2.5 rounded-xl transition-colors">
                End trial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
