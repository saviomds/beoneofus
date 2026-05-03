'use client';

import { useState, useEffect } from 'react';
import { Menu, X, MoreVertical } from 'lucide-react';
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
    <div className="flex w-full min-h-screen h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 relative overflow-hidden">

      {/* ── Mobile Navbar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 z-40 shrink-0">
        <button
          onClick={() => setIsLeftOpen(true)}
          className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <Menu size={18} className="text-gray-700 dark:text-gray-300" />
        </button>
        <span className="font-bold text-base tracking-tighter text-gray-900 dark:text-gray-100">
          beone<span className="text-blue-600 dark:text-blue-400">of</span>us
        </span>
        <button
          onClick={() => setIsRightOpen(true)}
          className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <MoreVertical size={18} className="text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* ── Left Sidebar Overlay (mobile) ── */}
      {isLeftOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 md:hidden backdrop-blur-sm"
          onClick={() => setIsLeftOpen(false)}
        />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          w-64 xl:w-72
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:flex-shrink-0
          ${isLeftOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile close button */}
        <div className="md:hidden flex justify-end p-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <button
            onClick={() => setIsLeftOpen(false)}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <Sidebar
            activeSection={activeSection}
            onSectionChange={(sec) => {
              setActiveSection(sec);
              setIsLeftOpen(false);
            }}
          />
        </div>
      </aside>

      {/* ── CENTER COLUMN ── */}
      <main className="
        flex-1 flex flex-col min-w-0
        mt-14 md:mt-0
        overflow-hidden
        bg-gray-50 dark:bg-gray-900
      ">
        <div className="hidden md:block shrink-0">
          <Header />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </main>

      {/* ── Right Sidebar Overlay (mobile) ── */}
      {isRightOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 lg:hidden backdrop-blur-sm"
          onClick={() => setIsRightOpen(false)}
        />
      )}

      {/* ── RIGHT SIDEBAR ── */}
      <aside
        className={`
          fixed inset-y-0 right-0 z-50 flex flex-col
          w-64 xl:w-80
          bg-white dark:bg-gray-900
          border-l border-gray-200 dark:border-gray-800
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:flex-shrink-0
          ${isRightOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-start p-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <button
            onClick={() => setIsRightOpen(false)}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <RightSidebar
            activeSection={activeSection}
            onSectionChange={(sec) => {
              setActiveSection(sec);
              setIsRightOpen(false);
            }}
          />
        </div>
      </aside>

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="w-7 h-7 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 dark:text-gray-500 font-mono uppercase text-xs tracking-widest">Loading…</p>
      </div>
    );
  }

  return (
    <DashboardProvider>
      {!isAuthenticated && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white px-4 py-3 z-[100] flex flex-col sm:flex-row items-center justify-center gap-3 shadow-2xl border-t border-gray-800">
          <span className="text-sm text-gray-300 text-center">
            You{`'`}re in guest mode. Join to post, follow, and interact.
          </span>
          <button
            onClick={() => router.push('/auth')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-1.5 rounded-lg text-sm font-bold transition whitespace-nowrap"
          >
            Sign In / Join Free
          </button>
        </div>
      )}
      <DashLayoutContent>{children}</DashLayoutContent>
    </DashboardProvider>
  );
}
