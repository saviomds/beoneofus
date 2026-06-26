'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Rocket, Plus, Search, X, Loader2, ArrowLeft, Send, Users,
  Lightbulb, Target, ChevronRight, CheckCircle2, DollarSign,
  RefreshCw, Tag, BarChart2, AlertCircle, Sparkles, TrendingUp,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const STAGES = [
  { id: 'all', label: 'All Stages' },
  { id: 'idea', label: '💡 Idea' },
  { id: 'validation', label: '🧪 Validation' },
  { id: 'mvp', label: '🚀 MVP' },
  { id: 'growth', label: '📈 Growth' },
];
const STAGE_COLORS = {
  idea:       'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50',
  validation: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  mvp:        'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/50',
  growth:     'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
};
const STAGE_ICONS = { idea: '💡', validation: '🧪', mvp: '🚀', growth: '📈' };
const COMMON_ROLES = ['Co-founder', 'CTO', 'Full Stack Developer', 'Mobile Developer', 'UI/UX Designer', 'Marketing Lead', 'Product Manager', 'Business Dev', 'Financial Expert', 'Legal Advisor'];
const INDUSTRIES = ['FinTech', 'EdTech', 'HealthTech', 'AgriTech', 'E-Commerce', 'AI/ML', 'SaaS', 'Consumer App', 'B2B', 'Marketplace', 'Gaming', 'Media', 'Blockchain', 'Logistics'];

function StartupCard({ startup, userId, onSelect }) {
  const isFounder = startup.founder_id === userId;
  const profile = startup.profiles;
  return (
    <button
      onClick={() => onSelect(startup)}
      className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${STAGE_COLORS[startup.stage] || STAGE_COLORS.idea}`}>
              {STAGE_ICONS[startup.stage]} {startup.stage}
            </span>
            {startup.equity_offered && <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-lg">Equity</span>}
            {startup.paid_roles && <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-lg">Paid</span>}
          </div>
          <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">{startup.title}</h3>
          {isFounder && <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Your Startup</span>}
        </div>
        <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0 mt-1" />
      </div>

      {startup.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 line-clamp-2">{startup.description}</p>
      )}

      {startup.roles_needed?.length > 0 && (
        <div className="mb-3">
          <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Looking for</p>
          <div className="flex flex-wrap gap-1">
            {startup.roles_needed.slice(0, 4).map(r => (
              <span key={r} className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-md text-blue-600 dark:text-blue-400">{r}</span>
            ))}
            {startup.roles_needed.length > 4 && <span className="text-[10px] text-gray-400 font-medium">+{startup.roles_needed.length - 4}</span>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-black">
            {profile?.full_name?.[0] || profile?.username?.[0] || '?'}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{profile?.full_name || profile?.username}</span>
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(startup.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </button>
  );
}

function StartupDetail({ startup, session, onBack }) {
  const [showApply, setShowApply] = useState(false);
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState('');
  const isFounder = startup.founder_id === session?.user?.id;
  const profile = startup.profiles;

  useEffect(() => {
    if (!session) return;
    supabase.from('startup_team_requests').select('id').eq('startup_id', startup.id).eq('user_id', session.user.id).single()
      .then(({ data }) => { if (data) setApplied(true); });
  }, [startup.id, session]);

  const handleApply = async () => {
    setApplying(true);
    setError('');
    try {
      const { error: e } = await supabase.from('startup_team_requests').insert({
        startup_id: startup.id,
        user_id: session.user.id,
        role,
        message,
      });
      if (e) throw new Error(e.message);
      setApplied(true);
      setShowApply(false);
    } catch (err) { setError(err.message); } finally { setApplying(false); }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"><ArrowLeft size={16} /></button>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-gray-900 dark:text-gray-100 text-xl tracking-tight leading-tight">{startup.title}</h2>
          {startup.industry && <p className="text-sm text-gray-500 dark:text-gray-400">{startup.industry}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${STAGE_COLORS[startup.stage] || STAGE_COLORS.idea}`}>{STAGE_ICONS[startup.stage]} {startup.stage}</span>
        {startup.equity_offered && <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-lg flex items-center gap-1"><DollarSign size={11} /> Equity Offered</span>}
        {startup.paid_roles && <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-lg">Paid Roles</span>}
      </div>

      {/* Founder */}
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-black">
          {profile?.full_name?.[0] || profile?.username?.[0] || '?'}
        </div>
        <div>
          <p className="text-sm font-black text-gray-900 dark:text-gray-100">{profile?.full_name || profile?.username}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{profile?.headline || 'Founder'}</p>
        </div>
      </div>

      {startup.description && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">About</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{startup.description}</p>
        </div>
      )}

      {(startup.problem || startup.solution) && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800">
          {startup.problem && (
            <div className="p-5">
              <p className="text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><AlertCircle size={11} /> Problem</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{startup.problem}</p>
            </div>
          )}
          {startup.solution && (
            <div className="p-5">
              <p className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><CheckCircle2 size={11} /> Solution</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{startup.solution}</p>
            </div>
          )}
        </div>
      )}

      {startup.roles_needed?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Users size={11} /> Roles Needed</p>
          <div className="flex flex-wrap gap-2">
            {startup.roles_needed.map(r => (
              <span key={r} className="text-[11px] font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg">{r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Join */}
      {!isFounder && (
        applied ? (
          <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Request Sent!</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">The founder will reach out if there's a match.</p>
            </div>
          </div>
        ) : showApply ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-black text-gray-900 dark:text-gray-100">Express Your Interest</p>
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Role You're Applying For</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                <option value="">Select a role...</option>
                {startup.roles_needed?.map(r => <option key={r} value={r}>{r}</option>)}
                {COMMON_ROLES.map(r => !startup.roles_needed?.includes(r) && <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell the founder about yourself, your skills, and why you want to join this startup..." rows={4} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
            {error && <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl"><AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /><p className="text-xs text-red-700 dark:text-red-400">{error}</p></div>}
            <div className="flex gap-2">
              <button onClick={() => setShowApply(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl transition-all">Cancel</button>
              <button onClick={handleApply} disabled={applying || !message.trim()} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2">
                {applying ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Send Request
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => session ? setShowApply(true) : window.location.href = '/auth'}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95 shadow-lg shadow-blue-500/20"
          >
            <Rocket size={16} /> Join This Startup
          </button>
        )
      )}
    </div>
  );
}

function CreateStartupModal({ token, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', problem: '', solution: '', stage: 'idea', industry: '', equity_offered: false, paid_roles: false });
  const [roles, setRoles] = useState([]);
  const [tags, setTags] = useState([]);
  const [roleInput, setRoleInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.title || !form.description) { setError('Title and description are required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/startups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, roles_needed: roles, tags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated(data.startup);
      onClose();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h3 className="font-black text-gray-900 dark:text-gray-100">Post Your Startup Idea</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Startup Name *</label>
            <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="What's your startup called?" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Briefly describe what you're building..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Problem You're Solving</label>
            <textarea value={form.problem} onChange={e => setForm(p => ({ ...p, problem: e.target.value }))} rows={2} placeholder="What problem does this solve?" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Your Solution</label>
            <textarea value={form.solution} onChange={e => setForm(p => ({ ...p, solution: e.target.value }))} rows={2} placeholder="How does your startup solve this?" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Stage</label>
              <select value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                {['idea', 'validation', 'mvp', 'growth'].map(s => <option key={s} value={s}>{STAGE_ICONS[s]} {s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Industry</label>
              <select value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                <option value="">Select...</option>
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Roles Needed</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {roles.map(r => <span key={r} onClick={() => setRoles(p => p.filter(x => x !== r))} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg cursor-pointer">{r} <X size={9} /></span>)}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_ROLES.map(r => !roles.includes(r) && <button key={r} onClick={() => setRoles(p => [...p, r])} className="text-[10px] font-bold px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:border-blue-400 transition-all">+ {r}</button>)}
            </div>
            <div className="flex gap-2">
              <input value={roleInput} onChange={e => setRoleInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && roleInput.trim()) { setRoles(p => [...p, roleInput.trim()]); setRoleInput(''); }}} placeholder="Custom role..." className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
              <button onClick={() => { if (roleInput.trim()) { setRoles(p => [...p, roleInput.trim()]); setRoleInput(''); }}} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"><Plus size={14} /></button>
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.equity_offered} onChange={e => setForm(p => ({ ...p, equity_offered: e.target.checked }))} className="w-4 h-4 rounded accent-amber-600 cursor-pointer" />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Equity offered</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.paid_roles} onChange={e => setForm(p => ({ ...p, paid_roles: e.target.checked }))} className="w-4 h-4 rounded accent-emerald-600 cursor-pointer" />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Paid roles</span>
            </label>
          </div>
          {error && <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl"><AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /><p className="text-xs text-red-700 dark:text-red-400">{error}</p></div>}
          <button onClick={handleSubmit} disabled={saving} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
            {saving ? 'Posting…' : 'Post Startup Idea'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StartupsContent() {
  const [session, setSession] = useState(null);
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [stage, setStage] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchStartups = useCallback(async (stg, q) => {
    const params = new URLSearchParams();
    if (stg && stg !== 'all') params.set('stage', stg);
    if (q) params.set('q', q);
    const res = await fetch(`/api/startups?${params}`);
    if (res.ok) { const { startups } = await res.json(); setStartups(startups || []); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); fetchStartups(stage, search); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { setLoading(true); fetchStartups(stage, search); }, [stage]);

  if (selected) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <StartupDetail startup={selected} session={session} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      {showCreate && session && <CreateStartupModal token={session.access_token} onClose={() => setShowCreate(false)} onCreated={s => { setStartups(p => [s, ...p]); setShowCreate(false); }} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Startup Builder</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 font-medium">Find co-founders, join startups, build something great.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setRefreshing(true); fetchStartups(stage, search); }} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /></button>
          {session && <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm shadow-blue-500/20"><Plus size={15} /> Post Idea</button>}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STAGES.map(s => (
          <button key={s.id} onClick={() => setStage(s.id)} className={`shrink-0 text-[11px] font-black px-3 py-2 rounded-xl transition-all ${stage === s.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            {s.label}
          </button>
        ))}
        <div className="relative shrink-0 ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') fetchStartups(stage, e.target.value); }} placeholder="Search…" className="pl-8 pr-3 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-36" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : startups.length ? (
        <div className="space-y-4">{startups.map(s => <StartupCard key={s.id} startup={s} userId={session?.user?.id} onSelect={setSelected} />)}</div>
      ) : (
        <div className="text-center py-20">
          <Rocket size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">No startups found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Be the first to post a startup idea.</p>
          {session && <button onClick={() => setShowCreate(true)} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm">Post Startup</button>}
        </div>
      )}
    </div>
  );
}
