'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Menu, X, Home, MessageSquare, Bell, User, Users, ShoppingBag, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import '../globals.css'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import RightSidebar from '../components/RightSidebar'
import { DashboardProvider } from './content/DashboardContext'
import AiFloatingChat from '../components/AiFloatingChat'
import NotificationPopup from '../components/NotificationPopup'
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../supabaseClient';

/* Patch performance.measure at module load time */
if (typeof globalThis !== 'undefined' && typeof globalThis.performance !== 'undefined') {
  const _origMeasure = globalThis.performance.measure.bind(globalThis.performance);
  globalThis.performance.measure = (...args) => {
    try { return _origMeasure(...args); } catch { /* swallow negative-timestamp error */ }
  };
  const _origMark = globalThis.performance.mark.bind(globalThis.performance);
  globalThis.performance.mark = (...args) => {
    try { return _origMark(...args); } catch { /* swallow mark errors */ }
  };
}

/* ── Mobile bottom nav ─────────────────────────────────────────── */
const BOTTOM_NAV = [
  { id: 'home',          icon: Home,          label: 'Home'    },
  { id: 'messages',      icon: MessageSquare, label: 'Msgs'    },
  { id: 'notifications', icon: Bell,          label: 'Alerts'  },
  { id: 'connections',   icon: Users,         label: 'Network' },
  { id: 'profile',       icon: User,          label: 'Profile' },
];

function BottomNav({ pathname }) {
  const router = useRouter();
  const active = pathname?.split('/')[2] || 'home';
  return (
    <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-white/98 dark:bg-zinc-900/98 backdrop-blur-2xl border border-gray-200/80 dark:border-zinc-700/50 rounded-2xl shadow-xl shadow-black/8 dark:shadow-black/40 px-2 py-2">
        {BOTTOM_NAV.map(({ id, icon: Icon, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => router.push('/dash/' + id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 w-14 h-12 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[8px] font-black uppercase tracking-wide leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Sidebar collapse helpers ───────────────────────────────────── */
const COLLAPSE_KEY = 'sidebar_collapsed_v1';

function readCollapsed() {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(COLLAPSE_KEY) === 'true'; } catch { return false; }
}

/* ── Main layout shell ──────────────────────────────────────────── */
function DashLayoutContent({ children }) {
  const [isLeftOpen, setIsLeftOpen]         = useState(false);
  const [isRightOpen, setIsRightOpen]       = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  /* Read persisted collapse preference on mount (client only) */
  useLayoutEffect(() => {
    setIsSidebarCollapsed(readCollapsed());
  }, []);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch {}
      return next;
    });
  };

  useEffect(() => { setIsLeftOpen(false); setIsRightOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = (isLeftOpen || isRightOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isLeftOpen, isRightOpen]);

  const isMessages = pathname?.endsWith('/messages') || pathname?.endsWith('/ai');

  return (
    <div className="flex w-full min-h-screen h-screen bg-slate-50 dark:bg-[#09090B] text-gray-900 dark:text-gray-100 relative overflow-hidden">

      {/* ══ MOBILE TOP BAR ═══════════════════════════════════════ */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4
                      bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl
                      border-b border-gray-100 dark:border-zinc-800/60 shadow-sm">
        <button
          onClick={() => setIsLeftOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={18} className="text-gray-600 dark:text-zinc-400" />
        </button>

        <span className="font-black text-[17px] tracking-tighter text-gray-900 dark:text-gray-100 select-none">
          beone<span className="text-blue-600">of</span>us
        </span>

        <button
          onClick={() => setIsRightOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Network panel"
        >
          <Users size={18} className="text-gray-600 dark:text-zinc-400" />
        </button>
      </div>

      {/* ══ OVERLAY ══════════════════════════════════════════════ */}
      {(isLeftOpen || isRightOpen) && (
        <div
          className="fixed inset-0 bg-black/30 z-[49] md:hidden backdrop-blur-sm"
          onClick={() => { setIsLeftOpen(false); setIsRightOpen(false); }}
        />
      )}

      {/* ══ LEFT SIDEBAR ═════════════════════════════════════════ */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col
        w-[272px] max-w-[88vw]
        bg-white dark:bg-[#111115]
        border-r border-gray-100 dark:border-zinc-800/60
        shadow-xl shadow-black/4 dark:shadow-black/40
        transition-all duration-300 ease-in-out
        md:relative md:shadow-none
        md:border-r md:border-gray-100 dark:md:border-zinc-800/60
        ${isSidebarCollapsed ? 'md:w-[72px]' : 'md:w-60 xl:w-64'}
        ${isLeftOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Mobile drawer header */}
        <div className="md:hidden flex items-center justify-between px-5 h-14 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <span className="font-black text-[15px] tracking-tighter text-gray-900 dark:text-gray-100">Menu</span>
          <button
            onClick={() => setIsLeftOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar overflow-x-hidden">
          <Sidebar
            onClose={() => setIsLeftOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
          />
        </div>
      </aside>

      {/* ══ CENTER COLUMN ════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top-bar spacer */}
        <div className="md:hidden h-14 shrink-0" />

        {/* Desktop header */}
        <div className="hidden md:block shrink-0 bg-white dark:bg-[#111115] border-b border-gray-100 dark:border-zinc-800/60">
          <Header />
        </div>

        {/* Scrollable content area */}
        <div className={`flex-1 min-h-0 ${isMessages ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar pb-24 md:pb-0'}`}>
          <div className={isMessages ? 'w-full h-full' : 'w-full h-full'}>
            {children}
          </div>
        </div>
      </main>

      {/* ══ RIGHT SIDEBAR ════════════════════════════════════════ */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 flex flex-col
        w-[288px] max-w-[90vw]
        bg-white dark:bg-[#111115]
        border-l border-gray-100 dark:border-zinc-800/60
        shadow-xl shadow-black/4 dark:shadow-black/40
        transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:shadow-none
        lg:w-64 xl:w-72
        ${isRightOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Mobile drawer header */}
        <div className="lg:hidden flex items-center justify-between px-5 h-14 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <span className="font-black text-[15px] tracking-tighter text-gray-900 dark:text-gray-100">Network</span>
          <button
            onClick={() => setIsRightOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <RightSidebar onClose={() => setIsRightOpen(false)} />
        </div>
      </aside>

      {/* ══ FLOATING BOTTOM NAV (mobile) ═════════════════════════ */}
      <BottomNav pathname={pathname} />

      {/* ══ AI FLOATING CHAT ═════════════════════════════════════ */}
      <AiFloatingChat />

      {/* ══ NOTIFICATION POPUP ═══════════════════════════════════ */}
      <NotificationPopup />
    </div>
  );
}

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;

function PickUsernameModal({ onDone }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!username) { setStatus('idle'); return; }
    if (!USERNAME_RE.test(username)) { setStatus('invalid'); return; }
    setStatus('checking');
    timer.current = setTimeout(async () => {
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('username', username);
      setStatus(count === 0 ? 'available' : 'taken');
    }, 400);
    return () => clearTimeout(timer.current);
  }, [username]);

  const handleSave = async () => {
    if (status !== 'available') return;
    setSaving(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Not signed in.'); setSaving(false); return; }
    const { error: err } = await supabase.from('profiles')
      .update({ username })
      .eq('id', session.user.id);
    if (err?.code === '23505') {
      setStatus('taken');
      setError('That username was just taken. Try another.');
    } else if (err) {
      setError(err.message);
    } else {
      localStorage.removeItem('pick_username');
      onDone();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-300">
        <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-1 tracking-tight">
          Choose your username
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          Your original username was already taken. Pick a unique one to continue.
        </p>
        <div className="relative mb-1">
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase())}
            maxLength={20}
            placeholder="your_username"
            autoFocus
            className={`w-full bg-white dark:bg-gray-800 border rounded-xl py-3 px-4 pr-11 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm ${
              status === 'taken' || status === 'invalid' ? 'border-red-400 dark:border-red-500' :
              status === 'available' ? 'border-emerald-400 dark:border-emerald-500' :
              'border-gray-300 dark:border-gray-700'
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {status === 'checking' && <Loader2 size={15} className="animate-spin text-gray-400" />}
            {status === 'available' && <CheckCircle2 size={15} className="text-emerald-500" />}
            {(status === 'taken' || status === 'invalid') && <XCircle size={15} className="text-red-500" />}
          </div>
        </div>
        {status === 'invalid' && username && (
          <p className="text-xs text-red-500 mb-3">3–20 chars: lowercase letters, numbers, _ or -</p>
        )}
        {status === 'taken' && (
          <p className="text-xs text-red-500 mb-3">Username already taken</p>
        )}
        {status === 'available' && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-3">Username available</p>
        )}
        {error && (
          <p className="text-xs text-red-500 mb-3">{error}</p>
        )}
        <button
          onClick={handleSave}
          disabled={status !== 'available' || saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mt-2"
        >
          {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Save username'}
        </button>
      </div>
    </div>
  );
}

function hasCachedSession() {
  if (typeof window === 'undefined') return false;
  try {
    if (document.cookie.split(';').some(
      c => c.trim().match(/^sb-.+-auth-token/)
    )) return true;
    return Object.keys(localStorage).some(
      k => k.startsWith('sb-') && k.endsWith('-auth-token') && !!localStorage.getItem(k)
    );
  } catch { return false; }
}

export default function DashLayout({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPickUsername, setShowPickUsername] = useState(false);
  const router = useRouter();

  useLayoutEffect(() => {
    if (hasCachedSession()) {
      setIsLoading(false);
      setIsAuthenticated(true);
    }
    if (typeof window !== 'undefined' && localStorage.getItem('pick_username') === '1') {
      setShowPickUsername(true);
    }
  }, []);

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
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090B] flex flex-col items-center justify-center gap-6">
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-white font-black text-sm">b</span>
          </div>
          <span className="font-black text-xl tracking-tighter text-gray-900 dark:text-gray-100">
            beone<span className="text-blue-600">of</span>us
          </span>
        </div>
        <div className="w-32 h-0.5 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full animate-[loading_1.2s_ease-in-out_infinite]" style={{ width: '40%' }} />
        </div>
        <style>{`
          @keyframes loading {
            0%   { transform: translateX(-100%); width: 40%; }
            50%  { width: 60%; }
            100% { transform: translateX(280%); width: 40%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <DashboardProvider>
      {showPickUsername && (
        <PickUsernameModal onDone={() => setShowPickUsername(false)} />
      )}
      {!isAuthenticated && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-center justify-between gap-4 bg-zinc-900 dark:bg-zinc-950 text-white pl-5 pr-2 py-2 rounded-2xl shadow-2xl shadow-black/30 border border-zinc-700/60 backdrop-blur-xl">
            <span className="text-sm text-zinc-300 font-medium">
              Guest mode — sign in to interact.
            </span>
            <button
              onClick={() => router.push('/auth')}
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-lg shadow-blue-500/20 shrink-0"
            >
              Sign in free
            </button>
          </div>
        </div>
      )}
      <DashLayoutContent>{children}</DashLayoutContent>
    </DashboardProvider>
  );
}
