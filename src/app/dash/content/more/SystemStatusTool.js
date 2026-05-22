"use client";
import { useState, useEffect } from "react";
import { Activity, Database, Loader2, Zap } from "lucide-react";
import { supabase } from "../../../supabaseClient";

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

export default SystemStatusTool;
