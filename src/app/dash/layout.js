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
    <div className="flex w-full h-[100dvh] bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 relative">

      {/* Mobile Navbar */}
      <div className="md:hidden absolute top-0 w-full h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 z-40">
        <button onClick={() => setIsLeftOpen(true)} className="p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
          <Menu size={20} className="text-gray-700 dark:text-gray-300" />
        </button>
        <span className="font-bold text-lg tracking-tighter text-gray-900 dark:text-gray-100">beone<span className="text-blue-600 dark:text-blue-400">of</span>us</span>
        <button onClick={() => setIsRightOpen(true)} className="p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
          <MoreVertical size={20} className="text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Left Sidebar Overlay */}
      {isLeftOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/20 dark:bg-black/60 z-50 md:hidden backdrop-blur-sm transition-all"
          onClick={() => setIsLeftOpen(false)}
        />
      )}

      {/* 1. Left Sidebar - Fixed Width */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 md:bg-transparent dark:md:bg-transparent border-r border-gray-200 dark:border-gray-800 transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 flex-shrink-0 flex flex-col ${isLeftOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="md:hidden flex justify-end p-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <button onClick={() => setIsLeftOpen(false)} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar pb-16 md:pb-0">
          <Sidebar activeSection={activeSection} onSectionChange={(sec) => { setActiveSection(sec); setIsLeftOpen(false); }} />
        </div>
      </div>

      {/* 2. Center Column - Fills all remaining space */}
      <main className="flex-grow flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900 mt-16 md:mt-0 relative h-full">
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
          className="fixed inset-0 bg-gray-900/20 dark:bg-black/60 z-50 lg:hidden backdrop-blur-sm transition-all"
          onClick={() => setIsRightOpen(false)}
        />
      )}

      {/* 3. Right Sidebar - Fixed Width */}
      <div className={`fixed inset-y-0 right-0 z-50 w-72 lg:w-[350px] bg-white dark:bg-gray-900 lg:bg-transparent dark:lg:bg-transparent border-l border-gray-200 dark:border-gray-800 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 flex-shrink-0 flex flex-col ${isRightOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="lg:hidden flex justify-start p-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <button onClick={() => setIsRightOpen(false)} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar pb-16 lg:pb-0">
          <RightSidebar activeSection={activeSection} onSectionChange={(sec) => { setActiveSection(sec); setIsRightOpen(false); }} />
        </div>
      </div>

    </div>
  );
}

export default function DashLayout({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsLoading(false);
    };
    
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => authListener.subscription?.unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-mono uppercase text-xs tracking-widest">Loading...</p>
      </div>
    );
  }

  return (
    <DashboardProvider>
      {!isAuthenticated && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-[100] flex flex-col sm:flex-row items-center justify-center gap-4 shadow-2xl border-t border-gray-800">
          <span className="text-sm font-medium text-gray-300">You are viewing the dashboard in guest mode. Join to post, follow, and interact.</span>
          <button onClick={() => router.push('/auth')} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap">
            Sign In / Join Free
          </button>
        </div>
      )}
      <DashLayoutContent>{children}</DashLayoutContent>
    </DashboardProvider>
  );
}