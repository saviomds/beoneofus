'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../../supabaseClient';
import { orgMeta } from '../../../lib/orgTypes';
import {
  LayoutDashboard, Megaphone, KanbanSquare, LineChart, Building2, Users2,
  ShieldCheck, CreditCard, ArrowLeft, ExternalLink, Eye, Loader2, Lock,
  TrendingUp, Save, AlertTriangle, CheckCircle2, Clock, Sun, Moon,
  Image as ImageIcon,
} from 'lucide-react';

const NAV = [
  { id: 'overview',     label: 'Overview',          icon: LayoutDashboard },
  { id: 'postings',     label: 'Postings',          icon: Megaphone },
  { id: 'pipeline',     label: 'Pipeline',          icon: KanbanSquare },
  { id: 'insights',     label: 'Insights',          icon: LineChart },
  { id: 'orgpage',      label: 'Organization Page', icon: Building2 },
  { id: 'team',         label: 'Team',              icon: Users2 },
  { id: 'verification', label: 'Verification',      icon: ShieldCheck },
  { id: 'billing',      label: 'Billing',           icon: CreditCard },
];

const STAGES = [
  { id: 'new',         label: 'New' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'interviewed', label: 'Interviewed' },
  { id: 'offer',       label: 'Offer' },
  { id: 'hired',       label: 'Hired' },
];

// ── Theme-aware surface tokens ────────────────────────────────────────────────
// Light base first, dark: variant for the "ink" console look. Both modes ship.
const screen  = 'bg-slate-50 dark:bg-ink';
const panel   = 'rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-white/[0.03] dark:border-white/10 dark:shadow-none';
const heading = 'text-slate-900 dark:text-white';
const body    = 'text-slate-700 dark:text-gray-200';
const muted   = 'text-slate-500 dark:text-gray-400';
const faint   = 'text-slate-400 dark:text-gray-500';
const hairline = 'border-slate-200 dark:border-white/10';
const field   = 'w-full rounded-xl py-2.5 px-3.5 text-sm outline-none border bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/40 dark:bg-white/[0.06] dark:border-transparent dark:text-gray-100 dark:placeholder:text-gray-600';
const accent  = 'text-brand-600 dark:text-brand-400';

function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Mount flag gates hydration-sensitive UI (the theme icon). It must flip
    // after mount, so a synchronous setState is required here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const isDark = mounted && (theme === 'dark' || (theme === 'system' && systemTheme === 'dark'));
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      title="Toggle light / dark"
      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
    >
      {mounted ? (isDark ? <Sun size={16} /> : <Moon size={16} />) : <Moon size={16} />}
    </button>
  );
}

export default function BusinessConsole() {
  const { slug } = useParams();
  const router = useRouter();
  const [state, setState] = useState('loading'); // loading | ready | denied | notfound
  const [data, setData] = useState(null);
  const [section, setSection] = useState('overview');
  const [token, setToken] = useState(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace(`/auth?next=/business/${slug}`); return; }
    setToken(session.access_token);
    const res = await fetch(`/api/business/${slug}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.status === 403) { setState('denied'); return; }
    if (res.status === 404) { setState('notfound'); return; }
    if (!res.ok) { setState('denied'); return; }
    const d = await res.json();
    // Institutions (government, education, healthcare, NGO, community) get their
    // own dedicated console — only businesses stay on the hiring-centric one.
    if (d.org?.type && d.org.type !== 'business') { router.replace(`/console/${slug}`); return; }
    setData(d);
    setState('ready');
  }, [slug, router]);

  useEffect(() => {
    // load() awaits the session before any setState, so writes never happen
    // synchronously; the async loader legitimately syncs remote data on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (state === 'loading') {
    return (
      <div className={`min-h-screen ${screen} flex items-center justify-center`}>
        <Loader2 className="animate-spin text-brand-500 dark:text-brand-400" size={28} />
      </div>
    );
  }
  if (state === 'denied' || state === 'notfound') {
    return (
      <div className={`min-h-screen ${screen} ${body} flex flex-col items-center justify-center px-6 text-center`}>
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-gray-500 mb-5">
          {state === 'denied' ? <Lock size={24} /> : <Building2 size={24} />}
        </div>
        <h1 className={`text-xl font-black ${heading}`}>{state === 'denied' ? 'No access to this console' : 'Organization not found'}</h1>
        <p className={`text-sm ${muted} mt-1.5 mb-6 max-w-sm`}>
          {state === 'denied'
            ? 'Only owners and admins of this organization can open its business console.'
            : 'This organization does not exist or was removed.'}
        </p>
        <Link href="/organizations" className="text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl transition-colors">
          Browse organizations
        </Link>
      </div>
    );
  }

  const { org, kpis, role, members, postings, applicants } = data;
  const meta = orgMeta(org.type);

  return (
    <div className={`min-h-screen ${screen} ${body}`}>
      {/* Top bar */}
      <header className={`sticky top-0 z-40 bg-white/90 dark:bg-ink/90 backdrop-blur-xl border-b ${hairline}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/organizations" className="text-slate-400 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-colors shrink-0"><ArrowLeft size={18} /></Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-trust-500 flex items-center justify-center shrink-0">
              <meta.icon size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className={`font-black ${heading} text-sm truncate leading-tight`}>{org.name}</p>
              <p className={`text-[11px] ${faint} leading-tight capitalize`}>{meta.label} console</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AccountBadge org={org} />
            <span className={`hidden sm:inline text-[11px] font-mono ${faint} capitalize`}>{role}</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Left nav rail */}
        <nav className={`hidden md:flex flex-col w-56 shrink-0 border-r ${hairline} min-h-[calc(100vh-3.5rem)] py-4 px-3 gap-0.5`}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                section === id
                  ? 'bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        {/* Mobile section select */}
        <div className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-ink/95 backdrop-blur-xl border-t ${hairline} overflow-x-auto no-scrollbar flex gap-1 px-2 py-2`}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSection(id)}
              className={`shrink-0 flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold ${section === id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400 dark:text-gray-500'}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 pb-24 md:pb-6">
          {section === 'overview'     && <Overview kpis={kpis} org={org} onGo={setSection} />}
          {section === 'postings'     && <Postings postings={postings} kpis={kpis} />}
          {section === 'pipeline'     && <Pipeline kpis={kpis} applicants={applicants} slug={slug} token={token} onChanged={load} />}
          {section === 'insights'     && <Insights kpis={kpis} />}
          {section === 'orgpage'      && <OrgPage org={org} slug={slug} token={token} onSaved={load} />}
          {section === 'team'         && <Team members={members} role={role} />}
          {section === 'verification' && <Verification org={org} slug={slug} token={token} onChanged={load} />}
          {section === 'billing'      && <Billing org={org} slug={slug} token={token} />}
        </main>
      </div>
    </div>
  );
}

function AccountBadge({ org }) {
  if (org.is_verified) {
    return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-trust-500/10 dark:bg-trust-500/15 text-trust-600 dark:text-trust-500">Business <CheckCircle2 size={13} className="text-premium-500" /></span>;
  }
  const pending = org.verification_status === 'pending';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${pending ? 'bg-premium-500/10 dark:bg-premium-500/15 text-premium-600 dark:text-premium-500' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400'}`}>
      Business {pending ? '· Pending' : ''}
    </span>
  );
}

function Stat({ label, value, sub, tone = 'brand' }) {
  const tint = tone === 'trust' ? 'text-trust-600 dark:text-trust-500' : tone === 'premium' ? 'text-premium-600 dark:text-premium-500' : accent;
  return (
    <div className={`${panel} p-5`}>
      <p className={`text-[11px] font-mono uppercase tracking-widest ${faint}`}>{label}</p>
      <p className={`text-3xl font-black mt-2 tabular-nums ${tint}`}>{value}</p>
      {sub && <p className={`text-xs ${faint} mt-1`}>{sub}</p>}
    </div>
  );
}

function SectionHead({ tag, title, desc }) {
  return (
    <div className="mb-6">
      <p className={`text-[11px] font-mono uppercase tracking-widest ${accent}`}>{tag}</p>
      <h2 className={`text-2xl font-black ${heading} mt-1`}>{title}</h2>
      {desc && <p className={`text-sm ${muted} mt-1`}>{desc}</p>}
    </div>
  );
}

function Overview({ kpis, org, onGo }) {
  const conv = kpis.totalViews > 0 ? Math.round((kpis.applicants / kpis.totalViews) * 100) : 0;
  return (
    <div>
      <SectionHead tag="Console" title="Overview" desc="Your organization's activity across the network." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Active postings" value={kpis.activePostings} sub={`${kpis.totalPostings} total`} />
        <Stat label="New applicants" value={kpis.newApplicants} sub="last 7 days" tone="trust" />
        <Stat label="Applicants" value={kpis.applicants} sub="all time" />
        <Stat label="Posting views" value={kpis.totalViews.toLocaleString()} sub={`${conv}% apply rate`} />
      </div>

      {/* Pipeline snapshot */}
      <div className={`${panel} p-5 mb-4`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-black ${heading}`}>Pipeline snapshot</h3>
          <button onClick={() => onGo('pipeline')} className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">Open pipeline →</button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {STAGES.map((s) => (
            <div key={s.id} className="text-center">
              <div className={`h-16 rounded-lg bg-slate-50 border border-slate-200 dark:bg-white/[0.04] dark:border-white/10 flex items-center justify-center text-xl font-black ${heading} tabular-nums`}>
                {kpis.pipeline[s.id] || 0}
              </div>
              <p className={`text-[10px] font-mono uppercase tracking-wider ${faint} mt-1.5`}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Insights panel */}
      <div className={`${panel} p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-trust-500/10 dark:bg-trust-500/15 text-trust-600 dark:text-trust-500 flex items-center justify-center"><TrendingUp size={15} /></div>
          <h3 className={`text-sm font-black ${heading}`}>AI insights</h3>
        </div>
        {kpis.applicants === 0 && kpis.totalViews === 0 ? (
          <p className={`text-sm ${muted}`}>Insights populate as your postings gather views and applications. Publish your first opportunity to get started.</p>
        ) : (
          <ul className={`space-y-2 text-sm ${body}`}>
            <li>• {kpis.newApplicants} new applicant{kpis.newApplicants === 1 ? '' : 's'} in the last 7 days across {kpis.activePostings} active posting{kpis.activePostings === 1 ? '' : 's'}.</li>
            <li>• {kpis.totalViews.toLocaleString()} total posting views converting at <span className="text-trust-600 dark:text-trust-500 font-bold">{conv}%</span> to applications.</li>
            <li>• {kpis.pipeline.shortlisted + kpis.pipeline.interviewed} candidate{(kpis.pipeline.shortlisted + kpis.pipeline.interviewed) === 1 ? '' : 's'} active in your hiring pipeline.</li>
          </ul>
        )}
        {!org.is_verified && (
          <div className="mt-4 flex items-start gap-2 text-xs text-premium-600 dark:text-premium-500 bg-premium-500/10 border border-premium-500/20 rounded-xl p-3">
            <ShieldCheck size={15} className="shrink-0 mt-0.5" />
            <span>Verify your organization to unlock scaled outreach and a trust badge across the network. Open the Verification tab.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Postings({ postings, kpis }) {
  return (
    <div>
      <SectionHead tag="Reach" title="Postings" desc="Jobs, services, and programs published by your organization." />
      {postings.length === 0 ? (
        <Empty icon={Megaphone} title="No postings yet" desc="Publish your first opportunity to reach the network." cta={{ href: '/dash/jobs', label: 'Create a posting' }} />
      ) : (
        <div className="space-y-2">
          {postings.map((p) => (
            <div key={p.id} className={`${panel} p-4 flex items-center justify-between gap-4`}>
              <div className="min-w-0">
                <p className={`font-bold ${heading} truncate`}>{p.title}</p>
                <p className={`text-xs ${faint} mt-0.5 capitalize`}>{p.status || 'active'}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-sm ${muted} shrink-0`}><Eye size={14} /> {(p.views || 0).toLocaleString()}</span>
            </div>
          ))}
          <Link href="/dash/jobs" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 mt-2">Manage postings <ExternalLink size={13} /></Link>
        </div>
      )}
    </div>
  );
}

function CandidateCard({ app, stageId, onMove, busy }) {
  const p = app.applicant;
  const name = p?.full_name || p?.username || 'Applicant';
  const idx = STAGES.findIndex((s) => s.id === stageId);
  const prev = STAGES[idx - 1];
  const next = STAGES[idx + 1];
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-2.5">
      <div className="flex items-center gap-2">
        <div className="relative w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex items-center justify-center text-[11px] font-black text-slate-500 dark:text-gray-300 shrink-0">
          {p?.avatar_url ? <Image src={p.avatar_url} alt="" fill className="object-cover" referrerPolicy="no-referrer" unoptimized /> : (name[0] || '?').toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-bold ${heading} truncate`}>{name}</p>
          <p className={`text-[10px] ${faint} truncate`}>{app.jobTitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2">
        <button disabled={busy || !prev} onClick={() => prev && onMove(app.id, prev.id)} title={prev ? `Move to ${prev.label}` : ''}
          className="flex-1 text-[10px] font-bold py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 transition-colors">
          {busy ? '…' : `← ${prev ? prev.label : ''}`}
        </button>
        <button disabled={busy || !next} onClick={() => next && onMove(app.id, next.id)} title={next ? `Move to ${next.label}` : ''}
          className="flex-1 text-[10px] font-bold py-1 rounded-md bg-brand-500/10 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300 hover:bg-brand-500/20 disabled:opacity-40 transition-colors">
          {next ? `${next.label} →` : ''}
        </button>
        <button disabled={busy} onClick={() => onMove(app.id, 'rejected')} title="Reject"
          className="text-[11px] font-bold px-1.5 py-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors">✕</button>
      </div>
    </div>
  );
}

function Pipeline({ kpis, applicants = [], slug, token, onChanged }) {
  const [busyId, setBusyId] = useState(null);

  const byStage = Object.fromEntries(STAGES.map((s) => [s.id, []]));
  for (const a of applicants) {
    const st = STAGES.some((s) => s.id === a.stage) ? a.stage : 'new';
    byStage[st].push(a);
  }

  const move = async (applicationId, status) => {
    setBusyId(applicationId);
    try {
      await fetch(`/api/business/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'move_applicant', applicationId, status }),
      });
      await onChanged?.();
    } catch { /* noop */ }
    setBusyId(null);
  };

  return (
    <div>
      <SectionHead tag="Talent" title="Applicant pipeline" desc="Move candidates through your hiring stages." />
      {applicants.length === 0 ? (
        <Empty icon={KanbanSquare} title="No applicants yet" desc="Candidates appear here as people apply to your postings." />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {STAGES.map((s) => (
            <div key={s.id} className={`${panel} p-3 w-64 shrink-0`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <span className={`text-[11px] font-mono uppercase tracking-wider ${faint}`}>{s.label}</span>
                <span className={`text-xs font-black ${heading} tabular-nums bg-slate-100 dark:bg-white/5 rounded-full px-2 py-0.5`}>{byStage[s.id].length}</span>
              </div>
              <div className="space-y-2 min-h-[80px]">
                {byStage[s.id].length === 0 && <p className="text-xs text-slate-400 dark:text-gray-600 px-1 py-3">Empty</p>}
                {byStage[s.id].map((a) => (
                  <CandidateCard key={a.id} app={a} stageId={s.id} onMove={move} busy={busyId === a.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {kpis.rejected > 0 && <p className={`text-xs ${faint} mt-3`}>{kpis.rejected} rejected application{kpis.rejected === 1 ? '' : 's'} not shown.</p>}
    </div>
  );
}

function Insights({ kpis }) {
  const conv = kpis.totalViews > 0 ? Math.round((kpis.applicants / kpis.totalViews) * 100) : 0;
  return (
    <div>
      <SectionHead tag="Analytics" title="Insights for institutions" desc="AI-generated view of demand, engagement, and conversion." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Stat label="Apply rate" value={`${conv}%`} sub="applications / views" tone="trust" />
        <Stat label="In pipeline" value={kpis.pipeline.shortlisted + kpis.pipeline.interviewed + kpis.pipeline.offer} sub="active candidates" />
        <Stat label="Hired" value={kpis.pipeline.hired} sub="all time" tone="premium" />
      </div>
      <div className={`${panel} p-5`}>
        <p className={`text-sm ${muted}`}>Deeper AI analytics — regional demand signals, skill-gap trends, and time-to-hire — grow richer as your organization posts and engages. Everything here is derived from your real activity; nothing is simulated.</p>
      </div>
    </div>
  );
}

function OrgPage({ org, slug, token, onSaved }) {
  const [form, setForm] = useState({
    tagline: org.tagline || '', description: org.description || '', website: org.website || '',
    location: org.location || '', sector: org.sector || '', hiring: !!org.hiring,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [uploading, setUploading] = useState(null); // 'logo' | 'banner' | null

  const uploadAsset = async (kind, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMsg({ type: 'err', text: 'Please choose an image file.' }); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg({ type: 'err', text: 'Image must be under 5 MB.' }); return; }
    setUploading(kind); setMsg(null);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${org.id}/${kind}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('org-assets').upload(path, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from('org-assets').getPublicUrl(path);
      const res = await fetch(`/api/business/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(kind === 'logo' ? { logo_url: pub.publicUrl } : { banner_url: pub.publicUrl }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Could not save image.'); }
      setMsg({ type: 'ok', text: `${kind === 'logo' ? 'Logo' : 'Banner'} updated.` });
      onSaved?.();
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    setUploading(null);
  };

  const save = async () => {
    setSaving(true); setMsg(null);
    const res = await fetch(`/api/business/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setMsg({ type: 'err', text: d.error || 'Could not save.' }); return; }
    setMsg({ type: 'ok', text: 'Saved.' });
    onSaved?.();
  };

  return (
    <div className="max-w-2xl">
      <SectionHead tag="Presence" title="Organization page" desc="Your public, verified presence on the network." />
      <Link href={`/organizations/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 mb-5"><ExternalLink size={14} /> View public page</Link>

      {/* Brand assets: banner + logo */}
      <div className="mb-5">
        <label className={`block text-xs font-bold ${muted} mb-1.5`}>Banner &amp; logo</label>
        <div className="relative h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-gradient-to-br from-brand-500/25 to-trust-500/25">
          {org.banner_url && <Image src={org.banner_url} alt="" fill className="object-cover" referrerPolicy="no-referrer" unoptimized />}
          <label className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 text-xs font-bold bg-white/90 dark:bg-ink/80 text-slate-800 dark:text-white px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-white shadow-sm transition-colors">
            {uploading === 'banner' ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} Upload banner
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadAsset('banner', e.target.files?.[0])} />
          </label>
          {/* Logo overlay */}
          <div className="absolute -bottom-0 left-4 top-0 flex items-end pb-3">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-white dark:border-ink bg-white dark:bg-white/10 shadow-lg flex items-center justify-center shrink-0">
              {org.logo_url
                ? <Image src={org.logo_url} alt="" fill className="object-cover" referrerPolicy="no-referrer" unoptimized />
                : <Building2 size={24} className="text-slate-300 dark:text-gray-500" />}
            </div>
          </div>
        </div>
        <div className="mt-2">
          <label className="inline-flex items-center gap-1.5 text-sm font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-white/15 transition-colors">
            {uploading === 'logo' ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />} Upload logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadAsset('logo', e.target.files?.[0])} />
          </label>
          <p className={`text-[11px] ${faint} mt-1.5`}>Square logo (min 200×200) and a wide banner (1200×300) look best. Max 5&nbsp;MB each.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>Tagline</label><input className={field} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} maxLength={140} /></div>
        <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>About</label><textarea className={`${field} min-h-[110px] resize-y`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>Sector</label><input className={field} value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} maxLength={80} /></div>
          <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>Location</label><input className={field} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={80} /></div>
        </div>
        <div><label className={`block text-xs font-bold ${muted} mb-1.5`}>Website</label><input className={field} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} maxLength={200} /></div>
        <label className={`flex items-center gap-2.5 text-sm ${body} cursor-pointer`}>
          <input type="checkbox" checked={form.hiring} onChange={(e) => setForm({ ...form, hiring: e.target.checked })} className="w-4 h-4 accent-brand-500" />
          Currently hiring
        </label>
        {msg && <p className={`text-sm ${msg.type === 'ok' ? 'text-trust-600 dark:text-trust-500' : 'text-red-500 dark:text-red-400'}`}>{msg.text}</p>}
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save changes
        </button>
      </div>
    </div>
  );
}

function Team({ members, role }) {
  return (
    <div>
      <SectionHead tag="People" title="Team" desc="Members who can manage this organization." />
      <div className="space-y-2 max-w-2xl">
        {members.map((m, i) => {
          const p = m.profiles;
          return (
            <div key={i} className={`${panel} p-4 flex items-center gap-3`}>
              <div className={`relative w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex items-center justify-center text-sm font-black ${muted} shrink-0`}>
                {p?.avatar_url ? <Image src={p.avatar_url} alt="" fill className="object-cover" referrerPolicy="no-referrer" unoptimized /> : (p?.full_name?.[0] || p?.username?.[0] || '?').toUpperCase()}
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
      {role === 'owner' && <p className={`text-xs ${faint} mt-4`}>Team invitations and seat roles (Admin, Recruiter, Program Manager) activate with Organizational Subscription plans.</p>}
    </div>
  );
}

function Verification({ org, slug, token, onChanged }) {
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
        organization_id: org.id,
        requester_id: session.user.id,
        registration_number: regNumber || null,
        document_url: docPath,
        note: note || null,
      });
      if (insErr) throw new Error(insErr.message);
      await fetch(`/api/business/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'request_verification' }),
      });
      onChanged?.();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const STATE = {
    verified:   { icon: CheckCircle2, tone: 'text-trust-600 dark:text-trust-500 bg-trust-500/10 dark:bg-trust-500/15', title: 'Verified organization', desc: 'Your organization carries the verified trust badge across the network.' },
    pending:    { icon: Clock,        tone: 'text-premium-600 dark:text-premium-500 bg-premium-500/10 dark:bg-premium-500/15', title: 'Verification pending', desc: 'Our team is reviewing your submission. Some scaled actions stay limited until approval.' },
    unverified: { icon: AlertTriangle,tone: 'text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-white/5', title: 'Not verified', desc: 'Verify your organization to earn a trust badge and unlock scaled outreach — trust is the product, not a feature.' },
  };
  const s = STATE[status] || STATE.unverified;
  const Icon = s.icon;

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
                <div>
                  <label className={`block text-xs font-bold ${muted} mb-1.5`}>Business registration / license number</label>
                  <input className={field} value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="e.g. C12345678" maxLength={60} />
                </div>
                <div>
                  <label className={`block text-xs font-bold ${muted} mb-1.5`}>Registration document <span className={faint}>(PDF or image, ≤ 8 MB)</span></label>
                  <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-500 dark:text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 dark:file:bg-white/10 file:text-slate-700 dark:file:text-gray-200 hover:file:bg-slate-200 dark:hover:file:bg-white/15" />
                </div>
                <div>
                  <label className={`block text-xs font-bold ${muted} mb-1.5`}>Note <span className={faint}>(optional)</span></label>
                  <textarea className={`${field} min-h-[70px] resize-y`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything our reviewers should know." maxLength={500} />
                </div>
                {err && <p className="text-sm text-red-500 dark:text-red-400">{err}</p>}
                <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 bg-premium-500 hover:bg-premium-600 text-ink px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Submit for verification
                </button>
                <p className={`text-[11px] ${faint}`}>Or verify from a company-domain email — free-mail addresses take longer to review.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        {[
          ['Identity verification', 'Confirm your organization before sensitive interactions.'],
          ['Credential checks', 'Validate registration and licensing where possible.'],
          ['Reputation signals', 'Build portable reputation from verified outcomes.'],
          ['AI-assisted moderation', 'Continuous monitoring for fraud and misrepresentation.'],
        ].map(([t, d]) => (
          <div key={t} className={`${panel} p-4`}>
            <p className={`text-sm font-bold ${heading}`}>{t}</p>
            <p className={`text-xs ${faint} mt-1`}>{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Billing({ org, slug, token }) {
  const [data, setData] = useState(null);   // { plan, prices, subscription, planExpiresAt }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);   // plan id being processed
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${slug}/billing`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setData(d);
    } finally { setLoading(false); }
  }, [slug, token]);

  useEffect(() => {
    // Async loader — every setState runs after the fetch await, never
    // synchronously during the effect.
    load();
  }, [load]);

  // Verify after returning from Paystack (?billing_ref=1&reference=…).
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
      const callbackUrl = `${window.location.origin}/business/${slug}?billing_ref=1`;
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

  const manage = async (action) => {
    setBusy(action); setMsg(null);
    try {
      const res = await fetch(`/api/organizations/${slug}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Action failed.');
      setMsg(action === 'cancel'
        ? 'Your plan will revert to Free at the end of the current period.'
        : 'Cancellation reversed — your plan stays active.');
      load();
    } catch (e) { setMsg(e.message); } finally { setBusy(null); }
  };

  const current = data?.plan || org?.plan || 'free';
  const prices = data?.prices || { growth: 49, scale: 199 };
  const TIERS = [
    { id: 'free',   name: 'Starter', price: 'Free',                feats: ['1 organization page', 'Up to 3 postings', 'Basic pipeline'] },
    { id: 'growth', name: 'Growth',  price: `$${prices.growth}/mo`, feats: ['Unlimited postings', 'Team seats & roles', 'AI talent matching', 'Insights analytics'] },
    { id: 'scale',  name: 'Scale',   price: `$${prices.scale}/mo`,  feats: ['Everything in Growth', 'Priority verification', 'Bulk program tools', 'Dedicated support'] },
  ];

  return (
    <div className="max-w-3xl">
      <SectionHead tag="Plans" title="Billing" desc="Organizational subscription plans — post, hire, and engage at scale." />
      {msg && <div className={`${panel} p-3 mb-4 text-sm ${heading}`}>{msg}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TIERS.map((t, i) => {
          const isCurrent = current === t.id;
          return (
            <div key={t.id} className={`${panel} p-5 relative ${i === 1 ? 'ring-1 ring-brand-500/40' : ''} ${isCurrent ? 'ring-2 ring-trust-500' : ''}`}>
              {isCurrent && <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider text-trust-600 dark:text-trust-500 bg-trust-500/10 px-2 py-0.5 rounded-full">Current</span>}
              <p className={`text-[11px] font-mono uppercase tracking-widest ${faint}`}>{t.name}</p>
              <p className={`text-2xl font-black ${heading} mt-1`}>{t.price}</p>
              <ul className="mt-4 space-y-2">
                {t.feats.map((ff) => <li key={ff} className={`flex items-center gap-2 text-sm ${muted}`}><CheckCircle2 size={14} className="text-trust-500 shrink-0" />{ff}</li>)}
              </ul>
              {t.id !== 'free' && !isCurrent && (
                <button
                  onClick={() => subscribe(t.id)}
                  disabled={busy === t.id || loading}
                  className="mt-5 w-full inline-flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                >
                  {busy === t.id ? <Loader2 size={14} className="animate-spin" /> : null}
                  {current === 'free' ? 'Upgrade' : 'Switch plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {data?.planExpiresAt && current !== 'free' && (
        <p className={`text-xs ${faint} mt-4`}>
          {data?.subscription?.cancel_at_period_end ? 'Reverts to Free on' : 'Your plan renews on'} {new Date(data.planExpiresAt).toLocaleDateString()}.
        </p>
      )}
      {current !== 'free' && (
        <div className="mt-2 flex items-center gap-3">
          {data?.subscription?.cancel_at_period_end ? (
            <button onClick={() => manage('reactivate')} disabled={busy === 'reactivate'} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50">Reactivate plan</button>
          ) : (
            <button onClick={() => manage('cancel')} disabled={busy === 'cancel'} className="text-xs font-bold text-red-500 hover:underline disabled:opacity-50">Cancel plan</button>
          )}
        </div>
      )}
      <p className={`text-xs ${faint} mt-2`}>Payments are processed securely by Paystack; amounts may be shown in your local currency at checkout.</p>
    </div>
  );
}

function Empty({ icon: Icon, title, desc, cta }) {
  return (
    <div className={`${panel} py-16 text-center`}>
      <div className="w-12 h-12 rounded-2xl bg-brand-500/10 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4"><Icon size={22} /></div>
      <p className={`font-bold ${heading}`}>{title}</p>
      <p className={`text-sm ${faint} mt-1 mb-5`}>{desc}</p>
      {cta && <Link href={cta.href} className="inline-flex items-center gap-1.5 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl transition-colors">{cta.label}</Link>}
    </div>
  );
}
