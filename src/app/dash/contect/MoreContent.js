"use client";

import { useState } from "react";
import { 
  Zap, 
  HelpCircle, 
  Code2, 
  Share2, 
  LogOut, 
  ChevronRight, 
  X, 
  Globe, 
  Cpu
} from "lucide-react";

const MORE_TOOLS = [
  { 
    id: "api", 
    label: "API Access", 
    icon: <Code2 size={20} />, 
    desc: "Developer tools & keys", 
    details: "Integrate SAVIOMDS into your own workflows using our REST API and Webhooks." 
  },
  { 
    id: "status", 
    label: "System Status", 
    icon: <Zap size={20} />, 
    desc: "Check platform health", 
    details: "Current status: All systems operational. Check latency for Mauritius region nodes." 
  },
  { 
    id: "community", 
    label: "Community Hub", 
    icon: <Globe size={20} />, 
    desc: "Join the conversation", 
    details: "Connect with other TechNinja developers and share your latest Next.js projects." 
  },
  { 
    id: "support", 
    label: "Help & Support", 
    icon: <HelpCircle size={20} />, 
    desc: "Get technical help", 
    details: "Access our documentation or open a ticket with our support engineering team." 
  },
];

export default function MoreContent() {
  const [activeItem, setActiveItem] = useState(null);

  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 no-scrollbar relative">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tighter">Resources</h1>
        <p className="text-gray-500 text-sm mt-1 font-medium">Extra tools for your development workflow.</p>
      </div>

      {/* Grid Layout - 2 Columns on desktop to use the mid-section width better */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MORE_TOOLS.map((tool) => (
          <div 
            key={tool.id}
            onClick={() => setActiveItem(tool)}
            className="group flex items-center justify-between p-5 bg-[#0F0F0F] border border-white/5 rounded-[1.5rem] hover:border-blue-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                {tool.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-tight">{tool.label}</span>
                <span className="text-[11px] text-gray-600 font-bold uppercase tracking-wider">{tool.desc}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-800 group-hover:text-white transition-all" />
          </div>
        ))}
      </div>

      {/* Secondary Actions */}
      <div className="mt-8 space-y-2">
         <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition-all group">
            <div className="flex items-center gap-3">
               <Share2 size={18} />
               <span className="text-sm font-bold">Share Profile</span>
            </div>
            <span className="text-[10px] font-black text-gray-600 group-hover:text-blue-500 transition-colors">SAVIOMDS.DEV</span>
         </button>
         
         <button className="w-full flex items-center gap-3 p-4 text-red-500/60 hover:text-red-500 transition-all">
            <LogOut size={18} />
            <span className="text-sm font-bold">Sign Out</span>
         </button>
      </div>

      {/* --- POP-UP TOGGLE --- */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setActiveItem(null)}
          />
          
          <div className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
            <button 
              onClick={() => setActiveItem(null)}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-6 shadow-lg shadow-blue-600/5">
                {activeItem.icon}
              </div>
              <h3 className="text-xl font-black text-white mb-2">{activeItem.label}</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-8">
                {activeItem.details}
              </p>
              
              <button 
                onClick={() => setActiveItem(null)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}