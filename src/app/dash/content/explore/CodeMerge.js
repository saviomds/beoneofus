"use client";
import { useState, useEffect, useCallback } from "react";
import {
  GitMerge, GitPullRequest, Check, X, AlertTriangle, Plus, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";

const STATUS_STYLES = {
  open:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  merged:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const SETUP_SQL = `create table if not exists project_merge_requests (
  id           uuid default gen_random_uuid() primary key,
  project_id   uuid references projects(id) on delete cascade,
  submitted_by uuid references auth.users(id),
  title        text not null,
  description  text,
  code_content text,
  status       text default 'open'
                 check (status in ('open','merged','rejected')),
  created_at   timestamptz default now()
);
alter table project_merge_requests enable row level security;
drop policy if exists "Anyone can view MRs" on project_merge_requests;
create policy "Anyone can view MRs" on project_merge_requests
  for select using (auth.uid() is not null);
drop policy if exists "Members can submit MRs" on project_merge_requests;
create policy "Members can submit MRs" on project_merge_requests
  for insert with check (auth.uid() = submitted_by);
drop policy if exists "Owners can update MRs" on project_merge_requests;
create policy "Owners can update MRs" on project_merge_requests
  for update using (
    project_id in (select id from projects where created_by = auth.uid())
  );`;

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border ${
      isError
        ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400"
        : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400"
    }`}>
      {isError ? <AlertTriangle size={15} /> : <Check size={15} />}
      {toast.msg}
    </div>
  );
}

function MRCard({ mr, isOwner, onMerge, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const statusCls = STATUS_STYLES[mr.status] ?? STATUS_STYLES.open;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <GitPullRequest size={15} className="text-blue-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{mr.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{new Date(mr.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg ${statusCls}`}>
            {mr.status}
          </span>
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 space-y-3 pt-3">
          {mr.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{mr.description}</p>
          )}
          {mr.code_content && (
            <pre className="text-xs bg-gray-950 text-gray-100 rounded-xl p-4 overflow-x-auto max-h-52 font-mono leading-5 whitespace-pre">
              {mr.code_content}
            </pre>
          )}
          {isOwner && mr.status === "open" && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onMerge(mr.id)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
              >
                <Check size={13} /> Merge
              </button>
              <button
                onClick={() => onReject(mr.id)}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
              >
                <X size={13} /> Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = { title: "", description: "", code: "" };

export default function CodeMerge({ project, currentUser }) {
  const [mrs, setMrs]           = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [isOwner, setIsOwner]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMRs = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("project_merge_requests")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    if (err?.code === "42P01" || err?.code === "42501" || err?.message?.includes("row-level security")) {
      setError("setup"); setLoading(false); return;
    }
    if (err) { setError("fetch"); setLoading(false); return; }

    setMrs(data || []);

    if (currentUser) {
      const isCreator = project.created_by === currentUser.id;
      if (isCreator) {
        setIsOwner(true);
      } else {
        const { data: m } = await supabase
          .from("project_members")
          .select("role")
          .eq("project_id", project.id)
          .eq("user_id", currentUser.id)
          .maybeSingle();
        setIsOwner(m?.role === "owner");
      }
    }
    setLoading(false);
  }, [project.id, project.created_by, currentUser]);

  useEffect(() => { fetchMRs(); }, [fetchMRs]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    if (!currentUser) { showToast("Sign in to submit a merge request.", "error"); return; }
    setSubmitting(true);
    const token = await getToken();
    if (!token) { showToast("Session expired — please refresh.", "error"); setSubmitting(false); return; }
    const res = await fetch("/api/merge-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ project_id: project.id, title: form.title.trim(), description: form.description.trim() || null, code_content: form.code.trim() || null }),
    });
    setSubmitting(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})); showToast("Failed: " + (b.error || "Unknown error"), "error"); return; }
    showToast("Merge request submitted!", "success");
    setForm(EMPTY_FORM);
    setShowForm(false);
    fetchMRs();
  };

  const handleMerge = async (id) => {
    const token = await getToken();
    if (!token) { showToast("Session expired — please refresh.", "error"); return; }
    const res = await fetch(`/api/merge-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "merged" }),
    });
    if (!res.ok) { const b = await res.json().catch(() => ({})); showToast("Failed: " + (b.error || "Unknown error"), "error"); }
    else { showToast("Merged!", "success"); fetchMRs(); }
  };

  const handleReject = async (id) => {
    const token = await getToken();
    if (!token) { showToast("Session expired — please refresh.", "error"); return; }
    const res = await fetch(`/api/merge-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (!res.ok) { const b = await res.json().catch(() => ({})); showToast("Failed: " + (b.error || "Unknown error"), "error"); }
    else { showToast("Rejected.", "success"); fetchMRs(); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={24} /></div>;

  if (error === "setup") {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-1">Database Setup Required</h4>
            <p className="text-sm text-amber-700 dark:text-amber-500 mb-3">
              Run this SQL to enable merge requests:
            </p>
            <pre className="text-xs bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto whitespace-pre">
              {SETUP_SQL}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  const open   = mrs.filter((m) => m.status === "open");
  const closed = mrs.filter((m) => m.status !== "open");

  return (
    <div className="space-y-4">
      <Toast toast={toast} />

      {/* New MR button */}
      {!showForm && currentUser && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm shadow-blue-500/20 active:scale-95"
        >
          <Plus size={14} /> New Merge Request
        </button>
      )}
      {!currentUser && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sign in to submit a merge request.</p>
      )}

      {/* Submit form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">New Merge Request</h3>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Title *"
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
          <textarea
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="Paste your code changes here (optional)"
            rows={5}
            className="w-full bg-gray-950 text-gray-100 font-mono border border-gray-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.title.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <GitPullRequest size={13} />}
              Submit
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Open MRs */}
      {open.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <GitPullRequest size={12} /> Open ({open.length})
          </h3>
          <div className="space-y-2">
            {open.map((mr) => (
              <MRCard key={mr.id} mr={mr} isOwner={isOwner} onMerge={handleMerge} onReject={handleReject} />
            ))}
          </div>
        </section>
      )}

      {/* Closed MRs */}
      {closed.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <GitMerge size={12} /> Closed ({closed.length})
          </h3>
          <div className="space-y-2">
            {closed.map((mr) => (
              <MRCard key={mr.id} mr={mr} isOwner={isOwner} onMerge={handleMerge} onReject={handleReject} />
            ))}
          </div>
        </section>
      )}

      {mrs.length === 0 && !showForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center">
          <GitMerge className="mx-auto mb-3 text-gray-300 dark:text-gray-700" size={28} />
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No merge requests yet</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Submit code changes for team review.</p>
        </div>
      )}
    </div>
  );
}
