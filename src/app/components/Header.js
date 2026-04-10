"use client";

import { useState } from 'react';
import { Search, Compass, MessageCircle, X, ArrowRight } from 'lucide-react';

export default function Header({ setActiveTab }) {
  const [showQuickView, setShowQuickView] = useState(null); // 'discuss' or 'discover'

  const closeQuickView = () => setShowQuickView(null);

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-40">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-600" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-white/5 rounded-2xl bg-[#0D0D0D] text-xs placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all"
            placeholder="Search the BeOneOfUs ecosystem..."
          />
        </div>

        {/* Right: Nav Links */}
        <nav className="flex items-center gap-6 ml-8">
          <button 
            onClick={() => setShowQuickView('discuss')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
          >
            <MessageCircle size={16} />
            Discuss
          </button>
          <button 
            onClick={() => setShowQuickView('discover')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-blue-500 transition-all"
          >
            <Compass size={16} />
            Discover
          </button>
        </nav>
      </header>

      {/* --- QUICK VIEW POP-UP TOGGLE --- */}
      {showQuickView && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={closeQuickView} />
          
          <div className="relative w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={closeQuickView} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors">
              <X size={24} />
            </button>

            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[4px] mb-2">
                {showQuickView === 'discuss' ? 'Community Forums' : 'Global Projects'}
              </span>
              <h2 className="text-4xl font-black text-white tracking-tighter mb-6">
                {showQuickView === 'discuss' ? 'Live Discussions' : 'Discover New Nodes'}
              </h2>

              {/* Real Info Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {showQuickView === 'discuss' ? (
                  <>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group">
                      <p className="text-sm font-bold text-white mb-1 group-hover:text-blue-500 transition-colors">Deploying to Mauritius (Edge Nodes)</p>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">42 Active Devs</span>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group">
                      <p className="text-sm font-bold text-white mb-1 group-hover:text-blue-500 transition-colors">Next.js 16 Early Access Discussion</p>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">128 Feedbacks</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group">
                      <p className="text-sm font-bold text-white mb-1 group-hover:text-blue-500 transition-colors">Project: BeOneOfUs Finance</p>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Payment Gateway Node</span>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group">
                      <p className="text-sm font-bold text-white mb-1 group-hover:text-blue-500 transition-colors">Project: Global Dev Graph</p>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Visualization Tool</span>
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={closeQuickView}
                className="flex items-center justify-center gap-2 w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-600/20"
              >
                Enter Full View <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}