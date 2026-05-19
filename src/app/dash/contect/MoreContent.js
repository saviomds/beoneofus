"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import {
  Zap, HelpCircle, Code2, LogOut, ChevronRight, X, Globe, Send, Quote,
  Copy, Check, Plus, Activity, Database, Key, User, AlertCircle,
  AlertTriangle, ShieldAlert, ShieldCheck, Loader2, Search, Trash2,
  Bot, UserCog, FileText, ClipboardList, UserPlus, Briefcase,
  BarChart3, Crown, Users, Award, TrendingUp, RefreshCw, Eye,
  BadgeCheck, Filter, ArrowUpRight, Terminal, Layers, Bell,
  CheckCircle2, Clock, XCircle, ChevronDown, MoreHorizontal,
  Shield, Video, Handshake, BookOpen, Mail, Hash, MessageSquare, Smile, Menu, Heart,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "../../supabaseClient";
import ProfileContent from "./ProfileContent";
import FounderContent from "./FounderContent";
import SponsorsAdminContent from "./SponsorsAdminContent";
import VerifiedBadge from "../../components/VerifiedBadge";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// ─── Shared UI Primitives ────────────────────────────────────────────────────

function Toast({ message, type }) {
  if (!message) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-[500] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-xl
      animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-xs
      ${type === "error"
        ? "bg-white/95 dark:bg-gray-900/95 border-red-200/60 dark:border-red-500/20 text-red-600 dark:text-red-400 shadow-red-500/10"
        : "bg-white/95 dark:bg-gray-900/95 border-emerald-200/60 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10"}`}>
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${type === "error" ? "bg-red-50 dark:bg-red-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"}`}>
        {type === "error" ? <AlertTriangle size={12} /> : <Check size={12} />}
      </div>
      <span className="text-xs font-semibold tracking-tight">{message}</span>
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState({ message: "", type: "success" });
  const show = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3500);
  }, []);
  return [toast, show];
}

function StatCard({ icon: Icon, label, value, sub, color = "blue", loading }) {
  const palette = {
    blue:   { border: "border-blue-100 dark:border-blue-500/10",   bg: "bg-white dark:bg-gray-900/70",   icon: "text-blue-500",    iconBg: "bg-blue-50 dark:bg-blue-500/10",    val: "text-blue-600 dark:text-blue-400",    glowBg: "bg-blue-400" },
    amber:  { border: "border-amber-100 dark:border-amber-500/10",  bg: "bg-white dark:bg-gray-900/70",  icon: "text-amber-500",   iconBg: "bg-amber-50 dark:bg-amber-500/10",   val: "text-amber-600 dark:text-amber-400",   glowBg: "bg-amber-400" },
    violet: { border: "border-violet-100 dark:border-violet-500/10", bg: "bg-white dark:bg-gray-900/70", icon: "text-violet-500",  iconBg: "bg-violet-50 dark:bg-violet-500/10",  val: "text-violet-600 dark:text-violet-400",  glowBg: "bg-violet-400" },
    emerald:{ border: "border-emerald-100 dark:border-emerald-500/10",bg: "bg-white dark:bg-gray-900/70",icon: "text-emerald-500", iconBg: "bg-emerald-50 dark:bg-emerald-500/10", val: "text-emerald-600 dark:text-emerald-400", glowBg: "bg-emerald-400" },
    rose:   { border: "border-rose-100 dark:border-rose-500/10",   bg: "bg-white dark:bg-gray-900/70",   icon: "text-rose-500",    iconBg: "bg-rose-50 dark:bg-rose-500/10",    val: "text-rose-600 dark:text-rose-400",    glowBg: "bg-rose-400" },
  };
  const c = palette[color];
  const display = typeof value === "number" ? value.toLocaleString() : (value ?? "—");
  const len = String(display).length;
  const sizeClass = len > 9 ? "text-base" : len > 6 ? "text-xl" : len > 4 ? "text-2xl" : "text-3xl";
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bg} p-4 shadow-sm hover:shadow-md transition-all duration-200 group cursor-default`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] leading-tight pr-1">{label}</p>
        <div className={`${c.iconBg} ${c.icon} w-7 h-7 rounded-lg flex items-center justify-center shrink-0`}><Icon size={13} /></div>
      </div>
      <p className={`${sizeClass} font-black tabular-nums leading-tight ${c.val} break-all`}>
        {loading ? <Loader2 size={18} className="animate-spin" /> : display}
      </p>
      {sub && <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-1.5 font-semibold truncate">{sub}</p>}
      <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-15 transition-opacity duration-500 ${c.glowBg}`} />
    </div>
  );
}

function Badge({ children, color = "gray" }) {
  const colors = {
    gray:    "bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700/50",
    blue:    "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    amber:   "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    red:     "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
    violet:  "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${colors[color]}`}>
      {children}
    </span>
  );
}

function statusColor(status) {
  if (!status) return "gray";
  if (status === "accepted" || status === "verified" || status === "completed") return "emerald";
  if (status === "declined" || status === "rejected") return "red";
  if (status === "pending") return "amber";
  return "blue";
}

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

// ─── System Status ───────────────────────────────────────────────────────────

const SystemStatusTool = () => {
  const [ping, setPing] = useState(0);
  const [history, setHistory] = useState(Array(30).fill(0));
  const [status, setStatus] = useState("Operational");

  useEffect(() => {
    let isMounted = true;
    const checkPing = async () => {
      const start = Date.now();
      try {
        await supabase.from("profiles").select("id").limit(1);
        const duration = Date.now() - start;
        if (isMounted) {
          setPing(duration);
          setHistory(prev => [...prev.slice(1), duration]);
          setStatus(duration > 800 ? "Degraded" : "Operational");
        }
      } catch {
        if (isMounted) { setStatus("Outage"); setPing(0); setHistory(prev => [...prev.slice(1), 0]); }
      }
    };
    checkPing();
    const iv = setInterval(checkPing, 2000);
    return () => { isMounted = false; clearInterval(iv); };
  }, []);

  const maxPing = Math.max(...history, 1);

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-gray-500" />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Latency</p>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-5xl font-black text-gray-900 dark:text-white tabular-nums">{ping}</span>
            <span className="text-gray-500 mb-1 font-bold text-sm">ms</span>
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Database size={14} className="text-gray-500" />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Health</p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${status === "Operational" ? "bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" : "bg-red-500 shadow-lg shadow-red-500/50"}`} />
            <span className={`text-xl font-black ${status === "Operational" ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>{status}</span>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Real-Time Packet Monitor</p>
        <div className="h-32 flex items-end gap-1 w-full">
          {history.map((val, i) => {
            const h = Math.max(2, Math.min(100, (val / maxPing) * 100));
            const opacity = 0.3 + (i / history.length) * 0.7;
            return (
              <div key={i} className="flex-1 bg-blue-500 rounded-t-sm transition-all duration-300"
                style={{ height: `${h}%`, opacity }} title={`${val}ms`} />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── API Access ───────────────────────────────────────────────────────────────

const ApiAccessTool = () => {
  const [keys, setKeys] = useState([
    { id: 1, name: "Production Key", key: "key_live_9a8b7c6d5e4f3a2b1c0d9e8f", created: "2023-11-20" },
    { id: 2, name: "Development Key", key: "key_test_1b2c3d4e5f6a7b8c9d0e1f2a", created: "2024-01-15" },
  ]);
  const [copied, setCopied] = useState(null);

  const handleCopy = (key) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateKey = () => {
    const live = Math.random() > 0.5;
    const newKey = (live ? "key_live_" : "key_test_") + Array.from({ length: 24 }, () => Math.random().toString(36).charAt(2)).join("");
    setKeys(prev => [{ id: Date.now(), name: "New API Key", key: newKey, created: new Date().toISOString().split("T")[0] }, ...prev]);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-900 dark:text-white font-black text-lg">Active Secret Keys</h3>
          <p className="text-gray-500 text-xs mt-0.5">Never share keys in public repositories.</p>
        </div>
        <button onClick={generateKey}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20">
          <Plus size={14} /> Generate Key
        </button>
      </div>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {keys.length === 0
          ? <div className="p-10 text-center text-gray-500 dark:text-gray-600 text-sm">No keys. Generate one to start.</div>
          : keys.map(k => (
            <div key={k.id} className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Key size={12} className={k.key.startsWith("key_live") ? "text-emerald-500 dark:text-emerald-400" : "text-amber-500 dark:text-amber-400"} />
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{k.name}</p>
                  <Badge color={k.key.startsWith("key_live") ? "emerald" : "amber"}>{k.key.startsWith("key_live") ? "live" : "test"}</Badge>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded inline-block">
                  {k.key.substring(0, 14)}••••••••••••
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <span className="text-[10px] text-gray-500 dark:text-gray-600 font-bold hidden sm:block">{k.created}</span>
                <button onClick={() => handleCopy(k.key)}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all border border-gray-200 dark:border-gray-700">
                  {copied === k.key ? <Check size={14} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={14} />}
                </button>
                <button onClick={() => setKeys(prev => prev.filter(x => x.id !== k.id))}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-all border border-gray-200 dark:border-gray-700">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
};

// ─── Community Hub ───────────────────────────────────────────────────────────

const COMMUNITY_CHANNELS = [
  { id: "general",  label: "general",  Icon: Globe,       desc: "Open discussion for all members",       color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950/30"   },
  { id: "tech",     label: "tech-talk",Icon: Code2,       desc: "Engineering, code & architecture",      color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30"},
  { id: "career",   label: "career",   Icon: Briefcase,   desc: "Jobs, growth & career advice",          color: "text-green-500",  bg: "bg-green-50 dark:bg-green-950/30" },
  { id: "showcase", label: "showcase", Icon: Award,       desc: "Share projects, wins & launches",       color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "help",     label: "help",     Icon: HelpCircle,  desc: "Ask the community for help",            color: "text-red-500",    bg: "bg-red-50 dark:bg-red-950/30"     },
];

function formatMsgTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

const CommunityHubTool = ({ currentUserId }) => {
  const [allMessages, setAllMessages]     = useState([]);
  const [input, setInput]                 = useState("");
  const [error, setError]                 = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeChannel, setActiveChannel] = useState("general");
  const [onlineUsers, setOnlineUsers]     = useState([]);
  const [typingUsers, setTypingUsers]     = useState([]);
  const [myProfile, setMyProfile]         = useState(null);
  const [hoveredMsg, setHoveredMsg]       = useState(null);
  const [copiedMsg, setCopiedMsg]         = useState(null);
  const [showSidebar, setShowSidebar]     = useState(false);
  const [sending, setSending]             = useState(false);
  const scrollRef       = useRef(null);
  const inputRef        = useRef(null);
  const presenceRef     = useRef(null);
  const typingTimers    = useRef({});

  const currentChannel = COMMUNITY_CHANNELS.find(c => c.id === activeChannel) || COMMUNITY_CHANNELS[0];

  /* fetch own profile */
  useEffect(() => {
    if (!currentUserId) return;
    supabase.from("profiles").select("username, avatar_url, is_verified")
      .eq("id", currentUserId).single()
      .then(({ data }) => { if (data) setMyProfile(data); });
  }, [currentUserId]);

  /* messages + realtime */
  useEffect(() => {
    const loadMessages = async () => {
      const { data, error: err } = await supabase
        .from("community_messages")
        .select("*, profiles:user_id(username, avatar_url, is_verified)")
        .order("created_at", { ascending: true })
        .limit(150);
      if (err) setError(true);
      else setAllMessages(data || []);
    };
    loadMessages();

    const ch = supabase.channel("community:messages-v2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, async (payload) => {
        const { data } = await supabase.from("community_messages")
          .select("*, profiles:user_id(username, avatar_url, is_verified)")
          .eq("id", payload.new.id).single();
        if (data) setAllMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  /* presence — online count + typing */
  useEffect(() => {
    if (!currentUserId || !myProfile) return;

    const pCh = supabase.channel("community:presence", {
      config: { presence: { key: currentUserId } },
    });

    pCh
      .on("presence", { event: "sync" }, () => {
        const state = pCh.presenceState();
        const users = Object.values(state).flat().map(u => u.info).filter(Boolean);
        setOnlineUsers(users);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.uid === currentUserId) return;
        const uname = payload.username || "Someone";
        setTypingUsers(prev => prev.includes(uname) ? prev : [...prev, uname]);
        clearTimeout(typingTimers.current[uname]);
        typingTimers.current[uname] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== uname));
        }, 3000);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await pCh.track({ info: { id: currentUserId, username: myProfile.username, avatar_url: myProfile.avatar_url } });
        }
      });

    presenceRef.current = pCh;
    return () => supabase.removeChannel(pCh);
  }, [currentUserId, myProfile]);

  /* auto-scroll */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [allMessages, typingUsers, activeChannel]);

  /* broadcast typing */
  const broadcastTyping = useCallback(() => {
    if (!presenceRef.current || !myProfile) return;
    presenceRef.current.send({ type: "broadcast", event: "typing", payload: { uid: currentUserId, username: myProfile.username } });
  }, [currentUserId, myProfile]);

  /* filter messages per channel */
  const messages = useMemo(() => {
    const hasChannel = allMessages.some(m => "channel" in m && m.channel);
    if (!hasChannel) return activeChannel === "general" ? allMessages : [];
    return allMessages.filter(m => (m.channel || "general") === activeChannel);
  }, [allMessages, activeChannel]);

  /* group by date */
  const grouped = useMemo(() => {
    const out = [];
    let lastDate = "";
    messages.forEach((msg, idx) => {
      const dateKey = msg.created_at ? new Date(msg.created_at).toDateString() : "";
      if (dateKey && dateKey !== lastDate) {
        out.push({ type: "date", label: formatDateLabel(msg.created_at), key: `d-${dateKey}` });
        lastDate = dateKey;
      }
      const prev = messages[idx - 1];
      const grouped = prev?.user_id === msg.user_id && dateKey === (prev?.created_at ? new Date(prev.created_at).toDateString() : "");
      out.push({ type: "msg", ...msg, grouped });
    });
    return out;
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !currentUserId || sending) return;
    setInput("");
    setSending(true);
    const optimistic = {
      id: `opt-${Date.now()}`,
      user_id: currentUserId,
      text,
      created_at: new Date().toISOString(),
      channel: activeChannel,
      profiles: myProfile || { username: "You" },
      grouped: false,
    };
    setAllMessages(prev => [...prev, optimistic]);
    try {
      const payload = { user_id: currentUserId, text };
      try { payload.channel = activeChannel; } catch {}
      await supabase.from("community_messages").insert(payload);
    } finally { setSending(false); }
  };

  const handleCopyMsg = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsg(id);
      setTimeout(() => setCopiedMsg(null), 2000);
    });
  };

  const onlineCount = onlineUsers.length || 1;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full p-10 text-center">
      <AlertCircle size={40} className="text-red-400/40 mb-4" />
      <p className="text-red-500 dark:text-red-400 font-bold text-sm mb-1">Community Hub Not Initialized</p>
      <p className="text-gray-400 text-xs max-w-xs leading-relaxed">
        The <code className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-mono">community_messages</code> table doesn't exist yet. Run the setup SQL migration to enable global chat.
      </p>
    </div>
  );

  return (
    <div className="flex h-full bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-w-4xl mx-auto shadow-sm">

      {/* ── Sidebar ── */}
      <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col w-52 shrink-0 border-r border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 absolute md:relative inset-y-0 left-0 z-30 md:z-auto`}>
        {/* Sidebar header */}
        <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={13} className="text-blue-500" />
            <span className="text-[11px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Community</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[10px] text-gray-400">{onlineCount} online</span>
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Channels</p>
          {COMMUNITY_CHANNELS.map(ch => {
            const isActive = ch.id === activeChannel;
            const count = ch.id === "general" ? allMessages.length : allMessages.filter(m => m.channel === ch.id).length;
            return (
              <button
                key={ch.id}
                onClick={() => { setActiveChannel(ch.id); setShowSidebar(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg transition-all text-left ${isActive ? "bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-800/50"}`}
              >
                <ch.Icon size={13} className={isActive ? ch.color : "text-gray-400 dark:text-gray-500"} />
                <span className={`flex-1 text-[11px] font-bold truncate ${isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}>
                  # {ch.label}
                </span>
                {count > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isActive ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Online users */}
        {onlineUsers.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-800 py-2 px-4">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Online now</p>
            <div className="space-y-1.5">
              {onlineUsers.slice(0, 5).map(u => (
                <div key={u.id} className="flex items-center gap-2">
                  <div className="relative shrink-0">
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-[8px] font-black text-gray-500">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                        : (u.username?.[0] || "?").toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white dark:border-gray-900" />
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate font-medium">@{u.username}</span>
                </div>
              ))}
              {onlineUsers.length > 5 && (
                <p className="text-[9px] text-gray-400">+{onlineUsers.length - 5} more</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {showSidebar && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/40 backdrop-blur-sm" onClick={() => setShowSidebar(false)} />
      )}

      {/* ── Main chat ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Channel header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-950">
          <button onClick={() => setShowSidebar(s => !s)} className="md:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
            <Menu size={16} />
          </button>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${currentChannel.bg}`}>
            <currentChannel.Icon size={14} className={currentChannel.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-gray-900 dark:text-gray-100"># {currentChannel.label}</span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{currentChannel.desc}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-900/40">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400">{onlineCount} online</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400">
              <MessageSquare size={11} />
              <span>{messages.length}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5" ref={scrollRef}>
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className={`w-14 h-14 rounded-2xl ${currentChannel.bg} flex items-center justify-center mb-4`}>
                <currentChannel.Icon size={24} className={currentChannel.color} />
              </div>
              <p className="font-black text-sm text-gray-700 dark:text-gray-300 mb-1"># {currentChannel.label}</p>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">{currentChannel.desc}. Be the first to post!</p>
            </div>
          ) : (
            grouped.map(item => {
              if (item.type === "date") return (
                <div key={item.key} className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 shrink-0">{item.label}</span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                </div>
              );

              const isMe = item.user_id === currentUserId;
              return (
                <div
                  key={item.id}
                  className={`flex gap-2.5 group ${isMe ? "flex-row-reverse" : "flex-row"} ${item.grouped ? "mt-0.5" : "mt-3"}`}
                  onMouseEnter={() => setHoveredMsg(item.id)}
                  onMouseLeave={() => setHoveredMsg(null)}
                >
                  {/* Avatar */}
                  {!isMe && (
                    <div
                      onClick={() => !item.id.toString().startsWith("opt-") && setSelectedUserId(item.user_id)}
                      className={`relative w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-[9px] text-gray-500 uppercase shrink-0 self-end overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400/50 transition-all ${item.grouped ? "opacity-0 pointer-events-none" : ""}`}
                    >
                      {item.profiles?.avatar_url
                        ? <Image src={item.profiles.avatar_url} alt="" fill sizes="28px" className="object-cover" />
                        : (item.profiles?.username || "?").substring(0, 2)}
                    </div>
                  )}

                  {/* Bubble + meta */}
                  <div className={`flex flex-col max-w-[78%] ${isMe ? "items-end" : "items-start"}`}>
                    {!item.grouped && !isMe && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">@{item.profiles?.username}</span>
                        {item.profiles?.is_verified && <VerifiedBadge size={9} />}
                        {item.created_at && (
                          <span className="text-[9px] text-gray-300 dark:text-gray-600">{formatMsgTime(item.created_at)}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-end gap-1.5">
                      {/* Hover actions (non-me messages, shown left) */}
                      {!isMe && hoveredMsg === item.id && (
                        <button
                          onClick={() => handleCopyMsg(item.id, item.text)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                        >
                          {copiedMsg === item.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                        </button>
                      )}

                      <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words max-w-full ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-sm shadow-sm shadow-blue-200 dark:shadow-blue-900/30"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200/70 dark:border-gray-700/50 rounded-bl-sm"
                      }`}>
                        {item.text}
                      </div>

                      {/* Hover actions (my messages, shown right) */}
                      {isMe && hoveredMsg === item.id && (
                        <button
                          onClick={() => handleCopyMsg(item.id, item.text)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                        >
                          {copiedMsg === item.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                        </button>
                      )}
                    </div>

                    {/* My message time */}
                    {isMe && !item.grouped && item.created_at && (
                      <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-0.5 px-1">{formatMsgTime(item.created_at)}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2.5 mt-3">
              <div className="w-7 h-7 shrink-0" />
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/50 px-3.5 py-2.5 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {typingUsers.length === 1 ? `${typingUsers[0]} is typing` : `${typingUsers.length} people are typing`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 focus-within:border-blue-400 dark:focus-within:border-blue-600 transition-all">
            <span className={`text-[11px] font-bold ${currentChannel.color} shrink-0`}># {currentChannel.label}</span>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); broadcastTyping(); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              placeholder={currentUserId ? `Message # ${currentChannel.label}…` : "Sign in to chat…"}
              disabled={!currentUserId || sending}
              className="flex-1 bg-transparent text-xs text-gray-900 dark:text-gray-100 focus:outline-none placeholder-gray-400 dark:placeholder-gray-600 min-w-0"
            />
            {input.length > 0 && (
              <span className={`text-[9px] font-bold shrink-0 ${input.length > 480 ? "text-red-500" : "text-gray-300 dark:text-gray-600"}`}>
                {input.length}/500
              </span>
            )}
            <button
              type="submit"
              disabled={!input.trim() || !currentUserId || sending || input.length > 500}
              className="w-7 h-7 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all shrink-0"
            >
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </button>
          </div>
          <p className="text-[10px] text-gray-300 dark:text-gray-700 mt-1.5 text-center">Enter to send · Be kind · No spam</p>
        </form>
      </div>

      {/* Profile modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/70 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto z-10 bg-white dark:bg-gray-950 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-2xl">
            <button onClick={() => setSelectedUserId(null)}
              className="absolute top-5 right-5 z-50 p-2 bg-gray-100 dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 rounded-full text-gray-500 transition-colors border border-gray-200 dark:border-gray-800">
              <X size={18} />
            </button>
            <div className="p-4 sm:p-6"><ProfileContent viewUserId={selectedUserId} /></div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Admin Panel ─────────────────────────────────────────────────────────────

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
      .select("id, username, avatar_url, status, is_verified, is_admin, is_premium, premium_requested, role")
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subId, action, adminId: session.user.id, note }),
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
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                            <p className="text-[11px] text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1">
                              <Users size={10} /> {(trialMode.user_count || 0).toLocaleString()} users on trial
                            </p>
                            {trialMode.expires_at && (
                              <p className={`text-[11px] font-bold flex items-center gap-1 ${Math.max(0, Math.ceil((new Date(trialMode.expires_at) - Date.now()) / 86400000)) < 30 ? "text-red-500" : Math.max(0, Math.ceil((new Date(trialMode.expires_at) - Date.now()) / 86400000)) < 90 ? "text-amber-500" : "text-gray-500 dark:text-gray-400"}`}>
                                <Clock size={10} /> {Math.max(0, Math.ceil((new Date(trialMode.expires_at) - Date.now()) / 86400000))} days remaining
                              </p>
                            )}
                          </div>
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
                            {user.is_premium && <Crown size={12} className="text-amber-500 dark:text-amber-400" />}
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

function TypewriterMessage({ content }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { setDisplayed(content.slice(0, i + 1)); i++; if (i >= content.length) clearInterval(t); }, 12);
    return () => clearInterval(t);
  }, [content]);
  return <ReactMarkdown components={mdComponents}>{displayed}</ReactMarkdown>;
}

const SUPPORT_CATEGORIES = [
  { id: "technical", label: "Technical Issue", color: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40" },
  { id: "account",   label: "Account & Profile", color: "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40" },
  { id: "feature",   label: "Feature Request", color: "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/40" },
  { id: "billing",   label: "Billing & Premium", color: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40" },
  { id: "bug",       label: "Bug Report", color: "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/40" },
  { id: "general",   label: "General Question", color: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40" },
];

const QUICK_PROMPTS = [
  "How do I reset my password?",
  "Why is my profile not showing up in search?",
  "How do I connect with another user?",
  "How do I upgrade to Premium?",
  "I can't upload a profile picture",
  "How do I delete my account?",
];

const FAQ_ITEMS = [
  {
    q: "How do I verify my profile?",
    a: "Go to **Settings → Profile** and click **Request Verification**. Our team reviews accounts within 48 hours. You need at least one connection and a complete profile to be eligible.",
  },
  {
    q: "Why aren't my notifications loading?",
    a: "Try a hard refresh (`Ctrl+Shift+R`). If the issue persists, clear your browser cache or check your notification permissions in **Settings → Notifications**.",
  },
  {
    q: "How do I cancel my Premium subscription?",
    a: "Navigate to **Settings → Billing** and click **Cancel Subscription**. Your Premium access continues until the end of the current billing period.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Go to **Settings → Privacy** and click **Download my data**. A JSON export will be emailed to your registered address within 24 hours.",
  },
  {
    q: "How does the AI Assistant work?",
    a: "The beoneofus AI uses large language models to provide career guidance, code review, and support. Conversations are not stored beyond your current session unless you explicitly save them.",
  },
  {
    q: "How do I report a user or content?",
    a: "Click the **⋯** menu on any post or profile and select **Report**. Our moderation team reviews all reports within 24 hours.",
  },
];

const SupportTool = () => {
  const [issue, setIssue] = useState("");
  const [category, setCategory] = useState("general");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [ratings, setRatings] = useState({});
  const [openFaq, setOpenFaq] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isProcessing]);

  const handleSubmit = async (text) => {
    const cur = (text || issue).trim();
    if (!cur || isProcessing) return;
    setIssue("");
    const msgId = Date.now();
    setMessages(prev => [...prev, { id: msgId, role: "user", content: cur, category }]);
    setIsProcessing(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: `You are the expert support AI for beoneofus — a professional networking and career platform. Category: ${category}. User issue: "${cur}". Respond with empathy and precision. Use markdown for structure when helpful.` }] }),
      });
      const responseText = await res.text();
      let data;
      try { data = JSON.parse(responseText); } catch { throw new Error("AI service unavailable. Try again shortly."); }
      if (!res.ok) throw new Error(data.error || "Failed to get response");
      setMessages(prev => [...prev, { id: Date.now(), role: "ai", content: data.message.content.replace(/^["']|["']$/g, "").trim(), isNew: true }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), role: "ai", content: `**Error:** ${err.message}`, isNew: false, isError: true }]);
    } finally { setIsProcessing(false); }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); });
  };

  const handleRate = (id, val) => setRatings(prev => ({ ...prev, [id]: prev[id] === val ? null : val }));

  const catColor = SUPPORT_CATEGORIES.find(c => c.id === category)?.color || "";

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-4">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-900 p-5 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 backdrop-blur-sm">
            <HelpCircle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="font-black text-base">Help & Support</h2>
              <span className="flex items-center gap-1 text-[10px] font-black bg-green-400/20 text-green-200 px-2 py-0.5 rounded-full border border-green-300/20">
                <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                AI Online
              </span>
            </div>
            <p className="text-xs text-blue-100/80 leading-relaxed">Ask anything about beoneofus — account help, technical issues, billing, and more.</p>
          </div>
          <div className="shrink-0 text-right hidden sm:block">
            <p className="text-[10px] text-blue-200/60 uppercase tracking-widest">Avg. response</p>
            <p className="text-sm font-black text-white">~3 sec</p>
          </div>
        </div>
      </div>

      {/* Category selector */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select a category</p>
        <div className="flex flex-wrap gap-2">
          {SUPPORT_CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all ${c.id === category ? c.color + " ring-2 ring-offset-1 ring-current/30" : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      {messages.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-black text-gray-900 dark:text-gray-100">Support Chat</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catColor}`}>
                {SUPPORT_CATEGORIES.find(c => c.id === category)?.label}
              </span>
            </div>
            <button onClick={() => setMessages([])} className="text-[11px] font-bold text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
              Clear chat
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5 ${msg.role === "user" ? "bg-blue-600 text-white" : msg.isError ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-gradient-to-br from-blue-500 to-violet-600 text-white"}`}>
                  {msg.role === "user" ? "You" : <Bot size={13} />}
                </div>

                <div className={`flex-1 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : msg.isError ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 rounded-tl-sm" : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm"}`}>
                    {msg.role === "user"
                      ? msg.content
                      : msg.isNew
                        ? <TypewriterMessage content={msg.content} />
                        : <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
                    }
                  </div>

                  {/* AI message actions */}
                  {msg.role === "ai" && !msg.isError && (
                    <div className="flex items-center gap-2 px-1">
                      <button onClick={() => handleCopy(msg.id, msg.content)} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        {copiedId === msg.id ? <><CheckCircle2 size={11} className="text-green-500" /> Copied</> : <><Copy size={11} /> Copy</>}
                      </button>
                      <span className="text-gray-200 dark:text-gray-700">·</span>
                      <button onClick={() => handleRate(msg.id, "up")} className={`text-[10px] transition-colors ${ratings[msg.id] === "up" ? "text-green-500" : "text-gray-400 hover:text-green-500"}`}>
                        👍
                      </button>
                      <button onClick={() => handleRate(msg.id, "down")} className={`text-[10px] transition-colors ${ratings[msg.id] === "down" ? "text-red-500" : "text-gray-400 hover:text-red-500"}`}>
                        👎
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
                  <Bot size={13} className="text-white" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Describe your issue</p>
        <textarea
          rows={3}
          value={issue}
          onChange={e => setIssue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
          disabled={isProcessing}
          placeholder="e.g. I can't log into my account after changing my email…"
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 resize-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
        />
        <div className="flex items-center gap-2">
          <button
            disabled={isProcessing || !issue.trim()}
            onClick={() => handleSubmit()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-black text-xs rounded-xl hover:bg-blue-500 transition-all disabled:opacity-40 shadow-sm"
          >
            {isProcessing ? <><Loader2 size={13} className="animate-spin" /> Thinking…</> : <><Send size={13} /> Send Message</>}
          </button>
          <p className="text-[10px] text-gray-400 shrink-0 hidden sm:block">Ctrl+Enter to send</p>
        </div>
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Common questions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => handleSubmit(prompt)}
                disabled={isProcessing}
                className="text-left text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800/40 rounded-xl px-3.5 py-2.5 transition-all font-medium leading-snug"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FAQ accordion */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <BookOpen size={14} className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-black text-gray-900 dark:text-gray-100">Frequently Asked Questions</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{item.q}</span>
                <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-xs text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-50 dark:border-gray-800/50 pt-3">
                  <ReactMarkdown components={mdComponents}>{item.a}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick resources */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: <Globe size={15} />, label: "Help Center", sub: "beoneofus.work/help", href: "https://beoneofus.work/help", color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30" },
          { icon: <Users size={15} />, label: "Community", sub: "Ask the community", href: "/dash/more?tool=community", color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30" },
          { icon: <FileText size={15} />, label: "Docs", sub: "beoneofus.work/docs", href: "https://beoneofus.work/docs", color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30" },
        ].map(item => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 hover:border-gray-300 dark:hover:border-gray-700 transition-all group"
          >
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>{item.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.label}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
};

// ─── User Dashboard ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  High:   { color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-950/30",    border: "border-red-200 dark:border-red-800/40",    bar: "bg-red-500",    dot: "bg-red-500"    },
  Medium: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800/40", bar: "bg-amber-500", dot: "bg-amber-500" },
  Low:    { color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-950/30",   border: "border-blue-200 dark:border-blue-800/40",   bar: "bg-blue-400",   dot: "bg-blue-400"   },
};

const STATUS_CONFIG = {
  pending:     { label: "To Do",       color: "text-gray-600 dark:text-gray-400",    bg: "bg-gray-100 dark:bg-gray-800",            icon: <Clock size={10} />       },
  in_progress: { label: "In Progress", color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30",          icon: <Loader2 size={10} />     },
  completed:   { label: "Completed",   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: <CheckCircle2 size={10} /> },
};

const CHANGELOG = [
  { version: "v2.3", title: "Community Hub Redesign", desc: "Real-time presence, channels, typing indicators and a full chat overhaul.", date: "May 19, 2026", tag: "Design" },
  { version: "v2.2", title: "Help & Support AI", desc: "Category-tagged tickets, FAQ accordion, quick prompts and chat-style responses.", date: "May 19, 2026", tag: "Feature" },
  { version: "v2.1", title: "Profile Dropdown Nav", desc: "New avatar dropdown in the main navbar with quick links and sign-out.", date: "May 18, 2026", tag: "UX" },
  { version: "v2.0", title: "Notification Bell", desc: "Live unread count, per-type routing, mark-all-read and real-time Supabase push.", date: "May 17, 2026", tag: "Feature" },
  { version: "v1.9", title: "Public Profiles /u/[username]", desc: "Shareable public profile pages with social links and work history.", date: "May 10, 2026", tag: "Feature" },
  { version: "v1.8", title: "Premium Tier", desc: "Premium subscription system with admin review and badge display.", date: "May 5, 2026", tag: "Feature" },
];

const NOTIF_ICONS = {
  like: <Heart size={12} className="text-red-500" />,
  comment: <MessageSquare size={12} className="text-blue-500" />,
  connection_request: <UserPlus size={12} className="text-violet-500" />,
  handshake: <Handshake size={12} className="text-green-500" />,
  group_invite: <Users size={12} className="text-amber-500" />,
  message: <Bell size={12} className="text-blue-500" />,
  partnership_update: <Handshake size={12} className="text-indigo-500" />,
};

const TASK_STATUSES = ["All", "pending", "in_progress", "completed"];

const UserDashboardTool = ({ currentUserId }) => {
  const [activeTab, setActiveTab]               = useState("");
  const [isFounderOrMember, setIsFounderOrMember] = useState(null);
  const [myTasks, setMyTasks]                   = useState([]);
  const [myJobApps, setMyJobApps]               = useState([]);
  const [myFounderApps, setMyFounderApps]       = useState([]);
  const [myNotifications, setMyNotifications]   = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [acceptedRoles, setAcceptedRoles]       = useState([]);
  const [taskFilter, setTaskFilter]             = useState("All");
  const [taskSearch, setTaskSearch]             = useState("");
  const [expandedTask, setExpandedTask]         = useState(null);
  const [deletingApp, setDeletingApp]           = useState(null);
  const [myProfile, setMyProfile]               = useState(null);

  const renderWithLinks = (text) => {
    if (!text) return text;
    return text.split(/(https?:\/\/[^\s]+|\B\/[^\s]+)/g).map((part, i) => {
      if (i % 2 === 1) {
        const internal = part.startsWith("/");
        return (
          <a key={i} href={part} target={internal ? "_self" : "_blank"} rel={internal ? "" : "noopener noreferrer"}
            onClick={e => e.stopPropagation()}
            className={internal ? "inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold ml-1" : "text-blue-400 hover:underline font-bold"}>
            {internal ? <><UserPlus size={11} /> Apply Now</> : part}
          </a>
        );
      }
      return part;
    });
  };

  /* bootstrap */
  useEffect(() => {
    if (!currentUserId) return;
    const init = async () => {
      setLoading(true);
      const [{ data: appData }, { data: profileData }] = await Promise.all([
        supabase.from("founder_applications").select("id, status, intended_role").eq("user_id", currentUserId),
        supabase.from("profiles").select("username, avatar_url, full_name, role, company").eq("id", currentUserId).single(),
      ]);
      if (profileData) setMyProfile(profileData);
      if (appData?.length) {
        setIsFounderOrMember(true);
        setActiveTab(prev => prev || "tasks");
        setAcceptedRoles([...new Set(appData.filter(a => a.status === "accepted").map(a => a.intended_role))]);
      } else {
        setIsFounderOrMember(false);
        setActiveTab(prev => prev || "job_apps");
      }
      setLoading(false);
    };
    init();
  }, [currentUserId]);

  /* tasks realtime */
  useEffect(() => {
    if (!currentUserId || isFounderOrMember !== true || activeTab !== "tasks") return;
    let ch;
    const fetchTasks = async () => {
      const { data } = await supabase.from("tasks").select(`
        *, assignee:profiles!tasks_assignee_id_fkey(username, avatar_url),
        assigner:profiles!tasks_assigner_id_fkey(username, avatar_url)
      `).or(`assignee_id.eq.${currentUserId},assigner_id.eq.${currentUserId}`).order("created_at", { ascending: false });
      if (data) setMyTasks(data);
    };
    fetchTasks();
    ch = supabase.channel(`user-tasks-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetchTasks).subscribe();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [activeTab, currentUserId, isFounderOrMember]);

  /* job apps */
  useEffect(() => {
    if (activeTab !== "job_apps" || myJobApps.length > 0) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("job_applications").select("*, jobs(title, company)").eq("user_id", currentUserId).order("created_at", { ascending: false });
      if (data) setMyJobApps(data);
      setLoading(false);
    };
    load();
  }, [activeTab, currentUserId, myJobApps.length]);

  /* founder apps */
  useEffect(() => {
    if (activeTab !== "founder_apps" || myFounderApps.length > 0) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("founder_applications").select("*").eq("user_id", currentUserId).order("created_at", { ascending: false });
      if (data) setMyFounderApps(data);
      setLoading(false);
    };
    load();
  }, [activeTab, currentUserId, myFounderApps.length]);

  /* notifications */
  useEffect(() => {
    if (activeTab !== "notifications" || myNotifications.length > 0) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("notifications").select("*").eq("receiver_id", currentUserId).order("created_at", { ascending: false }).limit(30);
      if (data) setMyNotifications(data);
      setLoading(false);
    };
    load();
  }, [activeTab, currentUserId, myNotifications.length]);

  const handleTaskUpdate = async (taskId, newStatus) => {
    setActionProcessing(true);
    try {
      const task = myTasks.find(t => t.id === taskId);
      const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
      if (error) throw error;
      setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      if (newStatus === "completed" && task?.assigner_id && task.assigner_id !== currentUserId) {
        await supabase.from("notifications").insert({
          receiver_id: task.assigner_id, actor_id: currentUserId,
          type: "message", content: `marked task "${task.title}" as completed.`
        });
      }
    } catch (err) { alert(err.message); }
    finally { setActionProcessing(false); }
  };

  const handleDeleteApp = async (table, id, setter) => {
    setDeletingApp(id);
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) setter(prev => prev.filter(a => a.id !== id));
    setDeletingApp(null);
  };

  /* computed stats */
  const taskStats = useMemo(() => ({
    total: myTasks.length,
    pending: myTasks.filter(t => t.status === "pending" || !t.status).length,
    inProgress: myTasks.filter(t => t.status === "in_progress").length,
    completed: myTasks.filter(t => t.status === "completed").length,
    high: myTasks.filter(t => t.priority === "High").length,
  }), [myTasks]);

  const completionPct = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

  const filteredTasks = useMemo(() => {
    let tasks = myTasks;
    if (taskFilter !== "All") tasks = tasks.filter(t => t.status === taskFilter || t.priority === taskFilter);
    if (taskSearch) tasks = tasks.filter(t => t.title?.toLowerCase().includes(taskSearch.toLowerCase()) || t.description?.toLowerCase().includes(taskSearch.toLowerCase()));
    return tasks.sort((a, b) => ({ High: 3, Medium: 2, Low: 1 }[b.priority || "Medium"] - ({ High: 3, Medium: 2, Low: 1 }[a.priority || "Medium"])));
  }, [myTasks, taskFilter, taskSearch]);

  const memberTabs = [
    { id: "tasks", label: "Tasks", Icon: ClipboardList, badge: taskStats.pending || null },
    { id: "founder_apps", label: "Applications", Icon: FileText, badge: myFounderApps.filter(a => a.status === "pending").length || null },
  ];
  const guestTabs = [
    { id: "job_apps", label: "Job Apps", Icon: Briefcase, badge: myJobApps.filter(a => a.status === "pending").length || null },
    { id: "notifications", label: "Notifications", Icon: Bell, badge: myNotifications.filter(n => n.unread).length || null },
    { id: "changelog", label: "What's New", Icon: Zap, badge: null },
  ];
  const tabs = isFounderOrMember ? memberTabs : guestTabs;

  if (loading && isFounderOrMember === null) return (
    <div className="py-20 flex flex-col items-center gap-3">
      <Loader2 className="animate-spin text-violet-500" size={26} />
      <p className="text-xs text-gray-400">Loading your dashboard…</p>
    </div>
  );

  return (
    <div className="space-y-4 max-w-3xl mx-auto py-4">

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-900/40 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-700 dark:from-violet-700 dark:via-violet-800 dark:to-indigo-900 p-5 text-white shadow-lg">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 60% 40%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white/20">
              {myProfile?.avatar_url
                ? <img src={myProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <UserCog size={22} />}
            </div>
            <div>
              <p className="text-[10px] text-violet-200/70 uppercase tracking-widest font-bold mb-0.5">My Dashboard</p>
              <h2 className="font-black text-base leading-tight">{myProfile?.full_name || myProfile?.username || "User"}</h2>
              {(myProfile?.role || myProfile?.company) && (
                <p className="text-[11px] text-violet-200/80 mt-0.5">{[myProfile.role, myProfile.company].filter(Boolean).join(" · ")}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {acceptedRoles.includes("cofounder") && (
              <a href="/founder-dashboard" className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white rounded-xl text-[11px] font-bold transition-all">
                Founder Workspace <ArrowUpRight size={11} />
              </a>
            )}
            {acceptedRoles.includes("member") && (
              <a href="/member-dashboard" className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white rounded-xl text-[11px] font-bold transition-all">
                Member Workspace <ArrowUpRight size={11} />
              </a>
            )}
          </div>
        </div>

        {/* Task progress bar (only for members) */}
        {isFounderOrMember && myTasks.length > 0 && (
          <div className="relative mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Task progress</span>
              <span className="text-[11px] font-black text-white">{completionPct}% complete</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${completionPct}%` }} />
            </div>
            <div className="flex gap-4 mt-3">
              {[
                { label: "To Do",    val: taskStats.pending,    col: "text-white/60" },
                { label: "In Progress", val: taskStats.inProgress, col: "text-blue-300" },
                { label: "Done",     val: taskStats.completed,  col: "text-emerald-300" },
                { label: "High Priority", val: taskStats.high, col: "text-red-300" },
              ].map(s => (
                <div key={s.label}>
                  <p className={`text-base font-black ${s.col}`}>{s.val}</p>
                  <p className="text-[9px] text-white/50">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 rounded-2xl overflow-x-auto shadow-sm">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-1 justify-center ${activeTab === t.id ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            <t.Icon size={13} />
            {t.label}
            {t.badge > 0 && (
              <span className="text-[9px] font-black bg-violet-500 text-white px-1.5 py-0.5 rounded-full leading-none">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content panel ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-violet-500" size={22} />
            <p className="text-xs text-gray-400">Loading…</p>
          </div>
        ) : (
          <>
            {/* ─ Tasks ─ */}
            {activeTab === "tasks" && (
              <>
                {/* Filter + search bar */}
                <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="relative flex-1">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={taskSearch}
                      onChange={e => setTaskSearch(e.target.value)}
                      placeholder="Search tasks…"
                      className="w-full pl-8 pr-3 py-2 text-[11px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-violet-400 transition-all text-gray-800 dark:text-gray-200 placeholder-gray-400"
                    />
                  </div>
                  <div className="flex gap-1 overflow-x-auto">
                    {["All", ...TASK_STATUSES.slice(1), "High", "Medium", "Low"].map(f => (
                      <button key={f} onClick={() => setTaskFilter(f)}
                        className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap ${taskFilter === f ? "bg-violet-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                        {f === "pending" ? "To Do" : f === "in_progress" ? "In Progress" : f === "completed" ? "Done" : f}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="py-16 flex flex-col items-center gap-2 text-center">
                    <ClipboardList size={30} className="text-gray-200 dark:text-gray-700" />
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500">{taskSearch ? "No tasks match your search" : "No tasks assigned yet"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {filteredTasks.map(task => {
                      const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;
                      const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                      const isExpanded = expandedTask === task.id;
                      return (
                        <div
                          key={task.id}
                          className={`group relative transition-all ${isExpanded ? "bg-gray-50 dark:bg-gray-800/40" : "hover:bg-gray-50 dark:hover:bg-gray-800/20"}`}
                        >
                          {/* Priority left accent */}
                          <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${pc.dot}`} />

                          <div className="p-4 pl-5 cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <p className={`text-xs font-bold ${task.status === "completed" ? "line-through text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-white"}`}>
                                    {task.title}
                                  </p>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${pc.color} ${pc.bg} ${pc.border}`}>
                                    {task.priority || "Medium"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1">{task.description}</p>
                              </div>

                              {/* Status toggle */}
                              <button
                                onClick={e => { e.stopPropagation(); handleTaskUpdate(task.id, task.status === "completed" ? "pending" : task.status === "in_progress" ? "completed" : "in_progress"); }}
                                disabled={actionProcessing}
                                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all disabled:opacity-50 ${sc.bg} ${sc.color}`}
                              >
                                {sc.icon}
                                {sc.label}
                              </button>
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                              {/* Assigner */}
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-[7px] font-black text-gray-500 shrink-0">
                                  {task.assigner?.avatar_url ? <img src={task.assigner.avatar_url} alt="" className="w-full h-full object-cover" /> : (task.assigner?.username?.[0] || "A").toUpperCase()}
                                </div>
                                <span className="text-[9px] text-gray-400">from @{task.assigner?.username || "Admin"}</span>
                              </div>
                              <span className="text-gray-200 dark:text-gray-700">·</span>
                              {/* Assignee */}
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-[7px] font-black text-gray-500 shrink-0">
                                  {task.assignee?.avatar_url ? <img src={task.assignee.avatar_url} alt="" className="w-full h-full object-cover" /> : (task.assignee?.username?.[0] || "?").toUpperCase()}
                                </div>
                                <span className="text-[9px] text-gray-400">@{task.assignee?.username || "?"}</span>
                              </div>
                              {task.created_at && (
                                <>
                                  <span className="text-gray-200 dark:text-gray-700">·</span>
                                  <span className="text-[9px] text-gray-400">{new Date(task.created_at).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Expanded description */}
                          {isExpanded && task.description && (
                            <div className="px-5 pb-4">
                              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                                {task.description}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ─ Job Apps ─ */}
            {activeTab === "job_apps" && (
              myJobApps.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-2 text-center">
                  <Briefcase size={30} className="text-gray-200 dark:text-gray-700" />
                  <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No job applications yet</p>
                  <Link href="/dash/jobs" className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                    Browse jobs <ChevronRight size={12} />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {myJobApps.map(app => {
                    const sc = statusColor(app.status);
                    const statusSteps = ["pending", "reviewing", "interview", "accepted", "rejected"];
                    const stepIdx = statusSteps.indexOf(app.status);
                    return (
                      <div key={app.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm">
                              {(app.jobs?.company || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white">{app.jobs?.title || "Unknown Role"}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">{app.jobs?.company || "—"}</p>
                              {app.created_at && (
                                <p className="text-[9px] text-gray-400 mt-0.5">Applied {new Date(app.created_at).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge color={sc}>{app.status || "pending"}</Badge>
                            <button
                              onClick={() => handleDeleteApp("job_applications", app.id, setMyJobApps)}
                              disabled={deletingApp === app.id}
                              className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              {deletingApp === app.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </div>
                        {/* Status pipeline */}
                        {stepIdx >= 0 && (
                          <div className="mt-3 flex items-center gap-1">
                            {statusSteps.slice(0, -1).map((step, i) => (
                              <div key={step} className="flex items-center gap-1 flex-1">
                                <div className={`h-1 flex-1 rounded-full transition-all ${i <= stepIdx ? "bg-blue-500" : "bg-gray-100 dark:bg-gray-800"}`} />
                                {i < statusSteps.length - 2 && (
                                  <div className={`w-2 h-2 rounded-full border-2 transition-all ${i < stepIdx ? "bg-blue-500 border-blue-500" : i === stepIdx ? "bg-white dark:bg-gray-900 border-blue-500" : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`} />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ─ Founder Apps ─ */}
            {activeTab === "founder_apps" && (
              myFounderApps.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-2 text-center">
                  <FileText size={30} className="text-gray-200 dark:text-gray-700" />
                  <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No applications found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {myFounderApps.map(app => (
                    <div key={app.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-all">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${app.intended_role === "cofounder" ? "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400" : "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"}`}>
                            {app.intended_role === "cofounder" ? <Crown size={15} /> : <Users size={15} />}
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${app.intended_role === "cofounder" ? "text-violet-600 dark:text-violet-400" : "text-blue-600 dark:text-blue-400"}`}>
                              {app.intended_role === "cofounder" ? "Co-founder Application" : "Member Application"}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">Submitted {new Date(app.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge color={statusColor(app.status)}>{app.status || "pending"}</Badge>
                          <button
                            onClick={() => handleDeleteApp("founder_applications", app.id, setMyFounderApps)}
                            disabled={deletingApp === app.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            {deletingApp === app.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ─ Notifications ─ */}
            {activeTab === "notifications" && (
              myNotifications.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-2 text-center">
                  <Bell size={30} className="text-gray-200 dark:text-gray-700" />
                  <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {myNotifications.map(n => (
                    <div key={n.id} className={`flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-all ${n.unread ? "bg-blue-50/40 dark:bg-blue-950/10" : ""}`}>
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                        {NOTIF_ICONS[n.type] || <Bell size={12} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                          <span className="font-bold capitalize text-gray-900 dark:text-white">{(n.type || "alert").replace(/_/g, " ")}: </span>
                          {renderWithLinks(n.content)}
                        </p>
                        <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                      </div>
                      {n.unread && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 shrink-0" />}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ─ Changelog ─ */}
            {activeTab === "changelog" && (
              <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {CHANGELOG.map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-all">
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <div className="w-7 h-7 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                        <Zap size={12} />
                      </div>
                      {i < CHANGELOG.length - 1 && <div className="flex-1 w-px bg-gray-100 dark:bg-gray-800 min-h-[20px]" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[9px] font-black font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">{item.version}</span>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{item.title}</p>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          item.tag === "Feature" ? "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400" :
                          item.tag === "Design" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" :
                          item.tag === "UX" ? "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400" :
                          "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                        }`}>{item.tag}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                      <p className="text-[9px] text-gray-300 dark:text-gray-700 mt-1">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Quote Tool ──────────────────────────────────────────────────────────────

const QUOTES = [
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson", tag: "Coding" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler", tag: "Coding" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck", tag: "Coding" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds", tag: "Coding" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman", tag: "Coding" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House", tag: "Coding" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson", tag: "Coding" },
  { text: "The best way to predict the future is to create it.", author: "Alan Kay", tag: "Innovation" },
  { text: "An entrepreneur is someone who jumps off a cliff and builds a plane on the way down.", author: "Reid Hoffman", tag: "Entrepreneurship" },
  { text: "If you are not embarrassed by the first version of your product, you've launched too late.", author: "Reid Hoffman", tag: "Entrepreneurship" },
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates", tag: "Entrepreneurship" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg", tag: "Entrepreneurship" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs", tag: "Motivation" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", tag: "Motivation" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein", tag: "Motivation" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke", tag: "Motivation" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", tag: "Motivation" },
  { text: "Every expert was once a beginner.", author: "Unknown", tag: "Learning" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci", tag: "Learning" },
  { text: "The more I learn, the more I realize how much I don't know.", author: "Albert Einstein", tag: "Learning" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", tag: "Learning" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King", tag: "Learning" },
];

const QUOTE_TAGS = ["All", "Coding", "Motivation", "Entrepreneurship", "Innovation", "Learning"];

const QuoteTool = () => {
  const [activeTag, setActiveTag] = useState("All");
  const [featuredIdx, setFeaturedIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  const filtered = activeTag === "All" ? QUOTES : QUOTES.filter(q => q.tag === activeTag);
  const featured = QUOTES[featuredIdx];

  const shuffle = () => {
    let next;
    do { next = Math.floor(Math.random() * QUOTES.length); } while (next === featuredIdx && QUOTES.length > 1);
    setFeaturedIdx(next);
  };

  return (
    <div className="p-5 space-y-5">
      {/* Featured quote */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-500/20 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-500/10 dark:via-violet-500/5 dark:to-transparent p-6">
        <Quote size={36} className="text-violet-300 dark:text-violet-500/30 mb-3" />
        <p className="text-base font-bold text-gray-900 dark:text-white leading-relaxed">
          {featured.text}
        </p>
        <p className="text-sm text-violet-600 dark:text-violet-400 font-bold mt-3">— {featured.author}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 dark:text-violet-500/60 px-2 py-0.5 bg-violet-100 dark:bg-violet-500/10 rounded-lg">
            {featured.tag}
          </span>
          <button
            onClick={shuffle}
            className="flex items-center gap-1.5 text-xs font-bold text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          >
            <RefreshCw size={12} /> New Quote
          </button>
        </div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-violet-200/30 dark:bg-violet-500/5 blur-2xl" />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {QUOTE_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              activeTag === tag
                ? "bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20"
                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-500/40"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Quote list */}
      <div className="grid gap-3">
        {filtered.map((q, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-violet-200 dark:hover:border-violet-500/20 transition-colors"
          >
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">&quot;{q.text}&quot;</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-600">— {q.author}</p>
              <span className="text-[10px] font-black uppercase tracking-wide text-gray-400 dark:text-gray-700">{q.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Tool Registry ────────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: "user_dashboard", label: "My Dashboard", icon: UserCog,
    desc: "Track your tasks, job applications, and platform activity at a glance.",
    color: "violet", tags: ["Tasks", "Applications", "Notifications"], isNew: false,
    category: "personal",
  },
  {
    id: "api", label: "API Access", icon: Code2,
    desc: "Generate and manage secret keys, explore endpoints, and integrate with the platform API.",
    color: "blue", tags: ["REST API", "SDK", "Keys"], isNew: false,
    category: "developer",
  },
  {
    id: "status", label: "System Status", icon: Zap,
    desc: "Real-time health dashboard — service uptime, latency, and incident history.",
    color: "emerald", tags: ["Uptime", "Latency", "Incidents"], isNew: false,
    category: "developer",
  },
  {
    id: "community", label: "Community Hub", icon: Globe,
    desc: "Live global chat with channels, online presence, typing indicators and more.",
    color: "indigo", tags: ["Chat", "Channels", "Live"], isNew: true,
    category: "community",
  },
  {
    id: "support", label: "Help & Support", icon: HelpCircle,
    desc: "AI-powered support with categorised tickets, FAQ, quick prompts and chat-style responses.",
    color: "orange", tags: ["AI Support", "FAQ", "Tickets"], isNew: true,
    category: "community",
  },
  {
    id: "quotes", label: "Daily Quotes", icon: Quote,
    desc: "Curated inspiration for builders, coders, and entrepreneurs — refreshed daily.",
    color: "amber", tags: ["Motivation", "Coding", "Career"], isNew: false,
    category: "community",
  },
  {
    id: "admin", label: "Admin Dashboard", icon: ShieldAlert,
    desc: "Full platform management — users, content, applications, and system controls.",
    color: "red", tags: ["Users", "Tasks", "Moderation"], isNew: false,
    category: "platform", adminOnly: true,
  },
];

const TOOL_CATEGORIES = [
  { id: "personal",   label: "Personal",        icon: UserCog,    accent: "from-violet-500 to-violet-600" },
  { id: "developer",  label: "Developer Tools",  icon: Terminal,   accent: "from-blue-500 to-blue-600"    },
  { id: "community",  label: "Community",        icon: Users,      accent: "from-indigo-500 to-indigo-600" },
  { id: "platform",   label: "Platform",         icon: ShieldAlert,accent: "from-red-500 to-red-600"      },
];

const TOOL_COLOR_MAP = {
  violet:  { bg: "bg-violet-100 dark:bg-violet-950/50", text: "text-violet-600 dark:text-violet-400", border: "border-violet-200 dark:border-violet-800/40", gradient: "from-violet-600 to-violet-700", tag: "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/30", glow: "shadow-violet-500/15" },
  blue:    { bg: "bg-blue-100 dark:bg-blue-950/50",    text: "text-blue-600 dark:text-blue-400",    border: "border-blue-200 dark:border-blue-800/40",    gradient: "from-blue-600 to-blue-700",    tag: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/30",    glow: "shadow-blue-500/15"    },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-950/50", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800/40", gradient: "from-emerald-600 to-emerald-700", tag: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30", glow: "shadow-emerald-500/15" },
  indigo:  { bg: "bg-indigo-100 dark:bg-indigo-950/50", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800/40", gradient: "from-indigo-600 to-indigo-700", tag: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/30", glow: "shadow-indigo-500/15" },
  orange:  { bg: "bg-orange-100 dark:bg-orange-950/50", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800/40", gradient: "from-orange-500 to-orange-600", tag: "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/30", glow: "shadow-orange-500/15" },
  amber:   { bg: "bg-amber-100 dark:bg-amber-950/50",  text: "text-amber-600 dark:text-amber-400",  border: "border-amber-200 dark:border-amber-800/40",  gradient: "from-amber-500 to-amber-600",  tag: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/30",  glow: "shadow-amber-500/15"  },
  red:     { bg: "bg-red-100 dark:bg-red-950/50",      text: "text-red-600 dark:text-red-400",      border: "border-red-200 dark:border-red-800/40",      gradient: "from-red-600 to-red-700",      tag: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30",      glow: "shadow-red-500/15"      },
};

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ tool, onClick }) {
  const tc = TOOL_COLOR_MAP[tool.color] || TOOL_COLOR_MAP.blue;
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg ${tc.glow} transition-all duration-200 text-left hover:-translate-y-0.5 overflow-hidden w-full`}
    >
      {/* hover accent top bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tc.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${tc.bg} border ${tc.border} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
          <tool.icon size={18} className={tc.text} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {tool.isNew && (
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${tc.tag}`}>Updated</span>
          )}
          <div className={`w-6 h-6 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04] flex items-center justify-center group-hover:${tc.bg} group-hover:border-${tool.color}-200 dark:group-hover:border-${tool.color}-800/40 transition-all`}>
            <ChevronRight size={12} className={`text-gray-300 dark:text-gray-700 group-hover:${tc.text} group-hover:translate-x-0.5 transition-all`} />
          </div>
        </div>
      </div>

      <p className={`text-sm font-black text-gray-900 dark:text-gray-100 group-hover:${tc.text} transition-colors mb-1`}>{tool.label}</p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium leading-relaxed line-clamp-2 flex-1">{tool.desc}</p>

      {/* Tags */}
      <div className="flex gap-1.5 flex-wrap mt-3">
        {tool.tags.map(tag => (
          <span key={tag} className="text-[9px] font-bold text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 px-2 py-0.5 rounded-full">
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function MoreContent() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null); // null | 'pending' | 'accepted' | 'declined'
  const [showApplyModal, setShowApplyModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const visibleTools = TOOLS.filter(t => !t.adminOnly || isAdmin);
  const toolParam = searchParams?.get("tool");
  const activeItem = toolParam ? visibleTools.find(t => t.id === toolParam) || null : null;

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const uid = session.user.id;
        setCurrentUserId(uid);
        const { data } = await supabase.from("profiles").select("is_admin").eq("id", uid).single();
        if (data?.is_admin) {
          setIsAdmin(true);
          setIsFounder(true);
          setApplicationStatus('accepted');
        } else {
          // Check if user has a founder application
          const { data: appData } = await supabase
            .from("founder_applications")
            .select("status")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (appData?.status === 'accepted') {
            setIsFounder(true);
            setApplicationStatus('accepted');
          } else if (appData?.status === 'pending') {
            setApplicationStatus('pending');
          } else if (appData?.status === 'declined') {
            setApplicationStatus('declined');
          }
        }
      }
    };
    init();
  }, []);

  const openTool = (tool) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tool", tool.id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const closeTool = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("tool");
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(url, { scroll: false });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const [toolSearch, setToolSearch] = useState("");

  const searchedTools = visibleTools.filter(t =>
    !toolSearch || t.label.toLowerCase().includes(toolSearch.toLowerCase()) || t.desc.toLowerCase().includes(toolSearch.toLowerCase()) || t.tags.some(tag => tag.toLowerCase().includes(toolSearch.toLowerCase()))
  );

  return (
    <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 dark:from-[#0a0a12] dark:via-[#0d0d1a] dark:to-[#0f0f1f] border border-white/[0.07] mb-8 p-6 shadow-xl">
        {/* dot-grid texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        {/* gradient orbs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-violet-600/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full">
                <Layers size={10} className="text-blue-400" />
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">Workspace</span>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/20 px-2.5 py-1 rounded-full">
                  <ShieldAlert size={10} className="text-red-400" />
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Admin</span>
                </div>
              )}
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter leading-none mb-2">Resources</h1>
            <p className="text-sm text-white/50 font-medium leading-relaxed max-w-md">
              Developer tools, community features, and platform utilities — all in one workspace.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xl font-black text-white">{visibleTools.length}</p>
              <p className="text-[10px] text-white/40">tools available</p>
            </div>
            <div className="w-px h-10 bg-white/10 hidden sm:block" />
            <div className="text-right hidden sm:block">
              <p className="text-xl font-black text-white">{visibleTools.filter(t => t.isNew).length}</p>
              <p className="text-[10px] text-white/40">recently updated</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={toolSearch}
          onChange={e => setToolSearch(e.target.value)}
          placeholder="Search tools by name, description, or tag…"
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-all shadow-sm"
        />
        {toolSearch && (
          <button onClick={() => setToolSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors">
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Tool grid (categorised) ── */}
      {toolSearch ? (
        /* flat search results */
        <div className="space-y-3 mb-8">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
            {searchedTools.length} result{searchedTools.length !== 1 ? "s" : ""} for "{toolSearch}"
          </p>
          {searchedTools.length === 0 ? (
            <div className="py-12 text-center">
              <Search size={28} className="text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-400">No tools match your search</p>
            </div>
          ) : searchedTools.map(tool => <ToolCard key={tool.id} tool={tool} onClick={() => openTool(tool)} />)}
        </div>
      ) : (
        TOOL_CATEGORIES.map(cat => {
          const catTools = visibleTools.filter(t => t.category === cat.id);
          if (catTools.length === 0) return null;
          return (
            <div key={cat.id} className="mb-8">
              <div className="flex items-center gap-2.5 mb-3 px-1">
                <div className={`w-5 h-5 rounded-lg bg-gradient-to-br ${cat.accent} flex items-center justify-center shrink-0`}>
                  <cat.icon size={11} className="text-white" />
                </div>
                <p className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{cat.label}</p>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-[10px] text-gray-400 dark:text-gray-600">{catTools.length} tool{catTools.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catTools.map(tool => <ToolCard key={tool.id} tool={tool} onClick={() => openTool(tool)} />)}
              </div>
            </div>
          );
        })
      )}

      {/* ── Founder Node ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-3 px-1">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Crown size={11} className="text-white" />
          </div>
          <p className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Founder Node</p>
          <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
        </div>

        {(isFounder || isAdmin) ? (
          <Link href="/founder-dashboard" className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 hover:from-blue-700 hover:via-blue-700 hover:to-blue-800 rounded-2xl shadow-lg shadow-blue-500/20 transition-all">
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
            <div className="relative flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                <Crown size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Founder Dashboard</p>
                <p className="text-[11px] text-blue-200/80 font-medium mt-0.5">Team, tasks, applications & more</p>
              </div>
            </div>
            <div className="relative flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold bg-white/15 text-white/80 px-2.5 py-1 rounded-full border border-white/10">
                Open workspace <ArrowUpRight size={10} />
              </span>
              <ChevronRight size={16} className="text-blue-200 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ) : applicationStatus === "pending" ? (
          <div className="relative overflow-hidden flex items-start gap-4 p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-amber-700 dark:text-amber-300">Application Under Review</p>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 font-medium mt-1 leading-relaxed">Your co-founder application is being reviewed by the team. We'll notify you once a decision is made — usually within 48 hours.</p>
            </div>
            <span className="shrink-0 w-2 h-2 bg-amber-400 rounded-full animate-pulse mt-1" />
          </div>
        ) : (
          <button onClick={() => setShowApplyModal(true)} className="group w-full relative overflow-hidden flex items-center justify-between p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/5 rounded-2xl transition-all text-left">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 group-hover:from-blue-50 group-hover:to-blue-50 dark:group-hover:from-blue-950/30 dark:group-hover:border-blue-800/40 flex items-center justify-center shrink-0 transition-all">
                <Crown size={18} className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-gray-100">
                  {applicationStatus === "declined" ? "Reapply as Co-Founder" : "Apply as Co-Founder"}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-500 font-medium mt-0.5">
                  {applicationStatus === "declined" ? "Your previous application was declined. You can apply again." : "Join the founding team and help shape the future of beoneofus."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {applicationStatus === "declined" && <Badge color="red">Reapply</Badge>}
              <ChevronRight size={15} className="text-gray-300 group-hover:text-blue-500 transition-all group-hover:translate-x-0.5" />
            </div>
          </button>
        )}
      </div>

      {/* ── Quick links ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-3 px-1">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Quick links</p>
          <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Feed",        href: "/dash/feed",          icon: <BarChart3 size={14} />,   color: "text-blue-500"   },
            { label: "Jobs",        href: "/dash/jobs",          icon: <Briefcase size={14} />,   color: "text-green-500"  },
            { label: "Connections", href: "/dash/connections",   icon: <Users size={14} />,       color: "text-violet-500" },
            { label: "Notifications", href: "/dash/notifications", icon: <Bell size={14} />,      color: "text-amber-500"  },
          ].map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2.5 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-0.5 transition-all group shadow-sm"
            >
              <span className={`${item.color} shrink-0`}>{item.icon}</span>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">{item.label}</span>
              <ChevronRight size={10} className="text-gray-300 dark:text-gray-700 ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Sign out ── */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/[0.04]">
        <button onClick={handleSignOut} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-sm font-bold group">
          <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Sign Out
        </button>
      </div>

      {/* ── Co-Founder Apply Modal ── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowApplyModal(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-gray-50 dark:bg-[#0c0c10] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 shrink-0 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Crown size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900 dark:text-white">Co-Founder Application</h2>
                  <p className="text-[10px] text-gray-500 dark:text-gray-500 font-medium">Join the founding team at beoneofus</p>
                </div>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-500 rounded-xl transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FounderContent onSubmitSuccess={() => { setShowApplyModal(false); setApplicationStatus("pending"); }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Tool Modal ── */}
      {activeItem && (() => {
        const tc = TOOL_COLOR_MAP[activeItem.color] || TOOL_COLOR_MAP.blue;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={closeTool} />
            <div className="relative w-full max-w-4xl h-[88vh] bg-gray-50 dark:bg-[#0c0c10] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

              {/* Colored modal header */}
              <div className={`relative overflow-hidden flex items-center justify-between px-5 py-4 bg-gradient-to-r ${tc.gradient} shrink-0`}>
                <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                <div className="relative flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                    <activeItem.icon size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-white">{activeItem.label}</h2>
                      {activeItem.isNew && (
                        <span className="text-[9px] font-black bg-white/20 text-white px-1.5 py-0.5 rounded-full border border-white/20">Updated</span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/60 font-medium">{activeItem.desc}</p>
                  </div>
                </div>
                <div className="relative flex items-center gap-2">
                  <div className="hidden sm:flex gap-1">
                    {activeItem.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[9px] font-bold bg-white/15 text-white/80 px-2 py-0.5 rounded-full border border-white/10">{tag}</span>
                    ))}
                  </div>
                  <button onClick={closeTool} className="p-2 bg-white/15 hover:bg-white/25 border border-white/10 text-white/80 hover:text-white transition-all rounded-xl backdrop-blur-sm">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className={`flex-1 overflow-hidden ${activeItem.id === "admin" ? "flex flex-col" : "overflow-y-auto"}`}>
                <div className={activeItem.id === "admin" ? "flex flex-col h-full" : "p-5"}>
                  {activeItem.id === "user_dashboard" && <UserDashboardTool currentUserId={currentUserId} />}
                  {activeItem.id === "status"         && <SystemStatusTool />}
                  {activeItem.id === "api"            && <ApiAccessTool />}
                  {activeItem.id === "community"      && <div className="h-full"><CommunityHubTool currentUserId={currentUserId} /></div>}
                  {activeItem.id === "support"        && <SupportTool />}
                  {activeItem.id === "quotes"         && <QuoteTool />}
                  {activeItem.id === "admin"          && <AdminPanelTool currentUserId={currentUserId} />}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
