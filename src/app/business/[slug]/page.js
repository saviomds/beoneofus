'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../supabaseClient';
import { orgMeta } from '../../../lib/orgTypes';
import {
  LayoutDashboard, Megaphone, KanbanSquare, LineChart, Building2, Users2,
  ShieldCheck, CreditCard, ArrowLeft, ExternalLink, Eye, Loader2, Lock,
  TrendingUp, Save, AlertTriangle, CheckCircle2, Clock,
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

const panel = 'bg-white/[0.03] border border-white/10 rounded-2xl';

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
    setData(await res.json());
    setState('ready');
  }, [slug, router]);

  useEffect(() => { load(); }, [load]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-400" size={28} />
      </div>
    );
  }
  if (state === 'denied' || state === 'notfound') {
    return (
      <div className="min-h-screen bg-ink text-gray-200 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 mb-5">
          {state === 'denied' ? <Lock size={24} /> : <Building2 size={24} />}
        </div>
        <h1 className="text-xl font-black text-white">{state === 'denied' ? 'No access to this console' : 'Organization not found'}</h1>
        <p className="text-sm text-gray-400 mt-1.5 mb-6 max-w-sm">
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

  const { org, kpis, role, members, postings } = data;
  const meta = orgMeta(org.type);

  return (
    <div className="min-h-screen bg-ink text-gray-200">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-ink/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/organizations" className="text-gray-400 hover:text-white transition-colors shrink-0"><ArrowLeft size={18} /></Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-trust-500 flex items-center justify-center shrink-0">
              <meta.icon size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-white text-sm truncate leading-tight">{org.name}</p>
              <p className="text-[11px] text-gray-500 leading-tight capitalize">{meta.label} console</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AccountBadge org={org} />
            <span className="hidden sm:inline text-[11px] font-mono text-gray-500 capitalize">{role}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Left nav rail */}
        <nav className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/10 min-h-[calc(100vh-3.5rem)] py-4 px-3 gap-0.5">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                section === id ? 'bg-brand-500/15 text-brand-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        {/* Mobile section select */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-ink/95 backdrop-blur-xl border-t border-white/10 overflow-x-auto no-scrollbar flex gap-1 px-2 py-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSection(id)}
              className={`shrink-0 flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold ${section === id ? 'text-brand-300' : 'text-gray-500'}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 pb-24 md:pb-6">
          {section === 'overview'     && <Overview kpis={kpis} org={org} onGo={setSection} />}
          {section === 'postings'     && <Postings postings={postings} kpis={kpis} />}
          {section === 'pipeline'     && <Pipeline kpis={kpis} />}
          {section === 'insights'     && <Insights kpis={kpis} />}
          {section === 'orgpage'      && <OrgPage org={org} slug={slug} token={token} onSaved={load} />}
          {section === 'team'         && <Team members={members} role={role} />}
          {section === 'verification' && <Verification org={org} slug={slug} token={token} onChanged={load} />}
          {section === 'billing'      && <Billing />}
        </main>
      </div>
    </div>
  );
}

function AccountBadge({ org }) {
  if (org.is_verified) {
    return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-trust-500/15 text-trust-500">Business <CheckCircle2 size={13} className="text-premium-500" /></span>;
  }
  const pending = org.verification_status === 'pending';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${pending ? 'bg-premium-500/15 text-premium-500' : 'bg-white/5 text-gray-400'}`}>
      Business {pending ? '· Pending' : ''}
    </span>
  );
}

function Stat({ label, value, sub, tone = 'brand' }) {
  const tint = tone === 'trust' ? 'text-trust-500' : tone === 'premium' ? 'text-premium-500' : 'text-brand-400';
  return (
    <div className={`${panel} p-5`}>
      <p className="text-[11px] font-mono uppercase tracking-widest text-gray-500">{label}</p>
      <p className={`text-3xl font-black mt-2 tabular-nums ${tint}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function SectionHead({ tag, title, desc }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-mono uppercase tracking-widest text-brand-400">{tag}</p>
      <h2 className="text-2xl font-black text-white mt-1">{title}</h2>
      {desc && <p className="text-sm text-gray-400 mt-1">{desc}</p>}
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
          <h3 className="text-sm font-black text-white">Pipeline snapshot</h3>
          <button onClick={() => onGo('pipeline')} className="text-xs font-bold text-brand-400 hover:text-brand-300">Open pipeline →</button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {STAGES.map((s) => (
            <div key={s.id} className="text-center">
              <div className="h-16 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-xl font-black text-white tabular-nums">
                {kpis.pipeline[s.id] || 0}
              </div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Insights panel */}
      <div className={`${panel} p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-trust-500/15 text-trust-500 flex items-center justify-center"><TrendingUp size={15} /></div>
          <h3 className="text-sm font-black text-white">AI insights</h3>
        </div>
        {kpis.applicants === 0 && kpis.totalViews === 0 ? (
          <p className="text-sm text-gray-400">Insights populate as your postings gather views and applications. Publish your first opportunity to get started.</p>
        ) : (
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• {kpis.newApplicants} new applicant{kpis.newApplicants === 1 ? '' : 's'} in the last 7 days across {kpis.activePostings} active posting{kpis.activePostings === 1 ? '' : 's'}.</li>
            <li>• {kpis.totalViews.toLocaleString()} total posting views converting at <span className="text-trust-500 font-bold">{conv}%</span> to applications.</li>
            <li>• {kpis.pipeline.shortlisted + kpis.pipeline.interviewed} candidate{(kpis.pipeline.shortlisted + kpis.pipeline.interviewed) === 1 ? '' : 's'} active in your hiring pipeline.</li>
          </ul>
        )}
        {!org.is_verified && (
          <div className="mt-4 flex items-start gap-2 text-xs text-premium-500 bg-premium-500/10 border border-premium-500/20 rounded-xl p-3">
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
                <p className="font-bold text-white truncate">{p.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">{p.status || 'active'}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-400 shrink-0"><Eye size={14} /> {(p.views || 0).toLocaleString()}</span>
            </div>
          ))}
          <Link href="/dash/jobs" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300 mt-2">Manage postings <ExternalLink size={13} /></Link>
        </div>
      )}
    </div>
  );
}

function Pipeline({ kpis }) {
  return (
    <div>
      <SectionHead tag="Talent" title="Applicant pipeline" desc="Candidates by stage across all your postings." />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STAGES.map((s) => (
          <div key={s.id} className={`${panel} p-4 min-h-[140px]`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500">{s.label}</span>
              <span className="text-xs font-black text-white tabular-nums bg-white/5 rounded-full px-2 py-0.5">{kpis.pipeline[s.id] || 0}</span>
            </div>
            {(kpis.pipeline[s.id] || 0) === 0 && <p className="text-xs text-gray-600">Empty</p>}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">Stage totals reflect application status on your postings. Per-candidate drag-and-drop management activates next.</p>
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
        <p className="text-sm text-gray-400">Deeper AI analytics — regional demand signals, skill-gap trends, and time-to-hire — grow richer as your organization posts and engages. Everything here is derived from your real activity; nothing is simulated.</p>
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

  const f = 'w-full bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500/40 border-0 placeholder:text-gray-600';
  return (
    <div className="max-w-2xl">
      <SectionHead tag="Presence" title="Organization page" desc="Your public, verified presence on the network." />
      <Link href={`/organizations/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300 mb-5"><ExternalLink size={14} /> View public page</Link>
      <div className="space-y-4">
        <div><label className="block text-xs font-bold text-gray-400 mb-1.5">Tagline</label><input className={f} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} maxLength={140} /></div>
        <div><label className="block text-xs font-bold text-gray-400 mb-1.5">About</label><textarea className={`${f} min-h-[110px] resize-y`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold text-gray-400 mb-1.5">Sector</label><input className={f} value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} maxLength={80} /></div>
          <div><label className="block text-xs font-bold text-gray-400 mb-1.5">Location</label><input className={f} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={80} /></div>
        </div>
        <div><label className="block text-xs font-bold text-gray-400 mb-1.5">Website</label><input className={f} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} maxLength={200} /></div>
        <label className="flex items-center gap-2.5 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={form.hiring} onChange={(e) => setForm({ ...form, hiring: e.target.checked })} className="w-4 h-4 accent-brand-500" />
          Currently hiring
        </label>
        {msg && <p className={`text-sm ${msg.type === 'ok' ? 'text-trust-500' : 'text-red-400'}`}>{msg.text}</p>}
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
              <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-sm font-black text-gray-300 shrink-0">
                {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : (p?.full_name?.[0] || p?.username?.[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white truncate">{p?.full_name || p?.username || 'Member'}</p>
                <p className="text-xs text-gray-500 capitalize">{m.title || m.role}</p>
              </div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 capitalize">{m.role}</span>
            </div>
          );
        })}
      </div>
      {role === 'owner' && <p className="text-xs text-gray-500 mt-4">Team invitations and seat roles (Admin, Recruiter, Program Manager) activate with Organizational Subscription plans.</p>}
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
    verified:   { icon: CheckCircle2, tone: 'text-trust-500 bg-trust-500/15', title: 'Verified organization', desc: 'Your organization carries the verified trust badge across the network.' },
    pending:    { icon: Clock,        tone: 'text-premium-500 bg-premium-500/15', title: 'Verification pending', desc: 'Our team is reviewing your submission. Some scaled actions stay limited until approval.' },
    unverified: { icon: AlertTriangle,tone: 'text-gray-400 bg-white/5', title: 'Not verified', desc: 'Verify your organization to earn a trust badge and unlock scaled outreach — trust is the product, not a feature.' },
  };
  const s = STATE[status] || STATE.unverified;
  const Icon = s.icon;
  const fld = 'w-full bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500/40 border-0 placeholder:text-gray-600';

  return (
    <div className="max-w-2xl">
      <SectionHead tag="Trust" title="Verification & trust center" desc="Identity, credentials, and reputation." />
      <div className={`${panel} p-6`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.tone}`}><Icon size={24} /></div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-white">{s.title}</h3>
            <p className="text-sm text-gray-400 mt-1">{s.desc}</p>

            {status === 'unverified' && (
              <div className="mt-5 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Business registration / license number</label>
                  <input className={fld} value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="e.g. C12345678" maxLength={60} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Registration document <span className="text-gray-600">(PDF or image, ≤ 8 MB)</span></label>
                  <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-gray-200 hover:file:bg-white/15" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Note <span className="text-gray-600">(optional)</span></label>
                  <textarea className={`${fld} min-h-[70px] resize-y`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything our reviewers should know." maxLength={500} />
                </div>
                {err && <p className="text-sm text-red-400">{err}</p>}
                <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 bg-premium-500 hover:bg-premium-600 text-ink px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Submit for verification
                </button>
                <p className="text-[11px] text-gray-500">Or verify from a company-domain email — free-mail addresses take longer to review.</p>
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
            <p className="text-sm font-bold text-white">{t}</p>
            <p className="text-xs text-gray-500 mt-1">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Billing() {
  return (
    <div className="max-w-3xl">
      <SectionHead tag="Plans" title="Billing" desc="Organizational subscription and marketplace statements." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          ['Starter', 'Free', ['1 organization page', 'Up to 3 postings', 'Basic pipeline']],
          ['Growth', 'Tiered', ['Unlimited postings', 'Team seats & roles', 'Insights analytics']],
          ['Institution', 'Custom', ['Bulk program tools', 'Priority verification', 'Dedicated support']],
        ].map(([name, price, feats], i) => (
          <div key={name} className={`${panel} p-5 ${i === 1 ? 'ring-1 ring-brand-500/40' : ''}`}>
            <p className="text-[11px] font-mono uppercase tracking-widest text-gray-500">{name}</p>
            <p className="text-2xl font-black text-white mt-1">{price}</p>
            <ul className="mt-4 space-y-2">
              {feats.map((ff) => <li key={ff} className="flex items-center gap-2 text-sm text-gray-400"><CheckCircle2 size={14} className="text-trust-500 shrink-0" />{ff}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">Subscription billing activates with the Organizational Subscription rollout. No charges are applied today.</p>
    </div>
  );
}

function Empty({ icon: Icon, title, desc, cta }) {
  return (
    <div className={`${panel} py-16 text-center`}>
      <div className="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-400 flex items-center justify-center mx-auto mb-4"><Icon size={22} /></div>
      <p className="font-bold text-white">{title}</p>
      <p className="text-sm text-gray-500 mt-1 mb-5">{desc}</p>
      {cta && <Link href={cta.href} className="inline-flex items-center gap-1.5 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl transition-colors">{cta.label}</Link>}
    </div>
  );
}
