"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import {
  Shield, Star, Crown, Check, X, Loader2, Building2,
  Globe, Mail, Eye, Award, RefreshCw, ChevronDown, Pencil,
  Trash2, CheckCircle2, XCircle, Clock, Handshake,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const TIER_OPTS = ["bronze", "silver", "gold"];
const STATUS_OPTS = ["pending", "active", "rejected"];

const TIER_COLORS = {
  bronze: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  silver: "text-slate-400 bg-slate-500/10 border-slate-500/30",
  gold:   "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
};
const STATUS_COLORS = {
  pending:  "text-amber-500 bg-amber-500/10 border-amber-500/30",
  active:   "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  rejected: "text-red-500 bg-red-500/10 border-red-500/30",
};
const TIER_ICONS = { bronze: Shield, silver: Star, gold: Crown };

export default function SponsorsAdminContent({ showToast }) {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState(null);

  // Fetch session token once on mount so PATCH/DELETE can prove admin identity.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null);
    });
  }, []);

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sponsors?all=true", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setSponsors(data.sponsors || []);
    } catch {
      showToast("Failed to load sponsors", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, token]);

  useEffect(() => {
    const init = () => { if (token !== null) load(); };
    init();
  }, [load, token]);

  const updateSponsor = async (id, updates) => {
    setSaving(true);
    try {
      const res = await fetch("/api/sponsors", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast("Sponsor updated");
      setEditing(null);
      await load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteSponsor = async (id, name) => {
    if (!window.confirm(`Delete sponsor "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/sponsors?id=${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast("Sponsor deleted");
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const startEdit = (s) => {
    setEditing(s.id);
    setEditFields({ tier: s.tier, status: s.status, logo_url: s.logo_url || "", tagline: s.tagline || "" });
  };

  const filtered = sponsors.filter(s => filter === "all" || s.status === filter);

  const counts = {
    all: sponsors.length,
    pending: sponsors.filter(s => s.status === "pending").length,
    active: sponsors.filter(s => s.status === "active").length,
    rejected: sponsors.filter(s => s.status === "rejected").length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-gray-900 dark:text-white font-black text-lg flex items-center gap-2">
            <Handshake size={18} className="text-blue-500" /> Sponsors
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-600 mt-0.5">{sponsors.length} total applications</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/sponsors"
            target="_blank"
            className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
          >
            <Globe size={12} /> Public page
          </a>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "active", "rejected"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {f} {counts[f] > 0 && <span className="ml-1 opacity-70">({counts[f]})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={20} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-600 text-sm">No sponsors in this category.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const TierIcon = TIER_ICONS[s.tier] || Shield;
            const isEditing = editing === s.id;
            return (
              <div
                key={s.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {s.logo_url ? (
                      <Image src={s.logo_url} alt={s.company_name} width={40} height={40} unoptimized className="w-10 h-10 object-contain rounded-xl border border-gray-100 dark:border-gray-800 bg-white p-1 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-black text-gray-900 dark:text-white truncate">{s.company_name}</p>
                      {s.tagline && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{s.tagline}</p>}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-gray-400"><Mail size={10} /> {s.contact_email}</span>
                        {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline"><Globe size={10} /> website</a>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg border flex items-center gap-1 ${TIER_COLORS[s.tier]}`}>
                      <TierIcon size={10} /> {s.tier}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg border ${STATUS_COLORS[s.status]}`}>
                      {s.status}
                    </span>
                    <button
                      onClick={() => isEditing ? setEditing(null) : startEdit(s)}
                      className="p-1.5 text-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => deleteSponsor(s.id, s.company_name)}
                      className="p-1.5 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Quick approve/reject buttons for pending */}
                {s.status === "pending" && !isEditing && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => updateSponsor(s.id, { status: "active" })}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                    >
                      <CheckCircle2 size={13} /> Approve
                    </button>
                    <button
                      onClick={() => updateSponsor(s.id, { status: "rejected" })}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                )}

                {/* Inline edit form */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Status</label>
                        <select
                          value={editFields.status}
                          onChange={e => setEditFields(f => ({ ...f, status: e.target.value }))}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                        >
                          {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Tier</label>
                        <select
                          value={editFields.tier}
                          onChange={e => setEditFields(f => ({ ...f, tier: e.target.value }))}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                        >
                          {TIER_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Logo URL</label>
                      <input
                        value={editFields.logo_url}
                        onChange={e => setEditFields(f => ({ ...f, logo_url: e.target.value }))}
                        placeholder="https://..."
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Tagline</label>
                      <input
                        value={editFields.tagline}
                        onChange={e => setEditFields(f => ({ ...f, tagline: e.target.value }))}
                        placeholder="Empowering developers worldwide"
                        maxLength={100}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSponsor(s.id, editFields)}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                      >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {s.description && (
                  <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 line-clamp-2">{s.description}</p>
                )}
                <p className="text-[9px] text-gray-300 dark:text-gray-700 mt-2">
                  Applied {new Date(s.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
