"use client";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Info, Users, Code2, MessageSquare, Video, GitMerge,
  Globe, Star, Wifi, WifiOff, Edit2, Save, Trash2, AlertTriangle,
  Lock, Loader2, X, CheckCircle2,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";
import TeamManager from "./TeamManager";
import LiveCode    from "./LiveCode";
import LiveChat    from "./LiveChat";
import VideoCall   from "./VideoCall";
import CodeMerge   from "./CodeMerge";

const TABS = [
  { id: "overview", label: "Overview",   icon: Info          },
  { id: "team",     label: "Team",       icon: Users         },
  { id: "code",     label: "Live Code",  icon: Code2         },
  { id: "chat",     label: "Chat",       icon: MessageSquare },
  { id: "calls",    label: "Calls",      icon: Video         },
  { id: "merge",    label: "Merge",      icon: GitMerge      },
];

const LANG_COLORS = {
  JavaScript: "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800/40",
  TypeScript:  "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800/40",
  Python:      "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800/40",
  Rust:        "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800/40",
  Go:          "text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-900/20 dark:border-cyan-800/40",
};

const EDIT_LANGUAGES = [
  "JavaScript","TypeScript","Python","Rust","Go",
  "C++","Java","Ruby","Swift","Kotlin","Other",
];

const STATUS_OPTIONS = [
  { value: "active",    label: "Active"    },
  { value: "paused",    label: "Paused"    },
  { value: "completed", label: "Completed" },
  { value: "archived",  label: "Archived"  },
];

// ── Overview tab ─────────────────────────────────────────────────────────

function OverviewTab({ project, currentUser, onUpdate, onDelete }) {
  const [editing, setEditing]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [formError, setFormError]         = useState(null);
  const [form, setForm]                   = useState({
    title:       project.title || "",
    description: project.description || "",
    language:    project.language || project.tags?.[0] || "JavaScript",
    is_public:   project.is_public !== false,
    status:      project.status || "active",
  });

  const isOwner    = currentUser && project.created_by === currentUser.id;
  const lang       = project.language || project.tags?.[0] || null;
  const langClass  = lang
    ? (LANG_COLORS[lang] ?? "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700")
    : null;
  const authorName = project.profiles?.full_name || project.profiles?.username || "Community";
  const username   = project.profiles?.username || "community";

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setFormError(null);
    const { data, error } = await supabase
      .from("projects")
      .update({
        title:       form.title.trim(),
        description: form.description.trim() || null,
        is_public:   form.is_public,
        status:      form.status,
        tags:        [form.language],
      })
      .eq("id", project.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onUpdate({ ...project, ...data });
    setEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from("projects").delete().eq("id", project.id);
    onDelete();
  };

  return (
    <div className="space-y-5">
      {/* About card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">About this Project</h3>
          {isOwner && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
            >
              <Edit2 size={12} /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl text-xs text-red-700 dark:text-red-400 font-medium">
                <AlertTriangle size={12} /> {formError}
              </div>
            )}
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Project title *"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description (optional)"
              rows={3}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
            />
            <div className="flex gap-2 flex-wrap">
              <select
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className="flex-1 min-w-[130px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {EDIT_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="flex-1 min-w-[130px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, is_public: !f.is_public }))}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  form.is_public
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                {form.is_public ? <><Globe size={13} /> Public</> : <><Lock size={13} /> Private</>}
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all disabled:opacity-50 active:scale-95"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={() => { setEditing(false); setFormError(null); }}
                className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-5">
              {project.description || "No description provided."}
            </p>
            <div className="flex flex-wrap gap-2">
              {lang && langClass && (
                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${langClass}`}>{lang}</span>
              )}
              {project.is_public !== false ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 px-3 py-1.5 rounded-lg">
                  <Globe size={10} /> Public
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg">
                  <Lock size={10} /> Private
                </span>
              )}
              {project.status && project.status !== "active" && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40 capitalize">
                  {project.status}
                </span>
              )}
              {project.stars > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-1.5 rounded-lg">
                  <Star size={10} /> {project.stars}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Creator card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">Creator</h3>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
            {authorName[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{authorName}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              @{username} · {project.created_at
                ? new Date(project.created_at).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
                : "recently"}
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Features */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Workspace Features</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Everything your team needs to collaborate.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TABS.filter((t) => t.id !== "overview").map((tab) => (
            <div key={tab.id} className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 bg-white/80 dark:bg-gray-900/60 border border-blue-100 dark:border-blue-800/30 rounded-xl px-3 py-2.5 font-medium">
              <tab.icon size={12} className="shrink-0" /> {tab.label}
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone (owner only) */}
      {isOwner && (
        <div className="bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/30 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={13} /> Danger Zone
          </h3>
          {confirmDelete ? (
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Are you sure? This will permanently delete <strong>{project.title}</strong> and all its data. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-50 active:scale-95"
                >
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  {deleting ? "Deleting…" : "Yes, delete permanently"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 px-4 py-2 rounded-xl transition-all border border-red-200 dark:border-red-800/30"
            >
              <Trash2 size={12} /> Delete Project
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main workspace ────────────────────────────────────────────────────────

export default function ProjectWorkspace({ project, currentUser, onBack }) {
  const [projectState, setProjectState] = useState(project);
  const [activeTab, setActiveTab]       = useState("overview");
  const [onlineUsers, setOnlineUsers]   = useState([]);
  const [connected, setConnected]       = useState(false);
  const channelRef                      = useRef(null);
  const myUsername = currentUser?.user_metadata?.username
    ?? currentUser?.email?.split("@")[0]
    ?? "Guest";

  // Workspace-level presence
  useEffect(() => {
    const key = currentUser?.id ?? `anon-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(`workspace:presence:${projectState.id}`, {
      config: { presence: { key } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const users = Object.values(channel.presenceState()).flat();
        setOnlineUsers(users);
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          channel.track({ user_id: currentUser?.id ?? null, username: myUsername, tab: activeTab });
        }
      });

    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [projectState.id, currentUser, myUsername]);

  // Update tracked tab when switching
  useEffect(() => {
    if (channelRef.current && connected) {
      channelRef.current.track({
        user_id:  currentUser?.id ?? null,
        username: myUsername,
        tab:      activeTab,
      });
    }
  }, [activeTab, connected, currentUser, myUsername]);

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return (
        <OverviewTab
          project={projectState}
          currentUser={currentUser}
          onUpdate={setProjectState}
          onDelete={onBack}
        />
      );
      case "team":  return <TeamManager project={projectState} currentUser={currentUser} />;
      case "code":  return <LiveCode    project={projectState} currentUser={currentUser} />;
      case "chat":  return <LiveChat    project={projectState} currentUser={currentUser} />;
      case "calls": return <VideoCall   project={projectState} currentUser={currentUser} />;
      case "merge": return <CodeMerge   project={projectState} currentUser={currentUser} />;
      default:      return null;
    }
  };

  return (
    <div className="w-full">
      {/* Header card */}
      <div className="flex items-center gap-3 mb-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5">
        <button
          onClick={onBack}
          className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-black text-gray-900 dark:text-gray-100 tracking-tight truncate">
              {projectState.title}
            </h2>
            {projectState.is_public === false && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg shrink-0">
                <Lock size={9} /> Private
              </span>
            )}
            <span className="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0">
              @{projectState.profiles?.username || "community"}
            </span>
          </div>
          {projectState.description && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{projectState.description}</p>
          )}
        </div>

        {/* Online users row */}
        <div className="flex items-center gap-2 shrink-0">
          {onlineUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {onlineUsers.slice(0, 5).map((u, i) => (
                  <div
                    key={i}
                    title={u.username ?? "Guest"}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-[9px] font-black shadow-sm"
                  >
                    {(u.username ?? "G")[0].toUpperCase()}
                  </div>
                ))}
                {onlineUsers.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-900 flex items-center justify-center text-gray-600 dark:text-gray-400 text-[9px] font-black">
                    +{onlineUsers.length - 5}
                  </div>
                )}
              </div>
              <span className="text-[11px] text-gray-400 font-medium hidden sm:block">
                {onlineUsers.length} here
              </span>
            </div>
          )}
          <div className={`flex items-center gap-1 text-[11px] font-medium ${connected ? "text-emerald-500" : "text-gray-400"}`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-5 scrollbar-none">
        {TABS.map((tab) => {
          const othersHere = onlineUsers.filter(
            (u) => u.tab === tab.id && u.user_id !== (currentUser?.id ?? null)
          );
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
              {othersHere.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-950 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div key={activeTab} className="w-full animate-in fade-in slide-in-from-bottom-1 duration-200">
        {renderTab()}
      </div>
    </div>
  );
}
