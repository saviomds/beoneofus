'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Search, Plus, X, Loader2, ArrowLeft, Globe,
  MapPin, Users, Briefcase, Code2, CheckCircle2, Star, Edit2,
  RefreshCw, ExternalLink, Wifi, Home, LayoutGrid, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const REMOTE_POLICIES = ['Remote', 'Hybrid', 'On-site'];
const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+'];
const COMMON_TECH = ['React', 'Node.js', 'Python', 'AWS', 'TypeScript', 'Go', 'PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes', 'GraphQL', 'Flutter', 'Swift', 'Kotlin', 'Vue', 'Next.js', 'Django', 'FastAPI', 'Rust', 'Java', 'Spring Boot', 'AI/ML', 'Blockchain'];
const INDUSTRIES = ['Technology', 'FinTech', 'EdTech', 'HealthTech', 'E-Commerce', 'Gaming', 'Media', 'Consulting', 'Government', 'NGO', 'Hospitality', 'Agriculture', 'Logistics', 'Real Estate'];

const REMOTE_ICONS = { Remote: <Wifi size={12} />, Hybrid: <LayoutGrid size={12} />, 'On-site': <Home size={12} /> };
const REMOTE_COLORS = {
  Remote: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  Hybrid: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  'On-site': 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

function CompanyCard({ company, userId, onSelect }) {
  const isOwner = company.owner_id === userId;
  return (
    <button
      onClick={() => onSelect(company)}
      className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all group"
    >
      <div className="relative h-14 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center px-5">
        {company.verified && (
          <div className="absolute top-2.5 right-3 flex items-center gap-1 text-[9px] font-black text-blue-300 bg-blue-900/40 border border-blue-700/50 px-2 py-0.5 rounded-full uppercase tracking-widest">
            <CheckCircle2 size={9} /> Verified
          </div>
        )}
        {company.hiring && (
          <span className="absolute bottom-2.5 left-5 text-[9px] font-black text-emerald-300 bg-emerald-900/40 border border-emerald-700/50 px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Hiring
          </span>
        )}
      </div>

      <div className="px-5 pb-5">
        <div className="flex items-end gap-3 -mt-5 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm shrink-0">
            {company.logo_url ? (
              <img src={company.logo_url} alt="" className="w-10 h-10 object-contain rounded-lg" />
            ) : (
              <Building2 size={22} className="text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight truncate">{company.name}</h3>
            {company.industry && <p className="text-xs text-gray-500 dark:text-gray-400">{company.industry}</p>}
          </div>
          {isOwner && <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/50 shrink-0 mb-1">Owner</span>}
        </div>

        {company.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 line-clamp-2">{company.description}</p>
        )}

        {company.tech_stack?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {company.tech_stack.slice(0, 5).map(t => (
              <span key={t} className="text-[10px] font-bold px-2 py-0.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-600 dark:text-gray-400">{t}</span>
            ))}
            {company.tech_stack.length > 5 && <span className="text-[10px] text-gray-400 font-medium">+{company.tech_stack.length - 5}</span>}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {company.location && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
              <MapPin size={10} /> {company.location}
            </div>
          )}
          {company.size && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
              <Users size={10} /> {company.size}
            </div>
          )}
          {company.remote_policy && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${REMOTE_COLORS[company.remote_policy]}`}>
              {REMOTE_ICONS[company.remote_policy]} {company.remote_policy}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function CompanyDetail({ company, userId, onBack }) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"><ArrowLeft size={16} /></button>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-gray-900 dark:text-gray-100 text-xl tracking-tight">{company.name}</h2>
          {company.industry && <p className="text-sm text-gray-500 dark:text-gray-400">{company.industry}</p>}
        </div>
        {company.website && (
          <a href={company.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
            <ExternalLink size={15} />
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {company.verified && <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 px-2.5 py-1 rounded-lg uppercase tracking-widest"><CheckCircle2 size={10} /> Verified</span>}
        {company.hiring && <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-lg uppercase tracking-widest"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Actively Hiring</span>}
        {company.remote_policy && <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg border ${REMOTE_COLORS[company.remote_policy]}`}>{REMOTE_ICONS[company.remote_policy]} {company.remote_policy}</span>}
        {company.size && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"><Users size={10} /> {company.size} employees</span>}
        {company.founded_year && <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">Est. {company.founded_year}</span>}
        {company.location && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"><MapPin size={10} /> {company.location}</span>}
      </div>

      {company.description && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">About</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{company.description}</p>
        </div>
      )}

      {company.tech_stack?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Code2 size={11} /> Tech Stack</p>
          <div className="flex flex-wrap gap-2">
            {company.tech_stack.map(t => (
              <span key={t} className="text-[11px] font-bold px-2.5 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50 rounded-lg">{t}</span>
            ))}
          </div>
        </div>
      )}

      {company.culture && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Culture & Values</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{company.culture}</p>
        </div>
      )}

      {company.hiring && company.website && (
        <a href={company.website} target="_blank" rel="noopener noreferrer" className="block w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all text-center text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
          <Briefcase size={16} /> View Open Roles <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

function CreateCompanyModal({ token, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', industry: '', location: '', size: '11–50', website: '', culture: '', remote_policy: 'Hybrid', hiring: false, founded_year: '' });
  const [tech, setTech] = useState([]);
  const [techInput, setTechInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addTech = (t) => { if (t && !tech.includes(t)) setTech(p => [...p, t]); };

  const handleSubmit = async () => {
    if (!form.name) { setError('Company name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, tech_stack: tech, founded_year: form.founded_year ? parseInt(form.founded_year) : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated(data.company);
      onClose();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h3 className="font-black text-gray-900 dark:text-gray-100">Add Company Profile</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { key: 'name', label: 'Company Name *', placeholder: 'e.g. Innova Tech Ltd' },
            { key: 'website', label: 'Website', placeholder: 'https://yourcompany.com' },
            { key: 'location', label: 'Location', placeholder: 'e.g. Port Louis, Mauritius' },
            { key: 'founded_year', label: 'Founded Year', placeholder: 'e.g. 2019' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">{label}</label>
              <input type="text" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
          ))}
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">About the Company</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="What does your company do?" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'industry', label: 'Industry', options: INDUSTRIES },
              { key: 'size', label: 'Company Size', options: COMPANY_SIZES },
              { key: 'remote_policy', label: 'Remote Policy', options: REMOTE_POLICIES },
            ].map(({ key, label, options }) => (
              <div key={key} className={key === 'industry' ? 'col-span-2' : ''}>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">{label}</label>
                <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                  <option value="">Select...</option>
                  {options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Culture & Values</label>
            <textarea value={form.culture} onChange={e => setForm(p => ({ ...p, culture: e.target.value }))} rows={2} placeholder="Describe your company culture, values, perks..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Tech Stack</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tech.map(t => <span key={t} onClick={() => setTech(p => p.filter(x => x !== t))} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50 rounded-lg cursor-pointer">{t} <X size={9} /></span>)}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_TECH.map(t => !tech.includes(t) && <button key={t} onClick={() => addTech(t)} className="text-[10px] font-bold px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:border-violet-400 transition-all">+ {t}</button>)}
            </div>
            <div className="flex gap-2">
              <input value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && techInput.trim()) { addTech(techInput.trim()); setTechInput(''); }}} placeholder="Custom technology..." className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
              <button onClick={() => { addTech(techInput.trim()); setTechInput(''); }} className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all"><Plus size={14} /></button>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.hiring} onChange={e => setForm(p => ({ ...p, hiring: e.target.checked }))} className="w-4 h-4 rounded accent-emerald-600 cursor-pointer" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Currently hiring</span>
          </label>
          {error && <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl"><AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /><p className="text-xs text-red-700 dark:text-red-400">{error}</p></div>}
          <button onClick={handleSubmit} disabled={saving} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Building2 size={15} />}
            {saving ? 'Creating…' : 'Add Company Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompaniesContent() {
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [hiringOnly, setHiringOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchCompanies = useCallback(async (hiring, q) => {
    const params = new URLSearchParams();
    if (hiring) params.set('hiring', 'true');
    if (q) params.set('q', q);
    const res = await fetch(`/api/companies?${params}`);
    if (res.ok) { const { companies } = await res.json(); setCompanies(companies || []); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); fetchCompanies(hiringOnly, search); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { setLoading(true); fetchCompanies(hiringOnly, search); }, [hiringOnly]);

  if (selected) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <CompanyDetail company={selected} userId={session?.user?.id} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      {showCreate && session && <CreateCompanyModal token={session.access_token} onClose={() => setShowCreate(false)} onCreated={c => { setCompanies(p => [c, ...p]); }} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Tech Companies</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 font-medium">Discover tech companies, their stack, and open roles.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setRefreshing(true); fetchCompanies(hiringOnly, search); }} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /></button>
          {session && <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm shadow-blue-500/20"><Plus size={15} /> Add Company</button>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') fetchCompanies(hiringOnly, e.target.value); }} placeholder="Search companies, tech stack…" className="w-full pl-8 pr-3 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
        </div>
        <button onClick={() => setHiringOnly(v => !v)} className={`flex items-center gap-1.5 text-[11px] font-black px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${hiringOnly ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400'}`}>
          <span className="w-1.5 h-1.5 bg-current rounded-full" /> Hiring Now
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-52 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : companies.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {companies.map(c => <CompanyCard key={c.id} company={c} userId={session?.user?.id} onSelect={setSelected} />)}
        </div>
      ) : (
        <div className="text-center py-20">
          <Building2 size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">No companies found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Be the first to add your company profile.</p>
          {session && <button onClick={() => setShowCreate(true)} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm">Add Company</button>}
        </div>
      )}
    </div>
  );
}
