"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import {
  Building2, Briefcase, Check, X, Loader2, Globe, MapPin,
  RefreshCw, CheckCircle2, Clock, Trash2,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const FILTERS = ["pending", "approved", "all"];

export default function HiringAdminContent({ showToast }) {
  const [tab, setTab] = useState("companies"); // companies | jobs
  const [filter, setFilter] = useState("pending");
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token ?? null));
  }, []);

  const load = useCallback(async () => {
    if (token === null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/hiring?status=${filter}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCompanies(data.companies || []);
      setJobs(data.jobs || []);
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [filter, token, showToast]);

  useEffect(() => {
    const run = () => { load(); };
    run();
  }, [load]);

  const setApproved = async (kind, id, approved) => {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/hiring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ kind, id, approved }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast?.(approved ? "Approved" : "Moved back to pending");
      await load();
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (kind, id, label) => {
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/hiring?kind=${kind}&id=${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast?.("Deleted");
      await load();
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setBusy(null);
    }
  };

  const rows = tab === "companies" ? companies : jobs;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-gray-900 dark:text-white font-black text-lg flex items-center gap-2">
            <Building2 size={18} className="text-blue-500" /> Hiring review
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-600 mt-0.5">
            {companies.length} companies · {jobs.length} jobs
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Kind toggle */}
      <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 rounded-2xl w-fit">
        {[
          { id: "companies", label: "Companies", Icon: Building2 },
          { id: "jobs", label: "Job posts", Icon: Briefcase },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === id ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
              filter === f ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={20} /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-600 text-sm">Nothing in this queue.</div>
      ) : tab === "companies" ? (
        <div className="space-y-3">
          {companies.map((c) => (
            <div key={c.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {c.logo_url ? (
                    <Image src={c.logo_url} alt={c.name} width={40} height={40} unoptimized className="w-10 h-10 object-contain rounded-xl border border-gray-100 dark:border-gray-800 bg-white p-1 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0"><Building2 size={16} className="text-gray-400" /></div>
                  )}
                  <div className="min-w-0">
                    <p className="font-black text-gray-900 dark:text-white truncate">{c.name}</p>
                    {c.industry && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.industry}</p>}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[10px] text-gray-400">
                      {c.profiles?.username && <span>@{c.profiles.username}</span>}
                      {c.location && <span className="flex items-center gap-1"><MapPin size={10} /> {c.location}</span>}
                      {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline"><Globe size={10} /> website</a>}
                    </div>
                  </div>
                </div>
                <StatusPill approved={c.approved} />
              </div>
              {c.description && <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{c.description}</p>}
              <Actions kind="company" row={c} label={c.name} busy={busy} onApprove={setApproved} onRemove={remove} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="font-black text-gray-900 dark:text-white truncate">{j.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{j.company}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[10px] text-gray-400">
                    {j.type && <span>{j.type}</span>}
                    {j.location && <span className="flex items-center gap-1"><MapPin size={10} /> {j.location}</span>}
                    <span>status: {j.status}</span>
                  </div>
                </div>
                <StatusPill approved={j.approved} />
              </div>
              {j.description && <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{j.description}</p>}
              <Actions kind="job" row={j} label={j.title} busy={busy} onApprove={setApproved} onRemove={remove} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ approved }) {
  return approved ? (
    <span className="text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg border text-emerald-500 bg-emerald-500/10 border-emerald-500/30 flex items-center gap-1 shrink-0">
      <CheckCircle2 size={10} /> Approved
    </span>
  ) : (
    <span className="text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg border text-amber-500 bg-amber-500/10 border-amber-500/30 flex items-center gap-1 shrink-0">
      <Clock size={10} /> Pending
    </span>
  );
}

function Actions({ kind, row, label, busy, onApprove, onRemove }) {
  return (
    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      {row.approved ? (
        <button
          onClick={() => onApprove(kind, row.id, false)}
          disabled={busy === row.id}
          className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl hover:bg-amber-100 transition-colors"
        >
          {busy === row.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Unapprove
        </button>
      ) : (
        <button
          onClick={() => onApprove(kind, row.id, true)}
          disabled={busy === row.id}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl hover:bg-emerald-100 transition-colors"
        >
          {busy === row.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
        </button>
      )}
      <button
        onClick={() => onRemove(kind, row.id, label)}
        disabled={busy === row.id}
        className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl hover:bg-red-100 transition-colors"
      >
        <Trash2 size={13} /> {kind === "company" ? "Delete" : "Reject"}
      </button>
    </div>
  );
}
