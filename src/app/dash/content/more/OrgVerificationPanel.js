"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../../supabaseClient";
import { orgMeta } from "../../../../lib/orgTypes";
import {
  ShieldCheck, Loader2, Lock, FileText, ExternalLink,
  Check, X, Clock, Inbox, RefreshCw,
} from "lucide-react";

/**
 * OrgVerificationPanel — inline organization trust-review queue.
 * Self-contained: fetches its own session token and talks to the admin-gated
 * /api/admin/verification endpoint (server enforces is_admin — this is UI only).
 *
 * Props:
 *   onCount(n)  — optional callback fired with the pending count (for badges)
 */
export default function OrgVerificationPanel({ onCount }) {
  const [state, setState] = useState("loading"); // loading | ready | denied
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (status, tok) => {
    const res = await fetch(`/api/admin/verification?status=${status}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (res.status === 403) { setState("denied"); return; }
    const data = await res.json().catch(() => ({}));
    const list = data.requests || [];
    setRequests(list);
    setState("ready");
    setRefreshing(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setState("denied"); return; }
      setToken(session.access_token);
      load("pending", session.access_token);
    })();
  }, [load]);

  // Report the pending count to the parent (for the badge) as a side effect,
  // after the queue is loaded — never during render or inside a state updater.
  useEffect(() => {
    if (state === "ready" && tab === "pending" && typeof onCount === "function") {
      onCount(requests.length);
    }
  }, [state, tab, requests, onCount]);

  const switchTab = (t) => { setTab(t); setState("loading"); load(t, token); };
  const refresh = () => { setRefreshing(true); load(tab, token); };

  const act = async (id, action) => {
    setBusyId(id);
    await fetch("/api/admin/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, action }),
    });
    setBusyId(null);
    // Pure updater — just compute the next list. The parent is notified of the
    // new pending count from an effect below, after this commit (never during
    // render, which is what triggered the setState-in-render warning).
    setRequests((rs) => rs.filter((r) => r.id !== id));
  };

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-trust-500" size={24} />
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 mb-4">
          <Lock size={24} />
        </div>
        <h3 className="text-lg font-black text-gray-900 dark:text-white">Admins only</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          This trust-review console is restricted to platform administrators.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs + refresh */}
      <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
        <div className="flex gap-1.5">
          {["pending", "approved", "rejected"].map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                tab === t
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl py-16 text-center">
          <Inbox size={26} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-bold text-gray-900 dark:text-white">Nothing {tab}</p>
          <p className="text-sm text-gray-500 mt-1">The {tab} queue is empty.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const org = r.organizations;
            const meta = org ? orgMeta(org.type) : null;
            const Icon = meta?.icon || ShieldCheck;
            return (
              <div
                key={r.id}
                className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-trust-500 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-white">{org?.name || "Organization"}</p>
                      {meta && <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{meta.label}</span>}
                      {org?.is_verified && <span className="text-[10px] font-bold text-trust-500">already verified</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Requested by {r.profiles?.full_name || r.profiles?.username || "user"} ·{" "}
                      <Clock size={10} className="inline" /> {new Date(r.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-sm text-gray-600 dark:text-gray-300">
                      {r.registration_number && (
                        <span>Reg #: <span className="font-mono text-gray-900 dark:text-white">{r.registration_number}</span></span>
                      )}
                      {org?.slug && (
                        <Link href={`/organizations/${org.slug}`} className="text-brand-500 hover:text-brand-600 inline-flex items-center gap-1">
                          Public page <ExternalLink size={11} />
                        </Link>
                      )}
                      {r.document_signed_url
                        ? <a href={r.document_signed_url} target="_blank" rel="noreferrer" className="text-trust-500 hover:underline inline-flex items-center gap-1"><FileText size={13} /> View document</a>
                        : <span className="text-gray-400 inline-flex items-center gap-1"><FileText size={13} /> No document</span>}
                    </div>
                    {r.note && <p className="text-sm text-gray-500 mt-2 italic">“{r.note}”</p>}
                  </div>
                </div>

                {tab === "pending" && (
                  <div className="flex gap-2 mt-4 justify-end">
                    <button
                      onClick={() => act(r.id, "reject")}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/15 text-gray-600 dark:text-gray-300 hover:text-red-500 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    >
                      <X size={15} /> Reject
                    </button>
                    <button
                      onClick={() => act(r.id, "approve")}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1.5 bg-trust-500 hover:bg-trust-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    >
                      {busyId === r.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Approve &amp; verify
                    </button>
                  </div>
                )}
                {tab !== "pending" && r.review_note && (
                  <p className="text-xs text-gray-400 mt-3">Review note: {r.review_note}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
