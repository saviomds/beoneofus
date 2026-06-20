"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Briefcase, Search, Plus, MoreVertical, Eye, Edit2, Copy,
  Trash2, X, MapPin, Calendar, Users, Loader2, CheckCircle2,
  Upload, Tag, DollarSign, SlidersHorizontal, FileText,
  Send, Zap, XCircle, Building2, RefreshCw, ImagePlus,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

// ─── Constants ───────────────────────────────────────────────────────────────

const JOB_TYPES   = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];
const DEPARTMENTS  = ["Engineering", "Design", "Marketing", "Sales", "Infrastructure", "Research", "Operations", "HR", "Finance", "Legal"];
const EXP_LEVELS   = ["Entry-level", "Mid-level", "Senior-level", "Lead", "Executive"];
const STATUS_FILTERS = ["active", "draft", "expired", "closed"];

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:  { label: "Active",  dot: "bg-emerald-500", cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40" },
  draft:   { label: "Draft",   dot: "bg-gray-400",    cls: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
  expired: { label: "Expired", dot: "bg-orange-500",  cls: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/40" },
  closed:  { label: "Closed",  dot: "bg-gray-600",    cls: "bg-gray-800 text-gray-100 border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Action Menu ──────────────────────────────────────────────────────────────

function ActionMenu({ job, onView, onEdit, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const items = [
    { label: "View job",  icon: Eye,    fn: () => { onView(job);      setOpen(false); } },
    { label: "Edit job",  icon: Edit2,  fn: () => { onEdit(job);      setOpen(false); } },
    { label: "Duplicate", icon: Copy,   fn: () => { onDuplicate(job); setOpen(false); } },
    { label: "Delete",    icon: Trash2, fn: () => { onDelete(job);    setOpen(false); }, danger: true },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl shadow-black/10 py-1 animate-in zoom-in-95 fade-in duration-100 origin-top-right">
          {items.map(({ label, icon: Icon, fn, danger }) => (
            <button
              key={label}
              onClick={fn}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                danger ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                       : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      {Array.from({ length: 11 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" style={{ width: `${45 + (i * 17) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Form helpers (module-level — never redefined on re-render) ───────────────

function FormField({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inpCls(err) {
  return `w-full bg-gray-50 dark:bg-gray-800/60 border ${
    err ? "border-red-400" : "border-gray-200 dark:border-gray-700"
  } rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-gray-400`;
}

// ─── Job Form Modal ───────────────────────────────────────────────────────────

function JobFormModal({ job = null, onClose, onSave }) {
  const isEdit = !!job;
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title:            job?.title || "",
    company:          job?.company || "",
    department:       job?.department || "",
    type:             job?.type || "Full-time",
    location:         job?.location || "",
    salary:           job?.salary || "",
    description:      job?.description || "",
    requirements:     (job?.requirements || []).join("\n"),
    skills:           (job?.skills || job?.tags || []).join(", "),
    experience_level: job?.experience_level || "Mid-level",
    status:           job?.status || "draft",
    image_url:        job?.image_url || "",
  });
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState({});
  const [imgUploading, setImgUploading] = useState(false);
  const [imgPreview, setImgPreview]   = useState(job?.image_url || "");

  // Single stable handler — no new function references on each render
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }, []);

  // Compress image to max 900px wide, 0.82 JPEG quality → typically < 150 KB
  const compressImage = useCallback((file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const blobUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        const MAX_W = 900;
        const scale = img.width > MAX_W ? MAX_W / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
      img.src = blobUrl;
    });
  }, []);

  // Upload image directly to Supabase Storage
  const handleImagePick = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "Only image files are allowed" }));
      return;
    }

    setErrors((prev) => ({ ...prev, image: undefined }));
    setImgUploading(true);

    // Show local preview instantly while compressing + uploading in background
    const localUrl = URL.createObjectURL(file);
    setImgPreview(localUrl);

    try {
      // Compress before upload — turns a 5 MB photo into ~100–200 KB
      const compressed = await compressImage(file);
      const path = `job-images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

      const { error: upErr } = await supabase.storage
        .from("job-images")
        .upload(path, compressed, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });

      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("job-images").getPublicUrl(path);
      setImgPreview(publicUrl);
      setForm((f) => ({ ...f, image_url: publicUrl }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, image: err.message || "Upload failed" }));
      setImgPreview(job?.image_url || "");
    } finally {
      URL.revokeObjectURL(localUrl);
      setImgUploading(false);
    }
  }, [job?.image_url, compressImage]);

  const removeImage = useCallback(() => {
    setImgPreview("");
    setForm((f) => ({ ...f, image_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const validate = useCallback(() => {
    const e = {};
    if (!form.title.trim())    e.title    = "Required";
    if (!form.company.trim())  e.company  = "Required";
    if (!form.location.trim()) e.location = "Required";
    setErrors((prev) => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
  }, [form.title, form.company, form.location]);

  const handleSave = useCallback(async (publishNow = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        title:            form.title,
        company:          form.company,
        department:       form.department,
        type:             form.type,
        location:         form.location,
        salary:           form.salary,
        description:      form.description,
        requirements:     form.requirements.split("\n").map((r) => r.trim()).filter(Boolean),
        skills:           form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        experience_level: form.experience_level,
        image_url:        form.image_url || null,
        status:           publishNow ? "active" : form.status,
      };

      const res = await fetch(
        isEdit ? `/api/jobs/manage?id=${job.id}` : "/api/jobs/manage",
        { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      onSave({
        ...data.job,
        applicants:  job?.applicants  ?? data.job.applicants  ?? 0,
        shortlisted: job?.shortlisted ?? data.job.shortlisted ?? 0,
        rejected:    job?.rejected    ?? data.job.rejected    ?? 0,
        posted_by:   job?.posted_by   ?? data.job.posted_by   ?? "You",
      });
      onClose();
    } catch (err) {
      setErrors((prev) => ({ ...prev, _api: err.message }));
    } finally {
      setSaving(false);
    }
  }, [form, isEdit, job, validate, onSave, onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-3 py-4">
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[94vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <Briefcase size={14} className="text-white" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 dark:text-gray-100 text-base">
                {isEdit ? "Edit Job" : "Create New Job"}
              </h2>
              <p className="text-xs text-gray-400">Fill in the details below</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {errors._api && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl text-sm text-red-700 dark:text-red-400">
              <XCircle size={14} className="shrink-0" /> {errors._api}
            </div>
          )}

          {/* ── Cover image upload ── */}
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Job / Company Image</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />
            {imgPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgPreview} alt="Job cover" className="w-full h-36 object-cover" />
                {imgUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 text-white text-xs font-semibold">
                    <Loader2 size={14} className="animate-spin" /> Uploading…
                  </div>
                )}
                {!imgUploading && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ImagePlus size={12} /> Change
                    </button>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-500 transition-colors"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imgUploading}
                className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 rounded-xl p-6 flex flex-col items-center gap-2 text-gray-400 hover:text-purple-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                {imgUploading
                  ? <><Loader2 size={20} className="animate-spin" /><span className="text-xs">Uploading…</span></>
                  : <><ImagePlus size={20} /><span className="text-sm font-medium">Click to upload cover image</span><span className="text-xs">PNG, JPG, WEBP · max 5 MB</span></>
                }
              </button>
            )}
            {errors.image && <p className="text-xs text-red-500 mt-1">{errors.image}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Job Title" required error={errors.title}>
                <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Senior Frontend Engineer" className={inpCls(errors.title)} />
              </FormField>
            </div>
            <FormField label="Company Name" required error={errors.company}>
              <div className="relative">
                <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input name="company" value={form.company} onChange={handleChange} placeholder="e.g. TechFlow Inc." className={`${inpCls(errors.company)} pl-8`} />
              </div>
            </FormField>
            <FormField label="Department / Category">
              <select name="department" value={form.department} onChange={handleChange} className={inpCls()}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </FormField>
            <FormField label="Employment Type">
              <select name="type" value={form.type} onChange={handleChange} className={inpCls()}>
                {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Experience Level">
              <select name="experience_level" value={form.experience_level} onChange={handleChange} className={inpCls()}>
                {EXP_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </FormField>
            <FormField label="Location" required error={errors.location}>
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input name="location" value={form.location} onChange={handleChange} placeholder="Remote, Nairobi KE…" className={`${inpCls(errors.location)} pl-8`} />
              </div>
            </FormField>
            <FormField label="Salary Range">
              <div className="relative">
                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input name="salary" value={form.salary} onChange={handleChange} placeholder="$80k–$120k/yr" className={`${inpCls()} pl-8`} />
              </div>
            </FormField>
          </div>

          <FormField label="Job Description">
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe the role, team, and what you're looking for…" rows={4} className={`${inpCls()} resize-none`} />
          </FormField>

          <FormField label="Requirements (one per line)">
            <textarea name="requirements" value={form.requirements} onChange={handleChange} placeholder={"5+ years React experience\nTypeScript proficiency\nRemote-first mindset"} rows={3} className={`${inpCls()} resize-none font-mono text-xs leading-5`} />
          </FormField>

          <FormField label="Skills (comma-separated)">
            <div className="relative">
              <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input name="skills" value={form.skills} onChange={handleChange} placeholder="React, TypeScript, Node.js" className={`${inpCls()} pl-8`} />
            </div>
          </FormField>

          <FormField label="Initial Status">
            <select name="status" value={form.status} onChange={handleChange} className={inpCls()}>
              <option value="draft">Draft — save privately</option>
              <option value="active">Active — visible to all</option>
            </select>
          </FormField>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 shrink-0 bg-gray-50/50 dark:bg-gray-900/30">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || imgUploading}
            className="px-4 py-2.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-all disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || imgUploading}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-purple-500/20"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><Send size={13} /> {isEdit ? "Update Job" : "Publish Job"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Job Drawer ──────────────────────────────────────────────────────────

function JobDetailDrawer({ job, onEdit, onClose }) {
  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-950 w-full max-w-md h-full overflow-y-auto border-l border-gray-200 dark:border-gray-800 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between z-10 shrink-0">
          <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm">Job Details</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(job)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-500 transition-colors"
            >
              <Edit2 size={11} /> Edit
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Cover image */}
          {job.image_url && (
            <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 -mx-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={job.image_url} alt={job.title} className="w-full h-32 object-cover" />
            </div>
          )}

          {/* Hero */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-black text-base shrink-0 shadow-md shadow-purple-500/25">
              {(job.department || job.company || "JB").substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-gray-900 dark:text-gray-100 text-lg leading-tight">{job.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{job.company}{job.department ? ` · ${job.department}` : ""}</p>
              <div className="mt-2"><StatusBadge status={job.status} /></div>
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: MapPin,    v: job.location || "—" },
              { icon: Briefcase, v: job.type || "—" },
              { icon: DollarSign,v: job.salary || "Not specified" },
              { icon: Calendar,  v: formatDate(job.created_at) },
            ].map(({ icon: Icon, v }, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Icon size={13} className="text-purple-500 shrink-0" /> {v}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Applicants",  value: job.applicants,  color: "text-purple-600 dark:text-purple-400" },
              { label: "Views",       value: job.views ?? 0,  color: "text-blue-600 dark:text-blue-400" },
              { label: "Shortlisted", value: job.shortlisted, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Rejected",    value: job.rejected,    color: "text-red-500 dark:text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-800">
                <p className={`text-xl font-black ${color}`}>{value ?? 0}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Skills */}
          {(job.skills || job.tags || []).length > 0 && (
            <div>
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {(job.skills || job.tags || []).map((s) => (
                  <span key={s} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-800/30">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div>
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">About the Role</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{job.description}</p>
            </div>
          )}

          {/* Requirements */}
          {(job.requirements || []).length > 0 && (
            <div>
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Requirements</h4>
              <ul className="space-y-2">
                {job.requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteDialog({ job, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-800 p-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-red-600 dark:text-red-400" />
        </div>
        <h3 className="font-black text-gray-900 dark:text-gray-100 text-base mb-1">Delete Job?</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          "<strong>{job.title}</strong>" will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-bold transition-all"
          >
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────

function MobileJobCard({ job, onView, onEdit, onDuplicate, onDelete }) {
  return (
    <div
      onClick={() => onView(job)}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 hover:shadow-md hover:shadow-purple-500/5 hover:border-purple-200 dark:hover:border-purple-800/50 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md shadow-purple-500/20">
            {(job.department || job.company || "JB").substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{job.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{job.company}{job.department ? ` · ${job.department}` : ""}</p>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <ActionMenu job={job} onView={onView} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <StatusBadge status={job.status} />
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Users size={10} /> {job.applicants}</span>
          <span className="flex items-center gap-1"><MapPin size={10} /> {job.location}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
        <span>Views <b className="text-gray-600 dark:text-gray-300">{job.views ?? 0}</b></span>
        <span>Shortlisted <b className="text-emerald-600">{job.shortlisted}</b></span>
        <span>Rejected <b className="text-red-500">{job.rejected}</b></span>
        <span className="ml-auto">{timeAgo(job.created_at)}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JobsContent() {
  const [jobs, setJobs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState("");
  const [statusFilters, setStatusFilters] = useState([]);
  const [selectedIds, setSelectedIds]     = useState([]);
  const [viewingJob, setViewingJob]   = useState(null);
  const [editingJob, setEditingJob]   = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs/manage");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load jobs");
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Realtime subscription
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("jobs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => fetchJobs())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchJobs]);

  // ── Filtering ────────────────────────────────────────────────────────────

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    if (q && !(
      j.title?.toLowerCase().includes(q) ||
      j.company?.toLowerCase().includes(q) ||
      j.department?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q)
    )) return false;
    if (statusFilters.length && !statusFilters.includes(j.status)) return false;
    return true;
  });

  const toggleStatus = (s) => setStatusFilters((f) => f.includes(s) ? f.filter((x) => x !== s) : [...f, s]);

  const allSelected = filtered.length > 0 && filtered.every((j) => selectedIds.includes(j.id));
  const toggleAll   = () => setSelectedIds(allSelected ? [] : filtered.map((j) => j.id));
  const toggleOne   = (id) => setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  // ── CRUD handlers ────────────────────────────────────────────────────────

  const handleSave = (savedJob) => {
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === savedJob.id);
      return idx >= 0 ? prev.map((j) => j.id === savedJob.id ? savedJob : j) : [savedJob, ...prev];
    });
    showToast(savedJob.status === "active" ? "Job published!" : "Job saved as draft.");
  };

  const handleDuplicate = async (job) => {
    try {
      const res = await fetch("/api/jobs/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:            `${job.title} (Copy)`,
          company:          job.company,
          department:       job.department,
          type:             job.type,
          location:         job.location,
          salary:           job.salary,
          description:      job.description,
          requirements:     job.requirements || [],
          skills:           job.skills || job.tags || [],
          experience_level: job.experience_level,
          external_url:     job.external_url,
          status:           "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to duplicate");
      setJobs((prev) => [data.job, ...prev]);
      showToast("Job duplicated as draft.");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async () => {
    if (!deletingJob) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/manage?id=${deletingJob.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setJobs((prev) => prev.filter((j) => j.id !== deletingJob.id));
      setDeletingJob(null);
      showToast("Job deleted.", "error");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = {
    total:     jobs.length,
    active:    jobs.filter((j) => j.status === "active").length,
    draft:     jobs.filter((j) => j.status === "draft").length,
    applicants: jobs.reduce((a, j) => a + (j.applicants || 0), 0),
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shadow-md shadow-purple-500/25">
            <Briefcase size={17} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Jobs</h1>
              {!loading && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  {stats.total}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {loading ? "Loading…" : `${stats.active} active · ${stats.draft} draft · ${stats.applicants} applicants`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs…"
              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            />
          </div>

          {/* Filter */}
          <button
            onClick={() => setStatusFilters(statusFilters.length ? [] : ["active"])}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
              statusFilters.length
                ? "bg-purple-600 border-purple-600 text-white"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-purple-300"
            }`}
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Filter</span>
            {statusFilters.length > 0 && (
              <span className="w-4 h-4 bg-white/20 rounded-full text-[10px] font-black flex items-center justify-center">{statusFilters.length}</span>
            )}
          </button>

          {/* Create */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-purple-500/20"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Create Job</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* ── Stats Cards ───────────────────────────────────────────────── */}
      <div className="hidden sm:grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Jobs",  value: stats.total,     icon: Briefcase, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
          { label: "Active",      value: stats.active,    icon: Zap,       color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Drafts",      value: stats.draft,     icon: FileText,  color: "text-gray-500",    bg: "bg-gray-100 dark:bg-gray-800" },
          { label: "Applicants",  value: stats.applicants,icon: Users,     color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={15} className={color} />
            </div>
            <div>
              {loading
                ? <div className="h-6 w-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-1" />
                : <p className={`text-xl font-black ${color}`}>{value}</p>
              }
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Chips ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-xs text-gray-400 font-semibold">Status:</span>
        {STATUS_FILTERS.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const active = statusFilters.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                active
                  ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-purple-300"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white/60" : cfg.dot}`} />
              {cfg.label}
              {active && (
                <span
                  onClick={(e) => { e.stopPropagation(); toggleStatus(s); }}
                  className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                >
                  <X size={8} />
                </span>
              )}
            </button>
          );
        })}
        {statusFilters.length > 0 && (
          <button onClick={() => setStatusFilters([])} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors hover:underline ml-1">
            Clear all
          </button>
        )}
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-2xl text-sm text-red-700 dark:text-red-400">
          <XCircle size={16} className="shrink-0" />
          <span>{error}</span>
          <button onClick={fetchJobs} className="ml-auto text-xs font-bold underline">Retry</button>
        </div>
      )}

      {/* ── Desktop Table ─────────────────────────────────────────────── */}
      <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-purple-600" />
                </th>
                {["Job Title", "Department", "Status", "Applicants", "Views", "Shortlisted", "Rejected", "Location", "Created", "Posted By", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Briefcase size={20} className="text-gray-400" />
                      </div>
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {jobs.length === 0 ? "No jobs posted yet" : "No jobs match your filters"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {jobs.length === 0 ? "Create your first job posting to get started." : "Try adjusting your search or filters."}
                      </p>
                      {jobs.length === 0 && (
                        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-500 transition-all mt-1">
                          <Plus size={13} /> Create your first job
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((job) => (
                  <tr
                    key={job.id}
                    className={`border-b border-gray-100 dark:border-gray-800 group hover:bg-purple-50/40 dark:hover:bg-purple-900/10 transition-colors duration-150 ${
                      selectedIds.includes(job.id) ? "bg-purple-50/60 dark:bg-purple-900/15" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3.5 w-10">
                      <input type="checkbox" checked={selectedIds.includes(job.id)} onChange={() => toggleOne(job.id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-purple-600" />
                    </td>
                    {/* Title */}
                    <td className="px-4 py-3.5 min-w-[180px]">
                      <button onClick={() => setViewingJob(job)} className="text-left group/t">
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover/t:text-purple-600 dark:group-hover/t:text-purple-400 transition-colors line-clamp-1">{job.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{job.company} · {job.type}</p>
                      </button>
                    </td>
                    {/* Department */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {job.department || "—"}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3.5"><StatusBadge status={job.status || "active"} /></td>
                    {/* Applicants */}
                    <td className="px-4 py-3.5 text-sm font-semibold text-purple-600 dark:text-purple-400">{job.applicants ?? 0}</td>
                    {/* Views */}
                    <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">{job.views ?? 0}</td>
                    {/* Shortlisted */}
                    <td className="px-4 py-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">{job.shortlisted ?? 0}</td>
                    {/* Rejected */}
                    <td className="px-4 py-3.5 text-sm font-medium text-red-500 dark:text-red-400">{job.rejected ?? 0}</td>
                    {/* Location */}
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        <MapPin size={10} className="shrink-0" /> {job.location || "—"}
                      </span>
                    </td>
                    {/* Created */}
                    <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(job.created_at)}</td>
                    {/* Posted By */}
                    <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{job.posted_by || "You"}</td>
                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <ActionMenu
                        job={job}
                        onView={setViewingJob}
                        onEdit={(j) => setEditingJob(j)}
                        onDuplicate={handleDuplicate}
                        onDelete={setDeletingJob}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
            <span className="text-xs text-gray-400">
              {selectedIds.length > 0 ? `${selectedIds.length} selected · ` : ""}{filtered.length} job{filtered.length !== 1 ? "s" : ""}
            </span>
            {selectedIds.length > 0 && (
              <button onClick={() => setSelectedIds([])} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Clear selection
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile Cards ──────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Briefcase size={20} className="text-gray-400" />
            </div>
            <p className="font-bold text-gray-900 dark:text-gray-100">
              {jobs.length === 0 ? "No jobs posted yet" : "No jobs match your filters"}
            </p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {jobs.length === 0 ? "Create your first job posting." : "Try adjusting your search or filters."}
            </p>
            {jobs.length === 0 && (
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-500 transition-all">
                <Plus size={13} /> Create first job
              </button>
            )}
          </div>
        ) : (
          filtered.map((job) => (
            <MobileJobCard
              key={job.id}
              job={job}
              onView={setViewingJob}
              onEdit={(j) => setEditingJob(j)}
              onDuplicate={handleDuplicate}
              onDelete={setDeletingJob}
            />
          ))
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}

      {showCreate && (
        <JobFormModal onClose={() => setShowCreate(false)} onSave={handleSave} />
      )}

      {editingJob && (
        <JobFormModal job={editingJob} onClose={() => setEditingJob(null)} onSave={handleSave} />
      )}

      {viewingJob && (
        <JobDetailDrawer
          job={viewingJob}
          onEdit={(j) => { setViewingJob(null); setEditingJob(j); }}
          onClose={() => setViewingJob(null)}
        />
      )}

      {deletingJob && (
        <DeleteDialog
          job={deletingJob}
          onConfirm={handleDelete}
          onCancel={() => setDeletingJob(null)}
          deleting={deleting}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-4 duration-300 whitespace-nowrap ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
        }`}>
          {toast.type === "error" ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
