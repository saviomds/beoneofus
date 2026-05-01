import { Users, Briefcase, Activity, Settings, ArrowRight, Zap, Target } from 'lucide-react';
import Link from 'next/link';

export default function FounderDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-6 sm:p-10 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Founder Command Center</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage your vision, team, and upcoming milestones.</p>
          </div>
          <Link href="/dash" className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 shrink-0">
            Return to Network <ArrowRight size={18} />
          </Link>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Active Team</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">12 Nodes</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Open Roles</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">3 Positions</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Network Health</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white text-green-500">Optimal</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Target size={20} className="text-blue-500"/> Project Roadmap</h2>
              <button className="text-sm font-bold text-blue-600 hover:underline">View All</button>
            </div>
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-800/30">
              <Zap size={32} className="mb-3 text-gray-400 dark:text-gray-500" />
              <p className="font-bold">No active milestones yet.</p>
              <p className="text-sm mt-1">Start planning your next big launch.</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm min-h-[400px]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2"><Settings size={20} className="text-gray-500"/> Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors border border-gray-100 dark:border-gray-800 group">
                <span className="font-bold text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Review Applications</span>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500" />
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors border border-gray-100 dark:border-gray-800 group">
                <span className="font-bold text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Post New Role</span>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
