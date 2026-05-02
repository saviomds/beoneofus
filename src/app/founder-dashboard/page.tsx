"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Briefcase, Activity, Settings, ArrowRight, Target, Loader2, CheckCircle2, Check, Clock, Calendar, Zap, Terminal, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../supabaseClient';
import Image from 'next/image';

export default function FounderDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState<any>(null);
  const [teamCount, setTeamCount] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [activeTab, setActiveTab] = useState('pending');
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    let taskSubscription: any;
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/'); // Redirect unauthenticated users to the home/login page
      } else {
        setIsAuthenticated(true);
        
        // Fetch Profile
        const { data: profileData } = await supabase.from('profiles').select('username, avatar_url, is_verified').eq('id', session.user.id).single();
        if (profileData) setProfile(profileData);

        // Fetch User's Tasks
        const { data: tasksData } = await supabase.from('tasks').select('*').eq('assignee_id', session.user.id).order('created_at', { ascending: false });
        if (tasksData) setTasks(tasksData);

        // Fetch Team Count
        const { count: tCount } = await supabase.from('founder_applications').select('*', { count: 'exact', head: true }).eq('status', 'accepted');
        setTeamCount(tCount || 1);

        // Fetch Pending Apps Count
        const { count: aCount } = await supabase.from('founder_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        setAppCount(aCount || 0);

        // Real-time subscription for incoming tasks
        taskSubscription = supabase.channel(`founder_tasks_${session.user.id}_${Date.now()}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `assignee_id=eq.${session.user.id}` }, async () => {
             const { data } = await supabase.from('tasks').select('*').eq('assignee_id', session.user.id).order('created_at', { ascending: false });
             if (data) setTasks(data);
          }).subscribe();
      }
    };
    checkAuth();

    return () => {
      if (taskSubscription) supabase.removeChannel(taskSubscription);
    };
  }, [router]);

  const handleCompleteTask = async (taskId) => {
    const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId);
    if (!error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
    }
  };

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const displayedTasks = activeTab === 'pending' ? pendingTasks : completedTasks;
  const progress = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 sm:p-8 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-gray-900 shadow-lg flex items-center justify-center text-xl font-black text-gray-400 uppercase overflow-hidden shrink-0">
              {profile?.avatar_url ? <Image src={profile.avatar_url} alt="avatar" fill sizes="80px" className="object-cover" /> : (profile?.username?.substring(0, 2) || 'FD')}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><ShieldCheck size={14}/> Commander Node Active</p>
              <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Welcome, {profile?.username || 'Founder'}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium text-sm flex items-center gap-2"><Calendar size={14}/> {currentDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
            <Link href="/dash" className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm">
              <Terminal size={16} /> Terminal
            </Link>
            <Link href="/dash?tool=admin" className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm">
              Admin Panel <ArrowRight size={16} />
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm group hover:border-blue-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Active Team</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{teamCount} Nodes</p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm group hover:border-purple-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Briefcase size={24} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Pending Apps</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{appCount} Requests</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm group hover:border-green-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Task Completion</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-black text-gray-900 dark:text-white">{progress}%</p>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">({completedTasks.length}/{tasks.length})</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm group hover:border-emerald-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Activity size={24} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Network Health</p>
            <p className="text-2xl font-black text-emerald-500">Optimal</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-sm min-h-[400px] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Target size={20} className="text-blue-500"/> Mission Objectives</h2>
              <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-full sm:w-auto">
                <button onClick={() => setActiveTab('pending')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}>Pending ({pendingTasks.length})</button>
                <button onClick={() => setActiveTab('completed')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'completed' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}>Completed</button>
              </div>
            </div>
            
            {displayedTasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800/30 p-8">
                {activeTab === 'pending' ? (
                  <>
                    <CheckCircle2 size={40} className="mb-4 text-green-400 dark:text-green-500 opacity-50" />
                    <p className="font-bold text-lg text-gray-900 dark:text-gray-100 tracking-tight">All objectives cleared</p>
                    <p className="text-sm mt-1 max-w-sm">You have no pending tasks. Assign new objectives via the Admin Panel.</p>
                  </>
                ) : (
                  <>
                    <Clock size={40} className="mb-4 text-gray-400 dark:text-gray-600 opacity-50" />
                    <p className="font-bold text-lg text-gray-900 dark:text-gray-100 tracking-tight">No completed tasks yet</p>
                    <p className="text-sm mt-1 max-w-sm">Tasks you complete will appear here for your records.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {displayedTasks.map(task => (
                  <div key={task.id} className={`p-5 rounded-[1.5rem] border transition-all flex flex-col sm:flex-row justify-between gap-4 group ${task.status === 'completed' ? 'bg-gray-50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800 opacity-75 hover:opacity-100' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-500/30 hover:shadow-md'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold truncate ${task.status === 'completed' ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>{task.title}</h3>
                        {task.priority && task.status === 'pending' && (
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${task.priority === 'High' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' : task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50' : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50'}`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{task.description}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-3 flex items-center gap-1"><Clock size={12}/> Assigned {new Date(task.created_at).toLocaleDateString()}</p>
                    </div>
                    {task.status === 'pending' && (
                      <button onClick={() => handleCompleteTask(task.id)} className="shrink-0 w-full sm:w-auto px-5 py-3 bg-gray-50 hover:bg-green-500 text-gray-600 hover:text-white border border-gray-200 hover:border-green-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 font-bold text-sm">
                        <Check size={18} /> <span className="sm:hidden">Mark Complete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-5 flex items-center gap-2"><Zap size={20} className="text-amber-500"/> Quick Actions</h2>
              <div className="space-y-3">
                <Link href="/dash?tool=admin&tab=founder_apps" className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-colors border border-gray-100 dark:border-gray-800 group">
                  <span className="font-bold text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Review Network Apps</span>
                  <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/dash?tool=admin&tab=tasks" className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-colors border border-gray-100 dark:border-gray-800 group">
                  <span className="font-bold text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Assign Node Tasks</span>
                  <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-6 sm:p-8 rounded-[2.5rem] shadow-lg text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                <Activity size={160} />
              </div>
              <h2 className="text-lg font-black mb-2 flex items-center gap-2 relative z-10"><Terminal size={20} className="text-blue-400"/> System Logs</h2>
              <p className="text-blue-200 text-sm mb-6 relative z-10 leading-relaxed">Your network infrastructure is running at optimal capacity. All systems are fully synchronized.</p>
              <div className="space-y-3 relative z-10 font-mono text-xs">
                <div className="flex gap-3 text-blue-300"><span className="text-green-400">●</span> <span>[SYS]</span> <span className="text-white">Node matrix stable</span></div>
                <div className="flex gap-3 text-blue-300"><span className="text-green-400">●</span> <span>[SEC]</span> <span className="text-white">Zero unauthorized access</span></div>
                <div className="flex gap-3 text-blue-300"><span className="text-blue-400">●</span> <span>[NET]</span> <span className="text-white">{teamCount} peers actively synced</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
