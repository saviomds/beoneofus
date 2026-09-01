'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../../supabaseClient';
import { verticalTheme } from '../../../lib/orgVerticals';
import {
  ArrowLeft, Loader2, Lock, Building2, Sun, Moon, Plus, ExternalLink,
  Save, ShieldCheck, CheckCircle2, Clock, AlertTriangle, TrendingUp, Trash2,
  X, MapPin, Users2, Image as ImageIcon, Calendar, Sparkles, RefreshCw,
  ArrowUp, ArrowDown, ArrowRight, Minus, Lightbulb, Target, Check,
} from 'lucide-react';

// ── Theme-aware surface tokens (mirror the business console) ─────────────────
const screen   = 'bg-slate-50 dark:bg-ink';
const panel    = 'rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-white/[0.03] dark:border-white/10 dark:shadow-none';
const heading  = 'text-slate-900 dark:text-white';
const body     = 'text-slate-700 dark:text-gray-200';
const muted    = 'text-slate-500 dark:text-gray-400';
const faint    = 'text-slate-400 dark:text-gray-500';
const hairline = 'border-slate-200 dark:border-white/10';
const field    = 'w-full rounded-xl py-2.5 px-3.5 text-sm outline-none border bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/40 dark:bg-white/[0.06] dark:border-transparent dark:text-gray-100 dark:placeholder:text-gray-600';
const accentTx = 'text-brand-600 dark:text-brand-400';

const toneClass = {
  brand:   'text-brand-600 dark:text-brand-400',
  trust:   'text-trust-600 dark:text-trust-500',
  premium: 'text-premium-600 dark:text-premium-500',
  slate:   'text-slate-700 dark:text-slate-300',
};

function fmt(v, format) {
  if (v == null) return '0';
  if (format === 'percent') return `${v}%`;
  if (format === 'number') return Number(v).toLocaleString();
  return String(v);
}

function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount guard: must start false on server/hydration, flip after mount to avoid a theme hydration mismatch
    setMounted(true);
  }, []);
  const isDark = mounted && (theme === 'dark' || (theme === 'system' && systemTheme === 'dark'));
  return (
    <button onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label="Toggle theme" title="Toggle light / dark"
      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors">
      {mounted ? (isDark ? <Sun size={16} /> : <Moon size={16} />) : <Moon size={16} />}
    </button>
  );
}

function SectionHead({ tag, title, desc, action }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <p className={`text-[11px] font-mono uppercase tracking-widest ${accentTx}`}>{tag}</p>
        <h2 className={`text-2xl font-black ${heading} mt-1`}>{title}</h2>
        {desc && <p className={`text-sm ${muted} mt-1`}>{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function Stat({ label, value, sub, tone = 'brand' }) {
  return (
    <div className={`${panel} p-5`}>
      <p className={`text-[11px] font-mono uppercase tracking-widest ${faint}`}>{label}</p>
      <p className={`text-3xl font-black mt-2 tabular-nums ${toneClass[tone] || toneClass.brand}`}>{value}</p>
      {sub && <p className={`text-xs ${faint} mt-1`}>{sub}</p>}
    </div>
  );
}

function Empty({ icon: Icon, title, desc, onAction, actionLabel }) {
  return (
    <div className={`${panel} py-16 text-center`}>
      <div className="w-12 h-12 rounded-2xl bg-brand-500/10 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4"><Icon size={22} /></div>
      <p className={`font-bold ${heading}`}>{title}</p>
      <p className={`text-sm ${faint} mt-1 mb-5 max-w-sm mx-auto`}>{desc}</p>
      {onAction && (
        <button onClick={onAction} className="inline-flex items-center gap-1.5 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={15} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

const STATUS_TONE = {
  active: 'bg-trust-500/10 text-trust-600 dark:text-trust-500',
  draft: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400',
  completed: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
  archived: 'bg-slate-100 dark:bg-white/5 text-slate-400',
  enrolled: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
  placed: 'bg-premium-500/10 text-premium-600 dark:text-premium-500',
  graduated: 'bg-premium-500/10 text-premium-600 dark:text-premium-500',
  dropped: 'bg-red-500/10 text-red-600 dark:text-red-400',
};
function Pill({ value }) {
  const key = (value || '').toLowerCase();
  return <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[key] || 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>{value}</span>;
}

// ── Program create form (the core institution workflow) ──────────────────────
function ProgramForm({ v, slug, token, onDone, onClose, initial }) {
  const [f, setF] = useState({
    title: initial?.title || '',
    kind: initial?.kind && v.kinds.includes(initial.kind) ? initial.kind : v.kinds[0],
    summary: initial?.summary || '',
    location: initial?.location || '',
    capacity: '',
    starts_at: '',
    status: initial?.status || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) { setErr(`Give your ${v.program.noun.toLowerCase()} a title.`); return; }
    setSaving(true); setErr(null);
    const res = await fetch(`/api/console/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'create_program', ...f }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setErr(d.error || 'Could not create.'); return; }
    onDone?.(d.program?.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className={`${panel} w-full sm:max-w-lg p-6 rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={`text-lg font-black ${heading}`}>{v.program.verb}</h3>
          <button type="button" onClick={onClose} className={`${muted} hover:${heading}`}><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-bold ${muted} mb-1.5`}>Title</label>
            <input autoFocus className={field} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={`e.g. ${v.program.noun} name`} maxLength={140} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-bold ${muted} mb-1.5`}>Type</label>
              <select className={field} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                {v.kinds.map((k) => <option key={k} value={k} className="capitalize">{k}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-bold ${muted} mb-1.5`}>Status</label>
              <select className={field} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-bold ${muted} mb-1.5`}>Summary</label>
            <input className={field} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="One line on what it does" maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-bold ${muted} mb-1.5`}>Location / region</label>
              <input className={field} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="District, venue…" maxLength={80} />
            </div>
            <div>
              <label className={`block text-xs font-bold ${muted} mb-1.5`}>Target ({v.person.plural.toLowerCase()})</label>
              <input type="number" min="0" className={field} value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-bold ${muted} mb-1.5`}>Start date <span className={faint}>(optional)</span></label>
            <input type="date" className={field} value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} />
          </div>
          {err && <p className="text-sm text-red-500 dark:text-red-400">{err}</p>}
          <button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {v.program.verb}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Programs section — list + create + manage status + add participants ──────
function Programs({ v, data, slug, token, reload, filter, prefill, onPrefillConsumed, onLinkRec }) {
  const [creating, setCreating] = useState(false);
  const [initial, setInitial] = useState(null);
  const [openId, setOpenId] = useState(null);
  let programs = data.programs;
  if (filter?.kind) programs = programs.filter((p) => p.kind === filter.kind);

  // Opened from a recommendation → open the create form pre-filled with its context.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- respond to a one-shot prefill signal from the parent, then acknowledge it
    if (prefill) { setInitial(prefill); setCreating(true); onPrefillConsumed?.(); }
  }, [prefill, onPrefillConsumed]);

  const openCreate = () => { setInitial(null); setCreating(true); };
  const closeCreate = () => { setCreating(false); setInitial(null); };

  const noun = filter?.kind === 'event' ? { noun: 'Event', plural: 'Events', verb: 'Create event' } : v.program;

  const patch = async (programId, changes) => {
    await fetch(`/api/console/${slug}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'update_program', programId, ...changes }),
    });
    reload();
  };
  const remove = async (programId) => {
    await fetch(`/api/console/${slug}?programId=${programId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    reload();
  };

  return (
    <div>
      <SectionHead tag="Workflow" title={noun.plural} desc={`Create and run the ${noun.plural.toLowerCase()} your organization delivers.`}
        action={<button onClick={openCreate} className="inline-flex items-center gap-1.5 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl transition-colors shrink-0"><Plus size={15} /> {noun.verb}</button>} />
      {programs.length === 0 ? (
        <Empty icon={Calendar} title={`No ${noun.plural.toLowerCase()} yet`} desc={`Launch your first ${noun.noun.toLowerCase()} to start tracking reach and outcomes — everything here runs on real data.`} onAction={openCreate} actionLabel={noun.verb} />
      ) : (
        <div className="space-y-2.5">
          {programs.map((p) => (
            <div key={p.id} className={`${panel} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-bold ${heading} truncate`}>{p.title}</p>
                    <Pill value={p.status} />
                    <span className={`text-[11px] font-mono uppercase tracking-wider ${faint} capitalize`}>{p.kind}</span>
                  </div>
                  {p.summary && <p className={`text-sm ${muted} mt-1`}>{p.summary}</p>}
                  <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs ${faint}`}>
                    <span className="inline-flex items-center gap-1"><Users2 size={12} /> {p.participantCount} {v.person.plural.toLowerCase()}{p.capacity ? ` / ${p.capacity}` : ''}</span>
                    {p.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{p.location}</span>}
                    {p.starts_at && <span className="inline-flex items-center gap-1"><Calendar size={12} />{new Date(p.starts_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setOpenId(openId === p.id ? null : p.id)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300 hover:bg-brand-500/20 transition-colors">
                    <Plus size={13} className="inline -mt-0.5" /> Add
                  </button>
                  {p.status === 'active'
                    ? <button onClick={() => patch(p.id, { status: 'completed' })} title="Mark completed" className={`text-xs font-bold px-2 py-1.5 rounded-lg ${muted} hover:bg-slate-100 dark:hover:bg-white/10`}>Complete</button>
                    : <button onClick={() => patch(p.id, { status: 'active' })} title="Reactivate" className={`text-xs font-bold px-2 py-1.5 rounded-lg ${muted} hover:bg-slate-100 dark:hover:bg-white/10`}>Activate</button>}
                  <button onClick={() => remove(p.id)} title="Delete" className="text-red-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                </div>
              </div>
              {openId === p.id && <AddParticipant v={v} program={p} slug={slug} token={token} reload={reload} />}
            </div>
          ))}
        </div>
      )}
      {creating && <ProgramForm v={{ ...v, program: noun, kinds: filter?.kind ? [filter.kind] : v.kinds }} slug={slug} token={token} initial={initial}
        onClose={closeCreate}
        onDone={(newId) => { const rid = initial?.recId; closeCreate(); reload(); if (rid && newId) onLinkRec?.(rid, newId); }} />}
    </div>
  );
}

function AddParticipant({ v, program, slug, token, reload }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState(v.defaultRole);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const roles = [v.defaultRole, 'volunteer', 'graduate', 'member', 'attendee'].filter((r, i, a) => a.indexOf(r) === i);

  const add = async () => {
    if (!name.trim()) { setErr('Enter a name.'); return; }
    setBusy(true); setErr(null);
    const res = await fetch(`/api/console/${slug}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'add_participant', programId: program.id, external_name: name, role, status: 'enrolled' }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(d.error || 'Could not add.'); return; }
    setName(''); reload();
  };

  return (
    <div className={`mt-3 pt-3 border-t ${hairline} flex flex-col sm:flex-row gap-2`}>
      <input className={`${field} flex-1`} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={`Add a ${v.person.noun.toLowerCase()} by name`} maxLength={80} />
      <select className={`${field} sm:w-40`} value={role} onChange={(e) => setRole(e.target.value)}>
        {roles.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
      </select>
      <button onClick={add} disabled={busy} className="inline-flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl font-bold text-sm shrink-0">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
      </button>
      {err && <p className="text-xs text-red-500 self-center">{err}</p>}
    </div>
  );
}

// ── Directory — participants list (filtered per tab) ─────────────────────────
function Directory({ v, data, slug, token, reload, filter, label }) {
  let people = data.directory;
  if (filter?.role) people = people.filter((p) => (p.role || '').toLowerCase() === filter.role);
  if (filter?.status) people = people.filter((p) => (p.status || '').toLowerCase() === filter.status);

  const setStatus = async (participantId, status) => {
    await fetch(`/api/console/${slug}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'update_participant', participantId, status }),
    });
    reload();
  };
  const remove = async (participantId) => {
    await fetch(`/api/console/${slug}?participantId=${participantId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    reload();
  };

  const title = label || v.person.plural;
  return (
    <div>
      <SectionHead tag="People" title={title} desc={`Everyone connected through your ${v.program.plural.toLowerCase()}.`} />
      {people.length === 0 ? (
        <Empty icon={Users2} title={`No ${title.toLowerCase()} yet`} desc={`Add people from the ${v.program.plural} tab to see them here.`} />
      ) : (
        <div className="space-y-2">
          {people.map((p) => (
            <div key={p.id} className={`${panel} p-3.5 flex items-center gap-3`}>
              <div className={`relative w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex items-center justify-center text-xs font-black ${muted} shrink-0`}>
                {p.avatar ? <Image src={p.avatar} alt="" fill unoptimized className="object-cover" referrerPolicy="no-referrer" /> : (p.name[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-bold ${heading} truncate`}>{p.name}</p>
                  {p.external && <span className={`text-[10px] font-mono uppercase ${faint}`}>off-platform</span>}
                </div>
                <p className={`text-xs ${faint} truncate`}>{p.programTitle} · <span className="capitalize">{p.role}</span></p>
              </div>
              <select value={p.status} onChange={(e) => setStatus(p.id, e.target.value)}
                className="text-xs font-bold rounded-lg py-1.5 px-2 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 border-0 outline-none capitalize cursor-pointer">
                {['enrolled', 'active', 'completed', 'placed', 'graduated', 'dropped'].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
              <button onClick={() => remove(p.id)} title="Remove" className="text-red-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Impact — vertical-specific analytics from real activity ──────────────────
const INSIGHT_TONE = {
  positive: { dot: 'bg-trust-500', label: 'text-trust-600 dark:text-trust-500' },
  watch:    { dot: 'bg-premium-500', label: 'text-premium-600 dark:text-premium-500' },
  neutral:  { dot: 'bg-slate-400', label: 'text-slate-500 dark:text-gray-400' },
};

function DeterministicInsights({ v, k }) {
  if (k.participants === 0) {
    return <p className={`text-sm ${muted}`}>Insights populate as you run {v.program.plural.toLowerCase()} and record {v.person.plural.toLowerCase()}.</p>;
  }
  return (
    <ul className={`space-y-2 text-sm ${body}`}>
      <li>• {k.participants.toLocaleString()} {v.person.plural.toLowerCase()} across {k.activePrograms} active {v.program.plural.toLowerCase()}.</li>
      <li>• {k.newParticipants} joined in the last 7 days.</li>
      <li>• {k.completionRate}% completion rate{k.regions ? ` across ${k.regions} location${k.regions === 1 ? '' : 's'}` : ''}.</li>
    </ul>
  );
}

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
}

const TREND_ICON = { up: ArrowUp, down: ArrowDown, flat: Minus };
const TREND_TONE = { up: 'text-trust-600 dark:text-trust-500', down: 'text-red-500 dark:text-red-400', flat: 'text-slate-400 dark:text-gray-500' };

function AiInsightsHeader({ children }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center"><Sparkles size={15} /></div>
        <h3 className={`text-sm font-black ${heading}`}>AI insights</h3>
      </div>
      {children}
    </div>
  );
}

function AiInsights({ v, data, slug, token }) {
  const k = data.kpis;
  const [state, setState] = useState('init'); // init | idle | ready | generating | error
  const [ai, setAi] = useState(null);
  const [err, setErr] = useState(null);
  const hasActivity = k.participants > 0 || data.programs.length > 0;

  // On open, load the cached analysis (fast path — no AI call).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/console/${slug}/insights`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.ok && d.cached) { setAi(d); setState('ready'); }
        else setState('idle');
      } catch { if (active) setState('idle'); }
    })();
    return () => { active = false; };
  }, [slug, token]);

  const generate = async () => {
    setState('generating'); setErr(null);
    try {
      const res = await fetch(`/api/console/${slug}/insights`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || 'Could not generate insights.'); setState('error'); return; }
      setAi(d); setState('ready');
    } catch { setErr('Network error. Try again.'); setState('error'); }
  };

  if (state === 'init' || state === 'generating') {
    return (
      <div className={`${panel} p-5`}>
        <AiInsightsHeader />
        <div className="space-y-2.5 animate-pulse">
          <div className="h-3.5 w-3/4 rounded bg-slate-100 dark:bg-white/5" />
          <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/5" />
          <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-white/5" />
          <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  if (state === 'ready' && ai) {
    return (
      <div className={`${panel} p-5`}>
        <AiInsightsHeader>
          <button onClick={generate} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700">
            <RefreshCw size={13} /> Regenerate
          </button>
        </AiInsightsHeader>

        {ai.stale && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-premium-600 dark:text-premium-500 bg-premium-500/10 border border-premium-500/20 rounded-lg px-2.5 py-1.5 mb-3">
            <AlertTriangle size={12} /> {ai.staleReason || 'New data available'} — regenerate to refresh.
          </div>
        )}

        <p className={`text-sm font-bold ${heading} mb-3`}>{ai.headline}</p>

        {ai.trends?.length > 0 && (
          <div className="grid grid-cols-1 gap-1.5 mb-4">
            {ai.trends.map((t, idx) => {
              const Icon = TREND_ICON[t.direction] || Minus;
              return (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 font-bold tabular-nums shrink-0 ${TREND_TONE[t.direction] || TREND_TONE.flat}`}>
                    <Icon size={13} /> {t.delta}
                  </span>
                  <span className={`${muted} truncate`} title={t.text}>{t.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <ul className="space-y-2.5">
          {ai.insights.map((i, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${(INSIGHT_TONE[i.kind] || INSIGHT_TONE.neutral).dot}`} />
              <span className={body}>{i.text}</span>
            </li>
          ))}
        </ul>

        {ai.recommendations?.length > 0 && (
          <div className="mt-4 space-y-2">
            {ai.recommendations.map((r, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs bg-brand-500/[0.07] border border-brand-500/20 rounded-xl p-3">
                <Lightbulb size={14} className="text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                <span className={body}><span className="font-bold">{r.action}.</span> {r.rationale}</span>
              </div>
            ))}
          </div>
        )}

        <p className={`text-[10px] font-mono uppercase tracking-wider ${faint} mt-3`}>
          AI · from your program data · updated {timeAgo(ai.generatedAt)}
        </p>
      </div>
    );
  }

  // idle | error — deterministic fallback + a way to generate.
  return (
    <div className={`${panel} p-5`}>
      <AiInsightsHeader />
      {state === 'error' && (
        <div className="flex items-start gap-2 text-xs text-red-500 dark:text-red-400 mb-3">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" /><span>{err}</span>
        </div>
      )}
      {!hasActivity ? (
        <p className={`text-sm ${muted}`}>Run {v.program.plural.toLowerCase()} and record {v.person.plural.toLowerCase()} to unlock an AI analysis of your impact.</p>
      ) : (
        <>
          <DeterministicInsights v={v} k={k} />
          <button onClick={generate} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl transition-colors">
            <Sparkles size={15} /> {state === 'error' ? 'Try again' : 'Generate AI insights'}
          </button>
        </>
      )}
    </div>
  );
}

function Impact({ v, data, slug, token }) {
  const k = data.kpis;
  const statusRows = Object.entries(k.byStatus || {}).sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(1, ...statusRows.map(([, n]) => n));
  return (
    <div>
      <SectionHead tag="Analytics" title={v.impactHeadline} desc="Reach, engagement, and outcomes — derived from your real activity, nothing simulated." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {v.kpis.map((kp) => <Stat key={kp.key} label={kp.label} value={fmt(k[kp.key], kp.format)} tone={kp.tone} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className={`${panel} p-5`}>
          <h3 className={`text-sm font-black ${heading} mb-4`}>{v.person.plural} by status</h3>
          {statusRows.length === 0 ? <p className={`text-sm ${faint}`}>No participants recorded yet.</p> : (
            <div className="space-y-2.5">
              {statusRows.map(([s, n]) => (
                <div key={s}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`capitalize ${body}`}>{s}</span>
                    <span className={`font-bold tabular-nums ${heading}`}>{n}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(n / maxStatus) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <AiInsights v={v} data={data} slug={slug} token={token} />
      </div>
    </div>
  );
}

// ── Recommendations — prescriptive, trackable action cards ───────────────────
const REC_TYPE_LABEL = {
  capacity_gap: 'Enrolment', empty_program: 'Empty program', declining_completion: 'At-risk',
  regional_coverage: 'Regional gap', volunteer_shortage: 'Volunteers', placement_gap: 'Placements',
  reengagement: 'Re-engagement', event_gap: 'Events', new_program: 'Pipeline',
};
const REC_PRIORITY = {
  high:   { chip: 'bg-red-500/10 text-red-600 dark:text-red-400', label: 'High' },
  medium: { chip: 'bg-premium-500/10 text-premium-600 dark:text-premium-500', label: 'Medium' },
  low:    { chip: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400', label: 'Low' },
};

// Map a recommendation → sensible starting values for the program-create form.
function prefillFromRec(rec) {
  const loc = rec.evidence?.location || '';
  const TITLE = {
    regional_coverage: loc ? `${loc} outreach` : 'Outreach program',
    volunteer_shortage: 'Volunteer drive',
    event_gap: 'Community event',
    reengagement: rec.suggestedKind === 'event' ? 'Re-engagement event' : '',
  };
  return {
    kind: rec.suggestedKind || undefined,
    title: TITLE[rec.type] || '',
    location: loc,
    summary: rec.title || '',
    status: 'active',
  };
}

const REC_STATUS = {
  suggested:   { label: 'New',         chip: 'bg-brand-500/10 text-brand-600 dark:text-brand-400' },
  accepted:    { label: 'Accepted',    chip: 'bg-trust-500/10 text-trust-600 dark:text-trust-500' },
  in_progress: { label: 'In Progress', chip: 'bg-premium-500/10 text-premium-600 dark:text-premium-500' },
  completed:   { label: 'Completed',   chip: 'bg-trust-500/10 text-trust-600 dark:text-trust-500' },
  resolved:    { label: 'Resolved',    chip: 'bg-trust-500/10 text-trust-600 dark:text-trust-500' },
  dismissed:   { label: 'Dismissed',   chip: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400' },
  archived:    { label: 'Archived',    chip: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400' },
};

// One-line summary of what became of a recommendation, from stored state.
function recJourney(h) {
  const prog = h.linkedProgram;
  const lp = prog ? `"${prog.title}"` : (h.createdProgramId ? 'a program (since removed)' : null);
  switch (h.status) {
    case 'suggested':   return 'Awaiting a decision.';
    case 'accepted':    return 'Accepted — not yet linked to a program.';
    case 'in_progress': return lp ? `Accepted → created ${lp}, now running.` : 'Accepted → program in progress.';
    case 'completed':   return prog ? `Created ${lp} → completed with ${(prog.participants || 0).toLocaleString()} participants (${prog.completionPct || 0}%).` : 'Marked completed.';
    case 'resolved':    return h.resolutionNote || 'Resolved — the underlying issue was solved.';
    case 'dismissed':   return 'Dismissed by a manager.';
    case 'archived':    return 'Archived.';
    default:            return '';
  }
}

function HistoryRow({ h }) {
  const st = REC_STATUS[h.status] || REC_STATUS.suggested;
  const prio = REC_PRIORITY[h.priority] || REC_PRIORITY.medium;
  const terminal = ['completed', 'resolved', 'dismissed', 'archived'].includes(h.status);
  const imp = h.linkedProgram?.impact ? IMPACT[h.linkedProgram.impact] : null;
  return (
    <div className={`${panel} p-4`}>
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${st.chip}`}>{st.label}</span>
        <span className={`text-[10px] font-mono uppercase tracking-wider ${faint}`}>{REC_TYPE_LABEL[h.type] || h.type}</span>
        {!terminal && <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${prio.chip}`}>{prio.label}</span>}
        {h.source === 'ai' && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-400"><Sparkles size={10} /> AI</span>}
        {imp && <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${imp.cls}`}>{imp.label}</span>}
      </div>
      <p className={`font-bold text-sm ${heading}`}>{h.title}</p>
      <p className={`text-sm ${muted} mt-0.5`}>{recJourney(h)}</p>
      <p className={`text-[11px] ${faint} mt-2`}>
        Generated {timeAgo(h.createdAt)}
        {h.status !== 'suggested' && h.updatedAt ? ` · last activity ${timeAgo(h.updatedAt)}` : ''}
      </p>
    </div>
  );
}
const IMPACT = {
  high:   { label: 'High impact',   cls: 'bg-trust-500/10 text-trust-600 dark:text-trust-500' },
  medium: { label: 'Medium impact', cls: 'bg-premium-500/10 text-premium-600 dark:text-premium-500' },
  low:    { label: 'Low impact',    cls: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400' },
};

function LinkedProgram({ lp }) {
  if (!lp) return null;
  const imp = lp.impact ? IMPACT[lp.impact] : null;
  return (
    <div className={`mt-3 rounded-xl border ${hairline} bg-slate-50 dark:bg-white/[0.02] p-3`}>
      <div className="flex items-center gap-1.5">
        <CheckCircle2 size={13} className="text-trust-500 shrink-0" />
        <span className={`text-sm font-bold ${heading} truncate`}>{lp.title}</span>
        <span className={`text-[10px] font-mono uppercase ${faint} capitalize`}>{lp.status}</span>
      </div>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs ${muted}`}>
        <span><span className={`font-bold ${heading} tabular-nums`}>{(lp.participants || 0).toLocaleString()}</span> participants</span>
        <span><span className={`font-bold ${heading} tabular-nums`}>{lp.completionPct || 0}%</span> completion</span>
        {imp && <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${imp.cls}`}>{imp.label}</span>}
      </div>
    </div>
  );
}

function RecCard({ rec, busy, onAct, onCreate, onView }) {
  const prio = REC_PRIORITY[rec.priority] || REC_PRIORITY.medium;
  const st = REC_STATUS[rec.status] || REC_STATUS.suggested;
  const isNew = rec.status === 'suggested';
  const resolved = rec.status === 'resolved';
  const hasLink = !!rec.linkedProgram;
  const canCreate = (isNew || rec.status === 'accepted') && rec.suggestedKind;
  const canDismiss = !['completed', 'resolved'].includes(rec.status);
  const anyAction = isNew || canCreate || hasLink || canDismiss;
  return (
    <div className={`${panel} p-4 ${rec.status === 'in_progress' ? 'ring-1 ring-premium-500/25' : ''} ${resolved ? 'opacity-90' : ''}`}>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${st.chip}`}>
          {resolved && <CheckCircle2 size={11} />}{st.label}
        </span>
        {!resolved && <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${prio.chip}`}>{prio.label}</span>}
        <span className={`text-[10px] font-mono uppercase tracking-wider ${faint}`}>{REC_TYPE_LABEL[rec.type] || rec.type}</span>
        {rec.source === 'ai' && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-400"><Sparkles size={10} /> AI</span>}
      </div>
      <p className={`font-bold ${heading} ${resolved ? 'line-through decoration-slate-300 dark:decoration-white/20' : ''}`}>{rec.title}</p>
      {!resolved && rec.rationale && <p className={`text-sm ${muted} mt-1`}>{rec.rationale}</p>}

      {resolved && rec.resolutionNote && (
        <div className="mt-2.5 flex items-start gap-2 text-sm bg-trust-500/[0.08] border border-trust-500/20 rounded-xl p-3">
          <CheckCircle2 size={15} className="text-trust-600 dark:text-trust-500 shrink-0 mt-0.5" />
          <span className={body}>{rec.resolutionNote}</span>
        </div>
      )}

      {hasLink && <LinkedProgram lp={rec.linkedProgram} />}

      {anyAction && (
        <div className={`flex items-center gap-1.5 mt-3 pt-3 border-t ${hairline}`}>
          {isNew && (
            <button disabled={busy} onClick={() => onAct(rec.id, 'accepted')}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />} Accept
            </button>
          )}
          {canCreate && (
            <button onClick={() => onCreate(rec)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${rec.status === 'accepted' ? 'bg-brand-500 hover:bg-brand-600 text-white' : `${muted} hover:bg-slate-100 dark:hover:bg-white/10`}`}>
              <Plus size={13} /> Create {rec.suggestedKind}
            </button>
          )}
          {hasLink && (
            <button onClick={() => onView?.()}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg ${muted} hover:bg-slate-100 dark:hover:bg-white/10 transition-colors`}>
              <ArrowRight size={13} /> View program
            </button>
          )}
          {canDismiss && (
            <button disabled={busy} onClick={() => onAct(rec.id, rec.status === 'in_progress' ? 'archived' : 'dismissed')}
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto transition-colors">
              <X size={13} /> {rec.status === 'in_progress' ? 'Archive' : 'Dismiss'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <div className={`${panel} p-3 text-center`}>
      <p className={`text-2xl font-black tabular-nums ${tone === 'trust' ? 'text-trust-600 dark:text-trust-500' : heading}`}>{value}</p>
      <p className={`text-[10px] font-mono uppercase tracking-wider ${faint} mt-0.5`}>{label}</p>
    </div>
  );
}

function Recommendations({ v, slug, token, go, onCreateProgram }) {
  const [state, setState] = useState('init'); // init | ready | generating
  const [cards, setCards] = useState([]);
  const [done, setDone] = useState([]);
  const [resolvedList, setResolvedList] = useState([]);
  const [metrics, setMetrics] = useState({ generated: 0 });
  const [genAt, setGenAt] = useState(null);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('board'); // board | history
  const [history, setHistory] = useState(null);
  const [histState, setHistState] = useState('idle'); // idle | loading | ready
  const programsTab = v.nav.find((n) => n.component === 'programs' && !n.filter)?.id || 'programs';

  const apply = (d) => {
    setCards(d.recommendations || []);
    setDone(d.completed || []);
    setResolvedList(d.resolved || []);
    setMetrics(d.metrics || { generated: 0 });
    setGenAt(d.generatedAt);
  };

  const loadCache = useCallback(async () => {
    try {
      const res = await fetch(`/api/console/${slug}/recommendations`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => ({}));
      if (res.ok) apply(d);
    } catch { /* keep prior */ }
    setState('ready');
  }, [slug, token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- load cached recommendations on mount
  useEffect(() => { loadCache(); }, [loadCache]);

  const generate = async () => {
    setState('generating'); setErr(null);
    try {
      const res = await fetch(`/api/console/${slug}/recommendations`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || 'Could not generate recommendations.'); setState('ready'); return; }
      apply(d);
    } catch { setErr('Network error. Try again.'); }
    setState('ready');
  };

  const act = async (id, status) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/console/${slug}/recommendations`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) apply(d);
    } catch { await loadCache(); }
    setBusyId(null);
  };

  const loadHistory = useCallback(async () => {
    setHistState('loading');
    try {
      const res = await fetch(`/api/console/${slug}/recommendations?scope=history`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setHistory(d.history || []);
    } catch { /* keep prior */ }
    setHistState('ready');
  }, [slug, token]);

  const switchTab = (t) => {
    setTab(t);
    if (t === 'history' && history === null) loadHistory();
  };

  const genBtn = (
    <button onClick={tab === 'history' ? loadHistory : generate} disabled={state === 'generating' || histState === 'loading'}
      className="inline-flex items-center gap-1.5 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl disabled:opacity-60 transition-colors shrink-0">
      {(state === 'generating' || (tab === 'history' && histState === 'loading')) ? <Loader2 size={15} className="animate-spin" /> : (tab === 'history' || metrics.generated) ? <RefreshCw size={15} /> : <Sparkles size={15} />}
      {tab === 'history' ? 'Refresh' : metrics.generated ? 'Refresh' : 'Generate'}
    </button>
  );

  const toggle = (
    <div className="inline-flex rounded-xl bg-slate-100 dark:bg-white/5 p-0.5">
      {['board', 'history'].map((t) => (
        <button key={t} onClick={() => switchTab(t)}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg capitalize transition-colors ${tab === t ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'}`}>
          {t}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <SectionHead tag="Prescriptive" title="Recommended actions" desc="Detected from your real program data — accept to act, and track outcomes as programs run."
        action={<div className="flex items-center gap-2">{toggle}{(tab === 'board' && metrics.generated > 0) && genBtn}</div>} />

      {err && (
        <div className="flex items-start gap-2 text-sm text-red-500 dark:text-red-400 mb-4">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" /><span>{err}</span>
        </div>
      )}

      {tab === 'board' && state === 'generating' && (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${panel} p-4 animate-pulse`}>
              <div className="h-3 w-24 rounded bg-slate-100 dark:bg-white/5 mb-3" />
              <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-white/5 mb-2" />
              <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {tab === 'board' && state !== 'generating' && metrics.generated === 0 && (
        <Empty icon={Target} title="No recommendations yet"
          desc="Generate to scan your programs and participants for concrete, prioritized actions."
          onAction={generate} actionLabel="Generate recommendations" />
      )}

      {tab === 'board' && state !== 'generating' && metrics.generated > 0 && (
        <>
          {/* AI-impact metrics — does AI actually drive outcomes? */}
          <div className="mb-4">
            <p className={`text-[11px] font-mono uppercase tracking-widest ${accentTx} mb-2`}>AI impact</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <MiniStat label="Generated" value={metrics.generated} />
              <MiniStat label="Accepted" value={metrics.accepted || 0} />
              <MiniStat label="Programs" value={metrics.programsCreated || 0} />
              <MiniStat label="Completed" value={metrics.completed || 0} tone="trust" />
              <MiniStat label="Resolved" value={metrics.resolved || 0} tone="trust" />
              <MiniStat label="Success" value={`${metrics.successRate || 0}%`} tone="trust" />
            </div>
          </div>

          {cards.length > 0 ? (
            <div className="space-y-2.5">
              {cards.map((rec) => (
                <RecCard key={rec.id} rec={rec} busy={busyId === rec.id}
                  onAct={act} onCreate={() => onCreateProgram(rec)} onView={() => go(programsTab)} />
              ))}
            </div>
          ) : (
            <div className={`${panel} p-6 text-center`}>
              <p className={`text-sm ${muted}`}>You&apos;ve actioned every open recommendation. Refresh to scan for new ones as your data grows.</p>
            </div>
          )}

          {done.length > 0 && (
            <div className="mt-6">
              <p className={`text-[11px] font-mono uppercase tracking-widest ${faint} mb-2`}>Completed · outcomes</p>
              <div className="space-y-2.5">
                {done.map((rec) => (
                  <RecCard key={rec.id} rec={rec} busy={busyId === rec.id}
                    onAct={act} onCreate={() => onCreateProgram(rec)} onView={() => go(programsTab)} />
                ))}
              </div>
            </div>
          )}

          {resolvedList.length > 0 && (
            <div className="mt-6">
              <p className={`text-[11px] font-mono uppercase tracking-widest ${faint} mb-2`}>Resolved · AI re-evaluated</p>
              <div className="space-y-2.5">
                {resolvedList.map((rec) => (
                  <RecCard key={rec.id} rec={rec} busy={busyId === rec.id}
                    onAct={act} onCreate={() => onCreateProgram(rec)} onView={() => go(programsTab)} />
                ))}
              </div>
            </div>
          )}

          {genAt && <p className={`text-xs ${faint} mt-4`}>Updated {timeAgo(genAt)} · AI re-checks resolved status on every load</p>}
        </>
      )}

      {tab === 'history' && (
        histState === 'loading' && history === null ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${panel} p-4 animate-pulse`}>
                <div className="h-3 w-28 rounded bg-slate-100 dark:bg-white/5 mb-3" />
                <div className="h-4 w-1/2 rounded bg-slate-100 dark:bg-white/5 mb-2" />
                <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-white/5" />
              </div>
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <Empty icon={Target} title="No history yet"
            desc="Once you generate recommendations, every suggestion and what became of it is logged here." />
        ) : (
          <>
            <p className={`text-sm ${muted} mb-3`}>Everything AI has suggested for this organization, most recent first — and what was done about it.</p>
            <div className="space-y-2.5">
              {history.map((h) => <HistoryRow key={h.id} h={h} />)}
            </div>
          </>
        )
      )}
    </div>
  );
}

// Top recommendation surfaced on Overview — pulls the #1 active action (cached GET).
function TopRecommendation({ slug, token, go }) {
  const [rec, setRec] = useState(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/console/${slug}/recommendations`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json().catch(() => ({}));
        if (active && res.ok && d.recommendations?.length) { setRec(d.recommendations[0]); setCount(d.recommendations.length); }
      } catch { /* silent — Overview stays clean if unavailable */ }
    })();
    return () => { active = false; };
  }, [slug, token]);

  if (!rec) return null;
  const prio = REC_PRIORITY[rec.priority] || REC_PRIORITY.medium;
  return (
    <button onClick={() => go('recommendations')}
      className={`${panel} p-5 mb-4 w-full text-left ring-1 ring-brand-500/25 hover:ring-brand-500/50 transition-all block`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center"><Target size={15} /></div>
          <h3 className={`text-sm font-black ${heading}`}>Top recommended action</h3>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-bold ${accentTx}`}>
          {count > 1 ? `${count} actions` : 'View'} <ArrowRight size={13} />
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${prio.chip}`}>{prio.label}</span>
        <span className={`text-[10px] font-mono uppercase tracking-wider ${faint}`}>{REC_TYPE_LABEL[rec.type] || rec.type}</span>
      </div>
      <p className={`font-bold ${heading}`}>{rec.title}</p>
      {rec.rationale && <p className={`text-sm ${muted} mt-0.5`}>{rec.rationale}</p>}
    </button>
  );
}

// ── Overview — vertical KPIs + snapshot ──────────────────────────────────────
function Overview({ v, data, slug, token, go }) {
  const k = data.kpis;
  return (
    <div>
      <SectionHead tag={v.console} title="Overview" desc={v.hero} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {v.kpis.map((kp) => <Stat key={kp.key} label={kp.label} value={fmt(k[kp.key], kp.format)} tone={kp.tone} />)}
      </div>
      <TopRecommendation slug={slug} token={token} go={go} />
      <div className={`${panel} p-5 mb-4`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-black ${heading}`}>Recent {v.program.plural.toLowerCase()}</h3>
          <button onClick={() => go(v.nav.find((n) => n.component === 'programs')?.id)} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">Manage →</button>
        </div>
        {data.programs.length === 0 ? (
          <p className={`text-sm ${muted}`}>No {v.program.plural.toLowerCase()} yet. Open the {v.program.plural} tab to launch your first.</p>
        ) : (
          <div className="space-y-2">
            {data.programs.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`font-bold ${heading} truncate`}>{p.title}</span>
                  <Pill value={p.status} />
                </div>
                <span className={`text-xs ${faint} shrink-0 inline-flex items-center gap-1`}><Users2 size={12} /> {p.participantCount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {!data.org.is_verified && (
        <div className="flex items-start gap-2 text-xs text-premium-600 dark:text-premium-500 bg-premium-500/10 border border-premium-500/20 rounded-xl p-3">
          <ShieldCheck size={15} className="shrink-0 mt-0.5" />
          <span>Verify your organization to earn a trust badge and unlock scaled outreach across the network. Open the Verification tab.</span>
        </div>
      )}
    </div>
  );
}

// ── Public page editor ───────────────────────────────────────────────────────
function OrgPageEditor({ org, slug, token, reload }) {
  const [form, setForm] = useState({ tagline: org.tagline || '', description: org.description || '', website: org.website || '', location: org.location || '', sector: org.sector || '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [msg, setMsg] = useState(null);

  const upload = async (kind, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMsg({ t: 'e', m: 'Choose an image file.' }); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg({ t: 'e', m: 'Image must be under 5 MB.' }); return; }
    setUploading(kind); setMsg(null);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${org.id}/${kind}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('org-assets').upload(path, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from('org-assets').getPublicUrl(path);
      const res = await fetch(`/api/console/${slug}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(kind === 'logo' ? { logo_url: pub.publicUrl } : { banner_url: pub.publicUrl }),
      });
      if (!res.ok) throw new Error('Could not save image.');
      setMsg({ t: 'ok', m: `${kind === 'logo' ? 'Logo' : 'Banner'} updated.` });
      reload();
    } catch (e) { setMsg({ t: 'e', m: e.message }); }
    setUploading(null);
  };

  const save = async () => {
    setSaving(true); setMsg(null);
    const res = await fetch(`/api/console/${slug}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setMsg({ t: 'e', m: d.error || 'Could not save.' }); return; }
    setMsg({ t: 'ok', m: 'Saved.' }); reload();
  };

  return (
    <div className="max-w-2xl">
      <SectionHead tag="Presence" title="Public page" desc="Your verified presence on the opportunity graph." />
      <Link href={`/organizations/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline mb-5"><ExternalLink size={14} /> View public page</Link>
      <div className="mb-5">
        <label className={`block text-xs font-bold ${muted} mb-1.5`}>Banner &amp; logo</label>
        <div className="relative h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-gradient-to-br from-brand-500/25 to-trust-500/25">
          {org.banner_url && <Image src={org.banner_url} alt="" fill unoptimized className="object-cover" referrerPolicy="no-referrer" />}
          <label className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 text-xs font-bold bg-white/90 dark:bg-ink/80 text-slate-800 dark:text-white px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-white shadow-sm">
            {uploading === 'banner' ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} Banner
            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload('banner', e.target.files?.[0])} />
          </label>
          <div className="absolute bottom-3 left-4">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-white dark:border-ink bg-white dark:bg-white/10 shadow-lg flex items-center justify-center">
              {org.logo_url ? <Image src={org.logo_url} alt="" fill unoptimized className="object-cover" referrerPolicy="no-referrer" /> : <Building2 size={22} className="text-slate-300 dark:text-gray-500" />}
            </div>
          </div>
        </div>
        <label className="inline-flex items-center gap-1.5 text-sm font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-white/15 mt-2">
          {uploading === 'logo' ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />} Upload logo
          <input type="file" accept="image/*" className="hidden" onChange={(e) => upload('logo', e.target.files?.[0])} />
        </label>
      </div>
      <div className="space-y-4">
        <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>Tagline</label><input className={field} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} maxLength={140} /></div>
        <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>About</label><textarea className={`${field} min-h-[110px] resize-y`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>Sector / field</label><input className={field} value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} maxLength={80} /></div>
          <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>Location</label><input className={field} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={80} /></div>
        </div>
        <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>Website</label><input className={field} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} maxLength={200} /></div>
        {msg && <p className={`text-sm ${msg.t === 'ok' ? 'text-trust-600 dark:text-trust-500' : 'text-red-500'}`}>{msg.m}</p>}
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-bold text-sm">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save changes
        </button>
      </div>
    </div>
  );
}

function Team({ data }) {
  return (
    <div>
      <SectionHead tag="People" title="Team" desc="Members who can manage this organization." />
      <div className="space-y-2 max-w-2xl">
        {data.members.map((m, i) => {
          const p = m.profiles;
          return (
            <div key={i} className={`${panel} p-4 flex items-center gap-3`}>
              <div className={`relative w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex items-center justify-center text-sm font-black ${muted} shrink-0`}>
                {p?.avatar_url ? <Image src={p.avatar_url} alt="" fill unoptimized className="object-cover" referrerPolicy="no-referrer" /> : (p?.full_name?.[0] || p?.username?.[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-bold ${heading} truncate`}>{p?.full_name || p?.username || 'Member'}</p>
                <p className={`text-xs ${faint} capitalize`}>{m.title || m.role}</p>
              </div>
              <span className={`text-[11px] font-mono uppercase tracking-wider ${faint} capitalize`}>{m.role}</span>
            </div>
          );
        })}
      </div>
      <p className={`text-xs ${faint} mt-4`}>Team invitations and seat roles activate with Organizational Subscription plans.</p>
    </div>
  );
}

function Verification({ org, slug, token, reload }) {
  const [busy, setBusy] = useState(false);
  const [regNumber, setRegNumber] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [err, setErr] = useState(null);
  const status = org.is_verified ? 'verified' : (org.verification_status || 'unverified');

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in.');
      let docPath = null;
      if (file) {
        if (file.size > 8 * 1024 * 1024) throw new Error('Document must be under 8 MB.');
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
        docPath = `${org.id}/${Date.now()}_${safe}`;
        const { error: upErr } = await supabase.storage.from('org-verification').upload(docPath, file, { upsert: false });
        if (upErr) throw new Error('Upload failed: ' + upErr.message);
      }
      const { error: insErr } = await supabase.from('verification_requests').insert({
        organization_id: org.id, requester_id: session.user.id,
        registration_number: regNumber || null, document_url: docPath, note: note || null,
      });
      if (insErr) throw new Error(insErr.message);
      await fetch(`/api/console/${slug}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'request_verification' }),
      });
      reload();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const STATE = {
    verified:   { icon: CheckCircle2, tone: 'text-trust-600 dark:text-trust-500 bg-trust-500/10', title: 'Verified organization', desc: 'Your organization carries the verified trust badge across the network.' },
    pending:    { icon: Clock, tone: 'text-premium-600 dark:text-premium-500 bg-premium-500/10', title: 'Verification pending', desc: 'Our team is reviewing your submission. Some scaled actions stay limited until approval.' },
    unverified: { icon: AlertTriangle, tone: 'text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-white/5', title: 'Not verified', desc: 'Verify your organization to earn a trust badge and unlock scaled outreach — trust is the product, not a feature.' },
  };
  const s = STATE[status] || STATE.unverified; const Icon = s.icon;

  return (
    <div className="max-w-2xl">
      <SectionHead tag="Trust" title="Verification & trust center" desc="Identity, credentials, and reputation." />
      <div className={`${panel} p-6`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.tone}`}><Icon size={24} /></div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-black ${heading}`}>{s.title}</h3>
            <p className={`text-sm ${muted} mt-1`}>{s.desc}</p>
            {status === 'unverified' && (
              <div className="mt-5 space-y-3">
                <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>Registration / license number</label><input className={field} value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="Official registration no." maxLength={60} /></div>
                <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>Registration document <span className={faint}>(PDF or image, ≤ 8 MB)</span></label>
                  <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 dark:text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 dark:file:bg-white/10 file:text-slate-700 dark:file:text-gray-200" /></div>
                <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>Note <span className={faint}>(optional)</span></label><textarea className={`${field} min-h-[70px] resize-y`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></div>
                {err && <p className="text-sm text-red-500">{err}</p>}
                <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 bg-premium-500 hover:bg-premium-600 text-ink px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-60">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Submit for verification
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        {[['Identity verification', 'Confirm your organization before sensitive interactions.'], ['Credential checks', 'Validate registration and licensing where possible.'], ['Reputation signals', 'Build portable reputation from verified outcomes.'], ['AI-assisted moderation', 'Continuous monitoring for fraud and misrepresentation.']].map(([t, d]) => (
          <div key={t} className={`${panel} p-4`}><p className={`text-sm font-bold ${heading}`}>{t}</p><p className={`text-xs ${faint} mt-1`}>{d}</p></div>
        ))}
      </div>
    </div>
  );
}

function Billing({ v, org, slug, token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${slug}/billing`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setData(d);
    } finally { setLoading(false); }
  }, [slug, token]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('reference') || url.searchParams.get('trxref');
    if (!ref || !url.searchParams.get('billing_ref')) return;
    ['reference', 'trxref', 'billing_ref'].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, '', url.toString());
    (async () => {
      setMsg('Confirming your payment…');
      const res = await fetch(`/api/organizations/${slug}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'verify', reference: ref }),
      });
      const d = await res.json().catch(() => ({}));
      setMsg(res.ok ? `You're now on the ${d.plan} plan — thank you! 🎉` : (d.error || 'Verification failed.'));
      load();
    })();
    /* eslint-disable-next-line */
  }, [slug, token]);

  const subscribe = async (plan) => {
    setBusy(plan); setMsg(null);
    try {
      const callbackUrl = `${window.location.origin}/console/${slug}?billing_ref=1`;
      const res = await fetch(`/api/organizations/${slug}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'initiate', plan, callbackUrl }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not start checkout.');
      window.location.assign(d.authorization_url);
    } catch (e) { setMsg(e.message); setBusy(null); }
  };

  const current = data?.plan || org?.plan || 'free';
  const prices = data?.prices || { growth: 49, scale: 199 };
  const noun = v.program.plural.toLowerCase();
  const TIERS = [
    { id: 'free',   name: 'Starter', price: 'Free',                feats: ['1 organization page', `Up to 3 ${noun}`, 'Basic directory'] },
    { id: 'growth', name: 'Growth',  price: `$${prices.growth}/mo`, feats: [`Unlimited ${noun}`, 'Team seats & roles', 'Impact analytics'] },
    { id: 'scale',  name: 'Scale',   price: `$${prices.scale}/mo`,  feats: ['Everything in Growth', 'Priority verification', 'Bulk program tools', 'Dedicated support'] },
  ];

  return (
    <div className="max-w-3xl">
      <SectionHead tag="Plans" title="Billing" desc="Organizational subscription — run programs and engage at scale." />
      {msg && <div className={`${panel} p-3 mb-4 text-sm ${heading}`}>{msg}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TIERS.map((t, i) => {
          const isCurrent = current === t.id;
          return (
            <div key={t.id} className={`${panel} p-5 relative ${i === 1 ? 'ring-1 ring-brand-500/40' : ''} ${isCurrent ? 'ring-2 ring-trust-500' : ''}`}>
              {isCurrent && <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider text-trust-600 dark:text-trust-500 bg-trust-500/10 px-2 py-0.5 rounded-full">Current</span>}
              <p className={`text-[11px] font-mono uppercase tracking-widest ${faint}`}>{t.name}</p>
              <p className={`text-2xl font-black ${heading} mt-1`}>{t.price}</p>
              <ul className="mt-4 space-y-2">{t.feats.map((ff) => <li key={ff} className={`flex items-center gap-2 text-sm ${muted}`}><CheckCircle2 size={14} className="text-trust-500 shrink-0" />{ff}</li>)}</ul>
              {t.id !== 'free' && !isCurrent && (
                <button onClick={() => subscribe(t.id)} disabled={busy === t.id || loading}
                  className="mt-5 w-full inline-flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors">
                  {busy === t.id ? <Loader2 size={14} className="animate-spin" /> : null}
                  {current === 'free' ? 'Upgrade' : 'Switch plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {data?.planExpiresAt && current !== 'free' && <p className={`text-xs ${faint} mt-4`}>Your plan renews on {new Date(data.planExpiresAt).toLocaleDateString()}.</p>}
      <p className={`text-xs ${faint} mt-2`}>Payments are processed securely by Paystack.</p>
    </div>
  );
}

export default function InstitutionConsole() {
  const { slug } = useParams();
  const router = useRouter();
  const [state, setState] = useState('loading'); // loading | ready | denied | notfound
  const [data, setData] = useState(null);
  const [token, setToken] = useState(null);
  const [section, setSection] = useState('overview');
  const [programPrefill, setProgramPrefill] = useState(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace(`/auth?next=/console/${slug}`); return; }
    setToken(session.access_token);
    const res = await fetch(`/api/console/${slug}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.status === 403) { setState('denied'); return; }
    if (res.status === 404) { setState('notfound'); return; }
    if (!res.ok) { setState('denied'); return; }
    const d = await res.json();
    // Business orgs belong in the hiring console; send them there.
    if (d.org?.type === 'business') { router.replace(`/business/${slug}`); return; }
    setData(d); setState('ready');
  }, [slug, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- load console data on mount
  useEffect(() => { load(); }, [load]);

  if (state === 'loading') {
    return <div className={`min-h-screen ${screen} flex items-center justify-center`}><Loader2 className="animate-spin text-brand-500" size={28} /></div>;
  }
  if (state === 'denied' || state === 'notfound') {
    return (
      <div className={`min-h-screen ${screen} ${body} flex flex-col items-center justify-center px-6 text-center`}>
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 mb-5">{state === 'denied' ? <Lock size={24} /> : <Building2 size={24} />}</div>
        <h1 className={`text-xl font-black ${heading}`}>{state === 'denied' ? 'No access to this console' : 'Organization not found'}</h1>
        <p className={`text-sm ${muted} mt-1.5 mb-6 max-w-sm`}>{state === 'denied' ? 'Only owners and admins of this organization can open its console.' : 'This organization does not exist or was removed.'}</p>
        <Link href="/organizations" className="text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl">Browse organizations</Link>
      </div>
    );
  }

  const { org, role } = data;
  const v = verticalTheme(org.type);
  const nav = v.nav;
  const current = nav.find((n) => n.id === section) || nav[0];
  const meta = v.meta;

  // Accepting a recommendation's "Create" → jump to the main Programs tab with the
  // form pre-filled from the recommendation's context.
  const createFromRec = (rec) => {
    const mainPrograms = nav.find((n) => n.component === 'programs' && !n.filter);
    setProgramPrefill({ ...prefillFromRec(rec), recId: rec.id });
    setSection(mainPrograms?.id || 'programs');
  };

  // After a program is created from a recommendation, forge the permanent link.
  const linkRecToProgram = async (recId, programId) => {
    try {
      await fetch(`/api/console/${slug}/recommendations`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'link', id: recId, programId }),
      });
    } catch { /* link is best-effort; the board reconciles on next load */ }
  };

  const renderSection = () => {
    switch (current.component) {
      case 'overview':     return <Overview v={v} data={data} slug={slug} token={token} go={setSection} />;
      case 'recommendations': return <Recommendations v={v} slug={slug} token={token} go={setSection} onCreateProgram={createFromRec} />;
      case 'programs':     return <Programs v={v} data={data} slug={slug} token={token} reload={load} filter={current.filter} prefill={current.filter ? null : programPrefill} onPrefillConsumed={() => setProgramPrefill(null)} onLinkRec={linkRecToProgram} />;
      case 'directory':    return <Directory v={v} data={data} slug={slug} token={token} reload={load} filter={current.filter} label={current.label} />;
      case 'impact':       return <Impact v={v} data={data} slug={slug} token={token} />;
      case 'orgpage':      return <OrgPageEditor org={org} slug={slug} token={token} reload={load} />;
      case 'team':         return <Team data={data} />;
      case 'verification': return <Verification org={org} slug={slug} token={token} reload={load} />;
      case 'billing':      return <Billing v={v} org={org} slug={slug} token={token} />;
      default:             return <Overview v={v} data={data} slug={slug} token={token} go={setSection} />;
    }
  };

  return (
    <div className={`min-h-screen ${screen} ${body}`}>
      <header className={`sticky top-0 z-40 bg-white/90 dark:bg-ink/90 backdrop-blur-xl border-b ${hairline}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/organizations" className="text-slate-400 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white shrink-0"><ArrowLeft size={18} /></Link>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.accent.icon}`}><meta.icon size={16} /></div>
            <div className="min-w-0">
              <p className={`font-black ${heading} text-sm truncate leading-tight`}>{org.name}</p>
              <p className={`text-[11px] ${faint} leading-tight`}>{v.console}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${meta.accent.chip}`}><meta.icon size={12} /> {v.label}</span>
            {org.is_verified && <span className="hidden sm:inline"><CheckCircle2 size={15} className="text-premium-500" /></span>}
            <span className={`hidden sm:inline text-[11px] font-mono ${faint} capitalize`}>{role}</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        <nav className={`hidden md:flex flex-col w-56 shrink-0 border-r ${hairline} min-h-[calc(100vh-3.5rem)] py-4 px-3 gap-0.5`}>
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSection(id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${section === id ? 'bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        <div className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-ink/95 backdrop-blur-xl border-t ${hairline} overflow-x-auto no-scrollbar flex gap-1 px-2 py-2`}>
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSection(id)}
              className={`shrink-0 flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold ${section === id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400 dark:text-gray-500'}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 pb-24 md:pb-6" key={section}>
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">{renderSection()}</div>
        </main>
      </div>
    </div>
  );
}
