"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  GraduationCap, Briefcase, Loader2, RefreshCw, X, AlertTriangle,
  AlertCircle, Info, Search, Send, FileText, CheckCircle2,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { statusMeta, REQUIREMENT_STATUS_LABEL, DOCUMENT_STATUS_LABEL, requirementTone, documentTone } from "../../_study-work/lib/statusMachine";
import { StatusBadge } from "../../_study-work/components/StatusBadge";

const ALL_STATUSES = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "CONFIRMED", "FULL_APPLICATION",
  "DOCUMENT_COLLECTION", "DOCUMENT_REVIEW", "ADDITIONAL_INFORMATION_REQUIRED",
  "PROCESSING", "APPROVED", "COMPLETED", "REJECTED",
];
const REQUIREMENT_STATUSES = ["NOT_STARTED", "UPLOADED", "UNDER_REVIEW", "APPROVED", "REJECTED", "NEEDS_CORRECTION", "COMPLETED"];
const DOCUMENT_STATUSES = ["MISSING", "UPLOADED", "UNDER_REVIEW", "APPROVED", "REJECTED", "NEEDS_CORRECTION"];

const FLAG_STYLE = {
  error: { icon: AlertTriangle, className: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" },
  warning: { icon: AlertCircle, className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  info: { icon: Info, className: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" },
};

function FlagChip({ flag }) {
  const style = FLAG_STYLE[flag.level] ?? FLAG_STYLE.info;
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${style.className}`}>
      <Icon size={11} /> {flag.label}
    </span>
  );
}

export default function StudyWorkAdminContent({ showToast }) {
  const [token, setToken] = useState(undefined);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [flagFilter, setFlagFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [finalDoc, setFinalDoc] = useState({ name: "", category: "Admission Letter", fileName: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token ?? null));
  }, []);

  const authHeaders = useCallback(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const load = useCallback(async () => {
    if (token === undefined) return;
    setLoading(true);
    try {
      const res = await fetch("/api/study-work/admin", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load applications");
      setApplications(data.applications || []);
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders, showToast]);

  useEffect(() => {
    const run = () => { load(); };
    run();
  }, [load]);

  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const res = await fetch("/api/study-work/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ op: "detail", applicationId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load application");
      setDetail(data);
    } catch (err) {
      showToast?.(err.message, "error");
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }, [authHeaders, showToast]);

  useEffect(() => {
    const run = () => {
      if (selectedId) loadDetail(selectedId);
      else setDetail(null);
    };
    run();
  }, [selectedId, loadDetail]);

  async function call(op, payload) {
    setBusy(true);
    try {
      const res = await fetch("/api/study-work/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ op, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      return data;
    } catch (err) {
      showToast?.(err.message, "error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(status) {
    const ok = await call("updateStatus", { applicationId: selectedId, status });
    if (ok) { showToast?.("Application status updated."); loadDetail(selectedId); load(); }
  }

  async function handleRequirementChange(requirementId, status) {
    const ok = await call("updateRequirement", { requirementId, status });
    if (ok) { showToast?.("Requirement updated."); loadDetail(selectedId); }
  }

  async function handleDocumentChange(documentId, status, reviewerComment) {
    const ok = await call("updateDocument", { documentId, status, reviewerComment });
    if (ok) { showToast?.("Document reviewed."); loadDetail(selectedId); load(); }
  }

  async function handleSendReply(e) {
    e.preventDefault();
    if (!reply.trim() || !detail?.conversation) return;
    const ok = await call("sendMessage", { conversationId: detail.conversation.id, body: reply.trim() });
    if (ok) { setReply(""); loadDetail(selectedId); }
  }

  async function handleAddFinalDocument(e) {
    e.preventDefault();
    if (!finalDoc.name.trim() || !finalDoc.fileName.trim()) return;
    const ok = await call("addFinalDocument", { applicationId: selectedId, ...finalDoc });
    if (ok) { showToast?.("Final document added."); setFinalDoc({ name: "", category: "Admission Letter", fileName: "" }); loadDetail(selectedId); }
  }

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (flagFilter !== "all" && !a.flags.some((f) => f.level === flagFilter)) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return a.applicantName.toLowerCase().includes(q) || a.applicantEmail.toLowerCase().includes(q) || a.applicationNumber.toLowerCase().includes(q);
      }
      return true;
    });
  }, [applications, typeFilter, flagFilter, query]);

  const counts = useMemo(() => ({
    errors: applications.filter((a) => a.flags.some((f) => f.level === "error")).length,
    warnings: applications.filter((a) => a.flags.some((f) => f.level === "warning")).length,
    missing: applications.reduce((sum, a) => sum + a.documentSummary.missing, 0),
  }), [applications]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-gray-900 dark:text-white font-black">
          Study/Work Abroad <span className="text-gray-500 dark:text-gray-600 font-normal text-sm">({applications.length})</span>
        </h3>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-blue-500 dark:text-blue-400 font-bold hover:text-blue-600 dark:hover:text-blue-300">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
          <p className="text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">Errors</p>
          <p className="text-lg font-black text-rose-700 dark:text-rose-300">{counts.errors}</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Warnings</p>
          <p className="text-lg font-black text-amber-700 dark:text-amber-300">{counts.warnings}</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Missing Documents</p>
          <p className="text-lg font-black text-gray-700 dark:text-gray-200">{counts.missing}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicant, email, or #"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200">
          <option value="all">All types</option>
          <option value="study">Study Abroad</option>
          <option value="work">Work Abroad</option>
        </select>
        <select value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)} className="px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200">
          <option value="all">All flags</option>
          <option value="error">Errors only</option>
          <option value="warning">Warnings only</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-600 text-sm">No applications found.</div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((a) => {
            const meta = statusMeta(a.status);
            const Icon = a.type === "study" ? GraduationCap : Briefcase;
            return (
              <div key={a.id} onClick={() => setSelectedId(a.id)}
                className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{a.applicantName}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{a.applicantEmail} · {a.applicationNumber}</p>
                    </div>
                  </div>
                  <StatusBadge label={meta.shortLabel} tone={meta.badgeTone} />
                </div>
                {a.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {a.flags.map((f, i) => <FlagChip key={i} flag={f} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40" onClick={() => setSelectedId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg h-full bg-white dark:bg-gray-950 overflow-y-auto shadow-2xl">
            {detailLoading || !detail ? (
              <div className="p-16 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
            ) : (
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-gray-900 dark:text-white">{detail.application.application_number}</h4>
                  <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X size={18} /></button>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Applicant</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {detail.profile ? `${detail.profile.first_name} ${detail.profile.last_name}` : detail.application.personal?.legalFirstName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{detail.profile?.email ?? detail.application.personal?.email}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Status</p>
                  <select disabled={busy} value={detail.application.status} onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{statusMeta(s).label}</option>)}
                  </select>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Requirements</p>
                  <div className="space-y-2">
                    {detail.requirements.map((r) => (
                      <div key={r.id} className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{r.name}</p>
                        </div>
                        <select disabled={busy} value={r.status} onChange={(e) => handleRequirementChange(r.id, e.target.value)}
                          className="text-[11px] font-bold px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
                          {REQUIREMENT_STATUSES.map((s) => <option key={s} value={s}>{REQUIREMENT_STATUS_LABEL[s]}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Documents</p>
                  <div className="space-y-2">
                    {detail.documents.map((d) => (
                      <DocumentRow key={d.id} doc={d} busy={busy} onChange={handleDocumentChange} />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Final documents</p>
                  <div className="space-y-1.5 mb-2">
                    {(detail.application.status === "APPROVED" || detail.application.status === "COMPLETED") ? null : (
                      <p className="text-[11px] text-gray-400">Typically issued once the application reaches Approved/Completed.</p>
                    )}
                  </div>
                  <form onSubmit={handleAddFinalDocument} className="flex flex-col gap-1.5">
                    <input value={finalDoc.name} onChange={(e) => setFinalDoc((f) => ({ ...f, name: e.target.value }))} placeholder="Document name"
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs" />
                    <div className="flex gap-1.5">
                      <select value={finalDoc.category} onChange={(e) => setFinalDoc((f) => ({ ...f, category: e.target.value }))}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs">
                        {["Admission Letter", "Employment Contract", "Permit Documents", "Application Documents", "Supporting Documents", "Other"].map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <input value={finalDoc.fileName} onChange={(e) => setFinalDoc((f) => ({ ...f, fileName: e.target.value }))} placeholder="file-name.pdf"
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs" />
                    </div>
                    <button type="submit" disabled={busy} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-xs font-bold">
                      <FileText size={12} /> Add final document
                    </button>
                  </form>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Messages</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto mb-2">
                    {detail.messages.map((m) => (
                      <div key={m.id} className={`text-xs p-2 rounded-lg ${m.sender === "advisor" ? "bg-blue-50 dark:bg-blue-500/10 text-blue-900 dark:text-blue-200" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"}`}>
                        <p className="font-bold mb-0.5">{m.sender_name}</p>
                        <p>{m.body}</p>
                      </div>
                    ))}
                    {detail.messages.length === 0 && <p className="text-[11px] text-gray-400">No messages yet.</p>}
                  </div>
                  {detail.conversation && (
                    <form onSubmit={handleSendReply} className="flex gap-1.5">
                      <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply as advisor…"
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs" />
                      <button type="submit" disabled={busy || !reply.trim()} className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-50"><Send size={12} /></button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentRow({ doc, busy, onChange }) {
  const [comment, setComment] = useState(doc.reviewer_comment ?? "");
  return (
    <div className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{doc.name}{doc.required && <span className="text-rose-500"> *</span>}</p>
        <select disabled={busy} value={doc.status} onChange={(e) => onChange(doc.id, e.target.value, comment)}
          className="text-[11px] font-bold px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          {DOCUMENT_STATUSES.map((s) => <option key={s} value={s}>{DOCUMENT_STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      {doc.file_name && <p className="text-[10px] text-gray-400">{doc.file_name}</p>}
      <div className="flex gap-1.5">
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Reviewer comment"
          className="flex-1 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-[11px]" />
        <button disabled={busy} onClick={() => onChange(doc.id, doc.status, comment)}
          className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-[11px] font-bold text-gray-600 dark:text-gray-300"><CheckCircle2 size={12} /></button>
      </div>
    </div>
  );
}
