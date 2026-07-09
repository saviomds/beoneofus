"use client";
import { useState } from "react";
import { Key, Eye, EyeOff, Copy, Check, Trash2, Plus, X } from "lucide-react";
import { Badge } from "./shared";

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


export default ApiAccessTool;
