'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Home, MessageSquare, Bell, User, Users } from 'lucide-react';
import '../globals.css'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import RightSidebar from '../components/RightSidebar'
import { DashboardProvider } from './contect/DashboardContext'
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../supabaseClient';

/* ── Bottom nav items shown on mobile ── */
const BOTTOM_NAV = [
  { id: 'feed',          icon: Home,         label: 'Home' },
  { id: 'messages',      icon: MessageSquare, label: 'Msgs' },
  { id: 'notifications', icon: Bell,          label: 'Alerts' },
  { id: 'connections',   icon: Users,         label: 'Network' },
  { id: 'profile',       icon: User,          label: 'Profile' },
];

function BottomNav({ pathname }) {
  const router = useRouter();
  const active = pathname?.split('/')[2] || 'feed';
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-stretch pb-safe">
      {BOTTOM_NAV.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => router.push('/dash/' + id)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
            active === id
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Icon size={20} strokeWidth={active === id ? 2.5 : 1.8} />
          <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
        </button>
      ))}
    </nav>
  );
}

function DashLayoutContent({ children }) {
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);
  const pathname = usePathname();

  /* Close drawers on route change */
  useEffect(() => {
    setIsLeftOpen(false);
    setIsRightOpen(false);
  }, [pathname]);

  /* Lock body scroll when a drawer is open */
  useEffect(() => {
    document.body.style.overflow = (isLeftOpen || isRightOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isLeftOpen, isRightOpen]);

  return (
    <div className="flex w-full min-h-screen h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 relative overflow-hidden">

      {/* ══ MOBILE TOP BAR ══ */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md flex items-center justify-between px-4 z-40 shrink-0">
        <button
          onClick={() => setIsLeftOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={18} className="text-gray-700 dark:text-gray-300" />
        </button>

        <span className="font-black text-lg tracking-tighter text-gray-900 dark:text-gray-100 select-none">
          beone<span className="text-blue-600 dark:text-blue-400">of</span>us
        </span>

        <button
          onClick={() => setIsRightOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Open panel"
        >
          <Users size={18} className="text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* ══ LEFT SIDEBAR OVERLAY (mobile) ══ */}
      {isLeftOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[49] md:hidden backdrop-blur-sm"
          onClick={() => setIsLeftOpen(false)}
        />
      )}

      {/* ══ LEFT SIDEBAR ══ */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          w-[280px] max-w-[85vw]
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          shadow-2xl
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:flex md:flex-col md:flex-shrink-0 md:shadow-none md:w-64 xl:w-72
          ${isLeftOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile close row */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <span className="font-black text-base tracking-tighter text-gray-900 dark:text-gray-100">Menu</span>
          <button
            onClick={() => setIsLeftOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <Sidebar onClose={() => setIsLeftOpen(false)} />
        </div>
      </aside>

      {/* ══ CENTER COLUMN ══ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-gray-900">
        {/* Mobile top-bar spacer */}
        <div className="md:hidden h-14 shrink-0" />
        {/* Desktop header */}
        <div className="hidden md:block shrink-0">
          <Header />
        </div>
        {/* Scrollable content — messages gets h-full/overflow-hidden; others scroll */}
        <div className={`flex-1 min-h-0 ${pathname?.endsWith('/messages') ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar pb-16 md:pb-0'}`}>
          {children}
        </div>
      </main>

      {/* ══ RIGHT SIDEBAR OVERLAY (mobile) ══ */}
      {isRightOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[49] lg:hidden backdrop-blur-sm"
          onClick={() => setIsRightOpen(false)}
        />
      )}

      {/* ══ RIGHT SIDEBAR ══ */}
      <aside
        className={`
          fixed inset-y-0 right-0 z-50 flex flex-col
          w-[300px] max-w-[90vw]
          bg-white dark:bg-gray-900
          border-l border-gray-200 dark:border-gray-800
          shadow-2xl
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:flex lg:flex-col lg:flex-shrink-0 lg:shadow-none lg:w-64 xl:w-80
          ${isRightOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Mobile close row */}
        <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <span className="font-black text-base tracking-tighter text-gray-900 dark:text-gray-100">Network</span>
          <button
            onClick={() => setIsRightOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <RightSidebar onClose={() => setIsRightOpen(false)} />
        </div>
      </aside>

      {/* ══ BOTTOM NAVIGATION (mobile only) ══ */}
      <BottomNav pathname={pathname} />
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
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md text-white px-4 py-3 z-[100] flex flex-col sm:flex-row items-center justify-center gap-3 shadow-2xl border-t border-gray-700">
          <span className="text-sm text-gray-300 text-center">
            You're in guest mode. Join to post, follow, and interact.
          </span>
          <button
            onClick={() => router.push('/auth')}
            className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-lg shadow-blue-500/20"
          >
            Sign In / Join Free
          </button>
        </div>
      )}
      <DashLayoutContent>{children}</DashLayoutContent>
    </DashboardProvider>
  );
}
