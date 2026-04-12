'use client';

import { useState } from 'react';
import { Menu, X, MoreVertical } from 'lucide-react';
import '../globals.css'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import RightSidebar from '../components/RightSidebar'
import { DashboardProvider, useDashboard } from './contect/DashboardContext'

function DashLayoutContent({ children }) {
  const { activeSection, setActiveSection } = useDashboard();
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);

  return (
    <div className="flex w-full h-[100dvh] overflow-hidden bg-black text-white relative">

      {/* Mobile Navbar */}
      <div className="md:hidden absolute top-0 w-full h-16 border-b border-white/5 bg-[#050505] flex items-center justify-between px-4 z-40">
        <button onClick={() => setIsLeftOpen(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition">
          <Menu size={20} />
        </button>
        <span className="font-bold text-lg tracking-tighter">beone<span className="text-blue-500">of</span>us</span>
        <button onClick={() => setIsRightOpen(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Left Sidebar Overlay */}
      {isLeftOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm"
          onClick={() => setIsLeftOpen(false)}
        />
      )}

      {/* 1. Left Sidebar - Fixed Width */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0a0a0a] md:bg-transparent border-r border-white/5 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex-shrink-0 flex flex-col ${isLeftOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="md:hidden flex justify-end p-4 border-b border-white/5 shrink-0">
          <button onClick={() => setIsLeftOpen(false)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar pb-16 md:pb-0">
          <Sidebar activeSection={activeSection} onSectionChange={(sec) => { setActiveSection(sec); setIsLeftOpen(false); }} />
        </div>
      </div>

      {/* 2. Center Column - Fills all remaining space */}
      <main className="flex-grow flex flex-col min-w-0 bg-black mt-16 md:mt-0 relative h-full">
        <div className="hidden md:block">
          <Header />
        </div>
        <div className="flex-grow overflow-y-auto no-scrollbar">
          <div className="w-full px-0 py-0">
            {children}
          </div>
        </div>
      </main>

      {/* Right Sidebar Overlay */}
      {isRightOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-sm"
          onClick={() => setIsRightOpen(false)}
        />
      )}

      {/* 3. Right Sidebar - Fixed Width */}
      <div className={`fixed inset-y-0 right-0 z-50 w-72 lg:w-[350px] bg-[#0a0a0a] lg:bg-[#050505] border-l border-white/5 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex-shrink-0 flex flex-col ${isRightOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="lg:hidden flex justify-start p-4 border-b border-white/5 shrink-0">
          <button onClick={() => setIsRightOpen(false)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar pb-16 lg:pb-0">
          <RightSidebar activeSection={activeSection} />
        </div>
      </div>

    </div>
  );
}

export default function DashLayout({ children }) {
  return (
    <DashboardProvider>
      <DashLayoutContent>{children}</DashLayoutContent>
    </DashboardProvider>
  );
}