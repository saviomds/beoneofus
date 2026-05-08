"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Briefcase, Activity, ArrowRight, Target, Loader2, CheckCircle2,
  Check, Clock, Calendar, Zap, Terminal, ShieldCheck, X, Plus, Crown,
  Search, BarChart3, ClipboardList, RefreshCw, Shield, UserCheck, UserX,
  ChevronDown, AlertTriangle, Filter, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../supabaseClient';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray:    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    blue:    'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    amber:   'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    red:     'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
    violet:  'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
    amber2:  'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

function priorityColor(p: string) {
  if (!p) return 'gray';
  if (p.toLowerCase() === 'high') return 'red';
  if (p.toLowerCase() === 'medium') return 'amber';
  return 'blue';
}

function statusColor(s: string) {
  if (!s) return 'gray';
  if (s === 'accepted' || s === 'completed') return 'emerald';
  if (s === 'declined' || s === 'rejected') return 'red';
  if (s === 'pending') return 'amber';
  if (s === 'in_progress') return 'blue';
  return 'gray';
}

function getRelativeTime(dateStr: string) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

// ─── Component ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',     label: 'Overview',     icon: BarChart3 },
  { id: 'applications', label: 'Applications', icon: Crown },
  { id: 'users',        label: 'Users',        icon: Users },
  { id: 'tasks',        label: 'Tasks',        icon: ClipboardList },
];

export default function FounderDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentDate, setCurrentDate] = useState('');

  // Overview stats
  const [stats, setStats] = useState({ team: 0, pendingApps: 0, totalTasks: 0, completedTasks: 0 });

  // Applications tab
  const [applications, setApplications] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [appActionLoading, setAppActionLoading] = useState(false);

  // Users tab
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Tasks tab
  const [tasks, setTasks] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskProcessing, setTaskProcessing] = useState(false);
  const [taskForm, setTaskForm] = useState({ assignee_id: '', title: '', description: '', priority: 'Medium', due_date: '' });

  // Toast
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  }, []);

  // ── Auth & access check ────────────────────────────────────────────────────
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));

    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth'); return; }

      const uid = session.user.id;
      setCurrentUserId(uid);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url, is_verified, is_admin, role')
        .eq('id', uid)
        .single();

      if (profileData) {
        setProfile(profileData);
        if (profileData.is_admin) setIsAdmin(true);
      }

      // Check if admin or accepted co-founder
      const isAdminUser = !!profileData?.is_admin;
      if (!isAdminUser) {
        const { data: appData } = await supabase
          .from('founder_applications')
          .select('status')
          .eq('user_id', uid)
          .eq('status', 'accepted')
          .limit(1)
          .single();
        if (!appData) { router.push('/dash/feed'); return; }
      }

      setHasAccess(true);
      setLoading(false);
    };
    checkAccess();
  }, [router]);

  // ── Stats (Overview) ──────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const [teamRes, pendingRes, tasksRes] = await Promise.all([
      supabase.from('founder_applications').select('id', { count: 'exact', head: true }).eq('status', 'accepted'),
      supabase.from('founder_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('tasks').select('id, status'),
    ]);
    const allTasks = tasksRes.data || [];
    setStats({
      team: teamRes.count || 0,
      pendingApps: pendingRes.count || 0,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
    });
  }, []);

  useEffect(() => {
    if (hasAccess && activeTab === 'overview') fetchStats();
  }, [hasAccess, activeTab, fetchStats]);

  // ── Applications ──────────────────────────────────────────────────────────
  const fetchApplications = useCallback(async () => {
    setAppsLoading(true);
    const { data } = await supabase
      .from('founder_applications')
      .select('*, profiles:user_id(id, username, avatar_url, status, is_verified, role)')
      .order('created_at', { ascending: false });
    setApplications(data || []);
    setAppsLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess && activeTab === 'applications') fetchApplications();
  }, [hasAccess, activeTab, fetchApplications]);

  const handleApplicationAction = async (appId: string, status: 'accepted' | 'declined', applicantId: string, appTitle: string) => {
    setAppActionLoading(true);
    try {
      const { error } = await supabase.from('founder_applications').update({ status }).eq('id', appId);
      if (error) throw error;

      // Notify applicant
      await supabase.from('notifications').insert({
        receiver_id: applicantId,
        actor_id: currentUserId,
        type: 'message',
        content: `Your co-founder application was ${status}. ${status === 'accepted' ? 'Welcome to the founding team!' : 'Thank you for your interest.'}`,
      });

      // If accepted, update profile role
      if (status === 'accepted') {
        await supabase.from('profiles').update({ role: 'founder' }).eq('id', applicantId);
      }

      // Send email notification
      try {
        await fetch('/api/notify-applicant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId: appId, applicantId, status, role: appTitle }),
        });
      } catch { /* non-blocking */ }

      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
      if (selectedApp?.id === appId) setSelectedApp((prev: any) => ({ ...prev, status }));
      showToast(`Application ${status}.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setAppActionLoading(false);
    }
  };

  // ── Users ─────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, status, is_verified, is_admin, role, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setUsers(data || []);
    setAllUsers(data || []);
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess && activeTab === 'users') fetchUsers();
  }, [hasAccess, activeTab, fetchUsers]);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(id, username, avatar_url),
        assigner:profiles!tasks_assigner_id_fkey(id, username, avatar_url)
      `)
      .order('created_at', { ascending: false });
    setTasks(data || []);
    setTasksLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess && activeTab === 'tasks') {
      fetchTasks();
      if (allUsers.length === 0) fetchUsers();
    }
  }, [hasAccess, activeTab, fetchTasks, fetchUsers, allUsers.length]);

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.assignee_id || !taskForm.title) return;
    setTaskProcessing(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          assignee_id: taskForm.assignee_id,
          assigner_id: currentUserId,
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          status: 'pending',
          due_date: taskForm.due_date || null,
        })
        .select(`*, assignee:profiles!tasks_assignee_id_fkey(id, username, avatar_url), assigner:profiles!tasks_assigner_id_fkey(id, username, avatar_url)`)
        .single();
      if (error) throw error;

      await supabase.from('notifications').insert({
        receiver_id: taskForm.assignee_id,
        actor_id: currentUserId,
        type: 'message',
        content: `assigned you a task: "${taskForm.title}"`,
      });

      setTasks(prev => [data, ...prev]);
      setShowTaskModal(false);
      setTaskForm({ assignee_id: '', title: '', description: '', priority: 'Medium', due_date: '' });
      showToast('Task assigned!');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setTaskProcessing(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (!error) setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'pending') return t.status === 'pending' || t.status === 'in_progress';
    if (taskFilter === 'completed') return t.status === 'completed';
    if (taskFilter === 'high') return t.priority?.toLowerCase() === 'high' && t.status !== 'completed';
    return true;
  });

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.status?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // ── Loading / no access ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!hasAccess) return null;

  const progress = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 sm:p-8 animate-in fade-in duration-500">
      {/* Toast */}
      {toast.msg && (
        <div className={`fixed bottom-6 right-6 z-[500] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm ${toast.type === 'error' ? 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400' : 'bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'}`}>
          {toast.type === 'error' ? <AlertTriangle size={15} className="shrink-0" /> : <Check size={15} className="shrink-0" />}
          <span className="text-xs font-bold">{toast.msg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-gray-900 shadow-lg flex items-center justify-center text-xl font-black text-gray-400 uppercase overflow-hidden shrink-0">
              {profile?.avatar_url
                ? <Image src={profile.avatar_url} alt="avatar" fill sizes="80px" className="object-cover" />
                : (profile?.username?.substring(0, 2) || 'FD')}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Crown size={14} /> {isAdmin ? 'Admin & Founder' : 'Co-Founder Node Active'}
              </p>
              <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                Welcome, {profile?.username || 'Founder'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium text-sm flex items-center gap-2">
                <Calendar size={14} /> {currentDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10 w-full md:w-auto flex-wrap">
            <Link href="/member-dashboard" className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-all text-sm border border-gray-200 dark:border-gray-700">
              <Users size={15} /> Member View
            </Link>
            <Link href="/dash/feed" className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold transition-all shadow-md text-sm">
              <Terminal size={15} /> Dashboard
            </Link>
            {isAdmin && (
              <Link href="/dash/more" className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md text-sm">
                <Shield size={15} /> Admin Panel <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </header>

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-1 justify-center ${activeTab === tab.id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Users,         label: 'Team Members',     value: stats.team,         color: 'blue',   sub: 'Active co-founders' },
                { icon: Crown,         label: 'Pending Apps',     value: stats.pendingApps,  color: 'amber',  sub: 'Awaiting review' },
                { icon: ClipboardList, label: 'Total Tasks',      value: stats.totalTasks,   color: 'violet', sub: 'Across all users' },
                { icon: CheckCircle2,  label: 'Task Completion',  value: `${progress}%`,     color: 'emerald', sub: `${stats.completedTasks}/${stats.totalTasks} done` },
              ].map(({ icon: Icon, label, value, color, sub }) => (
                <div key={label} className={`bg-white dark:bg-gray-900 p-6 rounded-[2rem] border shadow-sm transition-all hover:shadow-md ${
                  color === 'blue' ? 'border-blue-200 dark:border-blue-500/20' :
                  color === 'amber' ? 'border-amber-200 dark:border-amber-500/20' :
                  color === 'violet' ? 'border-violet-200 dark:border-violet-500/20' :
                  'border-emerald-200 dark:border-emerald-500/20'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                    color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                    color === 'violet' ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' :
                    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 font-medium">{sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Review Applications', desc: 'Accept or decline co-founder requests', icon: Crown, tab: 'applications', color: 'amber' },
                { label: 'Manage Team Tasks',   desc: 'Assign and track all team objectives',  icon: ClipboardList, tab: 'tasks', color: 'violet' },
                { label: 'Browse Users',         desc: 'View all platform members and their roles', icon: Users, tab: 'users', color: 'blue' },
              ].map(({ label, desc, icon: Icon, tab, color }) => (
                <button key={label} onClick={() => setActiveTab(tab)}
                  className="flex items-start gap-4 p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-500/40 hover:shadow-md transition-all text-left group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' :
                    color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' :
                    'bg-violet-50 dark:bg-violet-900/20 text-violet-500'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{label}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── APPLICATIONS ──────────────────────────────────────────────────────── */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Crown size={20} className="text-amber-500" /> Co-Founder Applications
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({applications.length})</span>
              </h2>
              <button onClick={fetchApplications} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 transition-all">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {appsLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
            ) : applications.length === 0 ? (
              <div className="py-16 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <Crown size={40} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">No applications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map(app => (
                  <div key={app.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 uppercase">
                          {app.profiles?.avatar_url
                            ? <Image src={app.profiles.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" />
                            : app.profiles?.username?.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">@{app.profiles?.username || 'Unknown'}</p>
                            <Badge color={statusColor(app.status)}>{app.status}</Badge>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {app.role === 'cofounder' ? 'Co-Founder Application' : 'Member Application'} · {getRelativeTime(app.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                          className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 transition-all"
                        >
                          {selectedApp?.id === app.id ? 'Close' : 'View'}
                        </button>
                        {app.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApplicationAction(app.id, 'declined', app.user_id, app.role)}
                              disabled={appActionLoading}
                              className="px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl text-xs font-bold border border-red-200 dark:border-red-500/20 transition-all disabled:opacity-50"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleApplicationAction(app.id, 'accepted', app.user_id, app.role)}
                              disabled={appActionLoading}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1"
                            >
                              {appActionLoading ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                              Accept
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {selectedApp?.id === app.id && app.reason && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                        {Object.entries(typeof app.reason === 'string' ? (() => { try { return JSON.parse(app.reason); } catch { return { Response: app.reason }; } })() : (app.reason || {})).map(([q, a]) => (
                          <div key={q}>
                            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">{q}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{String(a)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── USERS ─────────────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={20} className="text-blue-500" /> Platform Users
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({filteredUsers.length})</span>
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={fetchUsers} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 transition-all">
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search users by name or status…"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {usersLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                    <div className="relative w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 uppercase">
                      {user.avatar_url
                        ? <Image src={user.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" />
                        : user.username?.substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">@{user.username}</p>
                        {user.is_admin && <Badge color="amber2">Admin</Badge>}
                        {user.role && user.role !== 'member' && <Badge color="violet">{user.role}</Badge>}
                        {user.is_verified && <Badge color="blue">✓</Badge>}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 truncate">{user.status || 'Active'}</p>
                    </div>
                    <button
                      onClick={() => { setActiveTab('tasks'); setTaskForm(prev => ({ ...prev, assignee_id: user.id })); setShowTaskModal(true); }}
                      className="shrink-0 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-[11px] font-bold border border-gray-200 dark:border-gray-700 transition-all"
                    >
                      Assign Task
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TASKS ─────────────────────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <ClipboardList size={20} className="text-violet-500" /> All Tasks
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({filteredTasks.length})</span>
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={fetchTasks} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 transition-all">
                  <RefreshCw size={12} /> Refresh
                </button>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Plus size={14} /> Assign Task
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit">
              {['all', 'pending', 'completed', 'high'].map(f => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${taskFilter === f ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {tasksLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-16 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <ClipboardList size={40} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">No tasks found</p>
                <button onClick={() => setShowTaskModal(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all">
                  Assign First Task
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map(task => (
                  <div key={task.id} className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 transition-all hover:shadow-md ${task.status === 'completed' ? 'border-gray-100 dark:border-gray-800 opacity-75' : 'border-gray-200 dark:border-gray-700 hover:border-blue-500/30'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className={`font-bold text-sm ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{task.title}</h3>
                          <Badge color={statusColor(task.status)}>{task.status?.replace('_', ' ')}</Badge>
                          {task.priority && task.status !== 'completed' && (
                            <Badge color={priorityColor(task.priority)}>{task.priority}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{task.description}</p>

                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                          {task.assignee && (
                            <div className="flex items-center gap-1.5">
                              <div className="relative w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center text-[8px] font-bold text-gray-500">
                                {task.assignee.avatar_url ? <Image src={task.assignee.avatar_url} alt="a" fill sizes="20px" className="object-cover" /> : task.assignee.username?.substring(0, 2).toUpperCase()}
                              </div>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">→ @{task.assignee.username}</span>
                            </div>
                          )}
                          {task.assigner && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium">by @{task.assigner.username}</span>
                          )}
                          <span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium flex items-center gap-1">
                            <Clock size={10} /> {getRelativeTime(task.created_at)}
                          </span>
                        </div>
                      </div>

                      {task.status !== 'completed' && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                            className="p-2 bg-gray-50 dark:bg-gray-800 hover:bg-emerald-500 text-gray-400 hover:text-white border border-gray-200 dark:border-gray-700 hover:border-emerald-500 rounded-xl transition-all"
                            title="Mark complete"
                          >
                            <Check size={16} />
                          </button>
                          {task.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                              className="px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Start
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Assign Task Modal ──────────────────────────────────────────────────── */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTaskModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowTaskModal(false)} className="absolute top-5 right-5 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors">
              <X size={18} />
            </button>
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <ClipboardList size={20} className="text-violet-500" /> Assign Task
            </h2>
            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Assign To *</label>
                <select
                  required
                  value={taskForm.assignee_id}
                  onChange={e => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a user…</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>@{u.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Title *</label>
                <input
                  required
                  type="text"
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Task title…"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Description</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Add context and details…"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all resize-none text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-gray-500 dark:text-gray-400 [color-scheme:dark]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={taskProcessing || !taskForm.assignee_id || !taskForm.title}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {taskProcessing ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={16} /> Assign Task</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
