"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, Clock, ArrowRight, LayoutDashboard, Loader2, Check, Plus, X,
  Calendar, AlertCircle, BellRing, Flag, FileText, Link as LinkIcon, Search,
  ChevronRight, Zap, Hash, Inbox, Shield, Filter, Play, Pause, Square,
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

// ── CircularProgress helper ───────────────────────────────────────────────────
function CircularProgress({ rings }: { rings: { value: number; max: number; color: string; r: number; sw: number }[] }) {
  const S = 160, C = S / 2;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      {rings.map(({ value, max, color, r, sw }, i) => {
        const circ = 2 * Math.PI * r;
        const fill = Math.min(value / (max || 1), 1) * circ;
        return (
          <g key={i}>
            <circle cx={C} cy={C} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
            <circle cx={C} cy={C} r={r} fill="none" stroke={color} strokeWidth={sw}
              strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
              transform={`rotate(-90 ${C} ${C})`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
          </g>
        );
      })}
    </svg>
  );
}

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
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      // Run admin check and application check in parallel to eliminate sequential round trips
      const [{ data: profileCheck }, { data: apps }] = await Promise.all([
        supabase.from('profiles').select('is_admin').eq('id', session.user.id).single(),
        supabase.from('founder_applications')
          .select('status, intended_role')
          .eq('user_id', session.user.id)
          .eq('status', 'accepted')
          .in('intended_role', ['member', 'cofounder']),
      ]);

      if (!active) return;

      if (!profileCheck?.is_admin) {
        const memberApp = apps?.find((a: any) => a.intended_role === 'member');
        if (!memberApp) {
          const founderApp = apps?.find((a: any) => a.intended_role === 'cofounder');
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

  // Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    if (newStatus === 'completed') setCompletingId(taskId);
    // Capture task data synchronously before any async delay to avoid stale closure
    const task = tasks.find(t => t.id === taskId);
    const actorId = sessionUser?.id;
    const delay = newStatus === 'completed' ? 300 : 0;
    await new Promise(r => setTimeout(r, delay));
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (!error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      if (task?.assigner_id && task.assigner_id !== actorId) {
        await supabase.from('notifications').insert({
          receiver_id: task.assigner_id, actor_id: actorId, type: 'message',
          content: newStatus === 'in_progress'
            ? `started working on "${task.title}".`
            : `completed "${task.title}".`,
          unread: true,
        });
      }
    }
    if (newStatus === 'completed') setCompletingId(null);
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
    const ids = updates.filter(u => u.unread === true).map(u => u.id);
    if (!ids.length || !sessionUser) return;
    await supabase.from('notifications').update({ unread: false }).in('id', ids);
    setUpdates(prev => prev.map(u => ({ ...u, unread: false })));
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const pendingTasks    = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks  = tasks.filter(t => t.status === 'completed');
  const highCount       = pendingTasks.filter(t => t.priority?.toLowerCase() === 'high' || isOverdue(t.due_date)).length;
  const todayCount      = tasks.filter(t => isDueToday(t.due_date) && t.status !== 'completed').length;
  const completionRatio = tasks.length ? completedTasks.length / tasks.length : 0;
  const unreadCount     = updates.filter(u => u.unread === true).length;

  const filteredTasks = tasks.filter(t => {
    const matchFilter =
      filter === 'pending'   ? (t.status === 'pending' || t.status === 'in_progress') :
      filter === 'completed' ? t.status === 'completed' :
      filter === 'high'      ? ((t.priority?.toLowerCase() === 'high' || isOverdue(t.due_date)) && t.status !== 'completed') :
      filter === 'today'     ? (isDueToday(t.due_date) && t.status !== 'completed') : true;
    const matchSearch = !searchQuery ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  }).sort((a, b) => {
    const p: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return (p[b.priority?.toLowerCase() || 'medium'] || 0) - (p[a.priority?.toLowerCase() || 'medium'] || 0);
  });

  const username  = userProfile?.username || sessionUser?.user_metadata?.username || 'Node';
  const avatarUrl = userProfile?.avatar_url;
  const hour      = currentTime.getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const formatTimer = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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
    <div className="min-h-screen font-sans text-gray-900"
      style={{
        background: '#F3F4F6',
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.045) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}>
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
        .filter-scroll { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; padding-bottom:2px; }
        .filter-scroll::-webkit-scrollbar { display:none; }
        .filter-scroll button { flex-shrink:0; }
      ` }} />

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-4 pb-8">

        {/* ── HEADER CARD ── */}
        <div className="relative overflow-hidden rounded-3xl p-6 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)' }}>
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-white font-black text-xl shrink-0"
                style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.15)' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                  : username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-300">Member Workspace</span>
                  <span className="flex items-center gap-1 text-[9px] font-black text-emerald-300 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {greeting}, <span className="text-indigo-200">@{username}</span>
                </h1>
                <p className="text-indigo-300/70 text-xs sm:text-sm mt-0.5 font-medium">
                  {pendingTasks.length > 0
                    ? `${pendingTasks.length} active task${pendingTasks.length > 1 ? 's' : ''}${highCount > 0 ? ` · ${highCount} urgent` : ''}`
                    : 'All caught up — great work.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2 sm:mt-0">
              {[
                { label: 'Done',   value: `${Math.round(completionRatio * 100)}%`, cls: 'bg-white/10 text-white border-white/10' },
                { label: 'Active', value: pendingTasks.length, cls: 'bg-indigo-500/30 text-indigo-100 border-indigo-300/20' },
                { label: 'Today',  value: todayCount, cls: todayCount > 0 ? 'bg-rose-500/20 text-rose-200 border-rose-300/10' : 'bg-white/[0.07] text-white/50 border-white/[0.06]' },
              ].map(chip => (
                <div key={chip.label} className={`px-3 py-2 rounded-xl border text-center min-w-[58px] ${chip.cls}`}>
                  <p className="text-[8px] font-bold opacity-70 uppercase tracking-wider">{chip.label}</p>
                  <p className="text-lg font-black leading-tight">{chip.value}</p>
                </div>
              ))}
              <button onClick={() => { setIsModalOpen(true); setSubmitError(''); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-black transition-all border border-white/15 active:scale-95">
                <Plus size={12} /> Report Issue
              </button>
              <Link href="/dash"
                className="flex items-center gap-1 px-3 py-2 bg-white text-indigo-600 rounded-xl text-xs font-black transition-all hover:bg-white/90 active:scale-95">
                Network <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── BENTO ROW 1 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Widget A: Quick Tasks */}
          <div className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">My Tasks</p>
                <p className="text-3xl font-black text-gray-900">{pendingTasks.length}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <LayoutDashboard size={16} className="text-indigo-500" />
              </div>
            </div>
            <div className="flex-1 space-y-1.5 min-h-[120px]">
              {pendingTasks.slice(0, 4).map(task => {
                const pKey = (task.priority?.toLowerCase() || 'low') as keyof typeof PRIORITY;
                return (
                  <div key={task.id} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                    <button onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                      className="w-4 h-4 rounded-md border-2 border-gray-300 hover:border-indigo-400 shrink-0 transition-colors" />
                    <span className="text-xs font-medium text-gray-800 flex-1 truncate">{task.title}</span>
                    <span className={`text-[9px] font-black px-1.5 py-px rounded-md border ${PRIORITY[pKey].badge}`}>
                      {PRIORITY[pKey].label}
                    </span>
                  </div>
                );
              })}
              {pendingTasks.length === 0 && (
                <div className="py-6 text-center">
                  <CheckCircle2 size={24} className="text-indigo-200 mx-auto mb-1.5" />
                  <p className="text-xs text-gray-400 font-medium">All tasks complete</p>
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
                <span>Completion</span>
                <span className="font-black text-indigo-500">{Math.round(completionRatio * 100)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                  style={{ width: `${completionRatio * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Widget B: Focus Timer (indigo/violet) */}
          <div className="rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center gap-4 min-h-[220px]"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Focus Timer</p>
            <p className="text-5xl font-black text-white tabular-nums tracking-tight font-mono">
              {formatTimer(timerSeconds)}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setTimerRunning(r => !r)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-black transition-all active:scale-95 border border-white/10">
                {timerRunning ? <Pause size={13} /> : <Play size={13} />}
                {timerRunning ? 'Pause' : timerSeconds > 0 ? 'Resume' : 'Start'}
              </button>
              {timerSeconds > 0 && !timerRunning && (
                <button onClick={() => setTimerSeconds(0)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95">
                  <Square size={13} />
                </button>
              )}
            </div>
            <p className="text-[10px] text-indigo-300/70 font-medium">
              {timerRunning ? 'Stay focused...' : timerSeconds > 0 ? 'Paused' : 'Start a focus session'}
            </p>
          </div>

          {/* Widget C: My Progress (dark) */}
          <div className="bg-[#121212] rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">My Progress</p>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <CircularProgress rings={[
                  { value: completionRatio * 100, max: 100, color: '#6366f1', r: 56, sw: 8 },
                  { value: pendingTasks.length, max: Math.max(tasks.length, 1), color: '#8b5cf6', r: 42, sw: 7 },
                  { value: highCount, max: Math.max(pendingTasks.length, 1), color: '#06b6d4', r: 29, sw: 6 },
                ]} />
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Completed', value: completedTasks.length, color: '#6366f1' },
                  { label: 'Active',    value: pendingTasks.length,   color: '#8b5cf6' },
                  { label: 'Urgent',    value: highCount,             color: '#06b6d4' },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{m.label}</p>
                    </div>
                    <p className="text-2xl font-black text-white tabular-nums">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── BENTO ROW 2 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Widget D: Activity Feed */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <BellRing size={14} className="text-indigo-500" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full text-[7px] font-black text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-black text-gray-900">Activity</h2>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md">{unreadCount} new</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead}
                  className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-wider transition-colors">
                  Clear all
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto thin-scroll p-3 space-y-2">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="p-3 bg-gray-50 rounded-2xl animate-pulse space-y-2">
                    <div className="h-2.5 bg-gray-200 rounded w-1/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-full" />
                  </div>
                ))
              ) : updates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Inbox size={24} className="text-gray-200 mb-2" />
                  <p className="text-xs font-bold text-gray-400">No updates yet</p>
                </div>
              ) : updates.slice(0, 10).map((upd, i) => {
                if (!upd?.id) return null;
                const isWarn = upd.type === 'warning' || upd.type === 'alert' || upd.type === 'system_error'
                  || upd.content?.toLowerCase().includes('high priority')
                  || upd.content?.toLowerCase().includes('urgent');
                const cfg = NOTIF_ICON[upd.type as keyof typeof NOTIF_ICON] || NOTIF_ICON.message;
                const { Icon: NIcon } = cfg;
                return (
                  <div key={upd.id}
                    className={`relative p-3 rounded-2xl border transition-all anim-fade-up ${upd.unread === true
                      ? isWarn
                        ? 'bg-rose-50/50 border-rose-200 border-l-2 border-l-rose-500'
                        : 'bg-indigo-50/50 border-indigo-200 border-l-2 border-l-indigo-500'
                      : 'bg-gray-50 border-gray-100'}`}
                    style={{ animationDelay: `${i * 30}ms` }}>
                    {upd.unread === true && <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                    <div className="flex items-start gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isWarn ? 'bg-rose-50' : cfg.bg}`}>
                        <NIcon size={11} className={isWarn ? 'text-rose-500' : cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1 mb-0.5">
                          <p className={`text-[9px] font-black uppercase tracking-widest ${isWarn ? 'text-rose-500' : 'text-indigo-500'}`}>
                            {upd.actor?.username ? `@${upd.actor.username}` : 'SYSTEM'}
                          </p>
                          <span className="text-[9px] text-gray-400 font-mono shrink-0">{getRelativeTime(upd.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{upd.content}</p>
                        {(upd.url || upd.more_content_url) && (
                          <a href={upd.url || upd.more_content_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 mt-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                            <LinkIcon size={9} /> View
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Widget E: Task Board (2 col) */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
            <div className="px-5 py-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-gray-900">Task Board</h2>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                    {filteredTasks.length}
                  </span>
                </div>
                <button onClick={() => { setIsModalOpen(true); setSubmitError(''); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-black transition-all active:scale-95">
                  <Plus size={11} /> New
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search tasks…"
                  className="w-full pl-8 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 transition-colors" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="filter-scroll">
                {[
                  { key: 'all',       label: 'All',    count: tasks.length          },
                  { key: 'pending',   label: 'Active', count: pendingTasks.length   },
                  { key: 'today',     label: 'Today',  count: todayCount            },
                  { key: 'high',      label: 'Urgent', count: highCount             },
                  { key: 'completed', label: 'Done',   count: completedTasks.length },
                ].map(f => (
                  <button key={f.key} onClick={() => setFilter(f.key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all border
                      ${filter === f.key
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                        : 'bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {f.label}
                    <span className={`text-[9px] font-black px-1 rounded ${filter === f.key ? 'text-indigo-200' : 'text-gray-400'}`}>{f.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto thin-scroll p-4 space-y-2">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="p-4 bg-gray-50 rounded-2xl animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-2/5 mb-2" />
                    <div className="h-2.5 bg-gray-100 rounded w-full" />
                  </div>
                ))
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 size={28} className="text-indigo-100 mb-3" />
                  <p className="text-sm font-black text-gray-700">
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
                      className={`group relative bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden transition-all duration-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 hover:-translate-y-px anim-fade-up ${isCompleting ? 'anim-complete' : ''}`}
                      style={{ animationDelay: `${i * 25}ms` }}>
                      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${task.status === 'completed' ? 'bg-emerald-400' : p.bar}`} />
                      <div className="pl-4 pr-3 py-3.5 flex items-start gap-3">
                        <button
                          onClick={() => task.status !== 'completed' && handleUpdateTaskStatus(task.id, 'completed')}
                          className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                            ${task.status === 'completed'
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-300 hover:border-indigo-400'}`}>
                          {task.status === 'completed' && <Check size={11} strokeWidth={3} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className={`text-sm font-semibold leading-snug ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
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

                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mt-0.5">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {task.due_date && (
                              <span className={`flex items-center gap-1 text-[10px] font-mono font-medium ${overdue ? 'text-red-500' : dueToday ? 'text-amber-500' : 'text-gray-400'}`}>
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
                                <span className="text-[10px] text-gray-400 font-medium">@{task.assigner.username}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {task.status === 'pending' && (
                          <button onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                            className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 text-[10px] font-black text-indigo-500 hover:text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-all">
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

        </div>
      </div>

      {/* ── FAB — visible only on mobile (desktop uses nav button) ── */}
      <button onClick={() => { setIsModalOpen(true); setSubmitError(''); }}
        className="sm:hidden fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl shadow-indigo-600/25 font-black text-sm transition-all hover:scale-105 active:scale-95 z-40"
        title="Report Issue (N)">
        <Plus size={17} /> Report Issue
      </button>

      {/* ── SHORTCUTS OVERLAY ── */}
      {showShortcuts && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-xs bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 anim-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Zap size={13} className="text-indigo-500" />
              </div>
              <h3 className="text-sm font-black text-gray-900">Keyboard Shortcuts</h3>
            </div>
            <div className="space-y-2.5">
              {[
                { key: 'N',   desc: 'Report new issue'    },
                { key: '?',   desc: 'Toggle this panel'   },
                { key: 'Esc', desc: 'Close modal / panel' },
              ].map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{s.desc}</span>
                  <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md text-[11px] font-mono font-bold text-gray-700">{s.key}</kbd>
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
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl anim-slide-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-black flex items-center gap-2 text-gray-900">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Flag size={13} className="text-indigo-500" />
                </div>
                Report Issue
              </h2>
              <button onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Title</label>
                <input required type="text" value={newTaskForm.title}
                  onChange={e => { setSubmitError(''); setNewTaskForm({ ...newTaskForm, title: e.target.value }); }}
                  placeholder="Brief summary of the issue…"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Details</label>
                <textarea required rows={3} value={newTaskForm.description}
                  onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  placeholder="Steps to reproduce, expected vs actual behavior…"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 transition-colors resize-none thin-scroll"
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
                        className={`py-2 rounded-xl text-xs font-black border transition-all ${active ? `${cfg.badge} shadow-sm` : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {submitError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
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
