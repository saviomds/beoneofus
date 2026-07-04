"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Terminal, Activity, Database, AlertTriangle, AlertCircle, Loader2,
  RefreshCw, CheckCircle2, ChevronDown, ChevronRight, XCircle, Check, X, Search,
  Filter, Eye, EyeOff, Trash2, UserPlus, Briefcase, BarChart3, Crown,
  Users, Award, TrendingUp, BadgeCheck, ArrowUpRight, Shield, Handshake,
  BookOpen, Mail, Hash, MessageSquare, FileText, ClipboardList, User,
  ShieldCheck, ShieldAlert, UserCog, Bot, Layers, Bell, Plus, Copy,
  Clock, MoreHorizontal, Video, Sparkles, Heart, Zap, Code2,
  Settings, Key, Globe, CreditCard, DollarSign, Save, ToggleLeft, ToggleRight,
  Webhook, Lock, Package, Star, Wrench, AlertOctagon, ExternalLink,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";
import SponsorsAdminContent from "../SponsorsAdminContent";
import VerifiedBadge from "../../../components/VerifiedBadge";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Toast, useToast, StatCard, Badge, statusColor } from "./shared";


function SystemLogsView() {
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logStats, setLogStats] = useState({ total: 0, unresolved: 0, errors: 0, warnings: 0, thisWeek: 0 });
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [resolvedFilter, setResolvedFilter] = useState("unresolved");
  const [expandedId, setExpandedId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    let query = supabase
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (levelFilter !== "all") query = query.eq("level", levelFilter);
    if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
    if (resolvedFilter === "unresolved") query = query.eq("resolved", false);
    if (resolvedFilter === "resolved") query = query.eq("resolved", true);
    const { data } = await query;
    setLogs(data || []);
    setLogsLoading(false);
  }, [levelFilter, categoryFilter, resolvedFilter]);

  const fetchLogStats = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [tot, unres, errs, warns, week] = await Promise.all([
      supabase.from("error_logs").select("id", { count: "exact", head: true }),
      supabase.from("error_logs").select("id", { count: "exact", head: true }).eq("resolved", false),
      supabase.from("error_logs").select("id", { count: "exact", head: true }).eq("level", "error"),
      supabase.from("error_logs").select("id", { count: "exact", head: true }).eq("level", "warn"),
      supabase.from("error_logs").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    ]);
    setLogStats({ total: tot.count ?? 0, unresolved: unres.count ?? 0, errors: errs.count ?? 0, warnings: warns.count ?? 0, thisWeek: week.count ?? 0 });
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchLogStats();

    supabase.from("notifications")
      .select("type, content, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { setEvents(data || []); setEventsLoading(false); });

    const ch = supabase.channel("error-logs-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "error_logs" }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 100));
        setLogStats(prev => ({
          ...prev,
          total: prev.total + 1,
          unresolved: prev.unresolved + (payload.new.resolved ? 0 : 1),
          errors: prev.errors + (payload.new.level === "error" ? 1 : 0),
          warnings: prev.warnings + (payload.new.level === "warn" ? 1 : 0),
          thisWeek: prev.thisWeek + 1,
        }));
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [fetchLogs, fetchLogStats]);

  const handleResolve = async (logId) => {
    setResolvingId(logId);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("error_logs").update({
      resolved: true,
      resolved_by: session?.user?.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", logId);
    setLogs(prev => prev.map(l => l.id === logId ? { ...l, resolved: true } : l));
    setLogStats(prev => ({ ...prev, unresolved: Math.max(0, prev.unresolved - 1) }));
    setResolvingId(null);
  };

  const levelCls = (level) => {
    if (level === "error") return "bg-red-500/10 text-red-400 border-red-500/30";
    if (level === "warn")  return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    return "bg-blue-500/10 text-blue-400 border-blue-500/30";
  };
  const catCls = (cat) => ({
    client:  "bg-violet-500/10 text-violet-400",
    react:   "bg-indigo-500/10 text-indigo-400",
    api:     "bg-cyan-500/10 text-cyan-400",
    auth:    "bg-rose-500/10 text-rose-400",
    payment: "bg-emerald-500/10 text-emerald-400",
  }[cat] || "bg-gray-800 text-gray-500");

  const CYBER_PANEL = "rounded-xl bg-gray-950 border border-white/[0.06] overflow-hidden";
  const WIN_BAR = "flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-black/40";

  return (
    <div className="space-y-4 font-mono">

      {/* ── CYBER HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gray-950 border border-cyan-500/20 p-5"
        style={{ boxShadow: "0 0 40px rgba(6,182,212,0.06), inset 0 0 60px rgba(0,0,0,0.5)" }}>
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)" }} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(6,182,212,1) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-black text-cyan-500/60 uppercase tracking-[0.35em]">beoneofus</span>
              <span className="text-gray-700 text-xs">/</span>
              <span className="text-[9px] text-gray-600 uppercase tracking-wider">sys.monitor</span>
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2.5">
              <Terminal size={17} className="text-cyan-400" />
              SYSTEM MONITOR
              <span className="inline-block w-[2px] h-5 bg-cyan-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-gray-600 mt-1.5 tracking-wider">&gt;_ real-time fault detection · auto-alerts admins on every new error event</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </div>
            <button onClick={() => { fetchLogs(); fetchLogStats(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[9px] font-black text-gray-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-widest">
              <RefreshCw size={11} /> Sync
            </button>
          </div>
        </div>
      </div>

      {/* ── HUD STATS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "TOTAL",     value: logStats.total,      icon: Database,      color: "cyan"    },
          { label: "UNRESOLVED",value: logStats.unresolved, icon: AlertTriangle, color: logStats.unresolved > 0 ? "red" : "emerald" },
          { label: "CRITICAL",  value: logStats.errors,     icon: AlertCircle,   color: "red"     },
          { label: "WARNINGS",  value: logStats.warnings,   icon: AlertTriangle, color: "amber"   },
          { label: "THIS WEEK", value: logStats.thisWeek,   icon: Activity,      color: "violet"  },
        ].map(({ label, value, icon: Icon, color }) => {
          const c = {
            cyan:    { b: "border-cyan-500/20",    t: "text-cyan-400",    s: "shadow-cyan-500/[0.07]",    bg: "bg-cyan-500/[0.04]"    },
            red:     { b: "border-red-500/20",     t: "text-red-400",     s: "shadow-red-500/[0.07]",     bg: "bg-red-500/[0.04]"     },
            emerald: { b: "border-emerald-500/20", t: "text-emerald-400", s: "shadow-emerald-500/[0.07]", bg: "bg-emerald-500/[0.04]" },
            amber:   { b: "border-amber-500/20",   t: "text-amber-400",   s: "shadow-amber-500/[0.07]",   bg: "bg-amber-500/[0.04]"   },
            violet:  { b: "border-violet-500/20",  t: "text-violet-400",  s: "shadow-violet-500/[0.07]",  bg: "bg-violet-500/[0.04]"  },
          }[color];
          return (
            <div key={label} className={`relative rounded-xl bg-gray-950 border ${c.b} p-3 shadow-lg ${c.s} overflow-hidden`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${c.t}`}>{label}</span>
                <Icon size={11} className={c.t} />
              </div>
              <p className={`text-2xl font-black tabular-nums leading-none ${c.t}`}>
                {logsLoading ? <Loader2 size={16} className="animate-spin" /> : (value ?? 0).toLocaleString()}
              </p>
              <div className={`absolute bottom-0 left-0 right-0 h-px ${c.bg}`} />
            </div>
          );
        })}
      </div>

      {/* ── FILTER TERMINAL ── */}
      <div className={`${CYBER_PANEL} p-3`}>
        <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.2em] mb-2.5">&gt;_ filter --flags</p>
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[9px] text-gray-700 shrink-0">--level</span>
          {["all", "error", "warn", "info"].map(l => (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border transition-all
                ${levelFilter === l ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-transparent text-gray-600 border-gray-800 hover:border-gray-600 hover:text-gray-400"}`}>
              {l}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-800 mx-0.5" />
          <span className="text-[9px] text-gray-700 shrink-0">--src</span>
          {["all", "client", "react", "api", "auth", "payment"].map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border transition-all
                ${categoryFilter === c ? "bg-violet-500/20 text-violet-300 border-violet-500/40" : "bg-transparent text-gray-600 border-gray-800 hover:border-gray-600 hover:text-gray-400"}`}>
              {c}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-800 mx-0.5" />
          <span className="text-[9px] text-gray-700 shrink-0">--status</span>
          {["unresolved", "resolved", "all"].map(r => (
            <button key={r} onClick={() => setResolvedFilter(r)}
              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border transition-all
                ${resolvedFilter === r ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-transparent text-gray-600 border-gray-800 hover:border-gray-600 hover:text-gray-400"}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── LOG TERMINAL WINDOW ── */}
      <div className={CYBER_PANEL}>
        <div className={WIN_BAR}>
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
          </div>
          <span className="text-[10px] text-gray-600 ml-2">error_logs — {logs.length} entries</span>
        </div>

        <div className="divide-y divide-white/[0.03] max-h-[520px] overflow-y-auto">
          {logsLoading ? (
            <div className="py-14 flex flex-col items-center gap-3">
              <Loader2 size={18} className="animate-spin text-cyan-500" />
              <p className="text-[9px] text-gray-600 tracking-[0.2em] uppercase">scanning fault data...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 size={26} className="mx-auto text-emerald-500 mb-3" />
              <p className="text-sm font-black text-emerald-400 tracking-widest">ALL SYSTEMS NOMINAL</p>
              <p className="text-[9px] text-gray-600 mt-1 tracking-wider">no faults detected · filter range clean</p>
            </div>
          ) : logs.map((log, idx) => {
            const open = expandedId === log.id;
            const prefix  = { error: "[ERR]", warn: "[WRN]", info: "[INF]" }[log.level] || "[LOG]";
            const prefixT = { error: "text-red-400", warn: "text-amber-400", info: "text-blue-400" }[log.level] || "text-gray-500";
            const leftBar = { error: "border-l-red-500/60", warn: "border-l-amber-500/50", info: "border-l-blue-500/30" }[log.level] || "border-l-gray-800";
            return (
              <div key={log.id} className={`border-l-2 ${leftBar} transition-all ${log.resolved ? "opacity-35" : ""}`}>
                <button onClick={() => setExpandedId(open ? null : log.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/[0.025] transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`text-[10px] font-black shrink-0 ${prefixT}`}>{prefix}</span>
                    <span className="text-[9px] text-gray-700 shrink-0 tabular-nums">{String(idx + 1).padStart(3, "0")}</span>
                    {log.count > 1 && (
                      <span className="text-[8px] font-black text-gray-600 shrink-0 bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700/60">×{log.count}</span>
                    )}
                    <span className="text-[11px] text-gray-200 truncate flex-1">{log.message}</span>
                    <span className="text-[9px] text-gray-700 shrink-0 tabular-nums">{new Date(log.created_at).toLocaleTimeString([], { hour12: false })}</span>
                    {log.resolved && <span className="text-[8px] font-black text-emerald-500 shrink-0 tracking-widest font-sans">✓ PATCHED</span>}
                    <ChevronDown size={11} className={`text-gray-700 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                  </div>
                  <div className="flex items-center gap-2 mt-1 pl-[60px] flex-wrap">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-px rounded border font-sans ${levelCls(log.level)}`}>{log.level}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-px rounded font-sans ${catCls(log.category)}`}>{log.category || "client"}</span>
                    {log.url && <span className="text-[9px] text-gray-700 truncate max-w-[180px]">{log.url.replace(/^https?:\/\/[^/]+/, "")}</span>}
                  </div>
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-2 bg-black/50 border-t border-white/[0.04] space-y-3">
                    {log.stack && (
                      <div>
                        <p className="text-[8px] font-black text-red-500/50 uppercase tracking-[0.2em] mb-1.5 font-sans">&gt;_ STACK TRACE</p>
                        <pre className="text-[9px] text-red-400/80 bg-red-950/20 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-red-900/20 max-h-48">{log.stack}</pre>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[9px] pl-1">
                      {log.user_id && (
                        <div className="flex gap-2"><span className="text-gray-700 shrink-0">uid</span><span className="text-cyan-400/80">{log.user_id.slice(0, 12)}…</span></div>
                      )}
                      {log.component && (
                        <div className="flex gap-2"><span className="text-gray-700 shrink-0">cmp</span><span className="text-violet-400/80">{log.component}</span></div>
                      )}
                      {log.last_seen_at && (
                        <div className="flex gap-2"><span className="text-gray-700 shrink-0">last</span><span className="text-gray-500">{new Date(log.last_seen_at).toLocaleString()}</span></div>
                      )}
                      {log.user_agent && (
                        <div className="flex gap-2 col-span-2"><span className="text-gray-700 shrink-0">ua</span><span className="text-gray-600">{String(log.user_agent).slice(0, 90)}</span></div>
                      )}
                    </div>
                    {!log.resolved && (
                      <button onClick={() => handleResolve(log.id)} disabled={resolvingId === log.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black rounded-lg transition-all hover:bg-emerald-500/20 disabled:opacity-40 uppercase tracking-widest font-sans">
                        {resolvingId === log.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                        PATCH · Mark Resolved
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ACTIVITY FEED TERMINAL ── */}
      <div className={CYBER_PANEL}>
        <div className={WIN_BAR}>
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
          </div>
          <span className="text-[10px] text-gray-600 ml-2">platform_activity</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest font-sans">live</span>
          </div>
        </div>
        {eventsLoading ? (
          <div className="py-6 flex justify-center"><Loader2 size={14} className="animate-spin text-cyan-500" /></div>
        ) : events.length === 0 ? (
          <p className="text-[9px] text-gray-700 text-center py-8">// no recent activity</p>
        ) : (
          <div className="divide-y divide-white/[0.02] max-h-44 overflow-y-auto">
            {events.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] text-cyan-600/60 shrink-0">&gt;</span>
                <span className="text-[8px] font-black text-cyan-500/70 uppercase tracking-wider shrink-0 font-sans">{ev.type?.replace(/_/g, ".")}</span>
                <span className="text-[10px] text-gray-500 truncate flex-1">{ev.content?.slice(0, 70)}</span>
                <span className="text-[9px] text-gray-700 tabular-nums shrink-0">{new Date(ev.created_at).toLocaleTimeString([], { hour12: false })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


const AdminPanelTool = ({ currentUserId }) => {
  const searchParams = useSearchParams();
  const [adminTab, setAdminTab] = useState(searchParams?.get("tab") || "overview");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, showToast] = useToast();
  const [actionProcessing, setActionProcessing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Stats
  const [stats, setStats] = useState({ total: null, founders: null, members: null, verified: null, pending: null, admins: null, premium: null, premiumReq: null, pageViews: null });
  const [statsLoading, setStatsLoading] = useState(false);

  // Requests
  const [requests, setRequests] = useState([]);

  // Users
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [usersFetched, setUsersFetched] = useState(false);
  const [usersPage, setUsersPage] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const USERS_PER_PAGE = 50;

  // Premium subscriptions
  const [premiumSubs, setPremiumSubs] = useState([]);
  const [premiumSubsLoading, setPremiumSubsLoading] = useState(false);
  const [premiumFilter, setPremiumFilter] = useState("pending_review");
  const [reviewingSubId, setReviewingSubId] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [aiReviewing, setAiReviewing] = useState(null); // subId being AI reviewed
  const [premiumActionLoading, setPremiumActionLoading] = useState(null);

  // AI Logs
  const [aiLogs, setAiLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Applications
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  // Map of "applicant_id_job_id" → interview_room for accepted applications
  const [interviewRoomMap, setInterviewRoomMap] = useState({});

  // Founder Apps
  const [founderApps, setFounderApps] = useState([]);
  const [founderAppsLoading, setFounderAppsLoading] = useState(false);
  const [selectedFounderApp, setSelectedFounderApp] = useState(null);

  // Tasks
  const [adminTasks, setAdminTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState(null);
  const [showUserDeleteConfirm, setShowUserDeleteConfirm] = useState(null);
  const [showAdminToggleConfirm, setShowAdminToggleConfirm] = useState(null);
  const [showPremiumToggleConfirm, setShowPremiumToggleConfirm] = useState(null);
  const [trialMode, setTrialMode] = useState({ active: false, expires_at: null, user_count: 0 });
  const [trialLoading, setTrialLoading] = useState(false);
  const [showTrialConfirm, setShowTrialConfirm] = useState(null);
  const [trialCountdown, setTrialCountdown] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false });

  useEffect(() => {
    if (!trialMode.active || !trialMode.expires_at) return;
    let autoExpired = false;
    const tick = async () => {
      const diff = new Date(trialMode.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setTrialCountdown({ d: 0, h: 0, m: 0, s: 0, expired: true });
        if (!autoExpired) {
          autoExpired = true;
          // Trial has expired client-side — call the API to revert all trial users
          const { data: { session } } = await supabase.auth.getSession();
          await fetch("/api/admin/premium-trial", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ action: "disable" }),
          });
          setTrialMode({ active: false, expires_at: null, user_count: 0 });
          showToast("Freemium trial has expired — all trial users reverted to free tier.");
        }
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTrialCountdown({ d, h, m, s, expired: false });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [trialMode.active, trialMode.expires_at]);
  const [taskForm, setTaskForm] = useState({ assignee_id: "", title: "", description: "", priority: "Medium", linked_to: "" });
  const [taskFilter, setTaskFilter] = useState("All");
  const [teamMembers, setTeamMembers] = useState([]);

  // Free-form interview modal (Interviews tab — any user)
  const [showFreeInterviewModal, setShowFreeInterviewModal] = useState(false);
  const [freeInterviewUserSearch, setFreeInterviewUserSearch] = useState("");
  const [freeInterviewSearchResults, setFreeInterviewSearchResults] = useState([]);
  const [freeInterviewSelectedUser, setFreeInterviewSelectedUser] = useState(null);
  const [freeInterviewJobTitle, setFreeInterviewJobTitle] = useState("");
  const [freeInterviewCompany, setFreeInterviewCompany] = useState("");
  const [freeInterviewQuestions, setFreeInterviewQuestions] = useState([{ text: "", context: "" }]);
  const [freeInterviewCreating, setFreeInterviewCreating] = useState(false);
  const [freeInterviewSearching, setFreeInterviewSearching] = useState(false);

  const searchUsersForInterview = async (query) => {
    setFreeInterviewUserSearch(query);
    if (!query.trim()) { setFreeInterviewSearchResults([]); return; }
    setFreeInterviewSearching(true);
    const { data } = await supabase.from("profiles")
      .select("id, username, avatar_url, is_verified")
      .ilike("username", `%${query}%`)
      .limit(6);
    setFreeInterviewSearchResults(data || []);
    setFreeInterviewSearching(false);
  };

  const handleFreeInterviewCreate = async () => {
    if (!freeInterviewSelectedUser) { showToast("Select a user first.", "error"); return; }
    const validQs = freeInterviewQuestions.filter(q => q.text.trim());
    if (!validQs.length) { showToast("Add at least one question.", "error"); return; }
    setFreeInterviewCreating(true);
    try {
      const res = await fetch("/api/interview/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUserId,
          applicantId: freeInterviewSelectedUser.id,
          jobTitle: freeInterviewJobTitle || "Interview",
          company: freeInterviewCompany,
          questions: validQs,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      showToast(`Interview room created for @${freeInterviewSelectedUser.username}.`);
      setShowFreeInterviewModal(false);
      setFreeInterviewSelectedUser(null);
      setFreeInterviewUserSearch("");
      setFreeInterviewSearchResults([]);
      setFreeInterviewJobTitle("");
      setFreeInterviewCompany("");
      setFreeInterviewQuestions([{ text: "", context: "" }]);
      setInterviewRooms([]); // trigger refetch
    } catch (err) { showToast(err.message, "error"); }
    finally { setFreeInterviewCreating(false); }
  };

  // Interview creation modal (from Applications tab)
  const [interviewTarget, setInterviewTarget] = useState(null); // { applicantId, jobId, jobTitle, company }
  const [interviewQuestions, setInterviewQuestions] = useState([{ text: "", context: "" }]);
  const [creatingInterview, setCreatingInterview] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  const openInterviewModal = (app) => {
    setInterviewTarget({ applicantId: app.user_id, jobId: app.job_id, jobTitle: app.jobs?.title || "", company: app.jobs?.company || "" });
    setInterviewQuestions([{ text: "", context: "" }]);
    setShowInterviewModal(true);
  };

  const handleCreateInterview = async () => {
    const validQs = interviewQuestions.filter(q => q.text.trim());
    if (!validQs.length) { showToast("Add at least one question.", "error"); return; }
    setCreatingInterview(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/interview/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: currentUserId, applicantId: interviewTarget.applicantId, jobId: interviewTarget.jobId, jobTitle: interviewTarget.jobTitle, company: interviewTarget.company, questions: validQs }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      showToast("Interview room created & invite sent.");
      setShowInterviewModal(false);
      // Update interview room map so card reflects the new room immediately
      if (json.roomId && interviewTarget) {
        setInterviewRoomMap(prev => ({
          ...prev,
          [`${interviewTarget.applicantId}_${interviewTarget.jobId}`]: {
            id: json.roomId,
            status: 'active',
            overall_score: null,
            applicant_id: interviewTarget.applicantId,
            job_id: interviewTarget.jobId,
          },
        }));
      }
      // Refresh rooms list if on interviews tab
      setInterviewRooms([]);
    } catch (err) { showToast(err.message, "error"); }
    finally { setCreatingInterview(false); }
  };

  // Interviews
  const [interviewRooms, setInterviewRooms] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [interviewStatusFilter, setInterviewStatusFilter] = useState("all");
  const [expandedRoomId, setExpandedRoomId] = useState(null);
  const [roomAnswers, setRoomAnswers] = useState({});
  const [deletingRoomId, setDeletingRoomId] = useState(null);
  const [confirmDeleteAllRooms, setConfirmDeleteAllRooms] = useState(false);
  const [deletingAllRooms, setDeletingAllRooms] = useState(false);

  // Invite
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // Action prompt
  const [actionPrompt, setActionPrompt] = useState(null);
  const [customMessage, setCustomMessage] = useState("");

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;
    const init = async () => {
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", currentUserId).single();
      if (data?.is_admin) {
        setIsAdmin(true);
        // Also fetch pending requests immediately
        const { data: reqs } = await supabase.from("profiles")
          .select("id, username, avatar_url, status").eq("verification_status", "pending");
        setRequests(reqs || []);
        const [{ data: trialSetting }, { count: trialCount }] = await Promise.all([
          supabase.from("platform_settings").select("value").eq("key", "premium_trial").single(),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_trial_premium", true),
        ]);
        if (trialSetting?.value) setTrialMode({ ...trialSetting.value, user_count: trialCount ?? 0 });
      }
      setLoading(false);
    };
    init();
  }, [currentUserId]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    setStatsLoading(true);
    try {
      const [total, founders, members, verified, pending, admins, premium, premiumReq, pageViewsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "founder"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_admin", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_premium", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("premium_requested", true),
        supabase.from("platform_stats").select("value").eq("key", "page_views").single(),
      ]);
      setStats({
        total: total.count ?? 0,
        founders: founders.count ?? 0,
        members: members.count ?? 0,
        verified: verified.count ?? 0,
        pending: pending.count ?? 0,
        admins: admins.count ?? 0,
        premium: premium.count ?? 0,
        premiumReq: premiumReq.count ?? 0,
        pageViews: pageViewsRes.data?.value ?? 0,
      });
    } finally {
      setStatsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && adminTab === "overview") {
      const timer = setTimeout(() => fetchStats(), 0);
      return () => clearTimeout(timer);
    }
  }, [isAdmin, adminTab, fetchStats]);

  // Auto-refresh visits every 30 seconds while on overview tab
  useEffect(() => {
    if (adminTab !== "overview" || !isAdmin) return;
    const interval = setInterval(() => {
      supabase.from("platform_stats").select("value").eq("key", "page_views").single()
        .then(({ data }) => {
          if (data) setStats(prev => ({ ...prev, pageViews: data.value }));
        });
    }, 30000);
    return () => clearInterval(interval);
  }, [adminTab, isAdmin]);

  // ── Users ───────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (page = 0, append = false) => {
    setUsersLoading(true);
    const from = page * USERS_PER_PAGE;
    const to = from + USERS_PER_PAGE - 1;

    const { data, error } = await supabase.from("profiles")
      .select("id, username, avatar_url, status, is_verified, is_admin, is_premium, is_trial_premium, premium_requested, role")
      .range(from, to);
    if (!error) {
      if (append) {
        setAllUsers(prev => {
          // Filter to ensure no duplicates if real-time subscriptions also fired
          const newUsers = (data || []).filter(d => !prev.some(p => p.id === d.id));
          return [...prev, ...newUsers];
        });
      }
      else setAllUsers(data || []);
      setHasMoreUsers((data || []).length === USERS_PER_PAGE);
      setUsersPage(page);
    } else {
      console.error("Error fetching users:", error.message);
    }
    setUsersFetched(true);
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin && !usersFetched && !usersLoading) {
      const timer = setTimeout(() => fetchUsers(0, false), 0);
      return () => clearTimeout(timer);
    }
  }, [isAdmin, usersFetched, usersLoading, fetchUsers]);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase.channel("admin-profiles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setAllUsers(prev => [payload.new, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setAllUsers(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u));
        } else if (payload.eventType === "DELETE") {
          setAllUsers(prev => prev.filter(u => u.id !== payload.old.id));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  // ── Premium Subscriptions ────────────────────────────────────────────────────
  useEffect(() => {
    if (adminTab !== "premium_subs" || !isAdmin) return;
    const fetch = async () => {
      setPremiumSubsLoading(true);
      const { data } = await supabase
        .from("premium_subscriptions")
        .select("*, profiles!premium_subscriptions_user_id_fkey(id, username, avatar_url, status, is_verified, is_premium)")
        .order("created_at", { ascending: false });
      if (data) setPremiumSubs(data);
      setPremiumSubsLoading(false);
    };
    fetch();
  }, [adminTab, isAdmin]);

  const handlePremiumAction = async (subId, action, note = "") => {
    setPremiumActionLoading(`${subId}-${action}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/premium/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ subscriptionId: subId, action, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (action === "ai_review") {
        setPremiumSubs(prev => prev.map(s => s.id === subId ? { ...s, ai_review: json.aiReview } : s));
        setAiReviewing(null);
        showToast("AI review complete.");
      } else {
        setPremiumSubs(prev => prev.map(s => s.id === subId ? { ...s, status: json.status, review_note: note } : s));
        setReviewingSubId(null);
        setReviewNote("");
        showToast(action === "accept" ? "Premium activated for user." : "Request declined.");
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setPremiumActionLoading(null);
    }
  };

  // ── AI Logs ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (adminTab !== "ai_logs" || !isAdmin || aiLogs.length > 0) return;
    const fetch = async () => {
      setLogsLoading(true);
      const { data } = await supabase.from("ai_chat_messages")
        .select("role, content, created_at, user_id").order("created_at", { ascending: false }).limit(100);
      if (data) {
        const ids = [...new Set(data.map(l => l.user_id).filter(Boolean))];
        const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, is_verified").in("id", ids);
        const map = (profiles || []).reduce((a, p) => ({ ...a, [p.id]: p }), {});
        setAiLogs(data.map(l => ({ ...l, profiles: map[l.user_id] || null })));
      }
      setLogsLoading(false);
    };
    fetch();
  }, [adminTab, isAdmin, aiLogs.length]);

  // ── Applications ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (adminTab !== "applications" || !isAdmin || applications.length > 0) return;
    const fetch = async () => {
      setAppsLoading(true);
      const { data } = await supabase.from("job_applications")
        .select("*, jobs(id, title, company), profiles(username, avatar_url, is_verified, github, website, location, status, work_status)")
        .order("created_at", { ascending: false }).limit(200);
      if (data) {
        const unique = data.reduce((acc, cur) => {
          const dup = acc.find(i => i.user_id === cur.user_id && i.job_id === cur.job_id);
          return dup ? acc : [...acc, cur];
        }, []);
        setApplications(unique);
      }
      setAppsLoading(false);
    };
    fetch();
  }, [adminTab, isAdmin, applications.length]);

  // Always refresh interview room map when Applications tab is opened (not cached)
  useEffect(() => {
    if (adminTab !== "applications" || !isAdmin || !currentUserId) return;
    supabase.from("interview_rooms")
      .select("id, status, overall_score, applicant_id, job_id")
      .eq("admin_id", currentUserId)
      .then(({ data: rooms }) => {
        if (!rooms) return;
        const map = {};
        rooms.forEach(r => {
          // index by applicant+job (primary key) AND by applicant alone as fallback
          map[`${r.applicant_id}_${r.job_id}`] = r;
          if (!map[`${r.applicant_id}_only`]) map[`${r.applicant_id}_only`] = r;
        });
        setInterviewRoomMap(map);
      });
  }, [adminTab, isAdmin, currentUserId]);

  // ── Founder Apps ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (adminTab !== "founder_apps" || !isAdmin || founderApps.length > 0) return;
    const fetch = async () => {
      setFounderAppsLoading(true);
      const { data, error } = await supabase.from("founder_applications")
        .select("*").order("created_at", { ascending: false }).limit(200);
      if (error) { showToast("DB Error: " + error.message, "error"); setFounderAppsLoading(false); return; }
      if (data) {
        const ids = [...new Set(data.map(a => a.user_id).filter(Boolean))];
        if (ids.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, is_verified").in("id", ids);
          const map = (profiles || []).reduce((a, p) => ({ ...a, [p.id]: p }), {});
          setFounderApps(data.map(a => ({ ...a, profiles: map[a.user_id] || null })));
        } else {
          setFounderApps(data);
        }
      }
      setFounderAppsLoading(false);
    };
    fetch();
  }, [adminTab, isAdmin, founderApps.length, showToast]);

  // ── Tasks ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (adminTab !== "tasks" || !isAdmin) return;
    let channel;
    const fetchTasks = async () => {
      setTasksLoading(true);
      const { data } = await supabase.from("tasks").select(`
        *, assignee:profiles!tasks_assignee_id_fkey(username, avatar_url, status),
        assigner:profiles!tasks_assigner_id_fkey(username, avatar_url, status)
      `).order("created_at", { ascending: false });
      if (data) setAdminTasks(data);
      setTasksLoading(false);
    };
    const fetchTeam = async () => {
      const { data } = await supabase.from("founder_applications").select("user_id, intended_role, name").eq("status", "accepted");
      if (data) setTeamMembers(data.reduce((acc, m) => acc.find(x => x.user_id === m.user_id) ? acc : [...acc, m], []));
    };
    fetchTasks();
    fetchTeam();
    channel = supabase.channel("admin-tasks").on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetchTasks).subscribe();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [adminTab, isAdmin]);

  // ── Interviews ───────────────────────────────────────────────────────────────
  const fetchRooms = async () => {
    setInterviewsLoading(true);
    const { data } = await supabase
      .from("interview_rooms")
      .select("id, job_title, company, status, overall_score, created_at, applicant_id, questions, coding_challenge, profiles!interview_rooms_applicant_id_fkey(username, avatar_url)")
      .order("created_at", { ascending: false });
    if (data) setInterviewRooms(data);
    setInterviewsLoading(false);
  };

  useEffect(() => {
    if (adminTab !== "interviews" || !isAdmin) return;
    fetchRooms();
    const channel = supabase
      .channel("admin-interview-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "interview_rooms" }, (payload) => {
        if (payload.eventType === "UPDATE") {
          setInterviewRooms(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r));
        } else if (payload.eventType === "INSERT") {
          fetchRooms();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [adminTab, isAdmin]);

  const fetchRoomAnswers = async (roomId) => {
    if (roomAnswers[roomId]) {
      setExpandedRoomId(prev => prev === roomId ? null : roomId);
      return;
    }
    const { data } = await supabase
      .from("interview_answers")
      .select("question_index, question_text, answer_text, ai_score, ai_feedback, strengths, improvements")
      .eq("room_id", roomId)
      .order("question_index");
    setRoomAnswers(prev => ({ ...prev, [roomId]: data || [] }));
    setExpandedRoomId(roomId);
  };

  const handleDeleteRoom = async (roomId) => {
    setDeletingRoomId(roomId);
    await supabase.from("interview_answers").delete().eq("room_id", roomId);
    await supabase.from("interview_rooms").delete().eq("id", roomId);
    setInterviewRooms(prev => prev.filter(r => r.id !== roomId));
    setDeletingRoomId(null);
  };

  const handleDeleteAllRooms = async (ids) => {
    setDeletingAllRooms(true);
    if (ids.length) {
      await supabase.from("interview_answers").delete().in("room_id", ids);
      await supabase.from("interview_rooms").delete().in("id", ids);
    }
    setInterviewRooms([]);
    setDeletingAllRooms(false);
    setConfirmDeleteAllRooms(false);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleBulkDelete = async () => {
    if (selectedUserIds.size === 0) return;
    setActionProcessing(true);
    try {
      const ids = Array.from(selectedUserIds);
      const { error } = await supabase.from("profiles")
        .delete()
        .in("id", ids);
      if (error) throw error;
      showToast(`Purged ${ids.length} users from the network.`);
      setAllUsers(prev => prev.filter(u => !selectedUserIds.has(u.id)));
      setSelectedUserIds(new Set());
      setBulkMode(false);
      fetchStats();
    } catch (err) { showToast(err.message, "error"); }
    finally { setActionProcessing(false); setShowBulkDeleteConfirm(false); }
  };

  // Moved to the top of handlers to resolve ReferenceError
  const handleRemoveVerification = async (userId, username) => {
    if (actionProcessing) return;
    setActionProcessing(true);
    try {
      const { error } = await supabase.from("profiles")
        .update({ is_verified: false, verification_status: "unverified" })
        .eq("id", userId);
      if (error) throw error;
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: false, verification_status: "unverified" } : u));
      showToast(`Verification removed from @${username}.`);
      fetchStats();
    } catch (err) { showToast(err.message, "error"); }
    finally { setActionProcessing(false); }
  };

  const handleBulkVerify = async () => {
    if (selectedUserIds.size === 0) return;
    setActionProcessing(true);
    try {
      const ids = Array.from(selectedUserIds);
      const { error } = await supabase.from("profiles")
        .update({ is_verified: true, verification_status: "verified" })
        .in("id", ids);
      if (error) throw error;
      showToast(`Verified ${ids.length} users successfully.`);
      setAllUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, is_verified: true, verification_status: "verified" } : u));
      setSelectedUserIds(new Set());
      setBulkMode(false);
      fetchStats();
    } catch (err) { showToast(err.message, "error"); }
    finally { setActionProcessing(false); }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleVerification = async (userId, action) => {
    try {
      const updates = action === "approve"
        ? { is_verified: true, verification_status: "verified" }
        : { is_verified: false, verification_status: "unverified" };
      const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
      if (error) throw error;
      setRequests(prev => prev.filter(r => r.id !== userId));
      await supabase.from("notifications").insert({
        receiver_id: userId, actor_id: currentUserId,
        type: action === "approve" ? "handshake" : "blocked",
        content: action === "approve" ? "approved your verification request!" : "denied your verification request."
      });
      showToast(`Verification ${action === "approve" ? "approved" : "denied"}.`);
      fetchStats();
    } catch (err) { showToast(err.message, "error"); }
  };

  const handleToggleAdmin = async (userId, isAdm, username) => {
    setActionProcessing(true);
    try {
      const { error } = await supabase.from("profiles").update({ is_admin: !isAdm }).eq("id", userId);
      if (error) throw error;
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !isAdm } : u));
      showToast(`Admin ${isAdm ? "revoked" : "granted"} for @${username}.`);
    } catch (err) { showToast(err.message, "error"); }
    finally { setActionProcessing(false); }
  };

  const handleTogglePremium = async (userId, isPrem, username) => {
    setActionProcessing(true);
    try {
      const { error } = await supabase.from("profiles")
        .update({ is_premium: !isPrem, premium_requested: false })
        .eq("id", userId);
      if (error) throw error;
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_premium: !isPrem, premium_requested: false } : u));
      showToast(`Premium ${isPrem ? "revoked" : "granted"} for @${username}.`);
    } catch (err) { showToast(err.message, "error"); }
    finally { setActionProcessing(false); }
  };

  const handleTrialMode = async (action) => {
    setTrialLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/premium-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setTrialMode(json.trialMode);
      fetchStats();
      showToast(action === "enable" ? "Premium trial activated for all users." : "Premium trial deactivated.");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setTrialLoading(false);
      setShowTrialConfirm(null);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    setActionProcessing(true);
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
      setAllUsers(prev => prev.filter(u => u.id !== userId));
      showToast(`@${username} deleted.`);
      fetchStats();
    } catch (err) { showToast(err.message, "error"); }
    finally { setActionProcessing(false); }
  };

  const handleImpersonateUser = async (userId, username) => {
    if (!confirm(`Impersonate @${username}? You will be logged out.`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("impersonate", { body: { userId } });
      if (error || data?.error) throw new Error(error?.message || data?.error || "Unknown error");
      if (data?.action_link) { showToast(`Logging in as @${username}…`); window.location.href = data.action_link; }
      else throw new Error("No action link returned.");
    } catch (err) { showToast(err.message, "error"); }
  };

  const submitActionPrompt = async () => {
    setActionProcessing(true);
    const { type, appId, newStatus, applicantId, title } = actionPrompt;
    const table = type === "job" ? "job_applications" : "founder_applications";
    try {
      const { error } = await supabase.from(table).update({ status: newStatus }).eq("id", appId);
      if (error) throw error;
      let content = `Your ${type === "job" ? "job" : ""} application for ${title || "a role"} was ${newStatus}.`;
      if (customMessage) content += ` Note: "${customMessage}"`;
      await supabase.from("notifications").insert({ receiver_id: applicantId, actor_id: currentUserId, type: "message", content });

      // Email hooks
      const endpoint = type === "job" ? "/api/send-app-email" : "/api/notify-applicant";
      try {
        await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: appId, applicantId, status: newStatus, jobTitle: title, role: title, customMessage }) });
      } catch { /* non-blocking */ }

      if (type === "job") {
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        if (selectedApp?.id === appId) setSelectedApp(prev => ({ ...prev, status: newStatus }));
      } else {
        setFounderApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        if (selectedFounderApp?.id === appId) setSelectedFounderApp(prev => ({ ...prev, status: newStatus }));
      }
      showToast(`Application ${newStatus}.`);
    } catch (err) { showToast(err.message, "error"); }
    finally { setActionProcessing(false); setActionPrompt(null); }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    setActionProcessing(true);
    try {
      const { data, error } = await supabase.from("tasks").insert({
        assignee_id: taskForm.assignee_id, assigner_id: currentUserId,
        title: taskForm.title, description: taskForm.description,
        priority: taskForm.priority, linked_to: taskForm.linked_to, status: "pending"
      }).select(`*, assignee:profiles!tasks_assignee_id_fkey(username, avatar_url, status),
        assigner:profiles!tasks_assigner_id_fkey(username, avatar_url, status)`).single();
      if (error) throw error;
      setAdminTasks(prev => [data, ...prev]);
      await supabase.from("notifications").insert({
        receiver_id: taskForm.assignee_id, actor_id: currentUserId,
        type: "message", content: `assigned you a task: ${taskForm.title}`
      });
      setShowTaskModal(false);
      setTaskForm({ assignee_id: "", title: "", description: "", priority: "Medium", linked_to: "" });
      showToast("Task assigned!");
    } catch (err) { showToast(err.message, "error"); }
    finally { setActionProcessing(false); }
  };

  const handleComplexUpdate = async (taskId, newStatus) => {
    setActionProcessing(true);
    try {
      const { error } = await supabase.rpc("update_task_complex", { p_task_id: taskId, p_new_status: newStatus });
      if (error) throw error;
      setAdminTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      showToast("Task updated!");
    } catch (err) { showToast(err.message, "error"); }
    finally { setActionProcessing(false); }
  };

  const handleSendInvite = async () => {
    const target = allUsers.find(u => u.username?.toLowerCase() === inviteSearch.toLowerCase());
    if (!target) { showToast("Select a valid user.", "error"); return; }
    setActionProcessing(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        receiver_id: target.id, actor_id: currentUserId, type: "message",
        content: `invited you to apply as a ${inviteRole === "cofounder" ? "Co-founder" : "Member"}! /member/application`
      });
      if (error) throw error;
      showToast(`Invite sent to @${target.username}!`);
      setShowInviteModal(false);
      setInviteSearch("");
    } catch (err) { showToast(err.message, "error"); }
    finally { setActionProcessing(false); }
  };

  const getReasonObj = (r) => {
    if (!r) return {};
    if (typeof r === "string") { try { return JSON.parse(r); } catch { return { Responses: r }; } }
    return r;
  };

  const TABS = [
    { id: "overview",     label: "Overview",     icon: BarChart3   },
    { id: "requests",     label: "Requests",     icon: Bell        },
    { id: "premium_subs", label: "Premium",      icon: Crown       },
    { id: "users",        label: "Users",        icon: Users       },
    { id: "ai_logs",      label: "AI Logs",      icon: Bot         },
    { id: "applications", label: "Applications", icon: Briefcase   },
    { id: "founder_apps", label: "Founder Apps", icon: Crown       },
    { id: "tasks",        label: "Tasks",        icon: ClipboardList },
    { id: "interviews",   label: "Interviews",   icon: Video         },
    { id: "sponsors",     label: "Sponsors",     icon: Handshake     },
    { id: "system_logs",  label: "System Logs",  icon: Terminal      },
    { id: "settings",     label: "Settings",     icon: Shield        },
  ];

  if (loading) return <div className="p-16 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>;

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center h-full p-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center mb-5">
        <ShieldAlert size={28} className="text-red-400" />
      </div>
      <p className="text-gray-900 dark:text-white font-black text-lg mb-1.5">Access Denied</p>
      <p className="text-gray-400 dark:text-gray-600 text-sm max-w-xs leading-relaxed">Your node lacks admin clearance to access this control terminal.</p>
    </div>
  );

  const handleDeleteTask = async (taskId) => {
    setActionProcessing(true);
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      setAdminTasks(prev => prev.filter(t => t.id !== taskId));
      showToast("Task purged successfully.");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-gray-50/80 dark:bg-[#08080f]">
      {/* Navigation Sidebar */}
      <div className="w-full md:w-60 shrink-0 bg-white dark:bg-[#0d0d1a] border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/[0.04] p-3 flex flex-row md:flex-col gap-0.5 overflow-x-auto md:overflow-y-auto no-scrollbar">
        <div className="hidden md:flex items-center gap-2.5 px-3 mb-5 mt-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <ShieldAlert size={13} className="text-white" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[2.5px]">Control Terminal</p>
          </div>
        </div>
        {TABS.map(tab => {
          const isActive = adminTab === tab.id;
          const hasAlert = (tab.id === "requests" && requests.length > 0) ||
                           (tab.id === "premium_subs" && premiumSubs.filter(s => s.status === "pending_review").length > 0);
          return (
            <button key={tab.id} onClick={() => setAdminTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] md:text-xs font-bold whitespace-nowrap transition-all duration-200 group relative
                ${isActive
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25"
                  : "text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.04]"}`}>
              <tab.icon size={14} className={isActive ? "text-white/90" : "text-gray-400 dark:text-gray-600 group-hover:text-blue-500 transition-colors"} />
              <span className="flex-1 text-left">{tab.label}</span>
              {hasAlert && (
                <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-white/70" : "bg-blue-500"} animate-pulse`} />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">

        {/* ── OVERVIEW ── */}
        {adminTab === "overview" && (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-violet-700 p-6 shadow-lg shadow-blue-500/20">
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                    <p className="text-[10px] font-black text-blue-200/80 uppercase tracking-[2.5px]">Live Dashboard</p>
                  </div>
                  <h3 className="text-white font-black text-2xl tracking-tight">Platform Overview</h3>
                  <p className="text-blue-200/60 text-xs font-medium mt-0.5">Real-time metrics & system vitals</p>
                </div>
                <button onClick={fetchStats} className="flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold text-white transition-all border border-white/20 backdrop-blur-sm active:scale-95 shrink-0">
                  <RefreshCw size={13} className={statsLoading ? "animate-spin" : ""} /> Sync Data
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard icon={Users}      label="Registrations"   value={stats.total}      color="blue"    loading={statsLoading} sub="Total members" />
              <StatCard icon={BadgeCheck} label="Verified"         value={stats.verified}   color="emerald" loading={statsLoading} sub="Badge-verified" />
              <StatCard icon={Shield}     label="Security"         value={stats.admins}     color="rose"    loading={statsLoading} sub="Admins" />
              <StatCard icon={Crown}      label="Premium"          value={stats.premium}    color="amber"   loading={statsLoading} sub="Active premium" />
              <StatCard icon={Activity}   label="Platform Visits"  value={stats.pageViews} color="violet" loading={statsLoading} sub="All-time visits" />
            </div>

            {/* Verification rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900/70 border border-gray-100 dark:border-white/[0.05] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">Verification Coverage</p>
                  <span className="text-[11px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg">{stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2.5">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}%` }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium">{stats.verified} verified</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium">{stats.total} total</span>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900/70 border border-gray-100 dark:border-white/[0.05] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">Awaiting Action</p>
                  <span className="text-[11px] font-black text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg">{stats.pending + stats.premiumReq} items</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{stats.pending}</p>
                    <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-0.5">Verifications</p>
                  </div>
                  <div className="w-px bg-gray-100 dark:bg-white/[0.05]" />
                  <div className="flex-1">
                    <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{stats.premiumReq}</p>
                    <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-0.5">Premium Req</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Traffic Panel */}
            <div className="bg-white dark:bg-gray-900/70 border border-violet-100 dark:border-violet-500/10 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                    <Activity size={13} className="text-violet-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">Live Traffic Monitor</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-violet-500 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 rounded-lg border border-violet-100 dark:border-violet-500/15">
                  30s refresh
                </span>
              </div>
              <div className="flex items-end gap-4">
                <div className="min-w-0">
                  <p className={`font-black text-violet-600 dark:text-violet-400 tabular-nums leading-tight break-all
                    ${String(stats.pageViews ?? "").length > 9 ? "text-2xl" : String(stats.pageViews ?? "").length > 6 ? "text-3xl" : "text-4xl"}`}>
                    {statsLoading
                      ? <Loader2 size={24} className="animate-spin text-violet-400" />
                      : (stats.pageViews != null ? stats.pageViews.toLocaleString() : "—")}
                  </p>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">total landing page visits</p>
                </div>
                <div className="flex-1 flex flex-col gap-1.5 mb-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
                    <span>Conversion rate</span>
                    <span className="text-emerald-500">
                      {stats.total > 0 && stats.pageViews > 0
                        ? `${((stats.total / stats.pageViews) * 100).toFixed(1)}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${stats.total > 0 && stats.pageViews > 0 ? Math.min((stats.total / stats.pageViews) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-600">
                    {stats.total ?? 0} registrations out of {stats.pageViews != null ? stats.pageViews.toLocaleString() : "—"} visitors
                  </p>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 px-1">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-violet-500 rounded-full" />
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Jump to Section</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: "Requests",     icon: Bell,        iconColor: "text-amber-500",  iconBg: "bg-amber-50 dark:bg-amber-500/10",    action: () => setAdminTab("requests") },
                { label: "Users",        icon: Users,       iconColor: "text-blue-500",   iconBg: "bg-blue-50 dark:bg-blue-500/10",      action: () => setAdminTab("users") },
                { label: "Tasks",        icon: ClipboardList, iconColor: "text-violet-500", iconBg: "bg-violet-50 dark:bg-violet-500/10", action: () => setAdminTab("tasks") },
                { label: "Founder Apps", icon: Crown,       iconColor: "text-amber-600",  iconBg: "bg-amber-50 dark:bg-amber-500/10",    action: () => setAdminTab("founder_apps") },
              ].map(({ label, icon: Icon, iconColor, iconBg, action }) => (
                <button key={label} onClick={action}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white dark:bg-gray-900/70 border border-gray-100 dark:border-white/[0.05] text-xs font-bold text-gray-600 dark:text-gray-400 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-200 dark:hover:border-blue-500/20 group">
                  <div className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <Icon size={17} />
                  </div>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Global Premium Trial ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-4 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-full" />
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Global Premium Trial</p>
              </div>
              <div className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${trialMode.active ? "bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border-violet-200 dark:border-violet-500/30" : "bg-white dark:bg-gray-900/70 border-gray-100 dark:border-white/[0.05]"}`}>
                {trialMode.active && (
                  <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #8b5cf6 1px, transparent 0)", backgroundSize: "18px 18px" }} />
                )}
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${trialMode.active ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                      <Crown size={20} className={trialMode.active ? "text-white" : "text-gray-400 dark:text-gray-600"} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-black text-gray-900 dark:text-white">Free Premium Trial</p>
                        {trialMode.active ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[9px] font-black uppercase tracking-widest rounded-full border border-violet-200 dark:border-violet-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" /> Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 text-[9px] font-black uppercase tracking-widest rounded-full">Inactive</span>
                        )}
                      </div>
                      {trialMode.active ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1">
                            <Users size={10} /> {(trialMode.user_count || 0).toLocaleString()} users on trial
                          </p>
                          {trialMode.expires_at && (
                            trialCountdown.expired ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                                <XCircle size={12} className="text-red-500 shrink-0" />
                                <span className="text-[11px] font-black text-red-600 dark:text-red-400">Trial expired — reverting users…</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {[
                                  { v: trialCountdown.d, label: "days" },
                                  { v: trialCountdown.h, label: "hrs" },
                                  { v: trialCountdown.m, label: "min" },
                                  { v: trialCountdown.s, label: "sec" },
                                ].map(({ v, label }, i) => (
                                  <div key={label} className="flex items-center">
                                    <div className={`flex flex-col items-center min-w-[36px] px-1.5 py-1 rounded-lg border text-center ${
                                      trialCountdown.d < 30 ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40" :
                                      trialCountdown.d < 90 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40" :
                                      "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/40"
                                    }`}>
                                      <span className={`text-sm font-black tabular-nums leading-none ${
                                        trialCountdown.d < 30 ? "text-red-600 dark:text-red-400" :
                                        trialCountdown.d < 90 ? "text-amber-600 dark:text-amber-400" :
                                        "text-violet-700 dark:text-violet-300"
                                      }`}>{String(v).padStart(2, "0")}</span>
                                      <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mt-0.5">{label}</span>
                                    </div>
                                    {i < 3 && <span className="text-gray-300 dark:text-gray-700 font-black text-xs mx-0.5">:</span>}
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                          {trialMode.expires_at && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                              Expires {new Date(trialMode.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </p>
                          )}
                          {trialMode.started_at && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                              Started {new Date(trialMode.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Grant all users 1 year of free premium access. Paid subscribers keep their PRO badge.</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {trialMode.active && (
                      <button
                        onClick={async () => {
                          const { data: { session } } = await supabase.auth.getSession();
                          const expiryStr = trialMode.expires_at
                            ? new Date(trialMode.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                            : "1 year";
                          await fetch("/api/admin/broadcast", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                            body: JSON.stringify({
                              subject: "Free Premium Trial — You're In!",
                              message: `Great news! We've activated a 1-year free premium trial for all members of beoneofus.\n\nYou now have full access to all premium features at no cost until ${expiryStr}.\n\nHead to your dashboard to explore everything premium has to offer!`,
                              audience: "all",
                            }),
                          });
                          showToast("Announcement sent to all users!");
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all"
                      >
                        <Bell size={12} /> Announce
                      </button>
                    )}
                    <button
                      onClick={() => setShowTrialConfirm(trialMode.active ? "disable" : "enable")}
                      disabled={trialLoading}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 ${
                        trialMode.active
                          ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20"
                          : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25"
                      }`}
                    >
                      {trialLoading ? <Loader2 size={13} className="animate-spin" /> : <Crown size={13} />}
                      {trialMode.active ? "Deactivate" : "Activate Trial"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REQUESTS ── */}
        {adminTab === "requests" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-gray-900 dark:text-white font-black text-xl">Verification Requests</h3>
              {requests.length > 0 && <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-lg border border-amber-100 dark:border-amber-500/20">{requests.length} pending</span>}
            </div>
            {requests.length === 0
              ? <div className="py-16 text-center text-gray-400 dark:text-gray-600 text-sm bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-white/[0.04]">No pending verification requests.</div>
              : requests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900/70 border border-gray-100 dark:border-white/[0.05] rounded-2xl hover:border-gray-200 dark:hover:border-white/[0.08] transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <div onClick={() => setSelectedUserId(req.id)}
                      className="relative w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:opacity-80">
                      {req.avatar_url ? <Image src={req.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" /> : req.username?.substring(0, 2)}
                    </div>
                    <div onClick={() => setSelectedUserId(req.id)} className="cursor-pointer">
                      <p className="text-sm font-bold text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 transition-colors">@{req.username}</p>
                      <p className="text-[10px] text-gray-500">{req.status || "Active Node"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleVerification(req.id, "reject")}
                      className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl text-xs font-bold border border-red-200 dark:border-red-500/20 transition-all">Deny</button>
                    <button onClick={() => handleVerification(req.id, "approve")}
                      className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20">Approve</button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ── USERS ── */}
        {adminTab === "users" && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-gray-900 dark:text-white font-black text-xl">Manage Users</h3>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg border border-blue-100 dark:border-blue-500/20">{allUsers.length}</span>
              </div>
              <div className="flex items-center gap-2">
                {bulkMode ? (
                  <>
                    <button onClick={handleBulkVerify} disabled={selectedUserIds.size === 0 || actionProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-40">
                      {actionProcessing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Verify Selected ({selectedUserIds.size})
                    </button>
                    <button onClick={() => setShowBulkDeleteConfirm(true)} disabled={selectedUserIds.size === 0 || actionProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/20 disabled:opacity-40">
                      {actionProcessing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Delete Selected ({selectedUserIds.size})
                    </button>
                    <button onClick={() => { setBulkMode(false); setSelectedUserIds(new Set()); }}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-bold hover:text-gray-900 dark:hover:text-white transition-all">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setBulkMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-600 transition-all border border-gray-200 dark:border-gray-800">
                      <Layers size={12} /> Bulk Actions
                    </button>
                    <button onClick={() => fetchUsers(0, false)} className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-gray-500 transition-all border border-gray-200 dark:border-gray-800"><RefreshCw size={14} /></button>
                  </>
                )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600" size={14} />
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users…"
                className="w-full bg-white dark:bg-gray-900/70 border border-gray-100 dark:border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-blue-300 dark:focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm" />
            </div>
            {usersLoading && allUsers.length === 0
              ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
              : (
                <div className="space-y-2">
                  {allUsers.filter(u => u.username?.toLowerCase().includes(userSearch.toLowerCase())).map(user => (
                    <div key={user.id}
                      className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-900/70 border border-gray-100 dark:border-white/[0.05] rounded-xl hover:border-blue-200 dark:hover:border-blue-500/15 transition-all duration-150 shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        {bulkMode && (
                          <button onClick={(e) => { e.stopPropagation(); toggleUserSelection(user.id); }}
                            className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center shrink-0
                              ${selectedUserIds.has(user.id) 
                                ? "bg-blue-600 border-blue-600 text-white" 
                                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"}`}>
                            {selectedUserIds.has(user.id) && <Check size={12} strokeWidth={4} />}
                          </button>
                        )}
                        <div onClick={() => setSelectedUserId(user.id)}
                          className="relative w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:opacity-80 shrink-0">
                          {user.avatar_url ? <Image src={user.avatar_url} alt="avatar" fill sizes="36px" className="object-cover" /> : user.username?.substring(0, 2)}
                        </div>
                        <div className="min-w-0 cursor-pointer" onClick={() => setSelectedUserId(user.id)}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 transition-colors">@{user.username}</p>
                            {user.is_verified && <BadgeCheck size={12} className="text-blue-500 dark:text-blue-400" />}
                            {user.is_premium && !user.is_trial_premium && <Crown size={12} className="text-amber-500 dark:text-amber-400" />}
                            {user.is_premium && user.is_trial_premium && <Sparkles size={12} className="text-blue-500 dark:text-blue-400" />}
                            {user.premium_requested && !user.is_premium && <span className="text-[9px] font-black bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.5 rounded-full">Req</span>}
                            {user.is_admin && <Badge color="amber">Admin</Badge>}
                            {user.role && <Badge color="gray">{user.role}</Badge>}
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-600 mt-0.5 truncate">{user.status || "Active"}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 ml-3">
                        {user.is_verified && (
                          <button onClick={() => handleRemoveVerification(user.id, user.username)} title="Remove Verification"
                            className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 rounded-xl transition-all border border-gray-200 dark:border-gray-700">
                            <XCircle size={14} />
                          </button>
                        )}
                        <button onClick={() => setShowPremiumToggleConfirm({ id: user.id, is_premium: user.is_premium, username: user.username })} title="Toggle Premium"
                          className={`p-2 rounded-xl transition-all border text-xs ${user.is_premium ? "bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20" : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:text-amber-500 dark:hover:text-amber-400"}`}>
                          <Crown size={14} />
                        </button>
                        <button onClick={() => setShowAdminToggleConfirm(user)} title="Toggle Admin"
                          className={`p-2 rounded-xl transition-all border text-xs ${user.is_admin ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20" : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:text-amber-500 dark:hover:text-amber-400"}`}>
                          <ShieldCheck size={14} />
                        </button>
                        <button onClick={() => handleImpersonateUser(user.id, user.username)} title="Impersonate"
                          className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-violet-500 dark:hover:text-violet-400 rounded-xl transition-all border border-gray-200 dark:border-gray-700">
                          <UserCog size={14} />
                        </button>
                        <button onClick={() => setShowUserDeleteConfirm(user)} title="Delete"
                          className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-all border border-gray-200 dark:border-gray-700">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
              {hasMoreUsers && !userSearch && (
                <div className="pt-2 flex justify-center">
                  <button onClick={() => fetchUsers(usersPage + 1, true)} className="px-5 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-gray-700 shadow-sm">
                    Load More Users
                  </button>
                </div>
              )}
                </div>
              )}
          </div>
        )}

        {/* ── PREMIUM SUBSCRIPTIONS ── */}
        {adminTab === "premium_subs" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-gray-900 dark:text-white font-black">Premium Requests</h3>
              <div className="flex gap-1 flex-wrap">
                {["pending_review", "active", "declined", "all"].map(f => (
                  <button key={f} onClick={() => setPremiumFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                      premiumFilter === f
                        ? "bg-amber-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}>
                    {f === "pending_review" ? "Pending" : f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {premiumSubsLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={22} /></div>
            ) : (
              (() => {
                const filtered = premiumSubs.filter(s =>
                  premiumFilter === "all" ? true : s.status === premiumFilter
                );
                if (filtered.length === 0) return (
                  <div className="py-12 text-center text-gray-400 dark:text-gray-600 text-sm">
                    No {premiumFilter === "all" ? "" : premiumFilter.replace("_", " ")} subscriptions.
                  </div>
                );
                return filtered.map(sub => {
                  const isReviewing = reviewingSubId === sub.id;
                  const aiLoading   = aiReviewing === sub.id;
                  return (
                    <div key={sub.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                      {/* Sub header */}
                      <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="relative w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center font-bold text-gray-500 shrink-0">
                          {sub.profiles?.avatar_url
                            ? <Image src={sub.profiles.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" />
                            : sub.profiles?.username?.substring(0, 2)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">@{sub.profiles?.username || "unknown"}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              {sub.plan} · ${(sub.amount / 100).toFixed(2)} · {new Date(sub.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {/* Status badge */}
                          {(() => {
                            const S = {
                              pending_review: { cls: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20", label: "Pending Review" },
                              active:         { cls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20", label: "Active" },
                              declined:       { cls: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20", label: "Declined" },
                              pending_payment:{ cls: "bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700", label: "Awaiting Payment" },
                              cancelled:      { cls: "bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700", label: "Cancelled" },
                            };
                            const m = S[sub.status] || S.cancelled;
                            return <span className={`text-[9px] font-black px-2 py-1 rounded-lg border ${m.cls}`}>{m.label}</span>;
                          })()}
                        </div>
                      </div>

                      {/* AI Review section */}
                      {(sub.status === "pending_review" || sub.ai_review) && (
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                          {sub.ai_review?.text ? (
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1">
                                <Bot size={11} /> AI Pre-Screening
                                <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-black ${
                                  sub.ai_review.recommendation === "approve"
                                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                }`}>
                                  {sub.ai_review.recommendation === "approve" ? "Recommend Approve" : "Review Carefully"}
                                </span>
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{sub.ai_review.text.replace(/RECOMMENDATION:.*/, "").trim()}</p>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAiReviewing(sub.id); handlePremiumAction(sub.id, "ai_review"); }}
                              disabled={aiLoading || premiumActionLoading?.includes(sub.id)}
                              className="flex items-center gap-2 text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors disabled:opacity-50"
                            >
                              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
                              {aiLoading ? "AI is reviewing…" : "Run AI Pre-Screening"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Review note input */}
                      {isReviewing && (
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Note to user (optional)</p>
                          <textarea
                            value={reviewNote}
                            onChange={e => setReviewNote(e.target.value)}
                            placeholder="Add a note for the user…"
                            rows={2}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-400 dark:focus:border-amber-500 resize-none transition-colors"
                          />
                        </div>
                      )}

                      {/* Actions */}
                      {sub.status === "pending_review" && (
                        <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
                          {!isReviewing ? (
                            <>
                              <button
                                onClick={() => setReviewingSubId(sub.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
                              >
                                <CheckCircle2 size={13} /> Review & Decide
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handlePremiumAction(sub.id, "accept", reviewNote)}
                                disabled={!!premiumActionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
                              >
                                {premiumActionLoading === `${sub.id}-accept` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                Accept
                              </button>
                              <button
                                onClick={() => handlePremiumAction(sub.id, "decline", reviewNote)}
                                disabled={!!premiumActionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
                              >
                                {premiumActionLoading === `${sub.id}-decline` ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                                Decline
                              </button>
                              <button
                                onClick={() => { setReviewingSubId(null); setReviewNote(""); }}
                                className="px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {sub.review_note && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto italic truncate max-w-[160px]">&quot;{sub.review_note}&quot;</p>
                          )}
                        </div>
                      )}
                      {sub.status === "active" && (
                        <div className="px-4 py-2.5 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 size={13} /> Approved and active
                          {sub.review_note && <span className="text-gray-400 dark:text-gray-500 font-normal">· &quot;{sub.review_note}&quot;</span>}
                        </div>
                      )}
                      {sub.status === "declined" && (
                        <div className="px-4 py-2.5 flex items-center gap-2 text-[11px] text-red-600 dark:text-red-400 font-bold">
                          <XCircle size={13} /> Declined
                          {sub.review_note && <span className="text-gray-400 dark:text-gray-500 font-normal">· &quot;{sub.review_note}&quot;</span>}
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}

        {/* ── AI LOGS ── */}
        {adminTab === "ai_logs" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900 dark:text-white font-black">AI Interaction Logs</h3>
              <button onClick={() => setAiLogs([])} className="text-xs text-blue-500 dark:text-blue-400 font-bold hover:text-blue-600 dark:hover:text-blue-300">Refresh</button>
            </div>
            {logsLoading
              ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
              : aiLogs.length === 0
                ? <div className="py-12 text-center text-gray-500 dark:text-gray-600 text-sm">No AI logs found.</div>
                : aiLogs.map((log, i) => (
                  <div key={i} className="flex gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden
                      ${log.role === "assistant" ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400" : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}>
                      {log.role === "assistant"
                        ? <Bot size={16} />
                        : log.profiles?.avatar_url
                          ? <div className="relative w-full h-full"><Image src={log.profiles.avatar_url} alt="avatar" fill sizes="32px" className="object-cover" /></div>
                          : <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{log.profiles?.username?.substring(0, 2) || "?"}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-300">
                          {log.role === "assistant" ? "beoneofus AI" : `@${log.profiles?.username || "Unknown"}`}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-600">{new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <p className={`text-xs leading-relaxed line-clamp-3 ${log.role === "assistant" ? "text-gray-600 dark:text-gray-400" : "text-gray-800 dark:text-gray-300"}`}>{log.content}</p>
                    </div>
                  </div>
                ))}
          </div>
        )}

        {/* ── APPLICATIONS ── */}
        {adminTab === "applications" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900 dark:text-white font-black">Job Applications <span className="text-gray-500 dark:text-gray-600 font-normal text-sm">({applications.length})</span></h3>
              <button onClick={() => { setApplications([]); setInterviewRoomMap({}); }} className="text-xs text-blue-500 dark:text-blue-400 font-bold hover:text-blue-600 dark:hover:text-blue-300">Refresh</button>
            </div>
            {appsLoading
              ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
              : applications.length === 0
                ? <div className="py-12 text-center text-gray-500 dark:text-gray-600 text-sm">No applications found.</div>
                : applications.map(app => (
                  <div key={app.id} onClick={() => setSelectedApp(app)}
                    className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div onClick={e => { e.stopPropagation(); setSelectedUserId(app.user_id); }}
                          className="relative w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:opacity-80">
                          {app.profiles?.avatar_url ? <Image src={app.profiles.avatar_url} alt="avatar" fill sizes="36px" className="object-cover" /> : app.profiles?.username?.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1">@{app.profiles?.username} {app.profiles?.is_verified && <BadgeCheck size={11} className="text-blue-500 dark:text-blue-400" />}</p>
                          <p className="text-[10px] text-gray-500 truncate">{app.jobs?.title || "Unknown"} · {app.jobs?.company || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Badge color={statusColor(app.status)}>{app.status || "pending"}</Badge>
                        <ChevronRight size={14} className="text-gray-400 dark:text-gray-600" />
                      </div>
                    </div>
                    {app.status !== "accepted" && app.status !== "declined" && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setActionPrompt({ type: "job", appId: app.id, newStatus: "declined", applicantId: app.user_id, title: app.jobs?.title })}
                          className="flex-1 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-lg text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">Decline</button>
                        <button onClick={() => setActionPrompt({ type: "job", appId: app.id, newStatus: "accepted", applicantId: app.user_id, title: app.jobs?.title })}
                          className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-500 transition-all">Accept</button>
                      </div>
                    )}
                    {app.status === "accepted" && (() => {
                      const room = interviewRoomMap[`${app.user_id}_${app.job_id}`] || interviewRoomMap[`${app.user_id}_only`];
                      const statusMap = { active: { label: "In Progress", cls: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" }, answers_complete: { label: "Q&A Done", cls: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" }, coding: { label: "Coding", cls: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" }, completed: { label: "Completed", cls: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" } };
                      const pill = room ? statusMap[room.status] : null;
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2" onClick={e => e.stopPropagation()}>
                          {room && (
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${pill?.cls}`}>{pill?.label}</span>
                              {room.status === "completed" && room.overall_score != null && (
                                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400">Score: {room.overall_score}%</span>
                              )}
                            </div>
                          )}
                          {(!room || room.status === "completed") && (
                            <button onClick={() => openInterviewModal(app)}
                              className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-xl text-[10px] font-bold transition-all ${room ? "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>
                              <Video size={11} /> {room ? "Re-assign Interview Room" : "Assign Interview Room"}
                            </button>
                          )}
                          {room && room.status !== "completed" && (
                            <p className="text-center text-[10px] text-gray-400 dark:text-gray-600">Interview in progress — wait for completion to re-assign</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
          </div>
        )}

        {/* ── FOUNDER APPS ── */}
        {adminTab === "founder_apps" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900 dark:text-white font-black">Founder Applications <span className="text-gray-500 dark:text-gray-600 font-normal text-sm">({founderApps.length})</span></h3>
              <div className="flex gap-2">
                <button onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all">
                  <UserPlus size={12} /> Invite
                </button>
                <button onClick={() => setFounderApps([])} className="text-xs text-blue-500 dark:text-blue-400 font-bold hover:text-blue-600 dark:hover:text-blue-300">Refresh</button>
              </div>
            </div>
            {founderAppsLoading
              ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
              : founderApps.length === 0
                ? <div className="py-12 text-center text-gray-500 dark:text-gray-600 text-sm">No founder applications.</div>
                : founderApps.map(app => (
                  <div key={app.id} onClick={() => setSelectedFounderApp(app)}
                    className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div onClick={e => { e.stopPropagation(); setSelectedUserId(app.user_id); }}
                          className="relative w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center font-black text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:opacity-80 shrink-0">
                          {app.profiles?.avatar_url ? <Image src={app.profiles.avatar_url} alt="avatar" fill sizes="36px" className="object-cover" /> : (app.name?.substring(0, 2) || "??")}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{app.profiles?.username ? `@${app.profiles.username}` : app.name}</p>
                          <p className={`text-[10px] font-bold ${app.intended_role === "cofounder" ? "text-violet-600 dark:text-violet-400" : "text-blue-600 dark:text-blue-400"}`}>
                            {app.intended_role === "cofounder" ? "Co-founder" : "Member"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge color={statusColor(app.status)}>{app.status || "pending"}</Badge>
                        <ChevronRight size={14} className="text-gray-400 dark:text-gray-600" />
                      </div>
                    </div>
                    {app.status !== "accepted" && app.status !== "declined" && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setActionPrompt({ type: "founder", appId: app.id, newStatus: "declined", applicantId: app.user_id, title: app.intended_role })}
                          className="flex-1 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-lg text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">Decline</button>
                        <button onClick={() => setActionPrompt({ type: "founder", appId: app.id, newStatus: "accepted", applicantId: app.user_id, title: app.intended_role })}
                          className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-500 transition-all">Accept</button>
                      </div>
                    )}
                  </div>
                ))}
          </div>
        )}

        {/* ── TASKS ── */}
        {adminTab === "tasks" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-gray-900 dark:text-white font-black">Task Assignments</h3>
              <div className="flex items-center gap-2">
                <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-0.5 rounded-xl shadow-sm">
                  {["All", "High", "Medium", "Low"].map(f => (
                    <button key={f} onClick={() => setTaskFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${taskFilter === f ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400"}`}>
                      {f}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowTaskModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all">
                  <Plus size={12} /> Assign
                </button>
              </div>
            </div>
            {tasksLoading
              ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
              : adminTasks.filter(t => taskFilter === "All" || t.priority === taskFilter).length === 0
                ? <div className="py-12 text-center text-gray-500 dark:text-gray-600 text-sm">No tasks.</div>
                : adminTasks.filter(t => taskFilter === "All" || t.priority === taskFilter)
                  .sort((a, b) => ({ High: 3, Medium: 2, Low: 1 }[b.priority || "Medium"] - ({ High: 3, Medium: 2, Low: 1 }[a.priority || "Medium"]))
                  ).map(task => (
                    <div key={task.id} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-all shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{task.title}</p>
                            <Badge color={task.priority === "High" ? "rose" : task.priority === "Medium" ? "amber" : "blue"}>{task.priority}</Badge>
                          </div>
                          {task.linked_to && <p className="text-[10px] text-gray-500 flex items-center gap-1 mb-1"><FileText size={9} />{task.linked_to}</p>}
                          <p className="text-xs text-gray-600 dark:text-gray-500 line-clamp-2">{task.description}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleComplexUpdate(task.id, task.status === "completed" ? "pending" : "completed")}
                            disabled={actionProcessing}
                            className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all disabled:opacity-50 ${
                              task.status === "completed" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"}`}>
                            {task.status}
                          </button>
                          <button onClick={() => setShowTaskDeleteConfirm(task)} className="p-2 text-gray-400 hover:text-red-500 transition-colors self-end">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/60">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden relative">
                            {task.assigner?.avatar_url ? <Image src={task.assigner.avatar_url} alt="assigner" fill sizes="20px" className="object-cover" /> : <UserCog size={10} className="absolute inset-0 m-auto text-gray-400 dark:text-gray-600" />}
                          </div>
                          <span className="text-[9px] text-gray-500 dark:text-gray-600 uppercase tracking-widest">@{task.assigner?.username || "Admin"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-gray-500 dark:text-gray-600 uppercase tracking-widest">→ @{task.assignee?.username || "?"}</span>
                          <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden relative">
                            {task.assignee?.avatar_url ? <Image src={task.assignee.avatar_url} alt="assignee" fill sizes="20px" className="object-cover" /> : <User size={10} className="absolute inset-0 m-auto text-gray-400 dark:text-gray-600" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
          </div>
        )}

        {/* ── INTERVIEWS ── */}
        {adminTab === "interviews" && (
          <div className="space-y-4">
            {/* Delete All confirm modal */}
            {confirmDeleteAllRooms && (() => {
              const filtered = interviewRooms.filter(r => {
                if (interviewStatusFilter === "all") return true;
                if (interviewStatusFilter === "passed") return r.status === "completed" && r.overall_score != null && r.overall_score >= 70;
                if (interviewStatusFilter === "failed") return r.status === "completed" && (r.overall_score == null || r.overall_score < 70);
                return r.status === interviewStatusFilter;
              });
              return (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle size={22} className="text-red-500 shrink-0" />
                      <h3 className="font-black text-gray-900 dark:text-gray-100">Delete {filtered.length} Interview{filtered.length !== 1 ? "s" : ""}?</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">
                      This will permanently delete the selected interview rooms and all their answers. This cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => setConfirmDeleteAllRooms(false)} disabled={deletingAllRooms}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                        Cancel
                      </button>
                      <button onClick={() => handleDeleteAllRooms(filtered.map(r => r.id))} disabled={deletingAllRooms}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                        {deletingAllRooms ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        {deletingAllRooms ? "Deleting…" : "Delete All"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-gray-900 dark:text-white font-black text-xl">Interview Rooms</h3>
                <p className="text-xs text-gray-500 dark:text-gray-600 mt-0.5">All active and completed interview sessions.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-0.5 rounded-xl shadow-sm">
                  {["all", "active", "answers_complete", "coding", "completed", "passed", "failed"].map(s => (
                    <button key={s} onClick={() => setInterviewStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${interviewStatusFilter === s ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400"}`}>
                      {s === "all" ? "All" : s === "answers_complete" ? "Answered" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                {interviewRooms.length > 0 && (
                  <button onClick={() => setConfirmDeleteAllRooms(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all shadow-sm">
                    <Trash2 size={13} /> Delete All
                  </button>
                )}
                <button onClick={fetchRooms} disabled={interviewsLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50">
                  <RefreshCw size={13} className={interviewsLoading ? "animate-spin" : ""} /> Refresh
                </button>
                <button onClick={() => setShowFreeInterviewModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                  <Plus size={13} /> New Interview
                </button>
              </div>
            </div>

            {interviewsLoading
              ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
              : (() => {
                  const filtered = interviewRooms.filter(r => {
                    if (interviewStatusFilter === "all") return true;
                    if (interviewStatusFilter === "passed") return r.status === "completed" && r.overall_score != null && r.overall_score >= 70;
                    if (interviewStatusFilter === "failed") return r.status === "completed" && (r.overall_score == null || r.overall_score < 70);
                    return r.status === interviewStatusFilter;
                  });
                  if (!filtered.length) return <div className="py-12 text-center text-gray-500 dark:text-gray-600 text-sm">No interview rooms found.</div>;
                  return filtered.map(room => {
                    const isExpanded = expandedRoomId === room.id;
                    const answers = roomAnswers[room.id] || [];
                    const statusColors = { active: "blue", answers_complete: "amber", coding: "violet", completed: "emerald" };
                    const statusColor = statusColors[room.status] || "gray";
                    return (
                      <div key={room.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                <Video size={18} className="text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{room.job_title}{room.company ? ` · ${room.company}` : ""}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-500 font-medium mt-0.5">
                                  @{room.profiles?.username || room.applicant_id?.slice(0, 8)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {room.status === "completed" && room.overall_score != null && (
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${room.overall_score >= 70 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"}`}>
                                  {room.overall_score >= 70 ? "PASSED" : "FAILED"}
                                </span>
                              )}
                              {room.overall_score != null && (
                                <span className={`text-xs font-black px-2 py-1 rounded-lg ${room.overall_score >= 85 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : room.overall_score >= 70 ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" : room.overall_score >= 55 ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                                  {room.overall_score}%
                                </span>
                              )}
                              <Badge color={statusColor}>{room.status === "answers_complete" ? "Answered" : room.status}</Badge>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/60">
                            <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-600">
                              <span className="flex items-center gap-1"><FileText size={10} />{Array.isArray(room.questions) ? room.questions.length : 0} questions</span>
                              {room.coding_challenge && <span className="flex items-center gap-1"><Code2 size={10} />Has coding challenge</span>}
                              <span className="flex items-center gap-1"><Clock size={10} />{new Date(room.created_at).toLocaleDateString()}</span>
                            </div>
                            <button onClick={() => fetchRoomAnswers(room.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-[10px] font-bold transition-all">
                              <Eye size={11} /> {isExpanded ? "Hide" : "View"} Answers
                              <ChevronDown size={11} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 p-4 space-y-3">
                            {answers.length === 0
                              ? <p className="text-xs text-gray-500 dark:text-gray-600 text-center py-4">No answers submitted yet.</p>
                              : answers.map((ans, i) => (
                                  <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Q{ans.question_index + 1}: {ans.question_text}</p>
                                      <span className={`shrink-0 text-xs font-black px-2 py-0.5 rounded-lg ${ans.ai_score >= 75 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : ans.ai_score >= 55 ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                                        {ans.ai_score ?? "—"}/100
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed mb-2 line-clamp-3">{ans.answer_text}</p>
                                    {ans.ai_feedback && (
                                      <p className="text-[10px] text-gray-500 dark:text-gray-500 italic border-l-2 border-blue-300 dark:border-blue-700 pl-2">{ans.ai_feedback}</p>
                                    )}
                                    {(ans.strengths?.length > 0 || ans.improvements?.length > 0) && (
                                      <div className="flex gap-4 mt-2">
                                        {ans.strengths?.length > 0 && (
                                          <div className="flex-1">
                                            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Strengths</p>
                                            {ans.strengths.map((s, si) => <p key={si} className="text-[10px] text-gray-500 dark:text-gray-600">· {s}</p>)}
                                          </div>
                                        )}
                                        {ans.improvements?.length > 0 && (
                                          <div className="flex-1">
                                            <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">To Improve</p>
                                            {ans.improvements.map((s, si) => <p key={si} className="text-[10px] text-gray-500 dark:text-gray-600">· {s}</p>)}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))
                            }
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
            }
          </div>
        )}

        {/* ── SPONSORS ── */}
        {adminTab === "sponsors" && (
          <SponsorsAdminContent showToast={showToast} />
        )}

        {/* ── SYSTEM LOGS ── */}
        {adminTab === "system_logs" && (
          <SystemLogsView />
        )}

        {/* ── SETTINGS ── */}
        {adminTab === "settings" && (
          <AdminSettingsPanel showToast={showToast} currentUserId={currentUserId} />
        )}
        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────────────── */}

      {/* App Detail */}
      {selectedApp && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/70 backdrop-blur-sm" onClick={() => setSelectedApp(null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedApp(null)} className="absolute top-5 right-5 p-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl text-gray-500 border border-gray-200 dark:border-gray-800"><X size={16} /></button>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4">Application Details</h2>
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-[10px] text-gray-500 dark:text-gray-600 uppercase tracking-widest mb-1">Status</p>
                  <Badge color={statusColor(selectedApp.status)}>{selectedApp.status || "pending"}</Badge>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-[10px] text-gray-500 dark:text-gray-600 uppercase tracking-widest mb-1">Applied</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{new Date(selectedApp.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {(selectedApp.cover_letter || selectedApp.message || selectedApp.notes) && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-[10px] text-gray-500 dark:text-gray-600 uppercase tracking-widest mb-2">Cover Letter</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{selectedApp.cover_letter || selectedApp.message || selectedApp.notes}</p>
                </div>
              )}
              {selectedApp.resume_url && (
                <a href={selectedApp.resume_url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all">
                  <span>View Resume / CV</span><FileText size={14} />
                </a>
              )}
            </div>
            <div className="flex gap-2">
              {selectedApp.status !== "accepted" && selectedApp.status !== "declined" ? (
                <>
                  <button onClick={() => setActionPrompt({ type: "job", appId: selectedApp.id, newStatus: "declined", applicantId: selectedApp.user_id, title: selectedApp.jobs?.title })}
                    className="flex-1 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-lg text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">Decline</button>
                  <button onClick={() => setActionPrompt({ type: "job", appId: selectedApp.id, newStatus: "accepted", applicantId: selectedApp.user_id, title: selectedApp.jobs?.title })}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all">Accept</button>
                </>
              ) : selectedApp.status === "accepted" ? (() => {
                const room = interviewRoomMap[`${selectedApp.user_id}_${selectedApp.job_id}`] || interviewRoomMap[`${selectedApp.user_id}_only`];
                return (
                  <div className="flex-1 space-y-2">
                    {room && (
                      <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold ${
                        room.status === "completed" ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                        : room.status === "coding" ? "bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                        : "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                      }`}>
                        <span>Interview: {room.status === "active" ? "In Progress" : room.status === "answers_complete" ? "Q&A Done" : room.status === "coding" ? "Coding Challenge" : "Completed"}</span>
                        {room.status === "completed" && room.overall_score != null && <span>{room.overall_score}%</span>}
                      </div>
                    )}
                    {(!room || room.status === "completed") ? (
                      <button onClick={() => { setSelectedApp(null); openInterviewModal(selectedApp); }}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${room ? "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>
                        <Video size={13} /> {room ? "Re-assign Interview Room" : "Assign Interview Room"}
                      </button>
                    ) : (
                      <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 py-1">Interview in progress — wait for completion</p>
                    )}
                  </div>
                );
              })() : (
                <div className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-center text-gray-500 text-xs font-bold uppercase">
                  {selectedApp.status}
                </div>
              )}
              <button onClick={async () => {
                if (!confirm("Delete this application?")) return;
                const { error } = await supabase.from("job_applications").delete().eq("id", selectedApp.id);
                if (!error) { setApplications(prev => prev.filter(a => a.id !== selectedApp.id)); setSelectedApp(null); showToast("Deleted."); }
                else showToast(error.message, "error");
              }} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-xl text-xs font-bold transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Founder App Detail */}
      {selectedFounderApp && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/70 backdrop-blur-sm" onClick={() => setSelectedFounderApp(null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedFounderApp(null)} className="absolute top-5 right-5 p-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl text-gray-500 border border-gray-200 dark:border-gray-800"><X size={16} /></button>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4">Applicant Review</h2>
            <div className="space-y-3 mb-5">
              {Object.entries(getReasonObj(selectedFounderApp.reason)).map(([key, val], i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5">{key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{val}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {selectedFounderApp.status !== "accepted" && selectedFounderApp.status !== "declined" ? (
                <>
                  <button onClick={() => setActionPrompt({ type: "founder", appId: selectedFounderApp.id, newStatus: "declined", applicantId: selectedFounderApp.user_id, title: selectedFounderApp.intended_role })}
                    className="flex-1 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-lg text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">Decline</button>
                  <button onClick={() => setActionPrompt({ type: "founder", appId: selectedFounderApp.id, newStatus: "accepted", applicantId: selectedFounderApp.user_id, title: selectedFounderApp.intended_role })}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all">Accept</button>
                </>
              ) : (
                <div className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-center text-gray-500 text-xs font-bold uppercase">{selectedFounderApp.status}</div>
              )}
              <button onClick={async () => {
                if (!confirm("Delete?")) return;
                const { error } = await supabase.from("founder_applications").delete().eq("id", selectedFounderApp.id);
                if (!error) { setFounderApps(prev => prev.filter(a => a.id !== selectedFounderApp.id)); setSelectedFounderApp(null); showToast("Deleted."); }
                else showToast(error.message, "error");
              }} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-xl text-xs font-bold transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Prompt */}
      {actionPrompt && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/70 backdrop-blur-sm" onClick={() => !actionProcessing && setActionPrompt(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-base font-black text-gray-900 dark:text-white mb-1">{actionPrompt.newStatus === "accepted" ? "Accept" : "Decline"} Application</h2>
            <p className="text-xs text-gray-500 mb-4">Add an optional personal note for the applicant.</p>
            <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="Optional message…" rows={3}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all resize-none mb-4 placeholder-gray-400 dark:placeholder-gray-500" />
            <div className="flex gap-2">
              <button onClick={() => setActionPrompt(null)} disabled={actionProcessing}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors">Cancel</button>
              <button onClick={submitActionPrompt} disabled={actionProcessing}
                className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all
                  ${actionPrompt.newStatus === "accepted" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}`}>
                {actionProcessing ? <Loader2 size={14} className="animate-spin" /> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk User Delete Confirmation */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm" onClick={() => !actionProcessing && setShowBulkDeleteConfirm(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/50">
              <Trash2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Purge Users?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-8 leading-relaxed">
              Permanently remove <span className="font-bold text-gray-900 dark:text-gray-200">{selectedUserIds.size} selected users</span> from the network? This cannot be undone.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={handleBulkDelete} disabled={actionProcessing}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-600/20 active:scale-95">
                {actionProcessing ? <Loader2 size={16} className="animate-spin" /> : "Confirm Purge"}
              </button>
              <button onClick={() => setShowBulkDeleteConfirm(false)}
                className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-xl text-sm hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Delete Confirmation (Pop card) */}
      {showUserDeleteConfirm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm" onClick={() => !actionProcessing && setShowUserDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/50">
              <Trash2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Delete User?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-8 leading-relaxed">
              Permanently remove <span className="font-bold text-gray-900 dark:text-gray-200">@{showUserDeleteConfirm.username}</span> from the network? All profile data and connections will be purged.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { handleDeleteUser(showUserDeleteConfirm.id, showUserDeleteConfirm.username); setShowUserDeleteConfirm(null); }}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-600/20 active:scale-95">
                Confirm Deletion
              </button>
              <button onClick={() => setShowUserDeleteConfirm(null)}
                className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-xl text-sm hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Toggle Confirmation (Pop card) */}
      {showAdminToggleConfirm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm" onClick={() => !actionProcessing && setShowAdminToggleConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-14 h-14 ${showAdminToggleConfirm.is_admin ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 border-red-100 dark:border-red-900/50" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 border-blue-100 dark:border-blue-900/50"} rounded-2xl flex items-center justify-center mx-auto mb-4 border`}>
              <Shield size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{showAdminToggleConfirm.is_admin ? "Revoke Admin?" : "Grant Admin?"}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-8 leading-relaxed">
              {showAdminToggleConfirm.is_admin ? `Remove administrative privileges from @${showAdminToggleConfirm.username}?` : `Grant @${showAdminToggleConfirm.username} full access to the admin terminal?`}
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { handleToggleAdmin(showAdminToggleConfirm.id, showAdminToggleConfirm.is_admin, showAdminToggleConfirm.username); setShowAdminToggleConfirm(null); }}
                className={`w-full py-3 ${showAdminToggleConfirm.is_admin ? "bg-red-600 hover:bg-red-500 shadow-red-600/20" : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"} text-white font-bold rounded-xl text-sm transition-all shadow-lg active:scale-95`}>
                {showAdminToggleConfirm.is_admin ? "Revoke Privileges" : "Grant Privileges"}
              </button>
              <button onClick={() => setShowAdminToggleConfirm(null)}
                className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-xl text-sm hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Toggle Confirmation (Pop card) */}
      {showPremiumToggleConfirm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm" onClick={() => !actionProcessing && setShowPremiumToggleConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-14 h-14 ${showPremiumToggleConfirm.is_premium ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 border-red-100 dark:border-red-900/50" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 border-amber-100 dark:border-amber-900/50"} rounded-2xl flex items-center justify-center mx-auto mb-4 border`}>
              <Crown size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{showPremiumToggleConfirm.is_premium ? "Revoke Premium?" : "Grant Premium?"}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-8 leading-relaxed">
              {showPremiumToggleConfirm.is_premium
                ? `Remove premium access from @${showPremiumToggleConfirm.username}?`
                : `Grant @${showPremiumToggleConfirm.username} premium access?`}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { handleTogglePremium(showPremiumToggleConfirm.id, showPremiumToggleConfirm.is_premium, showPremiumToggleConfirm.username); setShowPremiumToggleConfirm(null); }}
                disabled={actionProcessing}
                className={`w-full py-3 ${showPremiumToggleConfirm.is_premium ? "bg-red-600 hover:bg-red-500 shadow-red-600/20" : "bg-amber-500 hover:bg-amber-400 shadow-amber-500/20"} text-white font-bold rounded-xl text-sm transition-all shadow-lg active:scale-95 disabled:opacity-60`}>
                {showPremiumToggleConfirm.is_premium ? "Revoke Premium" : "Grant Premium"}
              </button>
              <button onClick={() => setShowPremiumToggleConfirm(null)}
                className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-xl text-sm hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Trial Mode Confirmation */}
      {showTrialConfirm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm" onClick={() => !trialLoading && setShowTrialConfirm(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border ${showTrialConfirm === "enable" ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/50" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 border-red-100 dark:border-red-900/50"}`}>
              <Crown size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
              {showTrialConfirm === "enable" ? "Activate Global Trial?" : "Deactivate Trial?"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed text-center">
              {showTrialConfirm === "enable"
                ? "This will grant ALL users 1 year of free premium access. Users who already have paid premium are unaffected. You can deactivate at any time."
                : `This will remove trial premium from ${(trialMode.user_count || 0).toLocaleString()} user${trialMode.user_count !== 1 ? "s" : ""}. Paid premium subscribers keep their access.`}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleTrialMode(showTrialConfirm)}
                disabled={trialLoading}
                className={`w-full py-3 text-white font-bold rounded-xl text-sm transition-all shadow-lg active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 ${showTrialConfirm === "enable" ? "bg-violet-600 hover:bg-violet-500 shadow-violet-600/20" : "bg-red-600 hover:bg-red-500 shadow-red-600/20"}`}
              >
                {trialLoading ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />}
                {trialLoading ? "Processing…" : showTrialConfirm === "enable" ? "Yes, Activate Trial" : "Yes, Deactivate"}
              </button>
              <button onClick={() => setShowTrialConfirm(null)} disabled={trialLoading}
                className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Delete Confirmation (Pop card) */}
      {showTaskDeleteConfirm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm" onClick={() => !actionProcessing && setShowTaskDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/50">
              <Trash2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Task?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-8 leading-relaxed">
              Permanently remove <span className="font-bold text-gray-900 dark:text-gray-200">&quot;{showTaskDeleteConfirm.title}&quot;</span> from the network? This action cannot be reversed.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { handleDeleteTask(showTaskDeleteConfirm.id); setShowTaskDeleteConfirm(null); }}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-600/20 active:scale-95">
                Purge Task
              </button>
              <button onClick={() => setShowTaskDeleteConfirm(null)}
                className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-xl text-sm hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/70 backdrop-blur-sm" onClick={() => !actionProcessing && setShowTaskModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowTaskModal(false)} disabled={actionProcessing} className="absolute top-5 right-5 p-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl text-gray-500 border border-gray-200 dark:border-gray-800 transition-colors"><X size={16} /></button>
            <h2 className="text-base font-black text-gray-900 dark:text-white mb-5 flex items-center gap-2"><ClipboardList size={16} className="text-blue-500 dark:text-blue-400" /> Assign Task</h2>
            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Assignee</label>
                <select required value={taskForm.assignee_id} onChange={e => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all">
                  <option value="" disabled>Select a user…</option>
                  {teamMembers.map(m => {
                    const u = allUsers.find(x => x.id === m.user_id);
                    return <option key={m.user_id} value={m.user_id}>{u ? `@${u.username}` : m.name} ({m.intended_role})</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Title</label>
                <input required type="text" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title…"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Description</label>
                <textarea required rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Details…"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all resize-none placeholder-gray-400 dark:placeholder-gray-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Priority</label>
                <div className="flex gap-2">
                  {["Low", "Medium", "High"].map(p => (
                    <button key={p} type="button" onClick={() => setTaskForm({ ...taskForm, priority: p })}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all
                        ${taskForm.priority === p
                          ? p === "High" ? "bg-red-600 text-white border-red-600" : p === "Medium" ? "bg-amber-500 text-white border-amber-500" : "bg-blue-600 text-white border-blue-600"
                          : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-500 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Linked Milestone (optional)</label>
                <input type="text" value={taskForm.linked_to} onChange={e => setTaskForm({ ...taskForm, linked_to: e.target.value })} placeholder="e.g. Project Alpha"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500" />
              </div>
              <button type="submit" disabled={actionProcessing || !taskForm.assignee_id || !taskForm.title}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                {actionProcessing ? <Loader2 size={14} className="animate-spin" /> : "Assign Task"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/70 backdrop-blur-sm" onClick={() => !actionProcessing && setShowInviteModal(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowInviteModal(false)} disabled={actionProcessing} className="absolute top-5 right-5 p-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl text-gray-500 border border-gray-200 dark:border-gray-800 transition-colors"><X size={16} /></button>
            <h2 className="text-base font-black text-gray-900 dark:text-white mb-5 flex items-center gap-2"><UserPlus size={16} className="text-blue-500 dark:text-blue-400" /> Invite to Apply</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Search User</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-600" size={13} />
                  <input value={inviteSearch} onChange={e => setInviteSearch(e.target.value)} placeholder="Username…"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
                {inviteSearch && (
                  <div className="mt-1.5 max-h-36 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                    {allUsers.filter(u => u.username?.toLowerCase().includes(inviteSearch.toLowerCase()) && u.id !== currentUserId).map(u => (
                      <div key={u.id} onClick={() => setInviteSearch(u.username)}
                        className="flex items-center gap-2.5 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800/60 last:border-0 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden relative shrink-0">
                          {u.avatar_url ? <Image src={u.avatar_url} alt="avatar" fill sizes="28px" className="object-cover" /> : null}
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">@{u.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Role</label>
                <div className="flex gap-2">
                  <button onClick={() => setInviteRole("member")}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${inviteRole === "member" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-500 border-gray-200 dark:border-gray-800"}`}>Member</button>
                  <button onClick={() => setInviteRole("cofounder")}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${inviteRole === "cofounder" ? "bg-violet-600 text-white border-violet-600" : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-500 border-gray-200 dark:border-gray-800"}`}>Co-founder</button>
                </div>
              </div>
              <button onClick={handleSendInvite} disabled={actionProcessing || !inviteSearch}
                className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm">
                {actionProcessing ? <Loader2 size={14} className="animate-spin" /> : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto z-10 bg-gray-950 rounded-2xl border border-gray-800 shadow-2xl">
            <button onClick={() => setSelectedUserId(null)}
              className="absolute top-5 right-5 z-50 p-2 bg-gray-900 hover:bg-gray-800 rounded-full text-gray-500 border border-gray-800 transition-colors">
              <X size={18} />
            </button>
            <div className="p-4 sm:p-6"><ProfileContent viewUserId={selectedUserId} /></div>
          </div>
        </div>
      )}

      {/* ── FREE-FORM INTERVIEW MODAL ── */}
      {showFreeInterviewModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFreeInterviewModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <Video size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900 dark:text-white">New Interview Room</h2>
                  <p className="text-[10px] text-gray-500 dark:text-gray-600 font-medium">Invite any user — no application required</p>
                </div>
              </div>
              <button onClick={() => setShowFreeInterviewModal(false)} className="p-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl text-gray-500 border border-gray-200 dark:border-gray-800 transition-all">
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* User search */}
              <div>
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[2px] mb-2">Select User</p>
                {freeInterviewSelectedUser ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                        {freeInterviewSelectedUser.avatar_url && <Image src={freeInterviewSelectedUser.avatar_url} alt="avatar" fill sizes="32px" className="object-cover" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1">
                          @{freeInterviewSelectedUser.username}
                          {freeInterviewSelectedUser.is_verified && <BadgeCheck size={11} className="text-blue-500" />}
                        </p>
                        <p className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">Selected</p>
                      </div>
                    </div>
                    <button onClick={() => setFreeInterviewSelectedUser(null)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      value={freeInterviewUserSearch}
                      onChange={e => searchUsersForInterview(e.target.value)}
                      placeholder="Search by username…"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                    />
                    {freeInterviewSearching && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                    {freeInterviewSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-10">
                        {freeInterviewSearchResults.map(u => (
                          <button key={u.id} onClick={() => { setFreeInterviewSelectedUser(u); setFreeInterviewSearchResults([]); setFreeInterviewUserSearch(""); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                            <div className="relative w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                              {u.avatar_url && <Image src={u.avatar_url} alt="avatar" fill sizes="28px" className="object-cover" />}
                            </div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1">
                              @{u.username} {u.is_verified && <BadgeCheck size={10} className="text-blue-500" />}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Job details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[2px] mb-1.5">Job Title</p>
                  <input
                    value={freeInterviewJobTitle}
                    onChange={e => setFreeInterviewJobTitle(e.target.value)}
                    placeholder="e.g. Frontend Engineer"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[2px] mb-1.5">Company</p>
                  <input
                    value={freeInterviewCompany}
                    onChange={e => setFreeInterviewCompany(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Questions */}
              <div>
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[2px] mb-2">Interview Questions</p>
                <div className="space-y-2">
                  {freeInterviewQuestions.map((q, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                        <input
                          value={q.text}
                          onChange={e => setFreeInterviewQuestions(prev => prev.map((x, idx) => idx === i ? { ...x, text: e.target.value } : x))}
                          placeholder="Question…"
                          className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all"
                        />
                        {freeInterviewQuestions.length > 1 && (
                          <button onClick={() => setFreeInterviewQuestions(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      <input
                        value={q.context}
                        onChange={e => setFreeInterviewQuestions(prev => prev.map((x, idx) => idx === i ? { ...x, context: e.target.value } : x))}
                        placeholder="Optional context or hint…"
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-[11px] text-gray-700 dark:text-gray-400 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  ))}
                  <button onClick={() => setFreeInterviewQuestions(prev => [...prev, { text: "", context: "" }])}
                    className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all">
                    <Plus size={13} /> Add Question
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
              <button onClick={() => setShowFreeInterviewModal(false)} disabled={freeInterviewCreating}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-800 transition-all disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleFreeInterviewCreate}
                disabled={freeInterviewCreating || !freeInterviewSelectedUser || !freeInterviewQuestions.some(q => q.text.trim())}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                {freeInterviewCreating ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {freeInterviewCreating ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INTERVIEW CREATION MODAL ── */}
      {showInterviewModal && interviewTarget && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInterviewModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <Video size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900 dark:text-white">Create Interview Room</h2>
                  <p className="text-[10px] text-gray-500 dark:text-gray-600 font-medium truncate max-w-[220px]">
                    {interviewTarget.jobTitle}{interviewTarget.company ? ` · ${interviewTarget.company}` : ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowInterviewModal(false)} className="p-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl text-gray-500 border border-gray-200 dark:border-gray-800 transition-all">
                <X size={15} />
              </button>
            </div>

            {/* Questions */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[2px]">Interview Questions</p>
              {interviewQuestions.map((q, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                    <input
                      value={q.text}
                      onChange={e => setInterviewQuestions(prev => prev.map((x, idx) => idx === i ? { ...x, text: e.target.value } : x))}
                      placeholder="Question…"
                      className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                    />
                    {interviewQuestions.length > 1 && (
                      <button onClick={() => setInterviewQuestions(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <input
                    value={q.context}
                    onChange={e => setInterviewQuestions(prev => prev.map((x, idx) => idx === i ? { ...x, context: e.target.value } : x))}
                    placeholder="Optional context or hint…"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-[11px] text-gray-700 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              ))}
              <button onClick={() => setInterviewQuestions(prev => [...prev, { text: "", context: "" }])}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 text-gray-400 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all">
                <Plus size={13} /> Add Question
              </button>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
              <button onClick={() => setShowInterviewModal(false)} disabled={creatingInterview}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-800 transition-all disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleCreateInterview} disabled={creatingInterview || !interviewQuestions.some(q => q.text.trim())}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                {creatingInterview ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {creatingInterview ? "Sending…" : "Send Interview Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} />
    </div>
  );
};

// ─── Admin Settings Panel ──────────────────────────────────────────────────────

function SettingsSection({ title, icon: Icon, iconColor = "text-blue-500", children }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-gray-900/60 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/80 dark:bg-white/[0.02]">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/[0.06] ${iconColor}`}>
          <Icon size={15} />
        </div>
        <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
      <div className="sm:w-44 shrink-0 pt-0.5">
        <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{label}</p>
        {hint && <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5 leading-snug">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", masked, mono }) {
  const [show, setShow] = useState(false);
  // Always use type="text" — type="password" blocks paste in many browsers.
  // When masked and not revealed, use -webkit-text-security to show bullets instead.
  return (
    <div className="relative">
      <input
        type={type === "email" ? "email" : type === "number" ? "number" : "text"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        data-1p-ignore
        style={masked && !show ? { WebkitTextSecurity: "disc" } : undefined}
        className={`w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all ${mono ? "font-mono text-xs" : ""} ${masked ? "pr-9" : ""}`}
      />
      {masked && (
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left p-3 rounded-xl border border-gray-100 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all group">
      <div className={`w-9 h-5 rounded-full flex items-center transition-all duration-200 shrink-0 ${checked ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`}>
        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-200 ml-0.5 ${checked ? "translate-x-4" : ""}`} />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{label}</p>
        {description && <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">{description}</p>}
      </div>
    </button>
  );
}

function SaveButton({ loading, onClick, label = "Save Changes", saved }) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 disabled:opacity-50
        ${saved ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"}`}>
      {loading ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
      {loading ? "Saving…" : saved ? "Saved!" : label}
    </button>
  );
}

function AdminSettingsPanel({ showToast, currentUserId }) {
  const [loading, setLoading] = useState(true);
  const [settingsTab, setSettingsTab] = useState("payment");

  // ── Paystack ──────────────────────────────────────────────────────
  const [pk, setPk] = useState("");
  const [sk, setSk] = useState("");
  const [whSecret, setWhSecret] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("9.99");
  const [annualPrice, setAnnualPrice] = useState("99.00");
  const [paystackSaving, setPaystackSaving] = useState(false);
  const [paystackSaved, setPaystackSaved] = useState(false);

  // ── Premium Settings ──────────────────────────────────────────────
  const [premiumEnabled, setPremiumEnabled] = useState(true);
  const [premiumMonthlyLabel, setPremiumMonthlyLabel] = useState("Gold");
  const [premiumAnnualLabel, setPremiumAnnualLabel] = useState("Gold Annual");
  const [premiumFeatures, setPremiumFeatures] = useState("Advanced courses\n1-on-1 coaching\nVerified certificate\nEvent access");
  const [premiumSaving, setPremiumSaving] = useState(false);
  const [premiumSaved, setPremiumSaved] = useState(false);

  // ── Verification ──────────────────────────────────────────────────
  const [verifyEnabled, setVerifyEnabled] = useState(true);
  const [verifyAutoApprove, setVerifyAutoApprove] = useState(false);
  const [verifyRequireLinkedIn, setVerifyRequireLinkedIn] = useState(false);
  const [verifyRequireResume, setVerifyRequireResume] = useState(true);
  const [verifySaving, setVerifySaving] = useState(false);
  const [verifySaved, setVerifySaved] = useState(false);

  // ── Platform ──────────────────────────────────────────────────────
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("We're doing a quick upgrade. Be back shortly!");
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [platformName, setPlatformName] = useState("BeOneOfUs");
  const [platformVersion, setPlatformVersion] = useState("1.0.0");
  const [supportEmail, setSupportEmail] = useState("");
  const [platformSaving, setPlatformSaving] = useState(false);
  const [platformSaved, setPlatformSaved] = useState(false);

  // ── Security ──────────────────────────────────────────────────────
  const [maxOtpAttempts, setMaxOtpAttempts] = useState("5");
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState("24");
  const [requireEmailVerify, setRequireEmailVerify] = useState(true);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securitySaved, setSecuritySaved] = useState(false);

  // ── Load all settings ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/settings", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        const s = json.settings || {};

        const val = (key, def) => (s[key]?.value !== undefined && s[key]?.value !== null) ? String(s[key].value) : def;
        const bval = (key, def) => s[key]?.value !== undefined ? Boolean(s[key].value) : def;

        // Paystack
        if (s["paystack_public_key"]?.is_set)  setPk(val("paystack_public_key", ""));
        if (s["paystack_secret_key"]?.is_set)   setSk(val("paystack_secret_key", ""));
        if (s["paystack_webhook_secret"]?.is_set) setWhSecret(val("paystack_webhook_secret", ""));
        setMonthlyPrice(val("premium_monthly_price_usd", "9.99"));
        setAnnualPrice(val("premium_annual_price_usd", "99.00"));

        // Premium
        setPremiumEnabled(bval("premium_enabled", true));
        setPremiumMonthlyLabel(val("premium_monthly_label", "Gold"));
        setPremiumAnnualLabel(val("premium_annual_label", "Gold Annual"));
        setPremiumFeatures(val("premium_features", "Advanced courses\n1-on-1 coaching\nVerified certificate\nEvent access"));

        // Verification
        setVerifyEnabled(bval("verification_enabled", true));
        setVerifyAutoApprove(bval("verification_auto_approve", false));
        setVerifyRequireLinkedIn(bval("verification_require_linkedin", false));
        setVerifyRequireResume(bval("verification_require_resume", true));

        // Platform
        setMaintenanceMode(bval("maintenance_mode", false));
        setMaintenanceMsg(val("maintenance_message", "We're doing a quick upgrade. Be back shortly!"));
        setRegistrationOpen(bval("registration_open", true));
        setShowOnboarding(bval("show_onboarding", true));
        setPlatformName(val("platform_name", "BeOneOfUs"));
        setPlatformVersion(val("platform_version", "1.0.0"));
        setSupportEmail(val("support_email", ""));

        // Security
        setMaxOtpAttempts(val("max_otp_attempts", "5"));
        setSessionTimeoutHours(val("session_timeout_hours", "24"));
        setRequireEmailVerify(bval("require_email_verification", true));
      } catch (err) {
        showToast(err.message || "Failed to load settings", "error");
      }
      setLoading(false);
    };
    load();
  }, []);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const saveBatch = async (batch, setSaving, setSaved) => {
    setSaving(true);
    setSaved(false);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ batch }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSaved(true);
      showToast("Settings saved successfully.");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      showToast(err.message || "Save failed", "error");
    }
    setSaving(false);
  };

  const savePaystack = async () => {
    setPaystackSaving(true);
    setPaystackSaved(false);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/settings/paystack", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          public_key: pk,
          secret_key: sk,
          webhook_secret: whSecret,
          plan_monthly_price_usd: parseFloat(monthlyPrice) || 9.99,
          plan_annual_price_usd: parseFloat(annualPrice) || 99.00,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPaystackSaved(true);
      showToast("Paystack configuration saved & validated.");
      setTimeout(() => setPaystackSaved(false), 3000);
    } catch (err) {
      showToast(err.message || "Save failed", "error");
    }
    setPaystackSaving(false);
  };

  const SETTINGS_TABS = [
    { id: "payment",      label: "Payment",      icon: CreditCard  },
    { id: "premium",      label: "Premium Plans", icon: Crown       },
    { id: "verification", label: "Verification",  icon: BadgeCheck  },
    { id: "platform",     label: "Platform",      icon: Globe       },
    { id: "security",     label: "Security",      icon: Shield      },
  ];

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-blue-500" />
        <p className="text-xs text-gray-400">Loading configuration…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-gray-900 border border-white/[0.06] p-5 shadow-lg">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings size={14} className="text-gray-400" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[2px]">Platform Configuration</span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">Admin Settings</h3>
            <p className="text-xs text-gray-500 mt-0.5">Configure payment, premium, verification, and platform-wide controls</p>
          </div>
          {maintenanceMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-xl">
              <AlertOctagon size={13} className="text-amber-400" />
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Maintenance Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 flex-wrap">
        {SETTINGS_TABS.map(tab => (
          <button key={tab.id} onClick={() => setSettingsTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all
              ${settingsTab === tab.id
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "bg-gray-100 dark:bg-white/[0.04] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.08]"}`}>
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PAYMENT TAB ── */}
      {settingsTab === "payment" && (
        <div className="space-y-4">
          <SettingsSection title="Paystack API Keys" icon={Key} iconColor="text-emerald-500">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/8 border border-emerald-200 dark:border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
              <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
              <span>Keys are validated against the Paystack API before saving. Secret keys are stored encrypted and only shown masked.</span>
            </div>
            <FieldRow label="Publishable Key" hint="Starts with pk_live_ or pk_test_">
              <TextInput value={pk} onChange={setPk} placeholder="pk_live_xxxxxxxxxxxxxxxxxxxxxxxx" mono />
            </FieldRow>
            <FieldRow label="Secret Key" hint="Starts with sk_live_ or sk_test_">
              <TextInput value={sk} onChange={setSk} placeholder="sk_live_xxxxxxxxxxxxxxxxxxxxxxxx" mono masked />
            </FieldRow>
            <FieldRow label="Webhook Secret" hint="From Paystack → Webhooks → Signing secret">
              <TextInput value={whSecret} onChange={setWhSecret} placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxxxx" mono masked />
            </FieldRow>
          </SettingsSection>

          <SettingsSection title="Subscription Pricing" icon={DollarSign} iconColor="text-blue-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow label="Monthly Price (USD)" hint="Charged in local currency via live rate">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} type="number" step="0.01" min="0"
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-white/[0.08] rounded-xl pl-7 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all" />
                </div>
              </FieldRow>
              <FieldRow label="Annual Price (USD)" hint="Charged in local currency via live rate">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input value={annualPrice} onChange={e => setAnnualPrice(e.target.value)} type="number" step="0.01" min="0"
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-white/[0.08] rounded-xl pl-7 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all" />
                </div>
              </FieldRow>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/8 border border-blue-100 dark:border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400 flex items-start gap-2">
              <Globe size={13} className="mt-0.5 shrink-0" />
              <span>Prices are converted to KES at live exchange rates via open.er-api.com. Monthly: ${monthlyPrice}/mo · Annual: ${annualPrice}/yr</span>
            </div>
          </SettingsSection>

          <SettingsSection title="Webhook Endpoint" icon={Webhook || Globe} iconColor="text-violet-500">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-white/[0.06] font-mono text-xs text-gray-700 dark:text-gray-400 select-all break-all">
              {typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/api/paystack/webhook
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-500 dark:text-gray-600">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
                <Check size={11} className="text-emerald-500" /> checkout.session.completed
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
                <Check size={11} className="text-emerald-500" /> charge.success
              </div>
            </div>
          </SettingsSection>

          <div className="flex justify-end">
            <SaveButton loading={paystackSaving} saved={paystackSaved} onClick={savePaystack} label="Save & Validate" />
          </div>
        </div>
      )}

      {/* ── PREMIUM TAB ── */}
      {settingsTab === "premium" && (
        <div className="space-y-4">
          <SettingsSection title="Premium Feature Toggle" icon={Star} iconColor="text-amber-500">
            <Toggle
              checked={premiumEnabled}
              onChange={setPremiumEnabled}
              label="Premium Subscriptions Active"
              description="When disabled, users cannot upgrade to premium. Existing subscribers are unaffected."
            />
          </SettingsSection>

          <SettingsSection title="Plan Labels" icon={Package} iconColor="text-blue-500">
            <FieldRow label="Monthly Plan Name" hint="Displayed to users on the upgrade page">
              <TextInput value={premiumMonthlyLabel} onChange={setPremiumMonthlyLabel} placeholder="Gold" />
            </FieldRow>
            <FieldRow label="Annual Plan Name" hint="Displayed on the annual upgrade option">
              <TextInput value={premiumAnnualLabel} onChange={setPremiumAnnualLabel} placeholder="Gold Annual" />
            </FieldRow>
          </SettingsSection>

          <SettingsSection title="Premium Features List" icon={CheckCircle2} iconColor="text-emerald-500">
            <FieldRow label="Feature List" hint="One feature per line — shown on the upgrade page">
              <textarea
                value={premiumFeatures}
                onChange={e => setPremiumFeatures(e.target.value)}
                rows={6}
                placeholder={"Advanced courses\n1-on-1 coaching\nVerified certificate"}
                className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all resize-none"
              />
            </FieldRow>
          </SettingsSection>

          <div className="flex justify-end">
            <SaveButton loading={premiumSaving} saved={premiumSaved}
              onClick={() => saveBatch({
                premium_enabled: premiumEnabled,
                premium_monthly_label: premiumMonthlyLabel,
                premium_annual_label: premiumAnnualLabel,
                premium_features: premiumFeatures,
              }, setPremiumSaving, setPremiumSaved)} />
          </div>
        </div>
      )}

      {/* ── VERIFICATION TAB ── */}
      {settingsTab === "verification" && (
        <div className="space-y-4">
          <SettingsSection title="Verification Controls" icon={BadgeCheck} iconColor="text-violet-500">
            <Toggle checked={verifyEnabled} onChange={setVerifyEnabled} label="Verification Requests Open" description="When disabled, users cannot submit new verification requests." />
            <Toggle checked={verifyAutoApprove} onChange={setVerifyAutoApprove} label="Auto-Approve Verifications" description="Automatically approve all verification requests without admin review." />
          </SettingsSection>

          <SettingsSection title="Verification Requirements" icon={FileText} iconColor="text-blue-500">
            <div className="space-y-2">
              <Toggle checked={verifyRequireResume} onChange={setVerifyRequireResume} label="Resume Required" description="Users must upload a resume/CV to apply for verification." />
              <Toggle checked={verifyRequireLinkedIn} onChange={setVerifyRequireLinkedIn} label="LinkedIn Profile Required" description="Users must provide a LinkedIn URL to apply for verification." />
            </div>
          </SettingsSection>

          <div className="flex justify-end">
            <SaveButton loading={verifySaving} saved={verifySaved}
              onClick={() => saveBatch({
                verification_enabled: verifyEnabled,
                verification_auto_approve: verifyAutoApprove,
                verification_require_resume: verifyRequireResume,
                verification_require_linkedin: verifyRequireLinkedIn,
              }, setVerifySaving, setVerifySaved)} />
          </div>
        </div>
      )}

      {/* ── PLATFORM TAB ── */}
      {settingsTab === "platform" && (
        <div className="space-y-4">
          <SettingsSection title="Site Identity" icon={Globe} iconColor="text-blue-500">
            <FieldRow label="Platform Name" hint="Displayed in emails, notifications, and the header">
              <TextInput value={platformName} onChange={setPlatformName} placeholder="BeOneOfUs" />
            </FieldRow>
            <FieldRow label="Platform Version" hint="Version label shown in the sidebar and footer (e.g. v1.0.0, v2.1, beta)">
              <TextInput value={platformVersion} onChange={setPlatformVersion} placeholder="1.0.0" mono />
            </FieldRow>
            <FieldRow label="Support Email" hint="Reply-to address for all system emails">
              <TextInput value={supportEmail} onChange={setSupportEmail} placeholder="support@yourdomain.com" type="email" />
            </FieldRow>
          </SettingsSection>

          <SettingsSection title="Access Controls" icon={Lock} iconColor="text-amber-500">
            <Toggle checked={registrationOpen} onChange={setRegistrationOpen} label="Registration Open" description="When disabled, new users cannot create accounts." />
            <Toggle checked={showOnboarding} onChange={setShowOnboarding} label="Show Onboarding Flow" description="Display the welcome/onboarding wizard to new users after signup." />
          </SettingsSection>

          <SettingsSection title="Maintenance Mode" icon={Wrench} iconColor="text-red-500">
            <Toggle checked={maintenanceMode} onChange={setMaintenanceMode}
              label="Enable Maintenance Mode"
              description="Redirects all non-admin visitors to a maintenance page. Admins can still access the platform." />
            {maintenanceMode && (
              <FieldRow label="Maintenance Message" hint="Shown to visitors during maintenance">
                <textarea
                  value={maintenanceMsg}
                  onChange={e => setMaintenanceMsg(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all resize-none"
                />
              </FieldRow>
            )}
          </SettingsSection>

          <div className="flex justify-end">
            <SaveButton loading={platformSaving} saved={platformSaved}
              onClick={() => saveBatch({
                platform_name: platformName,
                platform_version: platformVersion,
                support_email: supportEmail,
                registration_open: registrationOpen,
                show_onboarding: showOnboarding,
                maintenance_mode: maintenanceMode,
                maintenance_message: maintenanceMsg,
              }, setPlatformSaving, setPlatformSaved)} />
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {settingsTab === "security" && (
        <div className="space-y-4">
          <SettingsSection title="Authentication" icon={Shield} iconColor="text-red-500">
            <Toggle checked={requireEmailVerify} onChange={setRequireEmailVerify} label="Require Email Verification" description="New users must verify their email before accessing the platform." />
            <FieldRow label="Max OTP Attempts" hint="Lockout after this many failed OTP attempts per 10-min window">
              <input value={maxOtpAttempts} onChange={e => setMaxOtpAttempts(e.target.value)} type="number" min="1" max="20"
                className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all" />
            </FieldRow>
            <FieldRow label="Session Timeout (hours)" hint="Auto-sign out inactive sessions after this many hours">
              <input value={sessionTimeoutHours} onChange={e => setSessionTimeoutHours(e.target.value)} type="number" min="1" max="720"
                className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all" />
            </FieldRow>
          </SettingsSection>

          <SettingsSection title="Platform Security Info" icon={ShieldCheck} iconColor="text-emerald-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "CSP Headers",          status: "Active",   color: "emerald" },
                { label: "HSTS",                  status: "Active",   color: "emerald" },
                { label: "Rate Limiting",         status: "Active",   color: "emerald" },
                { label: "Service Role Isolation",status: "Active",   color: "emerald" },
                { label: "OTP Brute-force Guard", status: "Active",   color: "emerald" },
                { label: "RLS Policies",          status: "Supabase", color: "blue"    },
              ].map(({ label, status, color }) => (
                <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05]">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg
                    ${color === "emerald" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </SettingsSection>

          <div className="flex justify-end">
            <SaveButton loading={securitySaving} saved={securitySaved}
              onClick={() => saveBatch({
                require_email_verification: requireEmailVerify,
                max_otp_attempts: parseInt(maxOtpAttempts) || 5,
                session_timeout_hours: parseInt(sessionTimeoutHours) || 24,
              }, setSecuritySaving, setSecuritySaved)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Support Tool ─────────────────────────────────────────────────────────────

const mdComponents = {
  p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold text-blue-800 dark:text-blue-200" {...props} />,
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div className="rounded-lg overflow-hidden my-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1E1E1E]">
        <div className="px-3 py-1.5 text-[9px] font-mono text-gray-500 uppercase tracking-widest bg-gray-100 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">{match[1]}</div>
        <SyntaxHighlighter {...props} style={vscDarkPlus} language={match[1]} PreTag="div"
          customStyle={{ margin: 0, padding: "0.75rem", background: "transparent", fontSize: "0.7rem" }}>
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code {...props} className="bg-gray-100 dark:bg-gray-700/60 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono text-[10px]">{children}</code>
    );
  }
};


export default AdminPanelTool;
