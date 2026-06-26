'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Globe, Search, Plus, X, Loader2, ArrowLeft, Send, Briefcase,
  DollarSign, Clock, Tag, MapPin, ExternalLink, Filter, RefreshCw,
  ChevronRight, Users, CheckCircle2, AlertCircle, Laptop,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const CATEGORIES = ['all', 'Africa', 'Europe', 'Asia', 'Worldwide'];
const JOB_TYPES = ['all', 'remote', 'freelance', 'contract'];
const CATEGORY_META = {
  Africa:    { color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
  Europe:    { color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50', dot: 'bg-blue-500' },
  Asia:      { color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50', dot: 'bg-orange-500' },
  Worldwide: { color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/50', dot: 'bg-violet-500' },
};
const TYPE_COLORS = {
  remote:    'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50',
  freelance: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
  contract:  'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
};

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function JobCard({ job, onSelect }) {
  const cat = CATEGORY_META[job.category] || CATEGORY_META.Worldwide;
  return (
    <button
      onClick={() => onSelect(job)}
      className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight mb-1">
            {job.title}
          </h3>
          {job.company && (
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{job.company}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${cat.color}`}>{job.category}</span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${TYPE_COLORS[job.job_type] || TYPE_COLORS.remote}`}>{job.job_type}</span>
        </div>
      </div>

      {job.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 line-clamp-2">{job.description}</p>
      )}

      {job.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.skills.slice(0, 5).map(s => (
            <span key={s} className="text-[10px] font-bold px-2 py-0.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-600 dark:text-gray-400">{s}</span>
          ))}
          {job.skills.length > 5 && <span className="text-[10px] text-gray-400 font-medium">+{job.skills.length - 5}</span>}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {job.budget && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
              <DollarSign size={11} /> {job.budget}
            </div>
          )}
          {job.duration && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
              <Clock size={11} /> {job.duration}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(job.created_at)}</span>
          <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
    </button>
  );
}

function JobDetail({ job, session, onBack }) {
  const [showApply, setShowApply] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [rate, setRate] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState('');
  const cat = CATEGORY_META[job.category] || CATEGORY_META.Worldwide;

  useEffect(() => {
    if (!session) return;
    supabase.from('freelance_applications').select('id').eq('job_id', job.id).eq('applicant_id', session.user.id).single()
      .then(({ data }) => { if (data) setApplied(true); });
  }, [job.id, session]);

  const handleApply = async () => {
    if (!session) { window.location.href = '/auth'; return; }
    setApplying(true);
    setError('');
    try {
      const { error: e } = await supabase.from('freelance_applications').insert({
        job_id: job.id,
        applicant_id: session.user.id,
        cover_note: coverNote,
        portfolio_url: portfolioUrl,
        rate,
      });
      if (e) throw new Error(e.message);
      setApplied(true);
      setShowApply(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"><ArrowLeft size={16} /></button>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-gray-900 dark:text-gray-100 text-lg tracking-tight leading-tight">{job.title}</h2>
          {job.company && <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{job.company}</p>}
        </div>
        {job.apply_url && (
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
            <ExternalLink size={15} />
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${cat.color}`}>{job.category}</span>
        <span className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${TYPE_COLORS[job.job_type] || TYPE_COLORS.remote}`}>{job.job_type}</span>
        {job.budget && <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center gap-1"><DollarSign size={10} />{job.budget}</span>}
        {job.duration && <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center gap-1"><Clock size={10} />{job.duration}</span>}
      </div>

      {job.description && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Description</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{job.description}</p>
        </div>
      )}

      {job.skills?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Tag size={11} /> Required Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {job.skills.map(s => (
              <span key={s} className="text-[11px] font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Apply section */}
      {!job.apply_url && (
        <div>
          {applied ? (
            <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Application Sent</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">The poster will contact you if you are selected.</p>
              </div>
            </div>
          ) : showApply ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
              <p className="text-sm font-black text-gray-900 dark:text-gray-100">Apply for this Role</p>
              <textarea value={coverNote} onChange={e => setCoverNote(e.target.value)} placeholder="Introduce yourself and explain why you're a great fit..." rows={4} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
              <input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="Portfolio URL (optional)" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              <input value={rate} onChange={e => setRate(e.target.value)} placeholder="Your rate / expected compensation (optional)" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              {error && <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl"><AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /><p className="text-xs text-red-700 dark:text-red-400">{error}</p></div>}
              <div className="flex gap-2">
                <button onClick={() => setShowApply(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl transition-all">Cancel</button>
                <button onClick={handleApply} disabled={applying || !coverNote.trim()} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                  {applying ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Submit
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => session ? setShowApply(true) : window.location.href = '/auth'} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95 shadow-lg shadow-blue-500/20">
              <Send size={16} /> Apply Now
            </button>
          )}
        </div>
      )}

      {job.apply_url && !applied && (
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="block w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all text-center text-sm shadow-lg shadow-blue-500/20">
          Apply on External Site <ExternalLink size={14} className="inline ml-1.5" />
        </a>
      )}
    </div>
  );
}

function PostJobModal({ token, onClose, onPosted }) {
  const [form, setForm] = useState({ title: '', description: '', company: '', category: 'Worldwide', job_type: 'remote', budget: '', duration: '', apply_url: '' });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addSkill = (s) => { if (s && !skills.includes(s)) setSkills(p => [...p, s]); };

  const handleSubmit = async () => {
    if (!form.title || !form.description) { setError('Title and description are required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/freelance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, skills }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onPosted(data.job);
      onClose();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h3 className="font-black text-gray-900 dark:text-gray-100">Post a Freelance Job</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { key: 'title', label: 'Job Title *', type: 'text', placeholder: 'e.g. React Developer needed for mobile app' },
            { key: 'company', label: 'Company / Your Name', type: 'text', placeholder: 'Your company or name' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">{label}</label>
              <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
          ))}
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the role, responsibilities, and requirements..." rows={4} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Region</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                {['Africa', 'Europe', 'Asia', 'Worldwide'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Type</label>
              <select value={form.job_type} onChange={e => setForm(p => ({ ...p, job_type: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                {['freelance', 'remote', 'contract'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Budget</label>
              <input type="text" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} placeholder="e.g. $1,000 – $3,000" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Duration</label>
              <input type="text" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 3 months" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Required Skills</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {skills.map(s => <span key={s} onClick={() => setSkills(p => p.filter(x => x !== s))} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg cursor-pointer">{s} <X size={9} /></span>)}
            </div>
            <div className="flex gap-2">
              <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && skillInput.trim()) { addSkill(skillInput.trim()); setSkillInput(''); }}} placeholder="Add a skill…" className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
              <button onClick={() => { addSkill(skillInput.trim()); setSkillInput(''); }} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"><Plus size={14} /></button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">External Apply URL <span className="font-medium normal-case text-gray-400">(optional — if empty, applicants apply on-platform)</span></label>
            <input type="url" value={form.apply_url} onChange={e => setForm(p => ({ ...p, apply_url: e.target.value }))} placeholder="https://..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
          </div>
          {error && <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl"><AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /><p className="text-xs text-red-700 dark:text-red-400">{error}</p></div>}
          <button onClick={handleSubmit} disabled={saving} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Briefcase size={15} />}
            {saving ? 'Posting…' : 'Post Job'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FreelanceContent() {
  const [session, setSession] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(async (cat, typ, q) => {
    const params = new URLSearchParams();
    if (cat && cat !== 'all') params.set('category', cat);
    if (typ && typ !== 'all') params.set('type', typ);
    if (q) params.set('q', q);
    const res = await fetch(`/api/freelance?${params}`);
    if (res.ok) { const { jobs } = await res.json(); setJobs(jobs || []); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); fetchJobs(category, type, search); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { setLoading(true); fetchJobs(category, type, search); }, [category, type]);

  if (selected) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <JobDetail job={selected} session={session} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      {showPost && session && <PostJobModal token={session.access_token} onClose={() => setShowPost(false)} onPosted={j => { setJobs(p => [j, ...p]); setShowPost(false); }} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Remote & Freelance</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 font-medium">Freelance, remote, and contract opportunities worldwide.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setRefreshing(true); fetchJobs(category, type, search); }} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {session && (
            <button onClick={() => setShowPost(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm shadow-blue-500/20">
              <Plus size={15} /> Post Job
            </button>
          )}
        </div>
      </div>

      {/* Region filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map(c => {
          const meta = c !== 'all' ? CATEGORY_META[c] : null;
          return (
            <button key={c} onClick={() => setCategory(c)} className={`shrink-0 flex items-center gap-1.5 text-[11px] font-black px-3 py-2 rounded-xl transition-all ${category === c ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {meta && <span className={`w-2 h-2 rounded-full ${meta.dot}`} />}
              {c === 'all' ? <Globe size={11} /> : null}
              {c === 'all' ? 'All Regions' : c}
            </button>
          );
        })}
      </div>

      {/* Type + search */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {JOB_TYPES.map(t => (
          <button key={t} onClick={() => setType(t)} className={`shrink-0 text-[11px] font-black px-3 py-2 rounded-xl transition-all capitalize ${type === t ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            {t === 'all' ? 'All Types' : t}
          </button>
        ))}
        <div className="relative shrink-0 ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') fetchJobs(category, type, e.target.value); }} placeholder="Search…" className="pl-8 pr-3 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-36" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-44 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : jobs.length ? (
        <div className="space-y-4">{jobs.map(j => <JobCard key={j.id} job={j} onSelect={setSelected} />)}</div>
      ) : (
        <div className="text-center py-20">
          <Laptop size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">No jobs found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Try a different filter or be the first to post one.</p>
          {session && <button onClick={() => setShowPost(true)} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm">Post a Job</button>}
        </div>
      )}
    </div>
  );
}
