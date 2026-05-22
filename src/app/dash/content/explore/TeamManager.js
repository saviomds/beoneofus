"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, UserPlus, UserCheck, UserX, Crown, Shield, Eye,
  Loader2, AlertTriangle, CheckCircle2, Send, Info, Mail, AtSign, Search, X,
  ClipboardList, Plus, Trash2, Circle, Clock, CheckCircle, Calendar,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";

const ROLE_META = {
  owner:       { label: "Owner",       cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",  Icon: Crown  },
  contributor: { label: "Contributor", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",      Icon: Shield },
  viewer:      { label: "Viewer",      cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",         Icon: Eye    },
};

const TASK_STATUS = {
  todo:        { label: "To Do",       Icon: Circle,       cls: "text-gray-400 dark:text-gray-600",              next: "in_progress" },
  in_progress: { label: "In Progress", Icon: Clock,        cls: "text-blue-500",                                  next: "done"        },
  done:        { label: "Done",        Icon: CheckCircle,  cls: "text-emerald-500",                               next: "todo"        },
};

const PRIORITY_META = {
  low:    { label: "Low",    cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"        },
  medium: { label: "Medium", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  high:   { label: "High",   cls: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"         },
};

const SETUP_SQL = `create table if not exists project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'contributor' check (role in ('owner','contributor','viewer')),
  status text default 'pending' check (status in ('pending','approved','rejected')),
  joined_at timestamptz default now(),
  unique(project_id, user_id)
);
alter table project_members enable row level security;`;

const TASKS_SQL = `create table if not exists project_tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  status text default 'todo' check (status in ('todo','in_progress','done')),
  priority text default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  created_at timestamptz default now()
);
alter table project_tasks enable row level security;
create policy "Read tasks" on project_tasks for select using (
  exists (select 1 from projects where id = project_tasks.project_id and created_by = auth.uid())
  or exists (select 1 from project_members where project_id = project_tasks.project_id and user_id = auth.uid() and status = 'approved')
);
create policy "Creator inserts tasks" on project_tasks for insert with check (
  exists (select 1 from projects where id = project_tasks.project_id and created_by = auth.uid())
);
create policy "Creator or assignee updates tasks" on project_tasks for update using (
  exists (select 1 from projects where id = project_tasks.project_id and created_by = auth.uid())
  or assigned_to = auth.uid()
);
create policy "Creator deletes tasks" on project_tasks for delete using (
  exists (select 1 from projects where id = project_tasks.project_id and created_by = auth.uid())
);`;

function Toast({ toast }) {
  if (!toast) return null;
  const isErr = toast.type === "error";
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border ${
      isErr
        ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400"
        : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400"
    }`}>
      {isErr ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
      {toast.msg}
    </div>
  );
}

function MemberRow({ member }) {
  const name     = member.profiles?.full_name || member.profiles?.username || (member.user_id?.slice(0, 8) + "…");
  const username = member.profiles?.username || "user";
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
        {name[0]?.toUpperCase() ?? "U"}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{name}</p>
        <p className="text-[10px] text-gray-400">@{username}</p>
      </div>
    </div>
  );
}

export default function TeamManager({ project, currentUser }) {
  const [members, setMembers]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [myMembership, setMyMembership] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [toast, setToast]               = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const [inviteTab, setInviteTab]       = useState("username");
  const [userQuery, setUserQuery]       = useState("");
  const [userResults, setUserResults]   = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [emailInput, setEmailInput]     = useState("");
  const [inviteRole, setInviteRole]     = useState("contributor");
  const [inviting, setInviting]         = useState(false);
  const searchTimer                     = useRef(null);

  const [tasks, setTasks]               = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksErr, setTasksErr]         = useState(null);
  const [showAddTask, setShowAddTask]   = useState(false);
  const [taskForm, setTaskForm]         = useState({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "" });
  const [savingTask, setSavingTask]     = useState(false);

  const isDemo  = !project.id?.toString().match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
  const isOwner = !!(currentUser && project.created_by === currentUser.id);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fire-and-forget email notification via server route
  const notifyUser = async (targetUserId, type, extra = {}) => {
    if (!currentUser || !targetUserId || targetUserId === currentUser.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      fetch("/api/projects/notify", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ type, target_user_id: targetUserId, extra: { projectTitle: project.title, ...extra } }),
      });
    } catch (_) {}
  };

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data: rows, error: err } = await supabase
      .from("project_members")
      .select("id, project_id, user_id, role, status, joined_at")
      .eq("project_id", project.id)
      .order("joined_at", { ascending: true });

    const isSchemaErr = err?.code === "42P01"
      || err?.message?.includes("Could not find")
      || err?.message?.includes("schema cache");
    if (isSchemaErr) { setError("setup"); setLoading(false); return; }
    if (err)         { setError("fetch"); setLoading(false); return; }

    let enriched = rows || [];
    if (enriched.length > 0) {
      const ids = [...new Set(enriched.map((m) => m.user_id).filter(Boolean))];
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles").select("id, username, full_name, avatar_url").in("id", ids);
        const map = {};
        if (profs) profs.forEach((p) => { map[p.id] = p; });
        enriched = enriched.map((m) => ({ ...m, profiles: map[m.user_id] ?? null }));
      }
    }
    setMembers(enriched);
    setMyMembership(currentUser ? (enriched.find((m) => m.user_id === currentUser.id) ?? null) : null);
    setLoading(false);
  }, [project.id, currentUser]);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    const { data, error: err } = await supabase
      .from("project_tasks")
      .select("id, title, description, assigned_to, created_by, status, priority, due_date, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    if (err?.code === "42P01" || err?.message?.includes("project_tasks") || err?.message?.includes("relation")) {
      setTasksErr("setup"); setTasksLoading(false); return;
    }
    if (err) { setTasksErr("fetch"); setTasksLoading(false); return; }

    let enriched = data || [];
    if (enriched.length > 0) {
      const ids = [...new Set(enriched.map((t) => t.assigned_to).filter(Boolean))];
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles").select("id, username, full_name").in("id", ids);
        const map = {};
        if (profs) profs.forEach((p) => { map[p.id] = p; });
        enriched = enriched.map((t) => ({ ...t, assignee: map[t.assigned_to] ?? null }));
      }
    }
    setTasks(enriched);
    setTasksLoading(false);
  }, [project.id]);

  useEffect(() => {
    if (!isDemo) { fetchMembers(); fetchTasks(); }
    else setLoading(false);
  }, [fetchMembers, fetchTasks, isDemo]);

  // ── Member actions ────────────────────────────────────────────────────────

  const handleRequest = async () => {
    if (!currentUser) { showToast("Sign in to request access.", "error"); return; }
    setIsRequesting(true);
    const { error: err } = await supabase.from("project_members").insert({
      project_id: project.id, user_id: currentUser.id, role: "contributor", status: "pending",
    });
    setIsRequesting(false);
    if (err?.code === "23505") showToast("Request already sent.", "error");
    else if (err)              showToast("Failed: " + err.message, "error");
    else {
      showToast("Request sent! The owner will review it.", "success");
      fetchMembers();
      // Notify project owner about the join request
      notifyUser(project.created_by, "project_join_request");
    }
  };

  const logActivity = async (userId, type, content, metadata = {}) => {
    if (!userId) return;
    supabase.from("user_activity").insert({ user_id: userId, type, content, metadata }).then(() => {});
  };

  const handleApprove = async (id) => {
    const member = members.find((m) => m.id === id);
    const { error: err } = await supabase.from("project_members").update({ status: "approved" }).eq("id", id);
    if (err) showToast("Failed: " + err.message, "error");
    else {
      showToast("Member approved!", "success");
      fetchMembers();
      if (member) {
        notifyUser(member.user_id, "project_join_approved");
        logActivity(member.user_id, "project_joined", `Joined project: ${project.title}`, { project_id: project.id });
      }
    }
  };

  const handleRevoke = async (id) => {
    const member = members.find((m) => m.id === id);
    const { error: err } = await supabase.from("project_members").delete().eq("id", id);
    if (err) showToast("Failed: " + err.message, "error");
    else {
      showToast("Access revoked.", "success");
      fetchMembers();
      // Notify if it was a pending request being rejected
      if (member?.status === "pending") notifyUser(member.user_id, "project_join_rejected");
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    const member = members.find((m) => m.id === memberId);
    const { error: err } = await supabase.from("project_members").update({ role: newRole }).eq("id", memberId);
    if (err) showToast("Failed: " + err.message, "error");
    else {
      showToast("Role updated.", "success");
      fetchMembers();
      if (member) notifyUser(member.user_id, "project_role_changed", { newRole });
    }
  };

  const handleLeave = async () => {
    if (!myMembership) return;
    const { error: err } = await supabase.from("project_members").delete().eq("id", myMembership.id);
    if (err) showToast("Failed: " + err.message, "error");
    else { showToast("You left the project.", "success"); fetchMembers(); }
  };

  // ── Invite actions ────────────────────────────────────────────────────────

  const searchUsers = useCallback(async (q) => {
    if (!q || q.length < 2) { setUserResults([]); return; }
    setQueryLoading(true);
    const { data } = await supabase
      .from("profiles").select("id, username, full_name, avatar_url")
      .ilike("username", `%${q}%`).limit(6);
    setUserResults(data || []);
    setQueryLoading(false);
  }, []);

  const handleUserQueryChange = (e) => {
    const q = e.target.value.replace(/^@/, "");
    setUserQuery(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchUsers(q), 280);
  };

  const inviteProfile = async (profile) => {
    if (!currentUser) { showToast("Sign in to invite members.", "error"); return; }
    setInviting(true);
    const { error: err } = await supabase.from("project_members").insert({
      project_id: project.id, user_id: profile.id, role: inviteRole, status: "approved",
    });
    setInviting(false);
    if (err?.code === "23505") showToast(`@${profile.username} is already on the team.`, "error");
    else if (err)              showToast("Failed: " + err.message, "error");
    else {
      showToast(`@${profile.username} added!`, "success");
      setUserQuery(""); setUserResults([]);
      fetchMembers();
      notifyUser(profile.id, "project_invite", { role: inviteRole });
    }
  };

  const handleEmailInvite = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !currentUser) return;
    setInviting(true);
    const { data: profile, error: lookupErr } = await supabase
      .from("profiles").select("id, username, full_name").eq("email", email).single();
    setInviting(false);
    if (lookupErr || !profile) {
      showToast(`No account for ${email}. Ask them to sign up first.`, "error"); return;
    }
    await inviteProfile(profile);
    setEmailInput("");
  };

  // ── Task actions ──────────────────────────────────────────────────────────

  const handleAddTask = async () => {
    if (!taskForm.title.trim()) return;
    setSavingTask(true);
    const { error: err } = await supabase.from("project_tasks").insert({
      project_id:  project.id,
      title:       taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      assigned_to: taskForm.assigned_to || null,
      created_by:  currentUser.id,
      priority:    taskForm.priority,
      due_date:    taskForm.due_date || null,
      status:      "todo",
    });
    setSavingTask(false);
    if (err) { showToast("Failed: " + err.message, "error"); return; }
    showToast("Task created!", "success");
    logActivity(currentUser.id, "project_task_created", `Created task "${taskForm.title.trim()}" in ${project.title}`, { project_id: project.id });
    // Notify assignee if set
    if (taskForm.assigned_to) {
      notifyUser(taskForm.assigned_to, "project_task_assigned", {
        taskTitle:       taskForm.title.trim(),
        taskDescription: taskForm.description.trim() || undefined,
        priority:        taskForm.priority,
        dueDate:         taskForm.due_date || undefined,
      });
    }
    setTaskForm({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "" });
    setShowAddTask(false);
    fetchTasks();
  };

  const cycleTaskStatus = async (task) => {
    if (!currentUser) return;
    if (!isOwner && task.assigned_to !== currentUser.id) return;
    const next = TASK_STATUS[task.status]?.next || "todo";
    const { error: err } = await supabase.from("project_tasks").update({ status: next }).eq("id", task.id);
    if (err) { showToast("Failed: " + err.message, "error"); return; }
    const actType = next === "done" ? "project_task_completed" : "project_task_updated";
    logActivity(currentUser.id, actType, `${next === "done" ? "Completed" : "Updated"} task "${task.title}" in ${project.title}`, { project_id: project.id, task_id: task.id, status: next });
    fetchTasks();
  };

  const handleDeleteTask = async (id) => {
    const { error: err } = await supabase.from("project_tasks").delete().eq("id", id);
    if (err) showToast("Failed: " + err.message, "error");
    else fetchTasks();
  };

  const approved = members.filter((m) => m.status === "approved");
  const pending  = members.filter((m) => m.status === "pending");

  // ── Guard: demo ───────────────────────────────────────────────────────────
  if (isDemo) return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-6">
      <div className="flex items-start gap-3">
        <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-1">Demo Project</h4>
          <p className="text-sm text-amber-700 dark:text-amber-500">Create a real project to enable team management.</p>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={24} /></div>;

  if (error === "setup") return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-1">Database Setup Required</h4>
          <p className="text-sm text-amber-700 dark:text-amber-500 mb-3">Run this SQL in your Supabase dashboard:</p>
          <pre className="text-xs bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto whitespace-pre">{SETUP_SQL}</pre>
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <Toast toast={toast} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Members", value: approved.length,  color: "text-blue-600 dark:text-blue-400"   },
          { label: "Pending", value: pending.length,   color: "text-amber-600 dark:text-amber-400" },
          { label: "My Role", value: isOwner ? "Owner" : (myMembership ? (ROLE_META[myMembership.role]?.label ?? "—") : (currentUser ? "Guest" : "—")), color: "text-gray-700 dark:text-gray-200" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center">
            <div className={`text-xl font-black ${color} mb-0.5`}>{value}</div>
            <div className="text-[10px] text-gray-400 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Owner: Invite Panel */}
      {isOwner && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <UserPlus size={14} className="text-blue-500" /> Invite Members
          </h3>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">Add as</span>
            {[{ value: "contributor", label: "Contributor" }, { value: "viewer", label: "Viewer" }].map(({ value, label }) => (
              <button key={value} onClick={() => setInviteRole(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inviteRole === value ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >{label}</button>
            ))}
          </div>

          <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {[{ id: "username", label: "By Username", icon: AtSign }, { id: "email", label: "By Email", icon: Mail }].map(({ id, label, icon: Icon }) => (
              <button key={id}
                onClick={() => { setInviteTab(id); setUserQuery(""); setUserResults([]); setEmailInput(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  inviteTab === id ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"
                }`}
              ><Icon size={11} /> {label}</button>
            ))}
          </div>

          {inviteTab === "username" && (
            <div className="relative">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={userQuery} onChange={handleUserQueryChange} placeholder="Search by username…"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-8 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                {queryLoading && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                {userQuery && !queryLoading && (
                  <button onClick={() => { setUserQuery(""); setUserResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>
                )}
              </div>
              {userResults.length > 0 && (
                <div className="absolute z-20 mt-1.5 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                  {userResults.map((u) => {
                    const already = members.some((m) => m.user_id === u.id);
                    return (
                      <button key={u.id} disabled={inviting || already} onClick={() => inviteProfile(u)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0">
                            {(u.username || "U")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{u.full_name || u.username}</p>
                            <p className="text-[10px] text-gray-400">@{u.username}</p>
                          </div>
                        </div>
                        {already
                          ? <span className="text-[10px] font-bold text-emerald-500 shrink-0">On team</span>
                          : <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                              {inviting ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />} Add
                            </span>
                        }
                      </button>
                    );
                  })}
                </div>
              )}
              {userQuery.length >= 2 && !queryLoading && userResults.length === 0 && (
                <p className="mt-2 text-[11px] text-gray-400 italic">No users found for "@{userQuery}"</p>
              )}
            </div>
          )}

          {inviteTab === "email" && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !inviting && handleEmailInvite()}
                  placeholder="teammate@example.com"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <button onClick={handleEmailInvite} disabled={inviting || !emailInput.trim()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 active:scale-95"
              >
                {inviting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Invite
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending join requests (owner only) */}
      {isOwner && pending.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shrink-0">{pending.length}</span>
            Join Requests
          </h3>
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-900/5 rounded-xl">
                <MemberRow member={m} />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleApprove(m.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                  ><UserCheck size={12} /> Approve</button>
                  <button onClick={() => handleRevoke(m.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg text-xs font-bold transition-all"
                  ><UserX size={12} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team members list — always visible */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Users size={14} className="text-blue-500" />
          Team Members
          <span className="ml-auto text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{approved.length}</span>
        </h3>
        {approved.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto mb-2 text-gray-300 dark:text-gray-700" size={28} />
            <p className="text-sm text-gray-500 dark:text-gray-400">No team members yet.</p>
            {isOwner && <p className="text-xs text-gray-400 mt-1">Invite collaborators using the panel above.</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {approved.map((m) => {
              const meta     = ROLE_META[m.role] ?? ROLE_META.viewer;
              const RoleIcon = meta.Icon;
              const isSelf   = m.user_id === currentUser?.id;
              return (
                <div key={m.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-2">
                  <MemberRow member={m} />
                  <div className="flex items-center gap-2 shrink-0">
                    {isOwner && m.role !== "owner" && !isSelf ? (
                      <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-[10px] font-bold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
                      >
                        <option value="contributor">Contributor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${meta.cls}`}>
                        <RoleIcon size={10} /> {meta.label}{isSelf && <span className="opacity-50 ml-0.5">(you)</span>}
                      </span>
                    )}
                    {isOwner && !isSelf && (
                      <button onClick={() => handleRevoke(m.id)} title="Revoke access"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      ><UserX size={13} /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Request to join — non-owner, no membership, signed in */}
      {!isOwner && !myMembership && currentUser && (
        <button onClick={handleRequest} disabled={isRequesting}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm shadow-blue-500/20 active:scale-95"
        >
          {isRequesting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Request to Join Team
        </button>
      )}

      {myMembership?.status === "pending" && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl text-sm text-amber-700 dark:text-amber-400 font-medium">
          <Loader2 size={14} className="animate-spin" />
          Your join request is pending approval from the project owner.
        </div>
      )}

      {myMembership?.status === "approved" && !isOwner && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 size={14} /> You are a team member!
          </div>
          {confirmLeave ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={handleLeave} className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline">Confirm leave</button>
              <button onClick={() => setConfirmLeave(false)} className="text-[11px] font-bold text-gray-400 hover:underline">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmLeave(true)} className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors shrink-0">
              Leave project
            </button>
          )}
        </div>
      )}

      {!currentUser && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sign in to request access or be invited by the project owner.</p>
      )}

      {/* Tasks */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ClipboardList size={14} className="text-violet-500" />
            Tasks
            {tasks.length > 0 && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{tasks.length}</span>
            )}
          </h3>
          {isOwner && !showAddTask && (
            <button onClick={() => setShowAddTask(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 px-3 py-1.5 rounded-xl transition-all"
            ><Plus size={12} /> Add Task</button>
          )}
        </div>

        {/* Add task form */}
        {isOwner && showAddTask && (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 space-y-3">
            <input type="text" value={taskForm.title} autoFocus
              onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Task title *"
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <textarea value={taskForm.description} rows={2}
              onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
            />
            <div className="flex gap-2 flex-wrap">
              <select value={taskForm.assigned_to} onChange={(e) => setTaskForm((f) => ({ ...f, assigned_to: e.target.value }))}
                className="flex-1 min-w-[130px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {approved.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    @{m.profiles?.username || m.user_id?.slice(0, 8)}
                  </option>
                ))}
              </select>
              <select value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
                className="flex-1 min-w-[120px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
              </select>
              <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                className="flex-1 min-w-[130px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddTask} disabled={savingTask || !taskForm.title.trim()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-50 active:scale-95"
              >
                {savingTask ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                {savingTask ? "Saving…" : "Create Task"}
              </button>
              <button onClick={() => { setShowAddTask(false); setTaskForm({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "" }); }}
                className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
              >Cancel</button>
            </div>
          </div>
        )}

        {/* Tasks table setup notice */}
        {tasksErr === "setup" && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 mb-3">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
              <AlertTriangle size={12} /> Run this SQL to enable tasks:
            </p>
            <pre className="text-[10px] bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto whitespace-pre">{TASKS_SQL}</pre>
          </div>
        )}

        {/* Task list */}
        {tasksLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-violet-400" size={18} /></div>
        ) : tasks.length === 0 && tasksErr !== "setup" ? (
          <div className="text-center py-8">
            <ClipboardList className="mx-auto mb-2 text-gray-300 dark:text-gray-700" size={24} />
            <p className="text-sm text-gray-500 dark:text-gray-400">No tasks yet.</p>
            {isOwner && <p className="text-xs text-gray-400 mt-1">Click "Add Task" to assign work to your team.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const st         = TASK_STATUS[task.status] ?? TASK_STATUS.todo;
              const pr         = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
              const StatusIcon = st.Icon;
              const canUpdate  = isOwner || task.assigned_to === currentUser?.id;
              const overdue    = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
              return (
                <div key={task.id} className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  task.status === "done"
                    ? "bg-gray-50 dark:bg-gray-800/20 border-gray-100 dark:border-gray-800/50 opacity-60"
                    : "bg-white dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800/40"
                }`}>
                  <button onClick={() => cycleTaskStatus(task)} disabled={!canUpdate}
                    title={canUpdate ? `Mark as: ${TASK_STATUS[st.next]?.label}` : "Only owner or assignee can update"}
                    className={`mt-0.5 shrink-0 transition-transform ${canUpdate ? "hover:scale-110 cursor-pointer" : "cursor-default opacity-50"}`}
                  >
                    <StatusIcon size={17} className={st.cls} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold text-gray-900 dark:text-gray-100 ${task.status === "done" ? "line-through" : ""}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded ${pr.cls}`}>{pr.label}</span>
                      {task.assignee ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-gray-500 dark:text-gray-400">
                          <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[7px] font-black">
                            {(task.assignee.username || "U")[0].toUpperCase()}
                          </div>
                          @{task.assignee.username}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600">Unassigned</span>
                      )}
                      {task.due_date && (
                        <span className={`flex items-center gap-0.5 text-[9px] font-bold ${overdue ? "text-red-500" : "text-gray-400"}`}>
                          <Calendar size={8} />
                          {overdue && "Overdue · "}
                          {new Date(task.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>

                  {isOwner && (
                    <button onClick={() => handleDeleteTask(task.id)} title="Delete task"
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all shrink-0"
                    ><Trash2 size={12} /></button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
