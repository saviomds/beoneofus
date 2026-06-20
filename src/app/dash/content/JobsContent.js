"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Briefcase, Search, MapPin, Clock, DollarSign, Building2,
  BookmarkPlus, Bookmark, Send, X, ChevronDown, Loader2,
  CheckCircle2, AlertTriangle, Filter, Star, Zap, ArrowRight,
  Globe, Users, Calendar, BadgeCheck, FileText, Plus, Eye,
  ChevronRight, TrendingUp, Heart, MoreHorizontal, ExternalLink,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import VerifiedBadge from "../../components/VerifiedBadge";

const JOB_TYPES = ["All", "Full-time", "Part-time", "Contract", "Freelance", "Internship"];
const LEVELS = ["All", "Entry", "Mid", "Senior", "Lead", "Executive"];

const SAMPLE_JOBS = [
  {
    id: "j1", title: "Senior Frontend Engineer", company: "TechFlow", company_verified: true,
    location: "Remote", type: "Full-time", level: "Senior", salary: "$120k–$160k/yr",
    skills: ["React", "TypeScript", "Next.js"], posted_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    description: "We're looking for an experienced frontend engineer to join our product team and help us build a world-class developer experience platform.",
    requirements: ["5+ years React experience", "Strong TypeScript skills", "Experience with Next.js", "Remote-first mindset"],
    logo: null, featured: true, applicants: 23, views: 312,
  },
  {
    id: "j2", title: "Product Designer", company: "Designify", company_verified: false,
    location: "Lagos, NG", type: "Full-time", level: "Mid", salary: "$60k–$80k/yr",
    skills: ["Figma", "UI/UX", "Prototyping"], posted_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    description: "Join Designify as a Product Designer and shape the future of our flagship SaaS product.",
    requirements: ["3+ years product design", "Proficient in Figma", "Strong design system skills", "Portfolio required"],
    logo: null, featured: false, applicants: 11, views: 189,
  },
  {
    id: "j3", title: "Backend Engineer (Python)", company: "DataBridge", company_verified: true,
    location: "Remote", type: "Contract", level: "Mid", salary: "$80–$110/hr",
    skills: ["Python", "FastAPI", "PostgreSQL", "AWS"], posted_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    description: "DataBridge is seeking a backend engineer to help us scale our data pipeline infrastructure.",
    requirements: ["Python 3.x mastery", "FastAPI or Django REST", "Database design (PostgreSQL)", "AWS experience"],
    logo: null, featured: false, applicants: 6, views: 97,
  },
  {
    id: "j4", title: "DevOps / Platform Engineer", company: "CloudStack", company_verified: true,
    location: "Nairobi, KE", type: "Full-time", level: "Senior", salary: "$100k–$130k/yr",
    skills: ["Kubernetes", "Terraform", "CI/CD", "Docker"], posted_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    description: "Help us build and maintain the infrastructure that powers millions of developers.",
    requirements: ["Kubernetes in production", "Terraform IaC", "CI/CD pipelines", "Linux systems expertise"],
    logo: null, featured: true, applicants: 18, views: 445,
  },
  {
    id: "j5", title: "Mobile Engineer (React Native)", company: "AppWorks", company_verified: false,
    location: "Remote", type: "Full-time", level: "Mid", salary: "$90k–$120k/yr",
    skills: ["React Native", "TypeScript", "iOS", "Android"], posted_at: new Date(Date.now() - 3600000 * 96).toISOString(),
    description: "Build beautiful cross-platform mobile apps that delight millions of users.",
    requirements: ["React Native experience", "Published apps preferred", "TypeScript knowledge", "API integration experience"],
    logo: null, featured: false, applicants: 34, views: 521,
  },
  {
    id: "j6", title: "AI / ML Engineer", company: "Synapse AI", company_verified: true,
    location: "Remote", type: "Full-time", level: "Senior", salary: "$140k–$180k/yr",
    skills: ["Python", "PyTorch", "LLMs", "MLOps"], posted_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    description: "Join our research team to push the boundaries of what AI can do in production environments.",
    requirements: ["Masters or PhD in CS/ML", "PyTorch or TensorFlow", "LLM fine-tuning experience", "MLOps knowledge"],
    logo: null, featured: true, applicants: 7, views: 203,
  },
];

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function JobCard({ job, saved, onSave, onView, onApply }) {
  const initials = job.company.substring(0, 2).toUpperCase();
  return (
    <div
      onClick={() => onView(job)}
      className={`group bg-white dark:bg-gray-900 border rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 ${
        job.featured
          ? "border-blue-200 dark:border-blue-800/50 ring-1 ring-blue-500/10"
          : "border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Logo */}
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md shadow-blue-500/20">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {job.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{job.company}</span>
                {job.company_verified && <BadgeCheck size={12} className="text-blue-500 shrink-0" />}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onSave(job.id); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            >
              {saved ? <Bookmark size={14} className="text-blue-600 fill-blue-600" /> : <BookmarkPlus size={14} className="text-gray-400" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <MapPin size={10} /> {job.location}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <DollarSign size={10} /> {job.salary}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <Clock size={10} /> {timeAgo(job.posted_at)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
              {job.type}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {job.level}
            </span>
            {job.featured && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Zap size={9} /> Featured
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {job.skills.slice(0, 3).map((s) => (
              <span key={s} className="text-[10px] bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full">
                {s}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {job.applicants} applicants · {job.views} views
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onApply(job); }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
            >
              Apply <ArrowRight size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplyModal({ job, profile, onClose, onSubmit, submitting, submitted }) {
  const [coverLetter, setCoverLetter] = useState("");
  const [linkedin, setLinkedin] = useState(profile?.website || "");
  const [portfolio, setPortfolio] = useState(profile?.github ? `https://github.com/${profile.github}` : "");

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 dark:border-gray-800 text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2">Application Sent!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Your application for <strong>{job.title}</strong> at <strong>{job.company}</strong> has been submitted. You'll receive updates here and via email.
          </p>
          <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition-all">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-800 overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-900 dark:text-gray-100 text-base">Apply to {job.company}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{job.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Profile Preview */}
          {profile && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/40">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(profile.full_name || profile.username || "?").substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{profile.full_name || profile.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Applying with your beoneofus profile</p>
              </div>
              <CheckCircle2 size={16} className="text-blue-500 ml-auto shrink-0" />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Cover Letter <span className="text-gray-400">(optional)</span></label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Tell them why you're the perfect fit..."
              rows={4}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">LinkedIn / Portfolio URL <span className="text-gray-400">(optional)</span></label>
            <input
              type="url"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              placeholder="https://github.com/you or https://yourportfolio.com"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-xs text-gray-500 dark:text-gray-400">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            Your beoneofus profile (skills, work status, bio, and portfolio links) will be shared with the employer.
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ coverLetter, portfolio })}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95"
          >
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Submit Application</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function JobDetailDrawer({ job, saved, onSave, onApply, onClose }) {
  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-lg h-full overflow-y-auto border-l border-gray-200 dark:border-gray-800 shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between z-10">
          <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm">Job Details</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md">
              {job.company.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-gray-900 dark:text-gray-100 text-lg leading-tight">{job.title}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">{job.company}</span>
                {job.company_verified && <BadgeCheck size={14} className="text-blue-500" />}
              </div>
            </div>
            <button onClick={() => onSave(job.id)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              {saved ? <Bookmark size={18} className="text-blue-600 fill-blue-600" /> : <BookmarkPlus size={18} className="text-gray-400" />}
            </button>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: MapPin, label: job.location },
              { icon: Briefcase, label: job.type },
              { icon: TrendingUp, label: job.level },
              { icon: DollarSign, label: job.salary },
              { icon: Clock, label: timeAgo(job.posted_at) },
              { icon: Users, label: `${job.applicants} applicants` },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Icon size={14} className="text-blue-500 shrink-0" /> {label}
              </div>
            ))}
          </div>

          {/* Skills */}
          <div>
            <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Required Skills</h4>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((s) => (
                <span key={s} className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">About the Role</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{job.description}</p>
          </div>

          {/* Requirements */}
          <div>
            <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Requirements</h4>
            <ul className="space-y-2">
              {job.requirements.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => onApply(job)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-blue-500/20"
          >
            <Send size={15} /> Apply for this Position
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobsContent() {
  const [jobs] = useState(SAMPLE_JOBS);
  const [profile, setProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("browse"); // browse | saved | applied
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyingJob, setApplyingJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUserId(session.user.id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("username, full_name, status, skills, avatar_url, github, website")
        .eq("id", session.user.id)
        .single();
      if (prof) setProfile(prof);
    };
    load();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = (jobId) => {
    setSavedJobs((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const handleApply = async (job, { coverLetter, portfolio }) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setAppliedJobs((prev) => [...prev, job.id]);
    setSubmitting(false);
    setSubmitted(true);
  };

  const filtered = jobs.filter((j) => {
    const q = searchQuery.toLowerCase();
    if (q && !(
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.skills.some((s) => s.toLowerCase().includes(q))
    )) return false;
    if (typeFilter !== "All" && j.type !== typeFilter) return false;
    if (levelFilter !== "All" && j.level !== levelFilter) return false;
    return true;
  });

  const displayJobs =
    activeTab === "saved" ? jobs.filter((j) => savedJobs.includes(j.id)) :
    activeTab === "applied" ? jobs.filter((j) => appliedJobs.includes(j.id)) :
    filtered;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25">
            <Briefcase size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Jobs</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Apply directly with your beoneofus profile</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-5 w-fit">
        {[
          { id: "browse", label: "Browse Jobs" },
          { id: "saved", label: `Saved (${savedJobs.length})` },
          { id: "applied", label: `Applied (${appliedJobs.length})` },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === id
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "browse" && (
        <>
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs, companies, skills…"
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-gray-900 dark:text-gray-100"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 transition-all"
            >
              {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 transition-all"
            >
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            <strong className="text-gray-900 dark:text-gray-100">{filtered.length}</strong> positions found
          </p>
        </>
      )}

      {/* Job list */}
      <div className="space-y-3">
        {displayJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Briefcase size={24} className="text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
              {activeTab === "saved" ? "No saved jobs yet" : activeTab === "applied" ? "No applications yet" : "No jobs found"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeTab === "saved" ? "Bookmark jobs to save them here." : activeTab === "applied" ? "Apply to jobs to track them here." : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          displayJobs.map((job) => (
            <div key={job.id} className="relative">
              {appliedJobs.includes(job.id) && (
                <div className="absolute top-2 right-12 z-10">
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={9} /> Applied
                  </span>
                </div>
              )}
              <JobCard
                job={job}
                saved={savedJobs.includes(job.id)}
                onSave={handleSave}
                onView={setSelectedJob}
                onApply={(j) => { setApplyingJob(j); setSubmitted(false); }}
              />
            </div>
          ))
        )}
      </div>

      {/* Job detail drawer */}
      {selectedJob && (
        <JobDetailDrawer
          job={selectedJob}
          saved={savedJobs.includes(selectedJob.id)}
          onSave={handleSave}
          onApply={(j) => { setApplyingJob(j); setSubmitted(false); }}
          onClose={() => setSelectedJob(null)}
        />
      )}

      {/* Apply modal */}
      {applyingJob && (
        <ApplyModal
          job={applyingJob}
          profile={profile}
          onClose={() => { setApplyingJob(null); setSubmitted(false); }}
          onSubmit={(data) => handleApply(applyingJob, data)}
          submitting={submitting}
          submitted={submitted}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[300] px-4 py-3 rounded-2xl text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
