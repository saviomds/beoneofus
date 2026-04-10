"use client";

import { useState } from "react";
import { 
  TrendingUp, MessageSquare, CheckCircle2, Terminal, Cpu, 
  Globe, Zap, Activity, Users, Flame, ArrowUpRight, X, 
  ShieldCheck, GitBranch, Heart
} from 'lucide-react';

const SectionHeader = ({ title, showBadge, icon: Icon }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-2">
      <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[2.5px]">
        {title}
      </h3>
      {showBadge && <CheckCircle2 size={12} className="text-blue-500" />}
    </div>
    {Icon && <Icon size={14} className="text-gray-700" />}
  </div>
);

export default function RightSidebar() {
  const [activeModal, setActiveModal] = useState(null);

  // Close modal on background click
  const closeModal = () => setActiveModal(null);

  return (
    <aside className="w-full flex flex-col p-6 space-y-12 h-screen sticky top-0 overflow-y-auto no-scrollbar bg-transparent border-l border-white/5 relative">
      
      {/* 1. Global Pulse */}
      <div className="cursor-pointer" onClick={() => setActiveModal({ 
          type: 'Live Stats', 
          title: 'Network Activity', 
          details: 'Global traffic is currently routing through the Mauritius (MU) and Frankfurt (EU) nodes. Server latency is at an optimal 14ms.',
          icon: <Activity className="text-green-500" /> 
        })}>
        <SectionHeader title="Global Pulse" icon={Activity} />
        <div className="bg-[#0D0D0D] border border-white/5 rounded-2xl p-4 space-y-4 hover:border-white/10 transition-all">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping absolute inset-0" />
              <div className="w-2 h-2 bg-green-500 rounded-full relative" />
            </div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
              1,204 Devs Online
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col gap-0.5 border-l border-white/10 pl-3">
              <p className="text-[12px] text-gray-300 font-medium font-mono">
                <span className="text-blue-500 font-bold">[MU]</span> New PR in Next.js core
              </p>
              <span className="text-[9px] text-gray-600 font-bold uppercase">Just now</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Hot Repositories */}
      <div>
        <SectionHeader title="Hot Repositories" icon={Flame} />
        <div className="flex flex-wrap gap-2">
          {['next-auth-v5', 'stripe-hooks', 'supabase-realtime'].map((tag) => (
            <div 
              key={tag} 
              onClick={() => setActiveModal({ 
                type: 'Repository', 
                title: tag, 
                details: `Viewing live metrics for ${tag}. Trending with 45 new contributors this hour.`,
                icon: <Terminal className="text-blue-500" /> 
              })}
              className="px-3 py-1.5 rounded-xl bg-[#0F0F0F] border border-white/5 text-[11px] font-bold text-gray-500 hover:border-blue-500/50 hover:text-white cursor-pointer transition-all flex items-center gap-2 group"
            >
              <Terminal size={12} className="group-hover:text-blue-500" />
              {tag}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Global Nodes */}
      <div>
        <SectionHeader title="Global Nodes" showBadge />
        <div className="space-y-4">
          {[
            { name: 'Core Infrastructure', icon: Cpu, color: 'text-blue-400', members: '4.2k', desc: 'Centralized BeOneOfUs server logic and scaling.' },
            { name: 'Payment Systems', icon: Zap, color: 'text-amber-400', members: '1.1k', desc: 'Stripe integration and global transaction routing.' }
          ].map((channel) => (
            <div 
              key={channel.name} 
              onClick={() => setActiveModal({ 
                type: 'Node Info', 
                title: channel.name, 
                details: channel.desc, 
                icon: <channel.icon className={channel.color} /> 
              })}
              className="flex items-center justify-between group cursor-pointer p-2 -mx-2 rounded-xl hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-white/5 ${channel.color}`}>
                  <channel.icon size={16} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-200">{channel.name}</span>
                  <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{channel.members} devs</span>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-gray-800 group-hover:text-blue-500 transition-all" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Impact Discussions */}
      <div>
        <SectionHeader title="Impact Discussions" icon={MessageSquare} />
        <div className="space-y-5">
          {[{ title: "Standardizing project architecture for 2026", comments: 342 }].map((post, i) => (
            <div key={i} className="group cursor-pointer" onClick={() => setActiveModal({
              type: 'Discussion',
              title: post.title,
              details: 'This thread focuses on implementing strict folder conventions for large-scale Next.js apps.',
              icon: <MessageSquare className="text-emerald-500" />
            })}>
              <p className="text-[13px] text-gray-400 group-hover:text-white leading-relaxed font-medium transition-colors">
                {post.title}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[9px] text-gray-600 font-black uppercase tracking-widest">
                <MessageSquare size={10} />
                {post.comments} Feedbacks
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- POP-UP MODAL SYSTEM --- */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={closeModal} />
          
          <div className="relative w-full max-w-sm bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={closeModal} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                {activeModal.icon}
              </div>
              
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[3px] mb-2">
                {activeModal.type}
              </span>
              
              <h3 className="text-xl font-black text-white mb-3 tracking-tight leading-tight">
                {activeModal.title}
              </h3>
              
              <p className="text-sm text-gray-400 leading-relaxed mb-8">
                {activeModal.details}
              </p>

              <div className="w-full flex flex-col gap-2">
                <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">
                   Join Discussion
                </button>
                <button onClick={closeModal} className="w-full py-4 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest">
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}