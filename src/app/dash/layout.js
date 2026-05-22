'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Menu, X, Home, MessageSquare, Bell, User, Users, ShoppingBag, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import '../globals.css'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import RightSidebar from '../components/RightSidebar'
import { DashboardProvider } from './content/DashboardContext'
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../supabaseClient';

/* Patch performance.measure at module load time — Next.js/Turbopack calls it
   synchronously during render with marks that have negative timestamps in dev. */
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

/* ── Bottom nav items shown on mobile ── */
const BOTTOM_NAV = [
  { id: 'home',          icon: Home,          label: 'Home' },
  { id: 'messages',      icon: MessageSquare, label: 'Msgs' },
  { id: 'notifications', icon: Bell,          label: 'Alerts' },
  { id: 'marketplace',   icon: ShoppingBag,   label: 'Market' },
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

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;

function PickUsernameModal({ onDone }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | available | taken | invalid
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
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

// Returns true if Supabase has a cached session in localStorage (synchronous).
function hasCachedSession() {
  if (typeof window === 'undefined') return false;
  try {
    return Object.keys(localStorage).some(
      k => k.startsWith('sb-') && k.endsWith('-auth-token') && !!localStorage.getItem(k)
    );
  } catch { return false; }
}

export default function DashLayout({ children }) {
  // Always start with isLoading=true so server and client render the same initial HTML (no hydration mismatch).
  // useLayoutEffect then immediately skips the spinner for returning users before the browser paints.
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="w-7 h-7 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 dark:text-gray-500 font-mono uppercase text-xs tracking-widest">Loading…</p>
      </div>
    );
  }

  return (
    <DashboardProvider>
      {showPickUsername && (
        <PickUsernameModal onDone={() => setShowPickUsername(false)} />
      )}
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
