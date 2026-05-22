"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Terminal, ArrowLeft, Search, Code2, Filter, Globe, Lock,
  Loader2, X, AlertTriangle, CheckCircle2, Plus, FolderGit2,
  Users, Clock, TrendingUp, Zap,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import dynamic from "next/dynamic";

const ProjectWorkspace = dynamic(
  () => import("../dash/content/explore/ProjectWorkspace"),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    ),
  }
);
const FloatingAiAssistant = dynamic(
  () => import("../components/FloatingAiAssistant"),
  { ssr: false }
);

// ── constants ──────────────────────────────────────────────────────────────

const LANGUAGES = [
  "JavaScript","TypeScript","Python","Rust","Go",
  "C++","Java","Ruby","Swift","Kotlin","Other",
];

const LANG_META = {
  JavaScript: { badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", grad: "from-yellow-400 to-amber-500" },
  TypeScript:  { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",         grad: "from-blue-400 to-blue-600"    },
  Python:      { badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",     grad: "from-green-400 to-emerald-600" },
  Rust:        { badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", grad: "from-orange-400 to-red-500"   },
  Go:          { badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",         grad: "from-cyan-400 to-teal-600"    },
  "C++":       { badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", grad: "from-purple-400 to-violet-600" },
  Java:        { badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",             grad: "from-red-400 to-rose-600"     },
  Ruby:        { badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",         grad: "from-pink-400 to-rose-500"    },
  Swift:       { badge: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", grad: "from-orange-300 to-red-400"   },
  Kotlin:      { badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", grad: "from-violet-400 to-purple-600" },
};

const SORT_OPTIONS = [
  { value: "newest",   label: "Newest First"    },
  { value: "trending", label: "Most Members"   },
];

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── skeleton card ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 animate-pulse">
      <div className="flex items-start justify-between mb-5">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="w-20 h-6 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>
      <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-lg w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mb-1.5" />
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-5/6 mb-6" />
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-20" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-24" />
      </div>
    </div>
  );
}

// ── project card ───────────────────────────────────────────────────────────

function ProjectCard({ project, memberCount, onClick }) {
  const lang    = project.language || project.tags?.[0] || null;
  const meta    = lang ? (LANG_META[lang] ?? null) : null;
  const author  = project.profiles?.username || "community";
  const isNew   = Date.now() - new Date(project.created_at).getTime() < 86_400_000;

  return (
    <div
      onClick={() => onClick(project)}
      className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 hover:border-blue-400/60 dark:hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      {/* Icon + badges */}
      <div className="flex items-start justify-between mb-5">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
          meta ? `bg-gradient-to-br ${meta.grad}` : "bg-gradient-to-br from-blue-500 to-indigo-600"
        }`}>
          <Code2 size={22} className="text-white drop-shadow" />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isNew && (
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 animate-pulse">
              New
            </span>
          )}
          {project.is_public === false && (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <Lock size={9} /> Private
            </span>
          )}
          {lang && (
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${meta?.badge ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
              {lang}
            </span>
          )}
        </div>
      </div>

      {/* Title + description */}
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
        {project.title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 flex-1 line-clamp-2">
        {project.description || "No description provided."}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          {memberCount > 0 && (
            <span className="flex items-center gap-1 font-medium text-blue-500 dark:text-blue-400">
              <Users size={11} /> {memberCount}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={11} /> {timeAgo(project.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-[10px] font-black">
            {author[0].toUpperCase()}
          </div>
          <span className="text-[11px] text-gray-400 font-mono truncate max-w-[80px]">@{author}</span>
        </div>
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/[0.03] group-hover:to-indigo-500/[0.03] transition-all duration-300 pointer-events-none" />
    </div>
  );
}

// ── create project form ───────────────────────────────────────────────────

const EMPTY_FORM = { title: "", description: "", language: "JavaScript", is_public: true };

function CreateProjectForm({ currentUser, onCreated, onCancel }) {
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState(null);

  const handle = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setFormError(null);

    const { data: project, error: insertErr } = await supabase
      .from("projects")
      .insert({
        title:       form.title.trim(),
        description: form.description.trim() || null,
        is_public:   form.is_public,
        status:      "active",
        tags:        form.language ? [form.language] : [],
        created_by:  currentUser.id,
      })
      .select("*")
      .single();

    if (insertErr) { setFormError(insertErr.message); setSaving(false); return; }

    // Register creator as owner
    await supabase.from("project_members").insert({
      project_id: project.id,
      user_id:    currentUser.id,
      role:       "owner",
      status:     "approved",
    });

    // Fetch creator profile separately
    const { data: pf } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .eq("id", currentUser.id)
      .single();

    setSaving(false);
    onCreated({ ...project, profiles: pf ?? null });
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800/50 rounded-[2rem] p-6 mb-8 shadow-lg shadow-blue-500/5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
          <FolderGit2 size={18} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Create a New Project</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">It will appear on the explore feed instantly</p>
        </div>
      </div>

      {formError && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl text-xs text-red-700 dark:text-red-400 font-medium">
          <AlertTriangle size={13} /> {formError}
        </div>
      )}

      <div className="space-y-3">
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handle()}
          placeholder="Project title *"
          autoFocus
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Short description (optional)"
          rows={2}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={form.language}
            onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, is_public: !f.is_public }))}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold border transition-all ${
              form.is_public
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
            }`}
          >
            {form.is_public ? <><Globe size={14} /> Public</> : <><Lock size={14} /> Private</>}
          </button>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handle}
            disabled={saving || !form.title.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 active:scale-95 shadow-sm shadow-blue-500/30"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? "Creating…" : "Create Project"}
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

export default function ExploreProjects() {
  const [projects, setProjects]               = useState([]);
  const [memberCounts, setMemberCounts]       = useState({});
  const [stats, setStats]                     = useState({ projects: 0, members: 0 });
  const [onlineCount, setOnlineCount]         = useState(1);
  const [loading, setLoading]                 = useState(true);
  const [search, setSearch]                   = useState("");
  const [langFilter, setLangFilter]           = useState("all");
  const [sortBy, setSortBy]                   = useState("newest");
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentUser, setCurrentUser]         = useState(null);
  const [showCreate, setShowCreate]           = useState(false);
  const [toast, setToast]                     = useState(null);
  const [liveAlert, setLiveAlert]             = useState(null);
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const toastTimer                            = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) =>
      setCurrentUser(session?.user ?? null)
    );
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) =>
      setCurrentUser(s?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  // Fetch projects + stats + member counts
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [projRes, membersRes] = await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("project_members")
        .select("project_id, status")
        .eq("status", "approved"),
    ]);

    if (!projRes.error && projRes.data) {
      // Fetch creator profiles separately (no direct FK to profiles table)
      const creatorIds = [...new Set(projRes.data.map((p) => p.created_by).filter(Boolean))];
      let profileMap = {};
      if (creatorIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", creatorIds);
        if (profs) profs.forEach((p) => { profileMap[p.id] = p; });
      }
      const enriched = projRes.data.map((p) => ({ ...p, profiles: profileMap[p.created_by] ?? null }));
      setProjects(enriched);
      setStats((s) => ({ ...s, projects: enriched.length }));
    }

    if (!membersRes.error && membersRes.data) {
      const counts = {};
      membersRes.data.forEach((row) => {
        counts[row.project_id] = (counts[row.project_id] || 0) + 1;
      });
      setMemberCounts(counts);
      setStats((s) => ({ ...s, members: membersRes.data.length }));
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime: new public projects inserted by anyone
  useEffect(() => {
    const channel = supabase
      .channel("explore-realtime-projects")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "projects" },
        async (payload) => {
          const { data: proj } = await supabase
            .from("projects")
            .select("*")
            .eq("id", payload.new.id)
            .single();
          if (!proj) return;
          // Fetch creator profile separately
          let profiles = null;
          if (proj.created_by) {
            const { data: pf } = await supabase
              .from("profiles")
              .select("id, username, full_name, avatar_url")
              .eq("id", proj.created_by)
              .single();
            profiles = pf ?? null;
          }
          const newProject = { ...proj, profiles };
          setProjects((prev) =>
            prev.some((p) => p.id === newProject.id) ? prev : [newProject, ...prev]
          );
          setStats((s) => ({ ...s, projects: s.projects + 1 }));
          setLiveAlert(newProject);
          setTimeout(() => setLiveAlert(null), 5000);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // Presence: track who is browsing the explore page
  useEffect(() => {
    const key = `explore-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel("explore-page-presence", {
      config: { presence: { key } },
    });
    channel
      .on("presence", { event: "sync" }, () =>
        setOnlineCount(Math.max(1, Object.keys(channel.presenceState()).length))
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track({ ts: Date.now() });
      });
    return () => supabase.removeChannel(channel);
  }, []);

  const handleProjectCreated = (project) => {
    showToast("Project created! Opening workspace…", "success");
    setShowCreate(false);
    setProjects((prev) => [project, ...prev]);
    setStats((s) => ({ ...s, projects: s.projects + 1 }));
    setSelectedProject(project);
  };

  // Filter + sort
  const allLangs = ["all", ...Array.from(new Set(
    projects.map((p) => p.language || p.tags?.[0]).filter(Boolean)
  ))];

  const filtered = projects
    .filter((p) => {
      const q    = search.toLowerCase();
      const lang = p.language || p.tags?.[0] || "";
      const isPublic = p.is_public !== false;
      return (
        ((p.title || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          lang.toLowerCase().includes(q)) &&
        (langFilter === "all" || lang === langFilter) &&
        (visibilityFilter === "all" || (visibilityFilter === "public" ? isPublic : !isPublic))
      );
    })
    .sort((a, b) =>
      sortBy === "trending"
        ? (memberCounts[b.id] || 0) - (memberCounts[a.id] || 0)
        : new Date(b.created_at) - new Date(a.created_at)
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 overflow-x-hidden relative">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-xl tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Terminal className="text-blue-500" size={24} />
            beone<span className="text-blue-600">of</span>us
          </Link>
          <div className="flex items-center gap-3">
            {currentUser && !selectedProject && (
              <button
                onClick={() => { setShowCreate((v) => !v); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all active:scale-95 shadow-sm shadow-blue-500/30"
              >
                <Plus size={15} /> New Project
              </button>
            )}
            {!currentUser && (
              <Link
                href="/auth"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all active:scale-95"
              >
                Sign In
              </Link>
            )}
            <Link
              href="/"
              className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <ArrowLeft size={15} /> Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Live alert banner */}
      {liveAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 dark:border-gray-200">
            <Zap size={13} className="text-yellow-400 dark:text-yellow-500 shrink-0" />
            <span className="text-xs font-bold">
              @{liveAlert.profiles?.username || "someone"} just published{" "}
              <span className="text-blue-400 dark:text-blue-600">{liveAlert.title}</span>
            </span>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="pt-24 pb-24 px-6 relative z-10 max-w-7xl mx-auto">
        {selectedProject ? (
          <ProjectWorkspace
            project={selectedProject}
            currentUser={currentUser}
            onBack={() => setSelectedProject(null)}
          />
        ) : (
          <>
            {/* Hero */}
            <div className="mb-10">
              <div className="mb-5">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  {onlineCount} engineer{onlineCount !== 1 ? "s" : ""} exploring now
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-5 text-gray-900 dark:text-gray-100 leading-none">
                Explore<br className="hidden sm:block" />{" "}
                <span className="text-blue-600 dark:text-blue-400">Projects</span>
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl leading-relaxed">
                Real projects built by real developers. Join a team, collaborate live — code together, chat, video call, and ship merge requests all in one workspace.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-10 max-w-xl">
              {[
                { label: "Projects",       value: stats.projects,  icon: FolderGit2, color: "text-blue-600 dark:text-blue-400"    },
                { label: "Contributors",   value: stats.members,   icon: Users,      color: "text-violet-600 dark:text-violet-400" },
                { label: "Here right now", value: onlineCount,     icon: Zap,        color: "text-emerald-600 dark:text-emerald-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                  <div className={`text-2xl font-black ${color} mb-0.5 tabular-nums`}>{value}</div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1">
                    <Icon size={10} /> {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Create form */}
            {showCreate && currentUser && (
              <CreateProjectForm
                currentUser={currentUser}
                onCreated={handleProjectCreated}
                onCancel={() => setShowCreate(false)}
              />
            )}

            {/* Sign-in prompt */}
            {!currentUser && (
              <div className="mb-8 flex items-center gap-3 px-5 py-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-2xl">
                <FolderGit2 size={16} className="text-blue-500 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  <Link href="/auth" className="font-black underline underline-offset-2 hover:text-blue-600">
                    Sign in
                  </Link>{" "}
                  to create projects and collaborate with teams in real time.
                </p>
              </div>
            )}

            {/* Visibility filter pills */}
            <div className="flex items-center gap-2 mb-5">
              {[
                { value: "all",     label: "All Projects", icon: null     },
                { value: "public",  label: "Public",       icon: Globe    },
                { value: "private", label: "Private",      icon: Lock     },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setVisibilityFilter(value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    visibilityFilter === value
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                      : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-700"
                  }`}
                >
                  {Icon && <Icon size={11} />} {label}
                </button>
              ))}
            </div>

            {/* Search + Filter + Sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 max-w-4xl">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={17} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects, descriptions, languages…"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                <select
                  value={langFilter}
                  onChange={(e) => setLangFilter(e.target.value)}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 pl-9 pr-4 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer min-w-[150px] transition-all"
                >
                  {allLangs.map((l) => (
                    <option key={l} value={l}>{l === "all" ? "All Languages" : l}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <TrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 pl-9 pr-4 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer min-w-[155px] transition-all"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Count */}
            <p className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-8 font-medium">
              <Globe size={12} />
              {filtered.length} project{filtered.length !== 1 ? "s" : ""}
              {visibilityFilter !== "all" && <span className="text-blue-500 dark:text-blue-400">· {visibilityFilter}</span>}
              {langFilter !== "all" && <span className="text-blue-500 dark:text-blue-400">· {langFilter}</span>}
              {search && <span>· "{search}"</span>}
            </p>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-16 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <FolderGit2 size={28} className="text-gray-400 dark:text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {search || langFilter !== "all" ? "No matching projects" : "No public projects yet"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto text-sm">
                  {search || langFilter !== "all"
                    ? "Try a different search or language filter."
                    : "Be the first to share a project with the community."}
                </p>
                {currentUser ? (
                  <button
                    onClick={() => { setSearch(""); setLangFilter("all"); setShowCreate(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all active:scale-95"
                  >
                    <Plus size={15} /> Create a Project
                  </button>
                ) : (
                  <Link href="/auth" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
                    Sign In to Create
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    memberCount={memberCounts[project.id] || 0}
                    onClick={setSelectedProject}
                  />
                ))}
              </div>
            )}

            {/* Bottom CTA */}
            {!loading && filtered.length > 0 && (
              <div className="mt-20 relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2.5rem] p-10 md:p-16 shadow-2xl shadow-blue-600/20">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="relative z-10 text-center">
                  <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                    Ready to build together?
                  </h2>
                  <p className="text-blue-100 mb-8 max-w-lg mx-auto leading-relaxed">
                    Create a project, invite your team, and collaborate in real time. Live code sync, chat, video calls, and merge request reviews — all in one workspace.
                  </p>
                  {currentUser ? (
                    <button
                      onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setShowCreate(true); }}
                      className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-black px-8 py-4 rounded-xl text-sm transition-all hover:scale-105 active:scale-95 shadow-xl"
                    >
                      <Plus size={16} /> Create Your Project
                    </button>
                  ) : (
                    <Link
                      href="/auth"
                      className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-black px-8 py-4 rounded-xl text-sm transition-all hover:scale-105 active:scale-95 shadow-xl"
                    >
                      Get Started Free
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-10 text-center text-gray-400 dark:text-gray-600 text-xs font-mono uppercase tracking-widest relative z-10">
        beoneofus platform · {new Date().getFullYear()}
      </footer>

      <FloatingAiAssistant />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4 fade-in duration-300 bg-white dark:bg-gray-900 ${
          toast.type === "error"
            ? "border-red-200 dark:border-red-800/50"
            : "border-emerald-200 dark:border-emerald-800/50"
        }`}>
          {toast.type === "error"
            ? <AlertTriangle size={16} className="text-red-500 shrink-0" />
            : <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          }
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
