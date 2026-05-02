"use client";

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Code2, ArrowRight, LayoutDashboard, MessageSquare, Loader2, Check, Plus, X, Calendar, AlertCircle, BellRing, Flag, FileText } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../supabaseClient';

// Helpers
const getRelativeTime = (dateStr: string) => {
  if (!dateStr) return '';
  const diff = (new Date().getTime() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
};

const formatDueDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isOverdue = (dateStr: string) => {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  due.setHours(23, 59, 59, 999);
  return new Date() > due;
};

export default function MemberDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  // New Feature States
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });

  useEffect(() => {
    setMounted(true);
    let isComponentMounted = true;
    let taskSubscription: any = null;

    // Request browser notification permissions on load
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkAuthAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!isComponentMounted) return;
      
      if (!session) {
        router.push('/');
      } else {
        setIsAuthenticated(true);
        setSessionUser(session.user);
        
        // Fetch User's Tasks
        const { data: tasksData } = await supabase.from('tasks').select('*, assigner:profiles!tasks_assigner_id_fkey(username, avatar_url)').eq('assignee_id', session.user.id).order('created_at', { ascending: false });
        if (isComponentMounted && tasksData) setTasks(tasksData);

        // Fetch System Updates / Notifications
        const { data: notifData } = await supabase.from('notifications').select('*, actor:actor_id(username)').eq('receiver_id', session.user.id).order('created_at', { ascending: false }).limit(5);
        if (isComponentMounted && notifData) setUpdates(notifData);

        // Real-time subscription for incoming tasks
        if (isComponentMounted) {
          taskSubscription = supabase.channel(`member_tasks_${session.user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `assignee_id=eq.${session.user.id}` }, async (payload) => {
               
               // Desktop Notification for High Priority Tasks
               if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
                 const newTask = payload.new as any;
                 const oldTask = payload.old as any;
                 const isHigh = newTask.priority?.toLowerCase() === 'high' && newTask.status !== 'completed';
                 const wasHigh = oldTask?.priority?.toLowerCase() === 'high';
                 
                 if (isHigh && !wasHigh && 'Notification' in window && Notification.permission === 'granted') {
                   new Notification('Attention Required', { body: `High priority task assigned: ${newTask.title}` });
                   
                   // Play a notification sound
                   const audio = new Audio('https://actions.google.com/sounds/v1/water/droplet_1.ogg');
                   audio.play().catch(e => console.warn('Audio playback blocked by browser:', e));
                 }
               }

               const { data } = await supabase.from('tasks').select('*, assigner:profiles!tasks_assigner_id_fkey(username, avatar_url)').eq('assignee_id', session.user.id).order('created_at', { ascending: false });
               if (isComponentMounted && data) setTasks(data);
            }).subscribe();
        }
      }
    };
    checkAuthAndFetchData();
    
    return () => {
      isComponentMounted = false;
      if (taskSubscription) supabase.removeChannel(taskSubscription);
    };
  }, [router]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'n' || e.key === 'N') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsModalOpen(true);
      }
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    if (newStatus === 'completed') setCompletingId(taskId);
    
    // Wait for the scale-down animation only if completing
    setTimeout(async () => {
      const task = tasks.find(t => t.id === taskId);
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (!error) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        
        // Notify the assigner if it's not the user themselves
        if (task && task.assigner_id && task.assigner_id !== sessionUser?.id) {
          await supabase.from('notifications').insert({
            receiver_id: task.assigner_id,
            actor_id: sessionUser?.id,
            type: 'message',
            content: newStatus === 'in_progress' 
              ? `started working on the task "${task.title}".` 
              : `marked the task "${task.title}" as completed.`
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
    const { data, error } = await supabase.from('tasks').insert({
      ...newTaskForm,
      assignee_id: sessionUser.id,
      status: 'pending'
    }).select().single();
    
    setIsSubmitting(false);
    if (!error && data) {
      setTasks([data, ...tasks]);
      setIsModalOpen(false);
      setNewTaskForm({ title: '', description: '', priority: 'medium', due_date: '' });
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = updates.filter(u => !u.read).map(u => u.id);
    if (unreadIds.length === 0 || !sessionUser) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setUpdates(prev => prev.map(u => ({ ...u, read: true })));
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return t.status === 'pending' || t.status === 'in_progress';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'high') return (t.priority?.toLowerCase() === 'high' || isOverdue(t.due_date)) && t.status !== 'completed';
    return true;
  }).sort((a, b) => {
    const p: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1 };
    return (p[b.priority?.toLowerCase() || 'medium'] || 0) - (p[a.priority?.toLowerCase() || 'medium'] || 0);
  });
  const unreadCount = updates.filter(u => !u.read).length;

  // Progress Ring logic
  const radius = 24;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const completionRatio = tasks.length ? (completedTasks.length / tasks.length) : 0;
  const [dashOffset, setDashOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDashOffset(circumference - completionRatio * circumference);
    }, 100);
    return () => clearTimeout(timer);
  }, [completionRatio, circumference]);

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-[#0d0d0f]"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0d0d0f] p-6 sm:p-10 animate-in fade-in duration-500 font-sans text-gray-900 dark:text-gray-100">
      {/* Inline Styles for Custom Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp { 0% { opacity: 0; transform: translateY(20px) scale(0.95); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes staggeredFade { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes scaleDownComplete { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); } 100% { transform: scale(0.8); opacity: 0; } }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-staggered-fade { opacity: 0; animation: staggeredFade 0.4s ease-out forwards; }
        .animate-complete { animation: scaleDownComplete 0.3s ease-out forwards; }
      `}} />

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#141416] p-8 rounded-[1.5rem] border border-gray-200 dark:border-[#222224] shadow-sm">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Member Workspace</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Welcome back, <span className="text-indigo-600 dark:text-indigo-400">@{sessionUser?.user_metadata?.username || 'Node'}</span>. Here is what is happening today.</p>
          </div>
          <Link href="/dash" className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-md active:scale-95 shrink-0">
            Return to Network <ArrowRight size={18} />
          </Link>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => setFilter('pending')}
            className="bg-white dark:bg-[#141416] p-6 rounded-[1.5rem] border border-gray-200 dark:border-[#222224] shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Pending Tasks</p>
              <p className="text-2xl font-bold">{pendingTasks.length} Assignments</p>
            </div>
          </div>
          
          <div 
            onClick={() => setFilter('completed')}
            className="bg-white dark:bg-[#141416] p-6 rounded-[1.5rem] border border-gray-200 dark:border-[#222224] shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 relative overflow-hidden cursor-pointer"
          >
            {/* Progress Ring */}
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg height={radius * 2} width={radius * 2} className="absolute inset-0 transform -rotate-90">
                <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} className="text-gray-100 dark:text-gray-800" />
                <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset: dashOffset, transition: 'stroke-dashoffset 0.8s cubic-bezier(0.65, 0, 0.35, 1)' }} r={normalizedRadius} cx={radius} cy={radius} className="text-emerald-500" strokeLinecap="round" />
              </svg>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{Math.round(completionRatio * 100)}%</span>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Completion</p>
              <p className="text-2xl font-bold">{completedTasks.length} Done</p>
            </div>
          </div>

          <div 
            onClick={() => setFilter('high')}
            className="bg-white dark:bg-[#141416] p-6 rounded-[1.5rem] border border-gray-200 dark:border-[#222224] shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Attention Required</p>
              <p className="text-2xl font-bold">{pendingTasks.filter(t => t.priority?.toLowerCase() === 'high' || isOverdue(t.due_date)).length} Issues</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks Panel */}
          <div className="lg:col-span-2 bg-white dark:bg-[#141416] p-6 sm:p-8 rounded-[1.5rem] border border-gray-200 dark:border-[#222224] shadow-sm min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2"><LayoutDashboard size={18} className="text-indigo-500"/> Task Backlog</h2>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {['all', 'pending', 'completed', 'high'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filter === f ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-transparent border-gray-200 dark:border-[#222224] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#222224] hover:text-gray-900 dark:hover:text-gray-100'}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-[#222224] rounded-2xl bg-[#f8f9fa] dark:bg-[#0d0d0f]/50 p-10">
                <CheckCircle2 size={32} className="mb-3 text-gray-300 dark:text-gray-600" />
                <p className="font-bold">You are all caught up!</p>
                <p className="text-sm mt-1">Enjoy your free time or grab a new issue.</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {filteredTasks.map((task, i) => {
                  const isCompleting = completingId === task.id;
                  const overdue = task.status === 'pending' && isOverdue(task.due_date);
                  return (
                  <div 
                    key={task.id} 
                    className={`p-4 bg-[#f8f9fa] dark:bg-[#0d0d0f]/80 rounded-[1rem] border border-gray-200 dark:border-[#222224] flex justify-between items-start gap-4 group transition-all hover:border-indigo-500/30 dark:hover:border-indigo-500/30 animate-staggered-fade ${isCompleting ? 'animate-complete' : ''} ${overdue ? 'border-l-4 border-l-red-500 dark:border-l-red-500' : ''}`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold truncate ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>{task.title}</h3>
                        
                        {task.status === 'in_progress' && (
                          <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> In Progress
                          </span>
                        )}

                        {task.priority?.toLowerCase() === 'high' && <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">High</span>}
                        {task.priority?.toLowerCase() === 'medium' && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">Med</span>}
                        {task.priority?.toLowerCase() === 'low' && <span className="bg-gray-500/10 text-gray-500 border border-gray-500/20 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">Low</span>}
                      </div>
                      {task.linked_to && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1 mb-1.5 mt-0.5">
                          <FileText size={10} /> {task.linked_to}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{task.description}</p>
                      {task.due_date && (
                         <div className={`flex items-center gap-1 mt-3 text-[11px] font-mono font-medium ${overdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                           <Calendar size={12} /> {overdue ? 'Overdue: ' : 'Due: '} {formatDueDate(task.due_date)}
                         </div>
                      )}
                      {task.assigner && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/50 w-max">
                          <div className="relative w-5 h-5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                            {task.assigner.avatar_url ? (
                              <img src={task.assigner.avatar_url} alt={task.assigner.username} className="w-full h-full object-cover" />
                            ) : (
                              <span className="flex items-center justify-center w-full h-full text-[8px] font-bold text-gray-500">{task.assigner.username?.substring(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold tracking-wider uppercase">
                            Assigned by @{task.assigner.username}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      {task.status !== 'completed' && (
                        <button 
                          onClick={() => handleUpdateTaskStatus(task.id, 'completed')} 
                          className="p-2.5 bg-white hover:bg-emerald-500 text-gray-300 hover:text-white border border-gray-200 hover:border-emerald-500 dark:bg-[#141416] dark:border-[#222224] rounded-lg transition-colors shadow-sm focus:outline-none flex items-center justify-center" 
                          title="Mark as Complete"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      {task.status === 'pending' && (
                        <button 
                          onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')} 
                          className="text-[10px] font-bold px-2 py-1 text-indigo-600 dark:text-indigo-400 hover:underline transition-all"
                        >
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
          
          {/* Team Updates Panel */}
          <div className="bg-white dark:bg-[#141416] p-6 sm:p-8 rounded-[1.5rem] border border-gray-200 dark:border-[#222224] shadow-sm min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 relative">
                <BellRing size={18} className="text-gray-400"/> Activity Feed
                {unreadCount > 0 && <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
              </h2>
              {unreadCount > 0 && (
                 <button onClick={handleMarkAllRead} className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wider">
                   Mark all read
                 </button>
              )}
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {updates.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent updates.</p>
              ) : (
                updates.map((upd, i) => {
                  const isWarning = upd.type === 'warning' || upd.type === 'alert' || upd.content?.toLowerCase().includes('high priority') || upd.content?.toLowerCase().includes('urgent');
                  return (
                    <div key={upd.id} className={`p-4 bg-[#f8f9fa] dark:bg-[#0d0d0f]/80 rounded-[1rem] border border-gray-200 dark:border-[#222224] animate-staggered-fade relative ${!upd.read ? (isWarning ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-indigo-500') : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {isWarning && <AlertCircle size={12} className="text-red-500" />}
                          <p className={`text-[11px] font-bold uppercase tracking-widest ${isWarning ? 'text-red-500' : 'text-indigo-600 dark:text-indigo-400'}`}>{upd.actor?.username ? `@${upd.actor.username}` : 'SYSTEM'}</p>
                        </div>
                        <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{getRelativeTime(upd.created_at)}</p>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-300 font-medium leading-relaxed">{upd.content}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40"
        title="New Task (Press N)"
      >
        <Plus size={24} />
      </button>

      {/* New Task Modal Portal */}
      {mounted && isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#222224] rounded-[1.5rem] shadow-2xl p-6 sm:p-8 animate-slide-up">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#222224] text-gray-500 transition-colors focus:outline-none">
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold mb-6 tracking-tight flex items-center gap-2"><Flag size={20} className="text-indigo-500"/> Create Issue</h2>
            
            <form onSubmit={handleAddTask} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Title</label>
                <input required type="text" value={newTaskForm.title} onChange={e => setNewTaskForm({...newTaskForm, title: e.target.value})} placeholder="Task identifier..." className="w-full bg-[#f8f9fa] dark:bg-[#0d0d0f] border border-gray-200 dark:border-[#222224] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Description</label>
                <textarea required rows={3} value={newTaskForm.description} onChange={e => setNewTaskForm({...newTaskForm, description: e.target.value})} placeholder="Add context and details..." className="w-full bg-[#f8f9fa] dark:bg-[#0d0d0f] border border-gray-200 dark:border-[#222224] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none custom-scrollbar" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Priority</label>
                  <select value={newTaskForm.priority} onChange={e => setNewTaskForm({...newTaskForm, priority: e.target.value})} className="w-full bg-[#f8f9fa] dark:bg-[#0d0d0f] border border-gray-200 dark:border-[#222224] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Due Date</label>
                  <input type="date" value={newTaskForm.due_date} onChange={e => setNewTaskForm({...newTaskForm, due_date: e.target.value})} className="w-full bg-[#f8f9fa] dark:bg-[#0d0d0f] border border-gray-200 dark:border-[#222224] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-gray-500 dark:text-gray-400 [color-scheme:dark]" />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting || !newTaskForm.title} className="w-full mt-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Save Issue'}
              </button>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
