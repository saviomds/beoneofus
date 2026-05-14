"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Shield
} from "lucide-react";
import Link from "next/link";
import { supabase } from "../../supabaseClient";
import ProfileContent from "./ProfileContent";
import FounderContent from "./FounderContent";
import VerifiedBadge from "../../components/VerifiedBadge";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// ─── Shared UI Primitives ────────────────────────────────────────────────────

function Toast({ message, type }) {
  if (!message) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-[500] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border
      animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm
      ${type === "error"
        ? "bg-white dark:bg-[#0f0a0a] border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400"
        : "bg-white dark:bg-[#0a0f0a] border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"}`}>
      {type === "error" ? <AlertTriangle size={15} className="shrink-0" /> : <Check size={15} className="shrink-0" />}
      <span className="text-xs font-bold tracking-tight">{message}</span>
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
    blue:   { border: "border-blue-200 dark:border-blue-500/20",   bg: "bg-blue-50 dark:bg-blue-500/5",   icon: "text-blue-500 dark:text-blue-400",   val: "text-blue-600 dark:text-blue-300" },
    amber:  { border: "border-amber-200 dark:border-amber-500/20",  bg: "bg-amber-50 dark:bg-amber-500/5",  icon: "text-amber-500 dark:text-amber-400",  val: "text-amber-600 dark:text-amber-300" },
    violet: { border: "border-violet-200 dark:border-violet-500/20", bg: "bg-violet-50 dark:bg-violet-500/5", icon: "text-violet-500 dark:text-violet-400", val: "text-violet-600 dark:text-violet-300" },
    emerald:{ border: "border-emerald-200 dark:border-emerald-500/20",bg: "bg-emerald-50 dark:bg-emerald-500/5",icon: "text-emerald-500 dark:text-emerald-400",val: "text-emerald-600 dark:text-emerald-300" },
    rose:   { border: "border-rose-200 dark:border-rose-500/20",   bg: "bg-rose-50 dark:bg-rose-500/5",   icon: "text-rose-500 dark:text-rose-400",   val: "text-rose-600 dark:text-rose-300" },
  };
  const c = palette[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bg} p-5`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em]">{label}</p>
        <div className={`${c.icon} opacity-60`}><Icon size={16} /></div>
      </div>
      <p className={`text-3xl font-black tabular-nums ${c.val}`}>
        {loading ? <Loader2 size={20} className="animate-spin" /> : (value ?? "—")}
      </p>
      {sub && <p className="text-[10px] text-gray-500 dark:text-gray-600 mt-1.5 font-medium">{sub}</p>}
      <div className={`absolute -bottom-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-10 ${c.icon} bg-current`} />
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
  const getCurrentTimestamp = () => new Date().toISOString();
  const getTimestampOffset = (ms) => new Date(getCurrentTimestamp() - ms).toISOString();
  
  const [logs] = useState([
    { id: 1, endpoint: "/api/chats", method: "POST", status: 200, latency: "142ms", region: "iad1", timestamp: new Date().toISOString() },
    { id: 2, endpoint: "/api/premium/verify", method: "POST", status: 200, latency: "421ms", region: "iad1", timestamp: new Date(new Date().getTime() - 30000).toISOString() },
    { id: 3, endpoint: "/api/auth/session", method: "GET", status: 200, latency: "45ms", region: "iad1", timestamp: new Date(new Date().getTime() - 120000).toISOString() },
    { id: 4, endpoint: "/api/storage/upload", method: "PUT", status: 201, latency: "890ms", region: "iad1", timestamp: new Date(new Date().getTime() - 300000).toISOString() },
    { id: 5, endpoint: "/api/jobs/apply", method: "POST", status: 401, latency: "12ms", region: "iad1", timestamp: new Date(new Date().getTime() - 600000).toISOString() },
  ]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={Activity} label="Avg. Latency" value="156ms" color="blue" sub="Across all endpoints" />
        <StatCard icon={Globe} label="API Traffic" value="24.5k" color="violet" sub="Last 24 hours" />
        <StatCard icon={AlertCircle} label="Error Rate" value="0.42%" color="rose" sub="HTTP 5xx responses" />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Network Request Stream</p>
          <RefreshCw size={12} className="text-gray-400 animate-spin-slow" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] font-medium">
            <thead className="text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">{log.endpoint}</td>
                  <td className="px-4 py-3">
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-bold">{log.method}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-black ${log.status >= 400 ? "text-red-500" : "text-emerald-500"}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500">{log.latency}</td>
                  <td className="px-4 py-3 text-right text-gray-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 font-mono text-[11px] text-emerald-400/80 leading-relaxed shadow-lg overflow-hidden relative group">
        <div className="absolute top-3 right-3 text-gray-700 group-hover:text-emerald-500 transition-colors">
          <Terminal size={14} />
        </div>
        <p className="text-gray-500 mb-2"># System initialized. Watching Postgres streams...</p>
        <p>[OK] Connected to region iad1 (US East)</p>
        <p>[INFO] Edge runtime heartbeat detected (latency: 12ms)</p>
        <p>[INFO] Real-time subscription: public.profiles active</p>
        <p className="animate-pulse">_</p>
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

const CommunityHubTool = ({ currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("community_messages")
        .select("*, profiles:user_id(username, avatar_url, is_verified)")
        .order("created_at", { ascending: true }).limit(50);
      if (error) setError(true);
      else setMessages(data || []);
    };
    fetch();
    const ch = supabase.channel("public:community_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, async (payload) => {
        const { data } = await supabase.from("community_messages")
          .select("*, profiles:user_id(username, avatar_url, is_verified)").eq("id", payload.new.id).single();
        if (data) setMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentUserId) return;
    const text = input;
    setInput("");
    setMessages(prev => [...prev, { id: Date.now(), user_id: currentUserId, text, profiles: { username: "You" } }]);
    await supabase.from("community_messages").insert({ user_id: currentUserId, text });
  };

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full p-10 text-center">
      <AlertCircle size={40} className="text-red-500/40 mb-4" />
      <p className="text-red-500 dark:text-red-400 font-bold mb-2">Community Hub Not Initialized</p>
      <p className="text-gray-500 text-xs max-w-sm leading-relaxed">
        The <code className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">community_messages</code> table does not exist. Run the setup SQL to enable global chat.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-5 space-y-3" ref={scrollRef}>
        {messages.length === 0
          ? <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <Globe size={36} className="mb-3 text-blue-500/20" />
              <p className="font-bold text-xs uppercase tracking-widest">Global Chat Initialized</p>
            </div>
          : messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const sameAsPrev = prevMsg?.user_id === msg.user_id;
            return (
            <div key={msg.id} className={`flex gap-2 ${msg.user_id === currentUserId ? "justify-end" : "justify-start"}`}>
              {msg.user_id !== currentUserId && (
                <div onClick={() => setSelectedUserId(msg.user_id)}
                  className={`relative w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-[10px] text-gray-500 dark:text-gray-400 uppercase shrink-0 mt-auto cursor-pointer hover:opacity-80 transition-opacity overflow-hidden ${sameAsPrev ? "opacity-0 pointer-events-none" : ""}`}>
                  {msg.profiles?.avatar_url
                    ? <Image src={msg.profiles.avatar_url} alt="avatar" fill sizes="28px" className="object-cover" />
                    : msg.profiles?.username?.substring(0, 2)} 
                </div>
              )}
              <div className={`flex flex-col max-w-[80%] ${msg.user_id === currentUserId ? "items-end" : "items-start"}`}>
                {msg.user_id !== currentUserId && !sameAsPrev && (
                  <span className="text-[10px] text-gray-500 font-bold mb-1 pl-1 flex items-center gap-1">
                    @{msg.profiles?.username}
                    {msg.profiles?.is_verified && <VerifiedBadge size={9} />}
                  </span>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  msg.user_id === currentUserId
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : `bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 ${sameAsPrev ? "rounded-tl-2xl" : "rounded-tl-none"}`}`}>
                  {msg.text}
                </div>
              </div>
            </div>
          )})}
      </div>

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

      <form onSubmit={handleSend}
        className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2 shrink-0">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Broadcast to the network…"
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-600" />
        <button type="submit" disabled={!input.trim()}
          className="px-4 bg-blue-600 text-white hover:bg-blue-500 rounded-xl disabled:opacity-40 transition-all">
          <Send size={15} />
        </button>
      </form>
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
  const [stats, setStats] = useState({ total: null, founders: null, members: null, verified: null, pending: null, admins: null, premium: null, premiumReq: null });
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
  const [taskForm, setTaskForm] = useState({ assignee_id: "", title: "", description: "", priority: "Medium", linked_to: "" });
  const [taskFilter, setTaskFilter] = useState("All");
  const [teamMembers, setTeamMembers] = useState([]);

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
      const [total, founders, members, verified, pending, admins, premium, premiumReq] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "founder"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_admin", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_premium", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("premium_requested", true),
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
    if (!confirm(`${isPrem ? "Revoke" : "Grant"} premium for @${username}?`)) return;
    try {
      const { error } = await supabase.from("profiles")
        .update({ is_premium: !isPrem, premium_requested: false })
        .eq("id", userId);
      if (error) throw error;
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_premium: !isPrem, premium_requested: false } : u));
      showToast(`Premium ${isPrem ? "revoked" : "granted"} for @${username}.`);
    } catch (err) { showToast(err.message, "error"); }
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
    { id: "system_logs",  label: "System Logs",  icon: Terminal      },
  ];

  if (loading) return <div className="p-16 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>;

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center h-full p-16 text-center">
      <ShieldAlert size={48} className="text-red-500/30 mb-6" />
      <p className="text-red-500 dark:text-red-400 font-black text-lg mb-2">Unauthorized</p>
      <p className="text-gray-500 dark:text-gray-600 text-sm max-w-xs leading-relaxed">Your node lacks admin clearance to access this terminal.</p>
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
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-gray-50 dark:bg-[#0c0c12]">
      {/* Navigation Sidebar (redesigned) */}
      <div className="w-full md:w-56 shrink-0 bg-white/50 dark:bg-black/20 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 p-3 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto no-scrollbar">
        <p className="hidden md:block text-[9px] font-black text-gray-400 uppercase tracking-[2px] px-3 mb-4 mt-2">Control Terminal</p>
        {TABS.map(tab => {
          const isActive = adminTab === tab.id;
          const hasAlert = (tab.id === "requests" && requests.length > 0) || 
                           (tab.id === "premium_subs" && premiumSubs.filter(s => s.status === "pending_review").length > 0);
          return (
            <button key={tab.id} onClick={() => setAdminTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] md:text-xs font-bold whitespace-nowrap transition-all group relative
                ${isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5"}`}>
              <tab.icon size={15} className={isActive ? "text-white" : "text-gray-400 group-hover:text-blue-500"} />
              <span className="flex-1 text-left">{tab.label}</span>
              {hasAlert && (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white" : "bg-blue-500"} animate-pulse`} />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-gray-900 dark:text-white font-black text-2xl tracking-tight">Overview</h3>
                <p className="text-gray-500 text-xs font-medium">Real-time platform metrics and system vitals.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchStats} className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 transition-all border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95">
                  <RefreshCw size={14} className={statsLoading ? "animate-spin" : ""} /> Sync Data
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={Users}      label="Registrations"   value={stats.total}    color="blue"   loading={statsLoading} sub="Total Nodes" />
              <StatCard icon={BadgeCheck} label="Verified"      value={stats.verified}    color="emerald" loading={statsLoading} sub="Badge-verified" />
              <StatCard icon={Shield}     label="Security"        value={stats.admins}      color="rose"   loading={statsLoading} sub="Admins" />
              <StatCard icon={Crown}      label="Premium"       value={stats.premium}     color="amber"  loading={statsLoading} sub="Active premium members" />
            </div>

            {/* Verification rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verification Coverage</p>
                  <span className="text-emerald-500 font-black text-xs">{stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}%` }} />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-gray-500 dark:text-gray-600">{stats.verified} verified</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-600">{stats.total} total</span>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Awaiting Action</p>
                  <span className="text-amber-500 font-black text-xs">{stats.pending + stats.premiumReq} items</span>
                </div>
                <div className="flex gap-4">
                   <div className="flex-1">
                      <p className="text-xl font-black text-gray-900 dark:text-white">{stats.pending}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Verifications</p>
                   </div>
                   <div className="w-px h-8 bg-gray-100 dark:bg-gray-800" />
                   <div className="flex-1">
                      <p className="text-xl font-black text-gray-900 dark:text-white">{stats.premiumReq}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Premium Req</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Jump to Section</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Requests", icon: Bell, color: "text-amber-500 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800", action: () => setAdminTab("requests") },
                { label: "Users", icon: Users, color: "text-blue-500 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800", action: () => setAdminTab("users") },
                { label: "Tasks", icon: ClipboardList, color: "text-violet-500 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800", action: () => setAdminTab("tasks") },
                { label: "Founder Apps", icon: Crown, color: "text-amber-600 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800", action: () => setAdminTab("founder_apps") },
              ].map(({ label, icon: Icon, color, action }) => (
                <button key={label} onClick={action}
                  className={`flex flex-col items-center gap-2 p-5 rounded-2xl border text-xs font-bold transition-all hover:-translate-y-1 hover:shadow-md hover:border-blue-500/30 ${color}`}>
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── REQUESTS ── */}
        {adminTab === "requests" && (
          <div className="space-y-3">
            <h3 className="text-gray-900 dark:text-white font-black">Verification Requests <span className="text-gray-500 dark:text-gray-600 font-normal text-sm">({requests.length})</span></h3>
            {requests.length === 0
              ? <div className="py-16 text-center text-gray-500 dark:text-gray-600 text-sm">No pending verification requests.</div>
              : requests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-gray-300 dark:hover:border-gray-700 transition-all">
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
              <h3 className="text-gray-900 dark:text-white font-black">Manage Users <span className="text-gray-500 dark:text-gray-600 font-normal text-sm">({allUsers.length})</span></h3>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-600" size={14} />
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users…"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all" />
            </div>
            {usersLoading && allUsers.length === 0
              ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
              : (
                <div className="space-y-2">
                  {allUsers.filter(u => u.username?.toLowerCase().includes(userSearch.toLowerCase())).map(user => (
                    <div key={user.id}
                      className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-all shadow-sm">
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
                        <button onClick={() => handleTogglePremium(user.id, user.is_premium, user.username)} title="Toggle Premium"
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
              <button onClick={() => setApplications([])} className="text-xs text-blue-500 dark:text-blue-400 font-bold hover:text-blue-600 dark:hover:text-blue-300">Refresh</button>
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
              ) : (
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

const SupportTool = () => {
  const [issue, setIssue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tickets, setTickets] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issue.trim() || isProcessing) return;
    const cur = issue;
    setIssue("");
    setIsProcessing(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: `You are the technical support AI for the beoneofus platform. User issue: "${cur}". Provide a concise, helpful, technical resolution.` }] }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("AI API not active. Restart your dev server."); }
      if (!res.ok) throw new Error(data.error || "Failed to get response");
      setTickets(prev => [{ id: Date.now(), issue: cur, reply: data.message.content.replace(/^["']|["']$/g, "").trim(), isNew: true }, ...prev]);
    } catch (err) {
      setTickets(prev => [{ id: Date.now(), issue: cur, reply: "Error: " + err.message, isNew: false }, ...prev]);
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto py-4">
      <div className="p-5 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0"><HelpCircle size={20} /></div>
        <div>
          <h3 className="text-gray-900 dark:text-white font-black mb-1">AI Technical Support</h3>
          <p className="text-xs text-blue-700/80 dark:text-blue-300/60 leading-relaxed">Instant engineering assistance — debugging, architecture, platform guidance.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Describe Your Issue</label>
        <textarea rows={4} required value={issue} onChange={e => setIssue(e.target.value)} disabled={isProcessing}
          placeholder="e.g. Getting a 500 error when invoking a serverless function…"
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 resize-none transition-all placeholder-gray-400 dark:placeholder-gray-600" />
        <button disabled={isProcessing || !issue.trim()} type="submit"
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-black text-xs rounded-xl hover:bg-blue-500 transition-all disabled:opacity-40 shadow-sm">
          {isProcessing ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</> : "Submit Ticket"}
        </button>
      </form>
      {tickets.map(ticket => (
        <div key={ticket.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-xl">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Your Issue</p>
            <p className="text-xs text-gray-800 dark:text-gray-300">{ticket.issue}</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Bot size={12} className="text-blue-600 dark:text-blue-400" />
              <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest font-black">Support AI</p>
            </div>
            <div className="text-xs text-gray-800 dark:text-gray-300 leading-relaxed">
              {ticket.isNew ? <TypewriterMessage content={ticket.reply} /> : <ReactMarkdown components={mdComponents}>{ticket.reply}</ReactMarkdown>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── User Dashboard ───────────────────────────────────────────────────────────

const UserDashboardTool = ({ currentUserId }) => {
  const [activeTab, setActiveTab] = useState("");
  const [isFounderOrMember, setIsFounderOrMember] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [myJobApps, setMyJobApps] = useState([]);
  const [myFounderApps, setMyFounderApps] = useState([]);
  const [myNotifications, setMyNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [acceptedRoles, setAcceptedRoles] = useState([]);
  const [taskFilter, setTaskFilter] = useState("All");

  const FEATURES = [
    { id: 1, title: "Real-time Workspace Chat", desc: "Secure, encrypted node communication.", date: "May 1, 2026" },
    { id: 2, title: "AI Support Engineer", desc: "Instant technical assistance from AI.", date: "Apr 28, 2026" },
    { id: 3, title: "Advanced Code Review", desc: "Highlight and analyze code in your feed.", date: "Apr 15, 2026" },
  ];

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

  useEffect(() => {
    if (!currentUserId) return;
    const check = async () => {
      setLoading(true);
      const { data } = await supabase.from("founder_applications").select("id, status, intended_role").eq("user_id", currentUserId);
      if (data?.length) {
        setIsFounderOrMember(true);
        setActiveTab(prev => prev || "tasks");
        const accepted = data.filter(a => a.status === "accepted").map(a => a.intended_role);
        setAcceptedRoles([...new Set(accepted)]);
      } else {
        setIsFounderOrMember(false);
        setActiveTab(prev => prev || "job_apps");
      }
      setLoading(false);
    };
    check();
  }, [currentUserId]);

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

  useEffect(() => {
    if (activeTab !== "job_apps" || isFounderOrMember !== false || myJobApps.length > 0) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("job_applications").select("*, jobs(title, company)").eq("user_id", currentUserId).order("created_at", { ascending: false });
      if (data) setMyJobApps(data);
      setLoading(false);
    };
    fetch();
  }, [activeTab, currentUserId, isFounderOrMember, myJobApps.length]);

  useEffect(() => {
    if (activeTab !== "founder_apps" || isFounderOrMember !== true || myFounderApps.length > 0) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("founder_applications").select("*").eq("user_id", currentUserId).order("created_at", { ascending: false });
      if (data) setMyFounderApps(data);
      setLoading(false);
    };
    fetch();
  }, [activeTab, currentUserId, isFounderOrMember, myFounderApps.length]);

  useEffect(() => {
    if (activeTab !== "notifications" || isFounderOrMember !== false || myNotifications.length > 0) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("notifications").select("*").eq("receiver_id", currentUserId).order("created_at", { ascending: false }).limit(20);
      if (data) setMyNotifications(data);
      setLoading(false);
    };
    fetch();
  }, [activeTab, currentUserId, isFounderOrMember, myNotifications.length]);

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

  const memberTabs = [
    { id: "tasks", label: "Tasks" },
    { id: "founder_apps", label: "My Applications" },
  ];
  const guestTabs = [
    { id: "job_apps", label: "Job Apps" },
    { id: "notifications", label: "Notifications" },
    { id: "features", label: "What's New" },
  ];
  const tabs = isFounderOrMember ? memberTabs : guestTabs;

  return (
    <div className="space-y-4 max-w-3xl mx-auto py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-violet-50 dark:bg-violet-500/5 border border-violet-200 dark:border-violet-500/20 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl flex items-center justify-center shrink-0"><UserCog size={18} /></div>
          <div>
            <h3 className="text-gray-900 dark:text-white font-black text-sm">My Dashboard</h3>
            <p className="text-[10px] text-violet-600/70 dark:text-violet-300/50 font-medium">Personal tasks & applications</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {acceptedRoles.includes("cofounder") && (
            <a href="/founder-dashboard" className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm">
              Founder Workspace <ArrowUpRight size={11} />
            </a>
          )}
          {acceptedRoles.includes("member") && (
            <a href="/member-dashboard" className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm">
              Member Workspace <ArrowUpRight size={11} />
            </a>
          )}
          <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-0.5 rounded-xl shadow-sm">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${activeTab === t.id ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        {loading
          ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-violet-500" size={22} /></div>
          : (
            <div>
              {activeTab === "tasks" && (
                <>
                  <div className="flex gap-1 p-3 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
                    {["All", "High", "Medium", "Low"].map(f => (
                      <button key={f} onClick={() => setTaskFilter(f)}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all whitespace-nowrap ${taskFilter === f ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                  {myTasks.filter(t => taskFilter === "All" || t.priority === taskFilter).length === 0
                    ? <div className="py-12 text-center text-gray-500 dark:text-gray-600 text-xs">No tasks assigned.</div>
                    : myTasks.filter(t => taskFilter === "All" || t.priority === taskFilter)
                      .sort((a, b) => ({ High: 3, Medium: 2, Low: 1 }[b.priority || "Medium"] - ({ High: 3, Medium: 2, Low: 1 }[a.priority || "Medium"]))
                      ).map(task => (
                        <div key={task.id} className="p-4 border-b border-gray-100 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-bold text-gray-900 dark:text-white">{task.title}</p>
                                <Badge color={task.priority === "High" ? "rose" : task.priority === "Medium" ? "amber" : "blue"}>{task.priority}</Badge>
                              </div>
                              <p className="text-[10px] text-gray-500 dark:text-gray-500 line-clamp-2">{task.description}</p>
                            </div>
                            <button onClick={() => handleTaskUpdate(task.id, task.status === "completed" ? "pending" : "completed")}
                              disabled={actionProcessing}
                              className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all disabled:opacity-50 ${task.status === "completed" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"}`}>
                              {task.status}
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                            <span className="text-[9px] text-gray-600">from @{task.assigner?.username || "Admin"}</span>
                            <span className="text-[9px] text-gray-600">→ @{task.assignee?.username || "?"}</span>
                          </div>
                        </div>
                      ))
                  }
                </>
              )}

              {activeTab === "job_apps" && (
                myJobApps.length === 0
                  ? <div className="py-12 text-center text-gray-500 dark:text-gray-600 text-xs">No job applications.</div>
                  : myJobApps.map(app => (
                    <div key={app.id} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all">
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{app.jobs?.title || "Unknown"}</p>
                        <p className="text-[10px] text-gray-500">at {app.jobs?.company}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color={statusColor(app.status)}>{app.status}</Badge>
                        <button onClick={async () => {
                          if (!confirm("Delete?")) return;
                          const { error } = await supabase.from("job_applications").delete().eq("id", app.id);
                          if (!error) setMyJobApps(prev => prev.filter(a => a.id !== app.id));
                        }} className="p-1.5 text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))
              )}

              {activeTab === "founder_apps" && (
                myFounderApps.length === 0
                  ? <div className="py-12 text-center text-gray-500 dark:text-gray-600 text-xs">No applications found.</div>
                  : myFounderApps.map(app => (
                    <div key={app.id} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all">
                      <div>
                        <p className={`text-xs font-bold ${app.intended_role === "cofounder" ? "text-violet-600 dark:text-violet-400" : "text-blue-600 dark:text-blue-400"}`}>
                          {app.intended_role === "cofounder" ? "Co-founder Application" : "Member Application"}
                        </p>
                        <p className="text-[10px] text-gray-500">{new Date(app.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color={statusColor(app.status)}>{app.status || "pending"}</Badge>
                        <button onClick={async () => {
                          if (!confirm("Delete?")) return;
                          const { error } = await supabase.from("founder_applications").delete().eq("id", app.id);
                          if (!error) setMyFounderApps(prev => prev.filter(a => a.id !== app.id));
                        }} className="p-1.5 text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))
              )}

              {activeTab === "notifications" && (
                myNotifications.length === 0
                  ? <div className="py-12 text-center text-gray-500 dark:text-gray-600 text-xs">No notifications.</div>
                  : myNotifications.map(n => (
                    <div key={n.id} className="p-4 border-b border-gray-100 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all">
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                        <span className="font-bold text-violet-600 dark:text-violet-400 capitalize">{(n.type || "alert").replace("_", " ")}: </span>
                        {renderWithLinks(n.content)}
                      </p>
                      <p className="text-[9px] text-gray-500 dark:text-gray-600 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                  ))
              )}

              {activeTab === "features" && FEATURES.map(f => (
                <div key={f.id} className="p-4 border-b border-gray-100 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{f.title}</p>
                    <Badge color="violet">New</Badge>
                  </div>
                  <p className="text-[10px] text-gray-500">{f.desc}</p>
                  <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-1">{f.date}</p>
                </div>
              ))}
            </div>
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
  { id: "user_dashboard", label: "My Dashboard",    icon: UserCog,    desc: "Applications & task management" },
  { id: "api",            label: "API Access",       icon: Code2,      desc: "Developer keys & integration" },
  { id: "status",         label: "System Status",    icon: Zap,        desc: "Platform health & latency" },
  { id: "community",      label: "Community Hub",    icon: Globe,      desc: "Global network chat" },
  { id: "support",        label: "Help & Support",   icon: HelpCircle, desc: "AI technical assistance" },
  { id: "quotes",         label: "Daily Quotes",     icon: Quote,      desc: "Inspiration for builders & coders" },
  { id: "admin",          label: "Admin Dashboard",  icon: ShieldAlert, desc: "Platform management", adminOnly: true },
];

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

  return (
    <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Resources</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">Tools and utilities for your workflow.</p>
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleTools.map(tool => (
          <button key={tool.id} onClick={() => openTool(tool)}
            className="group flex items-center justify-between p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-500/40 dark:hover:border-blue-500/30 hover:shadow-lg transition-all text-left">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0">
                <tool.icon size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{tool.label}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-500 font-medium mt-0.5">{tool.desc}</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-gray-400 group-hover:text-blue-500 transition-all group-hover:translate-x-0.5 shrink-0" />
          </button>
        ))}
      </div>

      {/* Founder Node Section */}
      <div className="mt-8">
        <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[2px] mb-3 px-1">Founder Node</p>

        {/* Accepted founder or admin: show dashboard link */}
        {(isFounder || isAdmin) && (
          <Link
            href="/founder-dashboard"
            className="group flex items-center justify-between p-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-2xl shadow-lg shadow-blue-500/20 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Crown size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Founder Dashboard</p>
                <p className="text-[11px] text-blue-200 font-medium mt-0.5">Team, tasks & applications</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-blue-200 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {/* Pending application */}
        {!isFounder && !isAdmin && applicationStatus === 'pending' && (
          <div className="flex items-center gap-4 p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Application Under Review</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Your co-founder application is being reviewed. We will notify you soon.</p>
            </div>
          </div>
        )}

        {/* Declined or no application: show apply option */}
        {!isFounder && !isAdmin && applicationStatus !== 'pending' && (
          <button
            onClick={() => setShowApplyModal(true)}
            className="group w-full flex items-center justify-between p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-500/40 dark:hover:border-blue-500/30 hover:shadow-lg rounded-2xl transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0">
                <Crown size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {applicationStatus === 'declined' ? 'Reapply as Co-Founder' : 'Apply as Co-Founder'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-500 font-medium mt-0.5">
                  {applicationStatus === 'declined' ? 'Your previous application was not accepted. Try again.' : 'Join the founding team and help shape the platform.'}
                </p>
              </div>
            </div>
            <ChevronRight size={15} className="text-gray-400 group-hover:text-blue-500 transition-all group-hover:translate-x-0.5 shrink-0" />
          </button>
        )}
      </div>

      {/* Sign out */}
      <div className="mt-6">
        <button onClick={handleSignOut} className="flex items-center gap-2.5 p-3 text-red-400/50 hover:text-red-400 transition-colors text-sm font-bold">
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* Co-Founder Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowApplyModal(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-gray-50 dark:bg-[#0c0c10] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Crown size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900 dark:text-white">Co-Founder Application</h2>
                  <p className="text-[10px] text-gray-500 dark:text-gray-600 font-medium">Join the founding team</p>
                </div>
              </div>
              <button onClick={() => setShowApplyModal(false)}
                className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-500 rounded-xl transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FounderContent onSubmitSuccess={() => { setShowApplyModal(false); setApplicationStatus('pending'); }} />
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Tool Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={closeTool} />
          <div className="relative w-full max-w-4xl h-[88vh] bg-gray-50 dark:bg-[#0c0c10] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <activeItem.icon size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900 dark:text-white">{activeItem.label}</h2>
                  <p className="text-[10px] text-gray-500 dark:text-gray-600 font-medium">{activeItem.desc}</p>
                </div>
              </div>
              <button onClick={closeTool}
                className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all rounded-xl">
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className={`flex-1 overflow-hidden ${activeItem.id === "admin" ? "flex flex-col" : "overflow-y-auto"}`}>
              <div className={activeItem.id === "admin" ? "flex flex-col h-full" : "p-5"}>
                {activeItem.id === "user_dashboard" && <UserDashboardTool currentUserId={currentUserId} />}
                {activeItem.id === "status" && <SystemStatusTool />}
                {activeItem.id === "api" && <ApiAccessTool />}
                {activeItem.id === "community" && <div className="h-full"><CommunityHubTool currentUserId={currentUserId} /></div>}
                {activeItem.id === "support" && <SupportTool />}
                {activeItem.id === "quotes" && <QuoteTool />}
                {activeItem.id === "admin" && <AdminPanelTool currentUserId={currentUserId} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
