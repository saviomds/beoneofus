'use client';

import { useState, useEffect } from 'react';
import { Menu, X, MoreVertical, Lock } from 'lucide-react';
import '../globals.css'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import RightSidebar from '../components/RightSidebar'
import { DashboardProvider, useDashboard } from './contect/DashboardContext'
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';

function DashLayoutContent({ children }) {
  const { activeSection, setActiveSection } = useDashboard();
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);

  return (
    <div className="flex w-full h-[100dvh] bg-black text-white relative">

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
        <div className="flex-grow overflow-y-auto custom-scrollbar md:pr-1">
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setShowAuthPopup(true); // Show access denied popup instead of instant redirect
      } else {
        setIsAuthenticated(true);
      }
    };
    
    checkAuth();

    // Listen for logouts to kick users out in real-time
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setIsAuthenticated(false);
        setShowAuthPopup(true);
      } else {
        setIsAuthenticated(true);
        setShowAuthPopup(false);
      }
    });

    return () => authListener.subscription?.unsubscribe();
  }, [router]);

  // Show a hacker-themed loading screen while checking auth status
  if (!isAuthenticated) {
    if (showAuthPopup) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-red-500/30 w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Login first, beoneofus. You need an active session to access the dashboard.
            </p>
            <button 
              onClick={() => router.replace('/auth')} 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-500/20"
            >
              Return to Login
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-mono uppercase text-xs tracking-widest">Securing connection...</p>
      </div>
    );
  }

  return (
    <DashboardProvider>
      <DashLayoutContent>{children}</DashLayoutContent>
    </DashboardProvider>
  );
}