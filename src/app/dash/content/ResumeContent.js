"use client";

import { useState, useEffect } from "react";
import {
  FileText, Briefcase, GraduationCap, Code2, Eye,
  Plus, Trash2, Edit3, ExternalLink, Copy, Check, Loader2,
  ChevronDown, ChevronUp, Info, X,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const EMPTY_EXP = { company: "", role: "", location: "", start: "", end: "", current: false, description: "" };
const EMPTY_EDU = { school: "", degree: "", field: "", start: "", end: "", current: false, gpa: "" };
const EMPTY_RESUME = { summary: "", work_experience: [], education: [], show_certs: true, show_projects: true, show_posts: false };

function genId() { return Math.random().toString(36).slice(2, 10); }

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${checked ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function CollapsibleSection({ title, icon: Icon, expanded, onToggle, children }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Icon size={15} />
          </div>
          <span className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-wide">{title}</span>
        </div>
        {expanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          {children}
        </div>
      )}
    </div>
  );
}

const INPUT_CLS = "w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
const LABEL_CLS = "block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1";

function ExpForm({ data, onChange, onSave, onCancel }) {
  const canSave = data.company.trim() && data.role.trim();
  return (
    <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS}>Company *</label>
          <input value={data.company} onChange={e => onChange({ ...data, company: e.target.value })} className={INPUT_CLS} placeholder="Acme Corp" />
        </div>
        <div>
          <label className={LABEL_CLS}>Job Title *</label>
          <input value={data.role} onChange={e => onChange({ ...data, role: e.target.value })} className={INPUT_CLS} placeholder="Software Engineer" />
        </div>
        <div>
          <label className={LABEL_CLS}>Location</label>
          <input value={data.location} onChange={e => onChange({ ...data, location: e.target.value })} className={INPUT_CLS} placeholder="Nairobi, Kenya · Remote" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={LABEL_CLS}>Start</label>
            <input value={data.start} onChange={e => onChange({ ...data, start: e.target.value })} className={INPUT_CLS} placeholder="Jan 2022" />
          </div>
          <div>
            <label className={LABEL_CLS}>End</label>
            <input
              value={data.current ? "Present" : data.end}
              onChange={e => onChange({ ...data, end: e.target.value, current: false })}
              disabled={data.current}
              className={`${INPUT_CLS} disabled:opacity-50`}
              placeholder="Jun 2024"
            />
          </div>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={data.current} onChange={e => onChange({ ...data, current: e.target.checked, end: "" })} className="rounded border-gray-300" />
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">I currently work here</span>
      </label>
      <div>
        <label className={LABEL_CLS}>Description</label>
        <textarea
          value={data.description}
          onChange={e => onChange({ ...data, description: e.target.value })}
          rows={4}
          className={`${INPUT_CLS} resize-none`}
          placeholder={"• Built and shipped X feature that improved Y by Z%\n• Led a team of N engineers to deliver…\n• Reduced load time by 40% through…"}
        />
        <p className="text-[10px] text-gray-400 mt-1">Start each line with • to render as a bullet point</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={!canSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all">
          Save
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">
          Cancel
        </button>
      </div>
    </div>
  );
}

function EduForm({ data, onChange, onSave, onCancel }) {
  const canSave = data.school.trim() && data.degree.trim();
  return (
    <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS}>School / University *</label>
          <input value={data.school} onChange={e => onChange({ ...data, school: e.target.value })} className={INPUT_CLS} placeholder="African Leadership University" />
        </div>
        <div>
          <label className={LABEL_CLS}>Degree *</label>
          <input value={data.degree} onChange={e => onChange({ ...data, degree: e.target.value })} className={INPUT_CLS} placeholder="BSc Computer Science" />
        </div>
        <div>
          <label className={LABEL_CLS}>Field of Study</label>
          <input value={data.field} onChange={e => onChange({ ...data, field: e.target.value })} className={INPUT_CLS} placeholder="Software Engineering" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={LABEL_CLS}>From</label>
            <input value={data.start} onChange={e => onChange({ ...data, start: e.target.value })} className={INPUT_CLS} placeholder="2020" />
          </div>
          <div>
            <label className={LABEL_CLS}>To</label>
            <input value={data.current ? "Present" : data.end} onChange={e => onChange({ ...data, end: e.target.value, current: false })} disabled={data.current} className={`${INPUT_CLS} disabled:opacity-50`} placeholder="2024" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={data.current} onChange={e => onChange({ ...data, current: e.target.checked, end: "" })} className="rounded border-gray-300" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Currently enrolled</span>
        </label>
        <div className="flex items-center gap-2">
          <label className={`${LABEL_CLS} mb-0`}>GPA</label>
          <input value={data.gpa} onChange={e => onChange({ ...data, gpa: e.target.value })} className="w-24 px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="3.8/4.0" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={!canSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all">
          Save
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ResumeContent() {
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [resumeData, setResumeData] = useState(EMPTY_RESUME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [expanded, setExpanded] = useState({
    summary: true, experience: true, education: true, skills: false, visibility: false,
  });

  const [editingExp, setEditingExp] = useState(null);
  const [expForm, setExpForm] = useState(EMPTY_EXP);
  const [editingEdu, setEditingEdu] = useState(null);
  const [eduForm, setEduForm] = useState(EMPTY_EDU);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (p) {
        setProfile(p);
        if (p.resume_data && typeof p.resume_data === "object") {
          setResumeData(prev => ({ ...prev, ...p.resume_data }));
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const update = (patch) => { setResumeData(prev => ({ ...prev, ...patch })); setDirty(true); };
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ resume_data: resumeData }).eq("id", userId);
    if (error) {
      if (error.message?.includes("resume_data") || error.code === "PGRST204" || error.code === "42703") {
        setNeedsSetup(true);
      }
    } else {
      setSaved(true);
      setDirty(false);
      setNeedsSetup(false);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  const copyLink = () => {
    if (!profile) return;
    navigator.clipboard.writeText(`${window.location.origin}/resume/${profile.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Work Experience CRUD ---
  const commitExp = () => {
    if (!expForm.company.trim() || !expForm.role.trim()) return;
    if (editingExp === "new") {
      update({ work_experience: [...resumeData.work_experience, { ...expForm, id: genId() }] });
    } else {
      update({ work_experience: resumeData.work_experience.map(e => e.id === editingExp ? { ...expForm, id: editingExp } : e) });
    }
    setEditingExp(null); setExpForm(EMPTY_EXP);
  };
  const deleteExp = (id) => update({ work_experience: resumeData.work_experience.filter(e => e.id !== id) });
  const openExpEdit = (exp) => { setEditingExp(exp.id); setExpForm({ ...EMPTY_EXP, ...exp }); setEditingEdu(null); };
  const openNewExp = () => { setEditingExp("new"); setExpForm(EMPTY_EXP); setEditingEdu(null); };
  const cancelExp = () => { setEditingExp(null); setExpForm(EMPTY_EXP); };

  // --- Education CRUD ---
  const commitEdu = () => {
    if (!eduForm.school.trim() || !eduForm.degree.trim()) return;
    if (editingEdu === "new") {
      update({ education: [...resumeData.education, { ...eduForm, id: genId() }] });
    } else {
      update({ education: resumeData.education.map(e => e.id === editingEdu ? { ...eduForm, id: editingEdu } : e) });
    }
    setEditingEdu(null); setEduForm(EMPTY_EDU);
  };
  const deleteEdu = (id) => update({ education: resumeData.education.filter(e => e.id !== id) });
  const openEduEdit = (edu) => { setEditingEdu(edu.id); setEduForm({ ...EMPTY_EDU, ...edu }); setEditingExp(null); };
  const openNewEdu = () => { setEditingEdu("new"); setEduForm(EMPTY_EDU); setEditingExp(null); };
  const cancelEdu = () => { setEditingEdu(null); setEduForm(EMPTY_EDU); };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FileText size={40} className="text-gray-300 dark:text-gray-700 mb-4" />
        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Sign in to build your resume.</p>
      </div>
    );
  }

  const skills = Array.isArray(profile?.skills)
    ? profile.skills.filter(Boolean)
    : (profile?.skills ? String(profile.skills).split(",").map(s => s.trim()).filter(Boolean) : []);

  const resumeUrl = profile ? `/resume/${profile.username}` : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Resume Builder</h1>
          {profile && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
              /resume/{profile.username}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={copyLink}
            disabled={!profile}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
          {resumeUrl && (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              <ExternalLink size={12} /> Preview
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm disabled:opacity-60 ${dirty ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : null}
            {saving ? "Saving…" : saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Setup banner */}
      {needsSetup && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-100 mb-1">One-time database setup required</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mb-2.5">Run this once in your Supabase SQL Editor, then click Save again:</p>
              <code className="block text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 p-2.5 rounded-lg font-mono break-all select-all">
                ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resume_data JSONB DEFAULT &apos;{}&apos;;
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Profile snapshot (read-only) */}
      {profile && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">From Your Profile</span>
            <a href="/dash/profile" className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:underline">
              Edit Profile →
            </a>
          </div>
          <p className="font-black text-sm text-gray-900 dark:text-gray-100">{profile.full_name || `@${profile.username}`}</p>
          {profile.status && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{profile.status}</p>}
          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            {profile.location && <span>{profile.location}</span>}
            {profile.github && <span>{profile.github.replace(/^https?:\/\//, "")}</span>}
            {profile.website && <span>{profile.website.replace(/^https?:\/\//, "")}</span>}
          </div>
        </div>
      )}

      {/* Summary */}
      <CollapsibleSection title="Professional Summary" icon={FileText} expanded={expanded.summary} onToggle={() => toggle("summary")}>
        <textarea
          value={resumeData.summary}
          onChange={e => update({ summary: e.target.value })}
          rows={4}
          maxLength={600}
          className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
          placeholder="Write 2–4 sentences highlighting your experience, core strengths, and what you're looking for next…"
        />
        <p className="text-[11px] text-gray-400 mt-1.5 text-right">{resumeData.summary.length}/600</p>
      </CollapsibleSection>

      {/* Work Experience */}
      <CollapsibleSection title="Work Experience" icon={Briefcase} expanded={expanded.experience} onToggle={() => toggle("experience")}>
        <div className="space-y-3">
          {resumeData.work_experience.map(exp => (
            <div key={exp.id}>
              {editingExp === exp.id ? (
                <ExpForm data={expForm} onChange={setExpForm} onSave={commitExp} onCancel={cancelExp} />
              ) : (
                <div className="flex items-start gap-3 p-3 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{exp.role}</span>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">{exp.company}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {exp.start}{(exp.start && (exp.end || exp.current)) ? " – " : ""}{exp.current ? "Present" : exp.end}
                      {exp.location ? ` · ${exp.location}` : ""}
                    </p>
                    {exp.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{exp.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openExpEdit(exp)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => deleteExp(exp.id)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {editingExp === "new" ? (
            <ExpForm data={expForm} onChange={setExpForm} onSave={commitExp} onCancel={cancelExp} />
          ) : (
            <button
              onClick={openNewExp}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              <Plus size={13} /> Add Position
            </button>
          )}
        </div>
      </CollapsibleSection>

      {/* Education */}
      <CollapsibleSection title="Education" icon={GraduationCap} expanded={expanded.education} onToggle={() => toggle("education")}>
        <div className="space-y-3">
          {resumeData.education.map(edu => (
            <div key={edu.id}>
              {editingEdu === edu.id ? (
                <EduForm data={eduForm} onChange={setEduForm} onSave={commitEdu} onCancel={cancelEdu} />
              ) : (
                <div className="flex items-start gap-3 p-3 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {edu.degree}{edu.field ? ` · ${edu.field}` : ""}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {edu.school}{(edu.start || edu.end || edu.current) ? ` · ${edu.start}${edu.start && (edu.end || edu.current) ? " – " : ""}${edu.current ? "Present" : edu.end}` : ""}
                      {edu.gpa ? ` · GPA ${edu.gpa}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEduEdit(edu)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => deleteEdu(edu.id)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {editingEdu === "new" ? (
            <EduForm data={eduForm} onChange={setEduForm} onSave={commitEdu} onCancel={cancelEdu} />
          ) : (
            <button
              onClick={openNewEdu}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              <Plus size={13} /> Add Education
            </button>
          )}
        </div>
      </CollapsibleSection>

      {/* Skills (read from profile) */}
      <CollapsibleSection title="Skills" icon={Code2} expanded={expanded.skills} onToggle={() => toggle("skills")}>
        {skills.length > 0 ? (
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {skills.map(skill => (
                <span key={skill} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg">
                  {skill}
                </span>
              ))}
            </div>
            <a href="/dash/profile" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Manage skills in your profile →
            </a>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No skills on your profile yet.</p>
            <a href="/dash/profile" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Add skills to your profile →
            </a>
          </div>
        )}
      </CollapsibleSection>

      {/* Resume Sections visibility */}
      <CollapsibleSection title="Resume Sections" icon={Eye} expanded={expanded.visibility} onToggle={() => toggle("visibility")}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Toggle which auto-generated sections appear on your public resume.
        </p>
        <div className="space-y-3">
          {[
            { key: "show_certs",    label: "Certifications",    desc: "Courses completed on the platform" },
            { key: "show_projects", label: "Projects",          desc: "Public projects from your portfolio" },
            { key: "show_posts",    label: "Technical Writing", desc: "Recent posts you published" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{label}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
              <Toggle checked={!!resumeData[key]} onChange={() => update({ [key]: !resumeData[key] })} />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Save reminder */}
      {dirty && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl px-4 py-3">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">You have unsaved changes.</p>
          <button onClick={handleSave} disabled={saving} className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50">
            {saving ? "Saving…" : "Save now →"}
          </button>
        </div>
      )}
    </div>
  );
}
