"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ClipboardList, Briefcase, Bell, RefreshCw, Loader2, Check, X,
  CheckCircle2, Clock, XCircle, ChevronRight, TrendingUp, User,
  FileText, Zap, UserCog, ArrowUpRight, UserPlus, Search, Crown, Users, Circle,
  Trash2, Heart, MessageSquare, Handshake,
} from "lucide-react";

const NOTIF_ICONS = {
  like:                    <Heart size={12} className="text-rose-400" />,
  comment:                 <MessageSquare size={12} className="text-blue-400" />,
  message:                 <MessageSquare size={12} className="text-blue-400" />,
  handshake:               <Handshake size={12} className="text-emerald-400" />,
  connection_request:      <UserPlus size={12} className="text-violet-400" />,
  group_invite:            <Users size={12} className="text-amber-400" />,
  group_join_request:      <Users size={12} className="text-amber-400" />,
  partnership_update:      <TrendingUp size={12} className="text-cyan-400" />,
  interview_answers_complete: <ClipboardList size={12} className="text-indigo-400" />,
  blocked:                 <X size={12} className="text-red-400" />,
};

const CHANGELOG = [
  { version: "v2.4", title: "Shop & Orders", tag: "Feature", desc: "Buy and sell digital products directly on the platform with Paystack checkout.", date: "May 2026" },
  { version: "v2.3", title: "Notification Popups", tag: "UX", desc: "Real-time toast notifications for messages and activity — no more missing updates.", date: "May 2026" },
  { version: "v2.2", title: "Interview Suite", tag: "Feature", desc: "AI-evaluated interview rooms with coding challenges for verified opportunities.", date: "Apr 2026" },
  { version: "v2.1", title: "Premium Tier", tag: "Feature", desc: "Unlock advanced AI tools, analytics, and priority visibility with Premium.", date: "Mar 2026" },
  { version: "v2.0", title: "Public Profiles", tag: "Design", desc: "Every member now has a shareable profile at beoneofus.work/u/username.", date: "Feb 2026" },
];
import { supabase } from "../../../supabaseClient";
import { Toast, useToast, Badge, statusColor } from "./shared";

const TASK_STATUSES = ["All", "pending", "in_progress", "completed", "cancelled"];

const PRIORITY_CONFIG = {
  High:   { dot: "bg-red-500",    color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-900/20",    border: "border-red-200 dark:border-red-700/40" },
  Medium: { dot: "bg-amber-400",  color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-700/40" },
  Low:    { dot: "bg-gray-300",   color: "text-gray-500 dark:text-gray-400",  bg: "bg-gray-50 dark:bg-gray-800/40",  border: "border-gray-200 dark:border-gray-700/40" },
};

const STATUS_CONFIG = {
  pending:     { label: "To Do",      icon: <Circle size={10} />,        bg: "bg-gray-100 dark:bg-gray-800",      color: "text-gray-600 dark:text-gray-300" },
  in_progress: { label: "In Progress", icon: <Clock size={10} />,        bg: "bg-blue-50 dark:bg-blue-900/20",    color: "text-blue-600 dark:text-blue-400" },
  completed:   { label: "Done",       icon: <CheckCircle2 size={10} />, bg: "bg-emerald-50 dark:bg-emerald-900/20", color: "text-emerald-600 dark:text-emerald-400" },
  cancelled:   { label: "Cancelled",  icon: <XCircle size={10} />,      bg: "bg-red-50 dark:bg-red-900/20",      color: "text-red-600 dark:text-red-400" },
};

const UserDashboardTool = ({ currentUserId }) => {
  const [activeTab, setActiveTab]               = useState("");
  const [isFounderOrMember, setIsFounderOrMember] = useState(null);
  const [myTasks, setMyTasks]                   = useState([]);
  const [myJobApps, setMyJobApps]               = useState([]);
  const [myFounderApps, setMyFounderApps]       = useState([]);
  const [myNotifications, setMyNotifications]   = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [acceptedRoles, setAcceptedRoles]       = useState([]);
  const [taskFilter, setTaskFilter]             = useState("All");
  const [taskSearch, setTaskSearch]             = useState("");
  const [expandedTask, setExpandedTask]         = useState(null);
  const [deletingApp, setDeletingApp]           = useState(null);
  const [myProfile, setMyProfile]               = useState(null);

  const renderWithLinks = (text) => {
    if (!text) return text;
    return text.split(/(https?:\/\/[^\s]+|\B\/[^\s]+)/g).map((part, i) => {
      if (i % 2 === 1) {
        const internal = part.startsWith("/");
        return (
          <a key={i} href={part} target={internal ? "_self" : "_blank"} rel={internal ? "" : "noopener noreferrer"}
            onClick={e => e.stopPropagation()}
            className={internal ? "inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold ml-1" : "text-blue-400 hover:underline font-bold"}>
            {internal ? <><UserPlus size={11} /> Apply Now</> : part}
          </a>
        );
      }
      return part;
    });
  };

  /* bootstrap */
  useEffect(() => {
    if (!currentUserId) return;
    const init = async () => {
      setLoading(true);
      const [{ data: appData }, { data: profileData }] = await Promise.all([
        supabase.from("founder_applications").select("id, status, intended_role").eq("user_id", currentUserId),
        supabase.from("profiles").select("username, avatar_url, full_name, role, company").eq("id", currentUserId).single(),
      ]);
      if (profileData) setMyProfile(profileData);
      if (appData?.length) {
        setIsFounderOrMember(true);
        setActiveTab(prev => prev || "tasks");
        setAcceptedRoles([...new Set(appData.filter(a => a.status === "accepted").map(a => a.intended_role))]);
      } else {
        setIsFounderOrMember(false);
        setActiveTab(prev => prev || "job_apps");
      }
      setLoading(false);
    };
    init();
  }, [currentUserId]);

  /* tasks realtime */
  useEffect(() => {
    if (!currentUserId || isFounderOrMember !== true || activeTab !== "tasks") return;
    let ch;
    const fetchTasks = async () => {
      const { data } = await supabase.from("tasks").select(`
        *, assignee:profiles!tasks_assignee_id_fkey(username, avatar_url),
        assigner:profiles!tasks_assigner_id_fkey(username, avatar_url)
      `).or(`assignee_id.eq.${currentUserId},assigner_id.eq.${currentUserId}`).order("created_at", { ascending: false });
      if (data) setMyTasks(data);
    };
    fetchTasks();
    ch = supabase.channel(`user-tasks-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetchTasks).subscribe();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [activeTab, currentUserId, isFounderOrMember]);

  /* job apps */
  useEffect(() => {
    if (activeTab !== "job_apps" || myJobApps.length > 0) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("job_applications").select("*, jobs(title, company)").eq("user_id", currentUserId).order("created_at", { ascending: false });
      if (data) setMyJobApps(data);
      setLoading(false);
    };
    load();
  }, [activeTab, currentUserId, myJobApps.length]);

  /* founder apps */
  useEffect(() => {
    if (activeTab !== "founder_apps" || myFounderApps.length > 0) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("founder_applications").select("*").eq("user_id", currentUserId).order("created_at", { ascending: false });
      if (data) setMyFounderApps(data);
      setLoading(false);
    };
    load();
  }, [activeTab, currentUserId, myFounderApps.length]);

  /* notifications */
  useEffect(() => {
    if (activeTab !== "notifications" || myNotifications.length > 0) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("notifications").select("*").eq("receiver_id", currentUserId).order("created_at", { ascending: false }).limit(30);
      if (data) setMyNotifications(data);
      setLoading(false);
    };
    load();
  }, [activeTab, currentUserId, myNotifications.length]);

  const handleTaskUpdate = async (taskId, newStatus) => {
    setActionProcessing(true);
    try {
      const task = myTasks.find(t => t.id === taskId);
      const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
      if (error) throw error;
      setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      if (newStatus === "completed" && task?.assigner_id && task.assigner_id !== currentUserId) {
        await supabase.from("notifications").insert({
          receiver_id: task.assigner_id, actor_id: currentUserId,
          type: "message", content: `marked task "${task.title}" as completed.`
        });
      }
    } catch (err) { alert(err.message); }
    finally { setActionProcessing(false); }
  };

  const handleDeleteApp = async (table, id, setter) => {
    setDeletingApp(id);
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) setter(prev => prev.filter(a => a.id !== id));
    setDeletingApp(null);
  };

  /* computed stats */
  const taskStats = useMemo(() => ({
    total: myTasks.length,
    pending: myTasks.filter(t => t.status === "pending" || !t.status).length,
    inProgress: myTasks.filter(t => t.status === "in_progress").length,
    completed: myTasks.filter(t => t.status === "completed").length,
    high: myTasks.filter(t => t.priority === "High").length,
  }), [myTasks]);

  const completionPct = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

  const filteredTasks = useMemo(() => {
    let tasks = myTasks;
    if (taskFilter !== "All") tasks = tasks.filter(t => t.status === taskFilter || t.priority === taskFilter);
    if (taskSearch) tasks = tasks.filter(t => t.title?.toLowerCase().includes(taskSearch.toLowerCase()) || t.description?.toLowerCase().includes(taskSearch.toLowerCase()));
    return tasks.sort((a, b) => ({ High: 3, Medium: 2, Low: 1 }[b.priority || "Medium"] - ({ High: 3, Medium: 2, Low: 1 }[a.priority || "Medium"])));
  }, [myTasks, taskFilter, taskSearch]);

  const memberTabs = [
    { id: "tasks", label: "Tasks", Icon: ClipboardList, badge: taskStats.pending || null },
    { id: "founder_apps", label: "Applications", Icon: FileText, badge: myFounderApps.filter(a => a.status === "pending").length || null },
  ];
  const guestTabs = [
    { id: "job_apps", label: "Job Apps", Icon: Briefcase, badge: myJobApps.filter(a => a.status === "pending").length || null },
    { id: "notifications", label: "Notifications", Icon: Bell, badge: myNotifications.filter(n => n.unread).length || null },
    { id: "changelog", label: "What's New", Icon: Zap, badge: null },
  ];
  const tabs = isFounderOrMember ? memberTabs : guestTabs;

  if (loading && isFounderOrMember === null) return (
    <div className="py-20 flex flex-col items-center gap-3">
      <Loader2 className="animate-spin text-violet-500" size={26} />
      <p className="text-xs text-gray-400">Loading your dashboard…</p>
    </div>
  );

  return (
    <div className="space-y-4 max-w-3xl mx-auto py-4">

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-900/40 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-700 dark:from-violet-700 dark:via-violet-800 dark:to-indigo-900 p-5 text-white shadow-lg">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 60% 40%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white/20">
              {myProfile?.avatar_url
                ? <Image src={myProfile.avatar_url} alt="" width={48} height={48} className="w-full h-full object-cover" unoptimized />
                : <UserCog size={22} />}
            </div>
            <div>
              <p className="text-[10px] text-violet-200/70 uppercase tracking-widest font-bold mb-0.5">My Dashboard</p>
              <h2 className="font-black text-base leading-tight">{myProfile?.full_name || myProfile?.username || "User"}</h2>
              {(myProfile?.role || myProfile?.company) && (
                <p className="text-[11px] text-violet-200/80 mt-0.5">{[myProfile.role, myProfile.company].filter(Boolean).join(" · ")}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {acceptedRoles.includes("cofounder") && (
              <a href="/founder-dashboard" className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white rounded-xl text-[11px] font-bold transition-all">
                Founder Workspace <ArrowUpRight size={11} />
              </a>
            )}
            {acceptedRoles.includes("member") && (
              <a href="/member-dashboard" className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white rounded-xl text-[11px] font-bold transition-all">
                Member Workspace <ArrowUpRight size={11} />
              </a>
            )}
          </div>
        </div>

        {/* Task progress bar (only for members) */}
        {isFounderOrMember && myTasks.length > 0 && (
          <div className="relative mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Task progress</span>
              <span className="text-[11px] font-black text-white">{completionPct}% complete</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${completionPct}%` }} />
            </div>
            <div className="flex gap-4 mt-3">
              {[
                { label: "To Do",    val: taskStats.pending,    col: "text-white/60" },
                { label: "In Progress", val: taskStats.inProgress, col: "text-blue-300" },
                { label: "Done",     val: taskStats.completed,  col: "text-emerald-300" },
                { label: "High Priority", val: taskStats.high, col: "text-red-300" },
              ].map(s => (
                <div key={s.label}>
                  <p className={`text-base font-black ${s.col}`}>{s.val}</p>
                  <p className="text-[9px] text-white/50">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 rounded-2xl overflow-x-auto shadow-sm">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-1 justify-center ${activeTab === t.id ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            <t.Icon size={13} />
            {t.label}
            {t.badge > 0 && (
              <span className="text-[9px] font-black bg-violet-500 text-white px-1.5 py-0.5 rounded-full leading-none">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content panel ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-violet-500" size={22} />
            <p className="text-xs text-gray-400">Loading…</p>
          </div>
        ) : (
          <>
            {/* ─ Tasks ─ */}
            {activeTab === "tasks" && (
              <>
                {/* Filter + search bar */}
                <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="relative flex-1">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={taskSearch}
                      onChange={e => setTaskSearch(e.target.value)}
                      placeholder="Search tasks…"
                      className="w-full pl-8 pr-3 py-2 text-[11px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-violet-400 transition-all text-gray-800 dark:text-gray-200 placeholder-gray-400"
                    />
                  </div>
                  <div className="flex gap-1 overflow-x-auto">
                    {["All", ...TASK_STATUSES.slice(1), "High", "Medium", "Low"].map(f => (
                      <button key={f} onClick={() => setTaskFilter(f)}
                        className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap ${taskFilter === f ? "bg-violet-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                        {f === "pending" ? "To Do" : f === "in_progress" ? "In Progress" : f === "completed" ? "Done" : f}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="py-16 flex flex-col items-center gap-2 text-center">
                    <ClipboardList size={30} className="text-gray-200 dark:text-gray-700" />
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500">{taskSearch ? "No tasks match your search" : "No tasks assigned yet"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {filteredTasks.map(task => {
                      const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;
                      const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                      const isExpanded = expandedTask === task.id;
                      return (
                        <div
                          key={task.id}
                          className={`group relative transition-all ${isExpanded ? "bg-gray-50 dark:bg-gray-800/40" : "hover:bg-gray-50 dark:hover:bg-gray-800/20"}`}
                        >
                          {/* Priority left accent */}
                          <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${pc.dot}`} />

                          <div className="p-4 pl-5 cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <p className={`text-xs font-bold ${task.status === "completed" ? "line-through text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-white"}`}>
                                    {task.title}
                                  </p>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${pc.color} ${pc.bg} ${pc.border}`}>
                                    {task.priority || "Medium"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1">{task.description}</p>
                              </div>

                              {/* Status toggle */}
                              <button
                                onClick={e => { e.stopPropagation(); handleTaskUpdate(task.id, task.status === "completed" ? "pending" : task.status === "in_progress" ? "completed" : "in_progress"); }}
                                disabled={actionProcessing}
                                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all disabled:opacity-50 ${sc.bg} ${sc.color}`}
                              >
                                {sc.icon}
                                {sc.label}
                              </button>
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                              {/* Assigner */}
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-[7px] font-black text-gray-500 shrink-0">
                                  {task.assigner?.avatar_url ? <Image src={task.assigner.avatar_url} alt="" width={16} height={16} className="w-full h-full object-cover" unoptimized /> : (task.assigner?.username?.[0] || "A").toUpperCase()}
                                </div>
                                <span className="text-[9px] text-gray-400">from @{task.assigner?.username || "Admin"}</span>
                              </div>
                              <span className="text-gray-200 dark:text-gray-700">·</span>
                              {/* Assignee */}
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-[7px] font-black text-gray-500 shrink-0">
                                  {task.assignee?.avatar_url ? <Image src={task.assignee.avatar_url} alt="" width={16} height={16} className="w-full h-full object-cover" unoptimized /> : (task.assignee?.username?.[0] || "?").toUpperCase()}
                                </div>
                                <span className="text-[9px] text-gray-400">@{task.assignee?.username || "?"}</span>
                              </div>
                              {task.created_at && (
                                <>
                                  <span className="text-gray-200 dark:text-gray-700">·</span>
                                  <span className="text-[9px] text-gray-400">{new Date(task.created_at).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Expanded description */}
                          {isExpanded && task.description && (
                            <div className="px-5 pb-4">
                              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                                {task.description}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ─ Job Apps ─ */}
            {activeTab === "job_apps" && (
              myJobApps.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-2 text-center">
                  <Briefcase size={30} className="text-gray-200 dark:text-gray-700" />
                  <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No job applications yet</p>
                  <Link href="/dash/jobs" className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                    Browse jobs <ChevronRight size={12} />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {myJobApps.map(app => {
                    const sc = statusColor(app.status);
                    const statusSteps = ["pending", "reviewing", "interview", "accepted", "rejected"];
                    const stepIdx = statusSteps.indexOf(app.status);
                    return (
                      <div key={app.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm">
                              {(app.jobs?.company || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white">{app.jobs?.title || "Unknown Role"}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">{app.jobs?.company || "—"}</p>
                              {app.created_at && (
                                <p className="text-[9px] text-gray-400 mt-0.5">Applied {new Date(app.created_at).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge color={sc}>{app.status || "pending"}</Badge>
                            <button
                              onClick={() => handleDeleteApp("job_applications", app.id, setMyJobApps)}
                              disabled={deletingApp === app.id}
                              className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              {deletingApp === app.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </div>
                        {/* Status pipeline */}
                        {stepIdx >= 0 && (
                          <div className="mt-3 flex items-center gap-1">
                            {statusSteps.slice(0, -1).map((step, i) => (
                              <div key={step} className="flex items-center gap-1 flex-1">
                                <div className={`h-1 flex-1 rounded-full transition-all ${i <= stepIdx ? "bg-blue-500" : "bg-gray-100 dark:bg-gray-800"}`} />
                                {i < statusSteps.length - 2 && (
                                  <div className={`w-2 h-2 rounded-full border-2 transition-all ${i < stepIdx ? "bg-blue-500 border-blue-500" : i === stepIdx ? "bg-white dark:bg-gray-900 border-blue-500" : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`} />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ─ Founder Apps ─ */}
            {activeTab === "founder_apps" && (
              myFounderApps.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-2 text-center">
                  <FileText size={30} className="text-gray-200 dark:text-gray-700" />
                  <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No applications found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {myFounderApps.map(app => (
                    <div key={app.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-all">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${app.intended_role === "cofounder" ? "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400" : "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"}`}>
                            {app.intended_role === "cofounder" ? <Crown size={15} /> : <Users size={15} />}
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${app.intended_role === "cofounder" ? "text-violet-600 dark:text-violet-400" : "text-blue-600 dark:text-blue-400"}`}>
                              {app.intended_role === "cofounder" ? "Co-founder Application" : "Member Application"}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">Submitted {new Date(app.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge color={statusColor(app.status)}>{app.status || "pending"}</Badge>
                          <button
                            onClick={() => handleDeleteApp("founder_applications", app.id, setMyFounderApps)}
                            disabled={deletingApp === app.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            {deletingApp === app.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ─ Notifications ─ */}
            {activeTab === "notifications" && (
              myNotifications.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-2 text-center">
                  <Bell size={30} className="text-gray-200 dark:text-gray-700" />
                  <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {myNotifications.map(n => (
                    <div key={n.id} className={`flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-all ${n.unread ? "bg-blue-50/40 dark:bg-blue-950/10" : ""}`}>
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                        {NOTIF_ICONS[n.type] || <Bell size={12} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                          <span className="font-bold capitalize text-gray-900 dark:text-white">{(n.type || "alert").replace(/_/g, " ")}: </span>
                          {renderWithLinks(n.content)}
                        </p>
                        <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                      </div>
                      {n.unread && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 shrink-0" />}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ─ Changelog ─ */}
            {activeTab === "changelog" && (
              <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {CHANGELOG.map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-all">
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <div className="w-7 h-7 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                        <Zap size={12} />
                      </div>
                      {i < CHANGELOG.length - 1 && <div className="flex-1 w-px bg-gray-100 dark:bg-gray-800 min-h-[20px]" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[9px] font-black font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">{item.version}</span>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{item.title}</p>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          item.tag === "Feature" ? "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400" :
                          item.tag === "Design" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" :
                          item.tag === "UX" ? "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400" :
                          "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                        }`}>{item.tag}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                      <p className="text-[9px] text-gray-300 dark:text-gray-700 mt-1">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Quote Tool ──────────────────────────────────────────────────────────────

const QUOTES = [
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson", tag: "Coding" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler", tag: "Coding" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck", tag: "Coding" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds", tag: "Coding" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman", tag: "Coding" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House", tag: "Coding" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson", tag: "Coding" },
  { text: "The best way to predict the future is to create it.", author: "Alan Kay", tag: "Innovation" },
  { text: "An entrepreneur is someone who jumps off a cliff and builds a plane on the way down.", author: "Reid Hoffman", tag: "Entrepreneurship" },
  { text: "If you are not embarrassed by the first version of your product, you've launched too late.", author: "Reid Hoffman", tag: "Entrepreneurship" },
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates", tag: "Entrepreneurship" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg", tag: "Entrepreneurship" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs", tag: "Motivation" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", tag: "Motivation" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein", tag: "Motivation" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke", tag: "Motivation" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", tag: "Motivation" },
  { text: "Every expert was once a beginner.", author: "Unknown", tag: "Learning" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci", tag: "Learning" },
  { text: "The more I learn, the more I realize how much I don't know.", author: "Albert Einstein", tag: "Learning" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", tag: "Learning" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King", tag: "Learning" },
];


export default UserDashboardTool;
