'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FolderGit2, Plus, Users, Tag, Search, X, Loader2, ChevronRight,
  Code2, Globe, GitBranch, CheckCircle2, Clock, ArrowLeft, Send,
  UserPlus, Briefcase, Layers, Filter, RefreshCw, Edit2, Trash2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const CATEGORIES = ['all', 'general', 'web', 'mobile', 'ai', 'blockchain', 'design', 'data', 'other'];
const COMMON_ROLES = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'UI/UX Designer', 'Mobile Developer', 'DevOps', 'Data Scientist', 'AI/ML Engineer', 'Project Manager', 'Marketing', 'QA Engineer'];
const COMMON_TECH = ['React', 'Next.js', 'Vue', 'Node.js', 'Python', 'TypeScript', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Flutter', 'React Native', 'AI/ML', 'GraphQL'];

function ProjectCard({ project, userId, onSelect }) {
  const members = project.project_members?.[0]?.count || 0;
  const isOwner = project.created_by === userId;
  const profile = project.profiles;

  return (
    <button
      onClick={() => onSelect(project)}
      className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
            <FolderGit2 size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
              {project.title}
            </h3>
            {isOwner && (
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Your Project</span>
            )}
          </div>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border shrink-0 ${
          project.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
        }`}>
          {project.status || 'active'}
        </span>
      </div>

      {project.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 line-clamp-2">{project.description}</p>
      )}

      {project.tech_stack?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {project.tech_stack.slice(0, 4).map(t => (
            <span key={t} className="text-[10px] font-bold px-2 py-0.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-600 dark:text-gray-400">
              {t}
            </span>
          ))}
          {project.tech_stack.length > 4 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">+{project.tech_stack.length - 4}</span>
          )}
        </div>
      )}

      {project.roles_needed?.length > 0 && (
        <div className="mb-3">
          <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Roles Needed</p>
          <div className="flex flex-wrap gap-1">
            {project.roles_needed.slice(0, 3).map(r => (
              <span key={r} className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-md text-blue-600 dark:text-blue-400">
                {r}
              </span>
            ))}
            {project.roles_needed.length > 3 && (
              <span className="text-[10px] text-gray-400 font-medium">+{project.roles_needed.length - 3}</span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <Users size={12} /> {members} member{members !== 1 ? 's' : ''}
          </div>
          {project.max_members && (
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <span>/ {project.max_members} max</span>
            </div>
          )}
        </div>
        <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
      </div>
    </button>
  );
}

function CreateProjectModal({ onClose, onCreated, token }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'general', github_url: '', website_url: '', max_members: 5 });
  const [roles, setRoles] = useState([]);
  const [tech, setTech] = useState([]);
  const [customRole, setCustomRole] = useState('');
  const [customTech, setCustomTech] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addRole = (r) => { if (!roles.includes(r)) setRoles(p => [...p, r]); };
  const addTech = (t) => { if (!tech.includes(t)) setTech(p => [...p, t]); };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, roles_needed: roles, tech_stack: tech }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create project');
      onCreated(data.project);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h3 className="font-black text-gray-900 dark:text-gray-100">Create Project</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={16} className="text-gray-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Project Title *</label>
            <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Restaurant Mobile App" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What are you building? What problem does it solve?" rows={3} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Max Members</label>
              <input type="number" min={2} max={20} value={form.max_members} onChange={e => setForm(p => ({ ...p, max_members: parseInt(e.target.value) || 5 }))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Roles Needed</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {roles.map(r => (
                <span key={r} onClick={() => setRoles(p => p.filter(x => x !== r))} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/50 transition-all">
                  {r} <X size={9} />
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_ROLES.map(r => !roles.includes(r) && (
                <button key={r} onClick={() => addRole(r)} className="text-[10px] font-bold px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:border-blue-400 transition-all">+ {r}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={customRole} onChange={e => setCustomRole(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && customRole.trim()) { addRole(customRole.trim()); setCustomRole(''); }}} placeholder="Custom role..." className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              <button onClick={() => { if (customRole.trim()) { addRole(customRole.trim()); setCustomRole(''); }}} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"><Plus size={14} /></button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Tech Stack</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tech.map(t => (
                <span key={t} onClick={() => setTech(p => p.filter(x => x !== t))} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 transition-all">
                  {t} <X size={9} />
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_TECH.map(t => !tech.includes(t) && (
                <button key={t} onClick={() => addTech(t)} className="text-[10px] font-bold px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:border-violet-400 transition-all">+ {t}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={customTech} onChange={e => setCustomTech(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && customTech.trim()) { addTech(customTech.trim()); setCustomTech(''); }}} placeholder="Custom tech..." className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              <button onClick={() => { if (customTech.trim()) { addTech(customTech.trim()); setCustomTech(''); }}} className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all"><Plus size={14} /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">GitHub URL</label>
              <input type="url" value={form.github_url} onChange={e => setForm(p => ({ ...p, github_url: e.target.value }))} placeholder="https://github.com/..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Website URL</label>
              <input type="url" value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={saving || !form.title.trim()} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <FolderGit2 size={15} />}
            {saving ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectDetail({ project, userId, token, onBack, onUpdated }) {
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showApply, setShowApply] = useState(false);
  const [applyRole, setApplyRole] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [applying, setSending] = useState(false);
  const [myRequest, setMyRequest] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const isOwner = project.created_by === userId;

  useEffect(() => {
    const load = async () => {
      const [membersRes, requestsRes] = await Promise.all([
        supabase.from('project_members').select(`*, profiles!project_members_user_id_fkey(username, full_name, avatar_url)`).eq('project_id', project.id),
        isOwner
          ? fetch(`/api/project-requests?project_id=${project.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
          : Promise.resolve({ requests: [] }),
      ]);
      setMembers(membersRes.data || []);
      setRequests(requestsRes.requests || []);
      const me = (membersRes.data || []).find(m => m.user_id === userId);
      setIsMember(!!me);
      if (!me && userId) {
        const { data: req } = await supabase.from('project_requests').select('*').eq('project_id', project.id).eq('user_id', userId).single();
        setMyRequest(req || null);
      }
      setLoading(false);
    };
    load();
  }, [project.id, isOwner, token, userId]);

  const handleApply = async () => {
    setSending(true);
    const res = await fetch('/api/project-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ project_id: project.id, role: applyRole, message: applyMsg }),
    });
    if (res.ok) {
      const { request } = await res.json();
      setMyRequest(request);
      setShowApply(false);
    }
    setSending(false);
  };

  const handleRequestAction = async (reqId, status) => {
    const res = await fetch('/api/project-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: reqId, status, project_id: project.id }),
    });
    if (res.ok) {
      setRequests(p => p.filter(r => r.id !== reqId));
      if (status === 'accepted') {
        const { data: newMember } = await supabase.from('project_members').select(`*, profiles!project_members_user_id_fkey(username, full_name, avatar_url)`).eq('project_id', project.id).order('joined_at', { ascending: false }).limit(1).single();
        if (newMember) setMembers(p => [...p, newMember]);
      }
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-gray-900 dark:text-gray-100 text-lg tracking-tight truncate">{project.title}</h2>
          {isOwner && <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Your Project</span>}
        </div>
        <div className="flex items-center gap-2">
          {project.github_url && <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"><GitBranch size={15} /></a>}
          {project.website_url && <a href={project.website_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"><Globe size={15} /></a>}
        </div>
      </div>

      {project.description && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{project.description}</p>
        </div>
      )}

      {project.tech_stack?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Layers size={11} /> Tech Stack</p>
          <div className="flex flex-wrap gap-1.5">
            {project.tech_stack.map(t => (
              <span key={t} className="text-[11px] font-bold px-2.5 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50 rounded-lg">{t}</span>
            ))}
          </div>
        </div>
      )}

      {project.roles_needed?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Briefcase size={11} /> Looking For</p>
          <div className="flex flex-wrap gap-1.5">
            {project.roles_needed.map(r => (
              <span key={r} className="text-[11px] font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg">{r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Users size={11} /> Team ({members.length}/{project.max_members || 5})</p>
        {loading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : members.length ? (
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center shrink-0 text-white text-xs font-black">
                  {m.profiles?.full_name?.[0] || m.profiles?.username?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{m.profiles?.full_name || m.profiles?.username}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{m.role}</p>
                </div>
                {m.user_id === project.created_by && (
                  <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md">Owner</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500">No members yet.</p>
        )}
      </div>

      {/* Join requests (owner only) */}
      {isOwner && requests.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
          <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-3">Join Requests ({requests.length})</p>
          <div className="space-y-3">
            {requests.filter(r => r.status === 'pending').map(r => (
              <div key={r.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{r.profiles?.full_name || r.profiles?.username}</p>
                    {r.role && <p className="text-xs text-gray-500 dark:text-gray-400">as {r.role}</p>}
                  </div>
                </div>
                {r.message && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">{r.message}</p>}
                <div className="flex gap-2">
                  <button onClick={() => handleRequestAction(r.id, 'accepted')} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"><CheckCircle2 size={12} /> Accept</button>
                  <button onClick={() => handleRequestAction(r.id, 'rejected')} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"><X size={12} /> Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Apply */}
      {!isOwner && !isMember && userId && (
        <div>
          {myRequest ? (
            <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl">
              <Clock size={16} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Request Pending</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Your join request is awaiting approval from the project owner.</p>
              </div>
            </div>
          ) : showApply ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-black text-gray-900 dark:text-gray-100">Apply to Join</p>
              <input value={applyRole} onChange={e => setApplyRole(e.target.value)} placeholder="Your role (e.g. Frontend Developer)" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              <textarea value={applyMsg} onChange={e => setApplyMsg(e.target.value)} placeholder="Why do you want to join? What can you contribute?" rows={3} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
              <div className="flex gap-2">
                <button onClick={() => setShowApply(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl transition-all">Cancel</button>
                <button onClick={handleApply} disabled={applying} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                  {applying ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Send Request
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowApply(true)} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95 shadow-lg shadow-blue-500/20">
              <UserPlus size={16} /> Apply to Join Team
            </button>
          )}
        </div>
      )}

      {!userId && (
        <div className="text-center py-4">
          <button onClick={() => window.location.href = '/auth'} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm">Sign In to Apply</button>
        </div>
      )}
    </div>
  );
}

export default function ProjectMarketplaceContent() {
  const [session, setSession] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = useCallback(async (tab, cat, q, token) => {
    const params = new URLSearchParams({ category: cat || 'all' });
    if (q) params.set('q', q);
    if (tab === 'mine' && token) params.set('mine', '1');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/projects?${params}`, { headers });
    if (res.ok) {
      const { projects } = await res.json();
      setProjects(projects || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const params = new URLSearchParams({ category: category || 'all' });
      if (search) params.set('q', search);
      if (activeTab === 'mine' && session?.access_token) params.set('mine', '1');
      const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const res = await fetch(`/api/projects?${params}`, { headers });
      if (cancelled) return;
      if (res.ok) {
        const { projects } = await res.json();
        setProjects(projects || []);
      }
      setLoading(false);
      setRefreshing(false);
    };
    load();
    return () => { cancelled = true; };
  }, [activeTab, category, search, session?.access_token]);

  const handleSearch = (e) => {
    if (e.key === 'Enter') fetchProjects(activeTab, category, e.target.value, session?.access_token);
  };

  if (selected) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <ProjectDetail
          project={selected}
          userId={session?.user?.id}
          token={session?.access_token}
          onBack={() => setSelected(null)}
          onUpdated={() => fetchProjects(activeTab, category, search, session?.access_token)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      {showCreate && session && (
        <CreateProjectModal
          token={session.access_token}
          onClose={() => setShowCreate(false)}
          onCreated={(p) => { setProjects(prev => [p, ...prev]); setSelected(p); }}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Build Together</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 font-medium">Find projects to join or launch your own with a team.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setRefreshing(true); fetchProjects(activeTab, category, search, session?.access_token); }} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {session && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm shadow-blue-500/20">
              <Plus size={15} /> New Project
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {[{ id: 'browse', label: 'Browse' }, ...(session ? [{ id: 'mine', label: 'My Projects' }] : [])].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab === tab.id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="relative shrink-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search projects…"
            className="pl-8 pr-3 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-44"
          />
        </div>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} className={`shrink-0 text-[11px] font-bold px-3 py-2 rounded-xl transition-all ${category === c ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Project list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : projects.length ? (
        <div className="space-y-4">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} userId={session?.user?.id} onSelect={setSelected} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <FolderGit2 size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{activeTab === 'mine' ? 'No projects yet' : 'No projects found'}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeTab === 'mine' ? 'Create your first project and start building with others.' : 'Try a different filter or be the first to post one.'}
          </p>
          {session && activeTab === 'mine' && (
            <button onClick={() => setShowCreate(true)} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm active:scale-95">
              Create Project
            </button>
          )}
        </div>
      )}
    </div>
  );
}
