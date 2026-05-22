"use client";
import { useState, useCallback } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";


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

export { Toast, useToast, StatCard, Badge, statusColor };
