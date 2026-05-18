"use client";

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, Clock, ArrowRight, LayoutDashboard, Loader2, Check, Plus, X,
  Calendar, AlertCircle, BellRing, Flag, FileText, Link as LinkIcon, Search,
  ChevronRight, Zap, Hash, Inbox, Shield, Filter,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../supabaseClient';

// ── Helpers ──────────────────────────────────────────────────────────────────

const getRelativeTime = (dateStr: string) => {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const formatDueDate = (dateStr: string) =>
  !dateStr ? '' : new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const isOverdue = (dateStr: string) => {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  due.setHours(23, 59, 59, 999);
  return Date.now() > due.getTime();
};

const isDueToday = (dateStr: string) => {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
};

// ── Config ───────────────────────────────────────────────────────────────────

const PRIORITY: Record<string, { bar: string; badge: string; dot: string; label: string }> = {
  high:   { bar: 'bg-rose-500',   badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20',   dot: 'bg-rose-500',   label: 'High'   },
  medium: { bar: 'bg-amber-500',  badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20', dot: 'bg-amber-500',  label: 'Medium' },
  low:    { bar: 'bg-slate-400',  badge: 'bg-slate-500/10 text-slate-500 border-slate-500/20', dot: 'bg-slate-400',  label: 'Low'    },
};

const NOTIF_ICON: Record<string, { Icon: any; color: string; bg: string }> = {
  message:      { Icon: BellRing,       color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10'  },
  task:         { Icon: LayoutDashboard,color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10'  },
  warning:      { Icon: AlertCircle,    color: 'text-rose-500',   bg: 'bg-rose-50 dark:bg-rose-500/10'      },
  alert:        { Icon: AlertCircle,    color: 'text-rose-500',   bg: 'bg-rose-50 dark:bg-rose-500/10'      },
  system_error: { Icon: Shield,         color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-500/10'        },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MemberDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    typeof window !== 'undefined' && sessionStorage.getItem('member_auth') === 'true'
  );
  const [sessionUser, setSessionUser] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(sessionStorage.getItem('member_session_user') || 'null'); } catch { return null; }
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(sessionStorage.getItem('member_dashboard_tasks') || '[]'); } catch { return []; }
  });
  const [updates, setUpdates] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(sessionStorage.getItem('member_dashboard_updates') || '[]'); } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(() =>
    typeof window !== 'undefined' ? !sessionStorage.getItem('member_dashboard_tasks') : true
  );
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({ title: '', description: '', priority: 'medium' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Live clock
  useEffect(() => {
    const iv = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  // ── Data fetch + realtime ──────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    let sub: any = null;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) {
        sessionStorage.removeItem('member_auth');
        sessionStorage.removeItem('member_session_user');
        router.push('/');
        return;
      }

      // Admins can access any dashboard for preview purposes
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

      if (!active) return;

      if (!profileCheck?.is_admin) {
        // Verify this user has an accepted co-member application
        const { data: memberApp } = await supabase
          .from('founder_applications')
          .select('status')
          .eq('user_id', session.user.id)
          .eq('status', 'accepted')
          .eq('intended_role', 'member')
          .limit(1)
          .single();

        if (!active) return;
        if (!memberApp) {
          // Check if they're a co-founder and redirect them accordingly
          const { data: founderApp } = await supabase
            .from('founder_applications')
            .select('status')
            .eq('user_id', session.user.id)
            .eq('status', 'accepted')
            .eq('intended_role', 'cofounder')
            .limit(1)
            .single();
          sessionStorage.removeItem('member_auth');
          sessionStorage.removeItem('member_session_user');
          router.push(founderApp ? '/founder-dashboard' : '/dash/feed');
          return;
        }
      }

      setIsAuthenticated(true);
      sessionStorage.setItem('member_auth', 'true');
      setSessionUser(session.user);
      sessionStorage.setItem('member_session_user', JSON.stringify(session.user));

      const [{ data: tasksData }, { data: notifData }, { data: profile }] = await Promise.all([
        supabase.from('tasks')
          .select('*, assigner:profiles!tasks_assigner_id_fkey(username, avatar_url)')
          .eq('assignee_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase.from('notifications')
          .select('*, actor:actor_id(username)')
          .eq('receiver_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('profiles')
          .select('username, avatar_url, is_verified, is_premium')
          .eq('id', session.user.id)
          .single(),
      ]);

      if (!active) return;
      if (tasksData) { setTasks(tasksData); sessionStorage.setItem('member_dashboard_tasks', JSON.stringify(tasksData)); }
      if (notifData) { setUpdates(notifData); sessionStorage.setItem('member_dashboard_updates', JSON.stringify(notifData)); }
      if (profile) setUserProfile(profile);
      setIsLoading(false);

      sub = supabase.channel(`member_tasks_${session.user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `assignee_id=eq.${session.user.id}` }, async (payload) => {
          if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
            const n = payload.new as any;
            const o = payload.old as any;
            if (n.priority?.toLowerCase() === 'high' && n.status !== 'completed' && !o?.priority
              && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('High Priority Task', { body: `New: ${n.title}` });
            }
          }
          const { data } = await supabase.from('tasks')
            .select('*, assigner:profiles!tasks_assigner_id_fkey(username, avatar_url)')
            .eq('assignee_id', session.user.id).order('created_at', { ascending: false });
          if (active && data) setTasks(data);
        }).subscribe();
    })();

    return () => { active = false; if (sub) supabase.removeChannel(sub); };
  }, [router]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if ((e.key === 'n' || e.key === 'N') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        e.preventDefault(); setIsModalOpen(true); setSubmitError('');
      }
      if (e.key === 'Escape') { setIsModalOpen(false); setShowShortcuts(false); }
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(tag)) {
        e.preventDefault(); setShowShortcuts(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    if (newStatus === 'completed') setCompletingId(taskId);
    setTimeout(async () => {
      const task = tasks.find(t => t.id === taskId);
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (!error) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        if (task?.assigner_id && task.assigner_id !== sessionUser?.id) {
          await supabase.from('notifications').insert({
            receiver_id: task.assigner_id, actor_id: sessionUser?.id, type: 'message',
            content: newStatus === 'in_progress'
              ? `started working on "${task.title}".`
              : `completed "${task.title}".`,
          });
        }
      }
      if (newStatus === 'completed') setCompletingId(null);
    }, newStatus === 'completed' ? 300 : 0);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('tasks').insert({
        ...newTaskForm, assignee_id: sessionUser.id, assigner_id: sessionUser.id, status: 'pending',
      }).select().single();
      if (error) throw new Error(error.message || JSON.stringify(error));

      const assignerIds: string[] = Array.from(new Set(
        tasks.map((t: any) => t.assigner_id).filter((id: string) => id && id !== sessionUser.id)
      ));
      let recipientIds = assignerIds;
      if (!recipientIds.length) {
        const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true);
        recipientIds = (admins || []).map((a: any) => a.id);
      }
      if (recipientIds.length) {
        await supabase.from('notifications').insert(
          recipientIds.map(rid => ({
            receiver_id: rid, actor_id: sessionUser.id, type: 'message',
            content: `reported issue: "${newTaskForm.title}" [${newTaskForm.priority.toUpperCase()}]${newTaskForm.description ? ` — ${newTaskForm.description}` : ''}`,
          }))
        );
      }
      setTasks([data, ...tasks]);
      setIsModalOpen(false);
      setNewTaskForm({ title: '', description: '', priority: 'medium' });
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAllRead = async () => {
    const ids = updates.filter(u => !u.read).map(u => u.id);
    if (!ids.length || !sessionUser) return;
    await supabase.from('notifications').update({ read: true }).in('id', ids);
    setUpdates(prev => prev.map(u => ({ ...u, read: true })));
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const pendingTasks    = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks  = tasks.filter(t => t.status === 'completed');
  const highCount       = pendingTasks.filter(t => t.priority?.toLowerCase() === 'high' || isOverdue(t.due_date)).length;
  const todayCount      = tasks.filter(t => isDueToday(t.due_date) && t.status !== 'completed').length;
  const completionRatio = tasks.length ? completedTasks.length / tasks.length : 0;
  const unreadCount     = updates.filter(u => !u.read).length;

  const filteredTasks = tasks.filter(t => {
    const matchFilter =
      filter === 'pending'   ? (t.status === 'pending' || t.status === 'in_progress') :
      filter === 'completed' ? t.status === 'completed' :
      filter === 'high'      ? ((t.priority?.toLowerCase() === 'high' || isOverdue(t.due_date)) && t.status !== 'completed') :
      filter === 'today'     ? isDueToday(t.due_date) : true;
    const matchSearch = !searchQuery ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  }).sort((a, b) => {
    const p: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return (p[b.priority?.toLowerCase() || 'medium'] || 0) - (p[a.priority?.toLowerCase() || 'medium'] || 0);
  });

  // Progress ring
  const R = 28, SW = 3.5, NR = R - SW * 2, CIRC = NR * 2 * Math.PI;
  const [dashOffset, setDashOffset] = useState(CIRC);
  useEffect(() => {
    const t = setTimeout(() => setDashOffset(CIRC - completionRatio * CIRC), 150);
    return () => clearTimeout(t);
  }, [completionRatio, CIRC]);

  const username  = userProfile?.username || sessionUser?.user_metadata?.username || 'Node';
  const avatarUrl = userProfile?.avatar_url;
  const hour      = currentTime.getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!mounted || (!isAuthenticated && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#09090b]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={20} />
          </div>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Loading workspace…</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#09090b] font-sans text-gray-900 dark:text-gray-100">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp { from { opacity:0; transform:translateY(14px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes scaleOut{ 0%{transform:scale(1);opacity:1;}50%{transform:scale(1.04);}100%{transform:scale(0.85);opacity:0;} }
        .anim-slide-up  { animation: slideUp 0.32s cubic-bezier(0.16,1,0.3,1) forwards; }
        .anim-fade-up   { opacity:0; animation: fadeUp 0.3s ease-out forwards; }
        .anim-complete  { animation: scaleOut 0.3s ease-out forwards; }
        .thin-scroll::-webkit-scrollbar{width:3px;}
        .thin-scroll::-webkit-scrollbar-track{background:transparent;}
        .thin-scroll::-webkit-scrollbar-thumb{background:rgba(99,102,241,.18);border-radius:2px;}
      ` }} />

      {/* ── STICKY NAV ── */}
      <nav className="sticky top-0 z-30 bg-white/80 dark:bg-[#09090b]/90 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/[0.05] px-4 sm:px-8 h-14 flex items-center">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Avatar + name */}
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-indigo-500/20">
                {avatarUrl
                  ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                  : username.slice(0, 2).toUpperCase()
                }
              </div>
              <span className="absolute -bottom-px -right-px w-2 h-2 bg-emerald-500 rounded-full border-[1.5px] border-white dark:border-[#09090b]" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[9px] text-gray-400 font-medium leading-none">{greeting}</p>
              <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">@{username}</p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <span className="hidden md:block text-[10px] text-gray-400 dark:text-gray-600 font-mono px-2">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button onClick={() => setShowShortcuts(v => !v)}
              className="w-7 h-7 rounded-lg text-[11px] font-black text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all flex items-center justify-center">
              ?
            </button>
            <button onClick={() => { setIsModalOpen(true); setSubmitError(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black transition-all shadow-sm shadow-indigo-500/20 active:scale-95">
              <Plus size={12} /> New Issue
            </button>
            <Link href="/dash"
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.09] text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold transition-all">
              Network <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-5">

        {/* ── HERO ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-6 sm:p-8 shadow-xl shadow-indigo-500/20">
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-black text-indigo-200/60 uppercase tracking-[0.3em]">Member Workspace</span>
                <span className="flex items-center gap-1 text-[9px] font-black text-emerald-300 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {greeting}, <span className="text-indigo-200">@{username}</span>
              </h1>
              <p className="text-indigo-200/60 text-sm mt-1.5 font-medium">
                {pendingTasks.length > 0
                  ? `${pendingTasks.length} open task${pendingTasks.length > 1 ? 's' : ''}${highCount > 0 ? ` · ${highCount} need${highCount === 1 ? 's' : ''} attention` : ''}`
                  : 'All tasks complete — great work.'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              {[
                { label: 'Done',    value: `${Math.round(completionRatio * 100)}%`, cls: 'bg-white/10 text-white border-white/10' },
                { label: 'Active',  value: pendingTasks.length,  cls: 'bg-amber-500/20 text-amber-200 border-amber-300/10' },
                { label: 'Today',   value: todayCount,           cls: todayCount > 0 ? 'bg-rose-500/20 text-rose-200 border-rose-300/10' : 'bg-white/[0.07] text-white/50 border-white/[0.06]' },
              ].map(chip => (
                <div key={chip.label} className={`px-4 py-2 rounded-xl border text-center min-w-[68px] ${chip.cls}`}>
                  <p className="text-[9px] font-bold opacity-70 uppercase tracking-wider">{chip.label}</p>
                  <p className="text-xl font-black leading-tight">{chip.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Active tasks */}
          <button onClick={() => setFilter('pending')}
            className="group text-left bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.05] rounded-2xl p-5 hover:border-amber-300/70 dark:hover:border-amber-500/25 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <Clock size={17} className="text-amber-500" />
              </div>
              <ChevronRight size={13} className="text-gray-300 dark:text-gray-700 group-hover:text-amber-400 transition-colors" />
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{pendingTasks.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mt-0.5">Active Tasks</p>
            <div className="mt-3.5 h-1 bg-gray-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all duration-700"
                style={{ width: tasks.length ? `${(pendingTasks.length / tasks.length) * 100}%` : '0%' }} />
            </div>
          </button>

          {/* Completion */}
          <button onClick={() => setFilter('completed')}
            className="group text-left bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.05] rounded-2xl p-5 hover:border-emerald-300/70 dark:hover:border-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                <svg height={R * 2} width={R * 2} className="absolute inset-0 -rotate-90">
                  <circle stroke="currentColor" fill="transparent" strokeWidth={SW} r={NR} cx={R} cy={R} className="text-gray-100 dark:text-white/[0.05]" />
                  <circle stroke="currentColor" fill="transparent" strokeWidth={SW}
                    strokeDasharray={`${CIRC} ${CIRC}`}
                    style={{ strokeDashoffset: dashOffset, transition: 'stroke-dashoffset 1s cubic-bezier(0.65,0,0.35,1)' }}
                    r={NR} cx={R} cy={R} className="text-emerald-500" strokeLinecap="round" />
                </svg>
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 z-10">
                  {Math.round(completionRatio * 100)}%
                </span>
              </div>
              <ChevronRight size={13} className="text-gray-300 dark:text-gray-700 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{completedTasks.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mt-0.5">Completed</p>
            <div className="mt-3.5 h-1 bg-gray-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${completionRatio * 100}%` }} />
            </div>
          </button>

          {/* Attention */}
          <button onClick={() => setFilter('high')}
            className="group text-left bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.05] rounded-2xl p-5 hover:border-rose-300/70 dark:hover:border-rose-500/25 hover:shadow-lg hover:shadow-rose-500/5 hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                <AlertCircle size={17} className="text-rose-500" />
              </div>
              <ChevronRight size={13} className="text-gray-300 dark:text-gray-700 group-hover:text-rose-400 transition-colors" />
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{highCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mt-0.5">Need Attention</p>
            <div className="mt-3.5 h-1 bg-gray-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${highCount > 0 ? 'bg-rose-400' : 'bg-gray-100 dark:bg-white/[0.04]'}`}
                style={{ width: pendingTasks.length ? `${(highCount / pendingTasks.length) * 100}%` : '0%' }} />
            </div>
          </button>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Tasks Panel */}
          <div className="lg:col-span-2 bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.05] rounded-2xl flex flex-col min-h-[540px] overflow-hidden">
            {/* Panel header */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.04] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={14} className="text-indigo-500" />
                  <h2 className="text-sm font-black text-gray-900 dark:text-white">Task Backlog</h2>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded-md">
                    {filteredTasks.length}
                  </span>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 pointer-events-none" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search tasks…"
                  className="w-full pl-8 pr-8 py-2 text-xs bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/40 transition-colors" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { key: 'all',       label: 'All',    count: tasks.length         },
                  { key: 'pending',   label: 'Active', count: pendingTasks.length  },
                  { key: 'today',     label: 'Today',  count: todayCount           },
                  { key: 'high',      label: 'Urgent', count: highCount            },
                  { key: 'completed', label: 'Done',   count: completedTasks.length },
                ].map(f => (
                  <button key={f.key} onClick={() => setFilter(f.key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all border
                      ${filter === f.key
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                        : 'bg-transparent border-gray-200 dark:border-white/[0.05] text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04]'}`}>
                    {f.label}
                    <span className={`text-[9px] font-black px-1 rounded ${filter === f.key ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-600'}`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto thin-scroll p-4 space-y-2">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.03] animate-pulse">
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-2.5">
                        <div className="h-3 bg-gray-200 dark:bg-white/[0.07] rounded w-2/5" />
                        <div className="h-2.5 bg-gray-100 dark:bg-white/[0.04] rounded w-full" />
                        <div className="h-2.5 bg-gray-100 dark:bg-white/[0.04] rounded w-3/5" />
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-3">
                    <CheckCircle2 size={22} className="text-indigo-400" />
                  </div>
                  <p className="text-sm font-black text-gray-700 dark:text-gray-300">
                    {searchQuery ? 'No tasks match your search' : 'All clear!'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {searchQuery ? 'Try a different query.' : 'Nothing here for this filter.'}
                  </p>
                </div>
              ) : (
                filteredTasks.map((task, i) => {
                  const isCompleting = completingId === task.id;
                  const overdue  = task.status !== 'completed' && isOverdue(task.due_date);
                  const dueToday = task.status !== 'completed' && isDueToday(task.due_date) && !overdue;
                  const pKey = (task.priority?.toLowerCase() || 'low') as keyof typeof PRIORITY;
                  const p = PRIORITY[pKey] || PRIORITY.low;
                  return (
                    <div key={task.id}
                      className={`group relative bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] rounded-xl overflow-hidden transition-all duration-200 hover:border-indigo-200 dark:hover:border-indigo-500/20 hover:shadow-md hover:shadow-indigo-500/5 hover:-translate-y-px anim-fade-up ${isCompleting ? 'anim-complete' : ''}`}
                      style={{ animationDelay: `${i * 25}ms` }}>
                      {/* Priority bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${task.status === 'completed' ? 'bg-emerald-400' : p.bar}`} />

                      <div className="pl-4 pr-3 py-3.5 flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => task.status !== 'completed' && handleUpdateTaskStatus(task.id, 'completed')}
                          className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                            ${task.status === 'completed'
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500'}`}>
                          {task.status === 'completed' && <Check size={11} strokeWidth={3} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Title + badges */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className={`text-sm font-semibold leading-snug ${task.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-gray-100'}`}>
                              {task.title}
                            </span>
                            {task.status === 'in_progress' && (
                              <span className="shrink-0 flex items-center gap-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[9px] font-black uppercase px-1.5 py-px rounded-md">
                                <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" /> Active
                              </span>
                            )}
                            {task.status !== 'completed' && (
                              <span className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-px rounded-md border ${p.badge}`}>{p.label}</span>
                            )}
                            {overdue  && <span className="shrink-0 text-[9px] font-black uppercase px-1.5 py-px rounded-md bg-red-500/10 text-red-500 border border-red-500/20">Overdue</span>}
                            {dueToday && <span className="shrink-0 text-[9px] font-black uppercase px-1.5 py-px rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">Today</span>}
                          </div>

                          {task.linked_to && (
                            <p className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-gray-600 font-bold uppercase tracking-widest mb-1">
                              <Hash size={9} /> {task.linked_to}
                            </p>
                          )}

                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{task.description}</p>

                          {(task.url || task.more_content_url || task.moreContentUrl || task.moreContent) && (
                            <div className="flex gap-3 mt-2">
                              {task.url && (
                                <a href={task.url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                                  <LinkIcon size={10} /> View Link
                                </a>
                              )}
                              {(task.more_content_url || task.moreContentUrl || task.moreContent) && (
                                <a href={task.more_content_url || task.moreContentUrl || task.moreContent} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-indigo-500 transition-colors">
                                  <ArrowRight size={10} /> More Info
                                </a>
                              )}
                            </div>
                          )}

                          {/* Footer meta */}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {task.due_date && (
                              <span className={`flex items-center gap-1 text-[10px] font-mono font-medium ${overdue ? 'text-red-500' : dueToday ? 'text-amber-500' : 'text-gray-400 dark:text-gray-600'}`}>
                                <Calendar size={10} />
                                {overdue ? 'Overdue: ' : 'Due: '}{formatDueDate(task.due_date)}
                              </span>
                            )}
                            {task.assigner && (
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full overflow-hidden bg-gradient-to-br from-indigo-400 to-violet-500 shrink-0 flex items-center justify-center text-[7px] font-black text-white">
                                  {task.assigner.avatar_url
                                    ? <img src={task.assigner.avatar_url} alt="" className="w-full h-full object-cover" />
                                    : task.assigner.username?.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium">@{task.assigner.username}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Start button */}
                        {task.status === 'pending' && (
                          <button onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                            className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 text-[10px] font-black text-indigo-500 hover:text-indigo-600 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-2 py-1 rounded-lg transition-all">
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.05] rounded-2xl flex flex-col min-h-[540px] overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <BellRing size={14} className="text-gray-400 dark:text-gray-500" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full text-[7px] font-black text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-black text-gray-900 dark:text-white">Activity</h2>
              </div>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead}
                  className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-wider transition-colors">
                  Clear all
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto thin-scroll p-4 space-y-2">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="p-3.5 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.03] animate-pulse space-y-2">
                    <div className="h-2.5 bg-gray-200 dark:bg-white/[0.07] rounded w-1/4" />
                    <div className="h-2.5 bg-gray-100 dark:bg-white/[0.04] rounded w-full" />
                  </div>
                ))
              ) : updates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/[0.03] flex items-center justify-center mb-3">
                    <Inbox size={17} className="text-gray-300 dark:text-gray-700" />
                  </div>
                  <p className="text-xs font-bold text-gray-400">No updates yet</p>
                </div>
              ) : updates.map((upd, i) => {
                const isWarn = upd.type === 'warning' || upd.type === 'alert' || upd.type === 'system_error'
                  || upd.content?.toLowerCase().includes('high priority')
                  || upd.content?.toLowerCase().includes('urgent');
                const cfg = NOTIF_ICON[upd.type] || NOTIF_ICON.message;
                const { Icon: NotifIcon } = cfg;
                return (
                  <div key={upd.id}
                    className={`relative p-3.5 rounded-xl border transition-all anim-fade-up
                      ${!upd.read
                        ? isWarn
                          ? 'bg-rose-50/40 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20 border-l-2 border-l-rose-500'
                          : 'bg-indigo-50/40 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/20 border-l-2 border-l-indigo-500'
                        : 'bg-gray-50 dark:bg-white/[0.02] border-gray-100 dark:border-white/[0.04]'}`}
                    style={{ animationDelay: `${i * 30}ms` }}>
                    {!upd.read && <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />}
                    <div className="flex items-start gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isWarn ? 'bg-rose-50 dark:bg-rose-500/10' : cfg.bg}`}>
                        <NotifIcon size={13} className={isWarn ? 'text-rose-500' : cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1 mb-0.5">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${isWarn ? 'text-rose-500' : 'text-indigo-500'}`}>
                            {upd.actor?.username ? `@${upd.actor.username}` : 'SYSTEM'}
                          </p>
                          <span className="text-[9px] text-gray-400 dark:text-gray-600 font-mono shrink-0">{getRelativeTime(upd.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{upd.content}</p>
                        {(upd.url || upd.more_content_url || upd.moreContentUrl || upd.moreContent) && (
                          <div className="flex gap-3 mt-1.5">
                            {upd.url && (
                              <a href={upd.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                                <LinkIcon size={9} /> View
                              </a>
                            )}
                            {(upd.more_content_url || upd.moreContentUrl || upd.moreContent) && (
                              <a href={upd.more_content_url || upd.moreContentUrl || upd.moreContent} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-indigo-500 transition-colors">
                                <ArrowRight size={9} /> More
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── FAB ── */}
      <button onClick={() => { setIsModalOpen(true); setSubmitError(''); }}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl shadow-indigo-600/25 font-black text-sm transition-all hover:scale-105 active:scale-95 z-40"
        title="Report Issue (N)">
        <Plus size={17} /> Report Issue
      </button>

      {/* ── SHORTCUTS OVERLAY ── */}
      {showShortcuts && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-xs bg-white dark:bg-[#141416] border border-gray-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-5 anim-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                <Zap size={13} className="text-indigo-500" />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
            </div>
            <div className="space-y-2.5">
              {[
                { key: 'N',   desc: 'Create new issue'    },
                { key: '?',   desc: 'Toggle this panel'   },
                { key: 'Esc', desc: 'Close modal / panel' },
              ].map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{s.desc}</span>
                  <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] rounded-md text-[11px] font-mono font-bold text-gray-700 dark:text-gray-300">{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>, document.body
      )}

      {/* ── NEW ISSUE MODAL ── */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#141416] border border-gray-200 dark:border-white/[0.08] rounded-2xl shadow-2xl anim-slide-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
              <h2 className="text-base font-black flex items-center gap-2 text-gray-900 dark:text-white">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                  <Flag size={13} className="text-indigo-500" />
                </div>
                Report Issue
              </h2>
              <button onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400 transition-colors">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Title</label>
                <input required type="text" value={newTaskForm.title}
                  onChange={e => { setSubmitError(''); setNewTaskForm({ ...newTaskForm, title: e.target.value }); }}
                  placeholder="Brief summary of the issue…"
                  className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Details</label>
                <textarea required rows={3} value={newTaskForm.description}
                  onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  placeholder="Steps to reproduce, expected vs actual behavior…"
                  className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-colors resize-none thin-scroll"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(pv => {
                    const cfg = PRIORITY[pv];
                    const active = newTaskForm.priority === pv;
                    return (
                      <button key={pv} type="button" onClick={() => setNewTaskForm({ ...newTaskForm, priority: pv })}
                        className={`py-2 rounded-xl text-xs font-black border transition-all ${active ? `${cfg.badge} shadow-sm` : 'border-gray-200 dark:border-white/[0.06] text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.03]'}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {submitError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" /> {submitError}
                </div>
              )}
              <button type="submit" disabled={isSubmitting || !newTaskForm.title}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-black transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]">
                {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <><Plus size={14} /> Submit Issue</>}
              </button>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
