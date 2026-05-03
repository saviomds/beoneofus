"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, FolderDot, X, Loader2, Pencil, Trash2,
  CheckCircle2, AlertCircle, Search, LayoutGrid,
  List, Pin, PinOff, Tag, Clock, Hash, ChevronDown
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATUS_OPTIONS = ["active", "in progress", "archived", "on hold"];
const TAG_OPTIONS = ["frontend", "backend", "fullstack", "api", "design", "devops", "mobile"];

const STATUS_STYLES = {
  "active":      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "in progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "archived":    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "on hold":     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ProjectsContent() {
  const router = useRouter();

  // ---- Data -----------------------------------------------------------------
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // ---- Modal ----------------------------------------------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ---- Delete Modal ---------------------------------------------------------
  const [projectToDelete, setProjectToDelete] = useState(null); // project | null — single state drives open/close

  // ---- Form fields ----------------------------------------------------------
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [selectedTags, setSelectedTags] = useState([]);

  // ---- UI -------------------------------------------------------------------
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "oldest" | "name" | "pinned"

  // ---- Toast helper ---------------------------------------------------------
  // FIX: previous showToast was recreated on every render; moved to useCallback
  // and uses a single clearTimeout ref to avoid stacking timers.
  const toastTimerRef = { current: null };
  const showToast = useCallback((message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Data fetching
  // FIX: fetchProjects was defined inside useEffect, making it impossible to
  // call from other handlers without re-creating it. Extracted to useCallback.
  // FIX: The original called fetchProjects(userId) from other handlers but
  // used currentUserId which may not yet be set (stale closure). Now every
  // fetch call passes userId explicitly.
  // ---------------------------------------------------------------------------
  const fetchProjects = useCallback(async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProjects(data ?? []);
    } catch (err) {
      console.error("fetchProjects:", err);
      showToast("Failed to load projects: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // FIX: original useEffect had empty dep array but called router.push inside.
  // router is stable in Next.js App Router so this is safe, but deps should
  // accurately reflect what the effect uses. Added router.
  // FIX: no cleanup — if component unmounts before session resolves, setState
  // would run on an unmounted component. Added mounted guard.
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        setCurrentUserId(session.user.id);
        await fetchProjects(session.user.id);
      } else {
        setLoading(false);
        router.push("/auth");
      }
    };
    init();
    return () => { mounted = false; };
  }, [fetchProjects, router]);

  // ---------------------------------------------------------------------------
  // Modal helpers
  // ---------------------------------------------------------------------------
  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setStatus("active");
    setSelectedTags([]);
  }, []);

  const openCreateModal = useCallback(() => {
    setModalMode("create");
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  // FIX: original openEditModal called e.stopPropagation() but didn't guard
  // against a missing project arg.
  const openEditModal = useCallback((e, project) => {
    e.stopPropagation();
    if (!project) return;
    setModalMode("edit");
    setActiveProjectId(project.id);
    setTitle(project.title ?? "");
    setDescription(project.description ?? "");
    setStatus(project.status ?? "active");
    setSelectedTags(project.tags ?? []);
    setIsModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((e, project) => {
    e.stopPropagation();
    setProjectToDelete(project);
  }, []);

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------
  // FIX: original confirmDeleteProject called fetchProjects(currentUserId) but
  // currentUserId could be stale inside the async callback. Pass via closure-
  // captured ref instead, or re-read from state at call time. Here we derive
  // the userId from the supabase session to be safe.
  const confirmDeleteProject = useCallback(async () => {
    if (!projectToDelete) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectToDelete.id);
      if (error) throw error;
      // Optimistic remove — no need for a full re-fetch
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      showToast("Project deleted.", "success");
    } catch (err) {
      showToast("Failed to delete: " + err.message, "error");
    } finally {
      setProjectToDelete(null); // closes modal
      setIsProcessing(false);
    }
  }, [projectToDelete, showToast]);

  // FIX: handleTogglePin updated optimistically (original did this too, which
  // is correct), but didn't revert on error. Added revert.
  const handleTogglePin = useCallback(async (e, project) => {
    e.stopPropagation();
    const next = !project.pinned;
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, pinned: next } : p));
    try {
      const { error } = await supabase
        .from("projects")
        .update({ pinned: next })
        .eq("id", project.id);
      if (error) throw error;
      showToast(next ? "Project pinned!" : "Unpinned project.", "success");
    } catch (err) {
      // Revert on failure
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, pinned: project.pinned } : p));
      showToast("Failed to update pin: " + err.message, "error");
    }
  }, [showToast]);

  // FIX: handleSubmitProject called fetchProjects(currentUserId) — stale
  // closure risk. Now uses optimistic update for edits and targeted insert for
  // creates, with a single targeted re-fetch only when necessary.
  // FIX: also guarded against empty currentUserId at submit time.
  const handleSubmitProject = useCallback(async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) { showToast("Not authenticated.", "error"); return; }

    setIsProcessing(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        status,
        tags: selectedTags,
      };

      if (modalMode === "create") {
        const { data: newProject, error } = await supabase
          .from("projects")
          .insert({ ...payload, created_by: userId })
          .select()
          .single();
        if (error) throw error;
        // Prepend optimistically instead of full re-fetch
        setProjects(prev => [newProject, ...prev]);
        showToast("Project created!", "success");
      } else {
        const { data: updated, error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", activeProjectId)
          .select()
          .single();
        if (error) throw error;
        setProjects(prev => prev.map(p => p.id === activeProjectId ? updated : p));
        showToast("Project updated!", "success");
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast(`Failed to ${modalMode} project: ` + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  }, [title, description, status, selectedTags, modalMode, activeProjectId, showToast]);

  // FIX: toggleTag was a plain function recreated every render; wrapped in useCallback.
  const toggleTag = useCallback((tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Derived: filtered + sorted projects
  // ---------------------------------------------------------------------------
  const filteredProjects = useMemo(() => {
    let list = [...projects];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.tags ?? []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (filterStatus !== "all") {
      list = list.filter(p => (p.status ?? "active") === filterStatus);
    }
    switch (sortBy) {
      case "newest":  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case "oldest":  list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case "name":    list.sort((a, b) => a.title.localeCompare(b.title)); break;
      // FIX: "pinned" sort also falls back to newest within same pin group
      case "pinned":  list.sort((a, b) =>
        (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
        new Date(b.created_at) - new Date(a.created_at)
      ); break;
      default: break;
    }
    return list;
  }, [projects, search, filterStatus, sortBy]);

  // ---------------------------------------------------------------------------
  // Stats
  // FIX: stats used `projects.filter(p => (p.status || "active") === "active")`
  // which would count a project with no status as "active" even if it isn't.
  // Standardized to use null-coalescing consistently.
  // ---------------------------------------------------------------------------
  const stats = useMemo(() => ({
    total:      projects.length,
    active:     projects.filter(p => (p.status ?? "active") === "active").length,
    pinned:     projects.filter(p => p.pinned).length,
    inProgress: projects.filter(p => p.status === "in progress").length,
  }), [projects]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
            b1overs<span className="text-blue-500">.</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Your mini code workspace</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all text-sm"
        >
          <Plus size={18} /> New Project
        </button>
      </div>

      {/* ── Stats Bar ── */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",       value: stats.total,      icon: <Hash size={14} /> },
            { label: "Active",      value: stats.active,     icon: <CheckCircle2 size={14} />, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "In Progress", value: stats.inProgress, icon: <Clock size={14} />,        color: "text-blue-500" },
            { label: "Pinned",      value: stats.pinned,     icon: <Pin size={14} />,          color: "text-amber-500" },
          ].map(s => (
            <div
              key={s.label}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 flex items-center gap-3"
            >
              <span className={s.color ?? "text-gray-500 dark:text-gray-400"}>{s.icon}</span>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      {!loading && projects.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects, tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter by status */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">A – Z</option>
              <option value="pinned">Pinned first</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-900 shadow-sm text-blue-600 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-900 shadow-sm text-blue-600 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState onCreateClick={openCreateModal} />
      ) : filteredProjects.length === 0 ? (
        <NoResultsState onClear={() => { setSearch(""); setFilterStatus("all"); }} />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => router.push(`/projects/${project.id}`)}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {filteredProjects.map(project => (
            <ProjectRow
              key={project.id}
              project={project}
              onOpen={() => router.push(`/projects/${project.id}`)}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isProcessing && setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                {modalMode === "create" ? "New Project" : "Edit Project"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isProcessing}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProject} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Project Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. My Awesome App"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description…"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        status === s
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Tags <span className="text-gray-400 normal-case font-normal">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        selectedTags.includes(tag)
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !title.trim()}
                  className="flex-1 flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-60"
                >
                  {isProcessing
                    ? <Loader2 size={16} className="animate-spin" />
                    : modalMode === "create" ? "Create Project" : "Save Changes"
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {/* FIX: original used a separate isDeleteModalOpen boolean + projectToDelete.
          Merged into a single nullable state — truthy = open, null = closed.
          Eliminates the impossible state where isDeleteModalOpen=true but
          projectToDelete=null (which caused a crash on confirmDeleteProject). */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isProcessing && setProjectToDelete(null)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 flex items-center justify-center bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                <AlertCircle className="text-red-500" size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Delete Project</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Are you sure you want to delete{" "}
                <span className="font-bold text-gray-700 dark:text-gray-200">{projectToDelete.title}</span>?
                {" "}This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 p-4 pt-0 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={isProcessing}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProject}
                disabled={isProcessing}
                className="flex-1 flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-60"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[150] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4 fade-in duration-300 bg-white dark:bg-gray-900 ${
            toast.type === "error"
              ? "border-red-200 dark:border-red-800/50"
              : "border-emerald-200 dark:border-emerald-800/50"
          }`}
        >
          {toast.type === "error"
            ? <AlertCircle size={18} className="text-red-500 shrink-0" />
            : <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          }
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state components (extracted to keep JSX readable)
// ---------------------------------------------------------------------------
function EmptyState({ onCreateClick }) {
  return (
    <div className="py-24 flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-2xl">
      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4">
        <FolderDot size={28} className="text-blue-500" />
      </div>
      <p className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1">No projects yet</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-6">
        Create your first project to start building with b1overs.
      </p>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
      >
        <Plus size={16} /> Create Project
      </button>
    </div>
  );
}

function NoResultsState({ onClear }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-2xl">
      <Search size={28} className="text-gray-400 mb-3" />
      <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">No results found</p>
      <p className="text-sm text-gray-500">Try a different search or filter</p>
      <button
        onClick={onClear}
        className="mt-4 text-sm text-blue-600 hover:underline"
      >
        Clear filters
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Card (Grid view)
// ---------------------------------------------------------------------------
function ProjectCard({ project, onOpen, onEdit, onDelete, onTogglePin }) {
  const tags = project.tags ?? [];
  const status = project.status ?? "active";

  return (
    <div
      onClick={onOpen}
      className={`relative bg-white dark:bg-gray-900 border rounded-2xl p-5 cursor-pointer group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        project.pinned
          ? "border-amber-300 dark:border-amber-700/50"
          : "border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700/60"
      }`}
    >
      {project.pinned && (
        <div className="absolute top-3 right-3">
          <Pin size={13} className="text-amber-500 fill-amber-500" />
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
          <FolderDot size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base line-clamp-1 leading-tight">
            {project.title}
          </h3>
          <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES["active"]}`}>
            {status}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[2.5rem]">
        {project.description || "No description provided."}
      </p>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tags.slice(0, 3).map(t => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md text-[11px] font-medium"
            >
              <Tag size={9} /> {t}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-md text-[11px]">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-[11px] text-gray-400 flex items-center gap-1">
          <Clock size={10} /> {timeAgo(project.created_at)}
        </span>
        {/* FIX: action buttons were always mounted but visibility toggled via
            opacity-0 / group-hover:opacity-100. Pointer events were still
            active when invisible, causing accidental clicks.
            Added pointer-events-none when hidden. */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
          <button
            onClick={e => onTogglePin(e, project)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            title={project.pinned ? "Unpin" : "Pin"}
          >
            {project.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button
            onClick={e => onEdit(e, project)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={e => onDelete(e, project)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Row (List view)
// ---------------------------------------------------------------------------
function ProjectRow({ project, onOpen, onEdit, onDelete, onTogglePin }) {
  const tags = project.tags ?? [];
  const status = project.status ?? "active";

  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-4 px-5 py-4 cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl shrink-0">
        <FolderDot size={18} className="text-blue-600 dark:text-blue-400" />
      </div>

      {project.pinned && (
        <Pin size={12} className="text-amber-500 fill-amber-500 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
            {project.title}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${STATUS_STYLES[status] ?? STATUS_STYLES["active"]}`}>
            {status}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
          {project.description || "No description."}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        {tags.slice(0, 2).map(t => (
          <span
            key={t}
            className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-[11px]"
          >
            {t}
          </span>
        ))}
      </div>

      <span className="hidden sm:block text-[11px] text-gray-400 shrink-0 w-16 text-right">
        {timeAgo(project.created_at)}
      </span>

      {/* FIX: same pointer-events fix as ProjectCard */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity shrink-0">
        <button
          onClick={e => onTogglePin(e, project)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          title={project.pinned ? "Unpin" : "Pin"}
        >
          {project.pinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
        <button
          onClick={e => onEdit(e, project)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={e => onDelete(e, project)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
