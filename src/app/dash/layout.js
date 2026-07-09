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

/* ── Temporary session diagnostics ───────────────────────────────
   Silent by default. To trace the session lifecycle in any environment
   (including prod), run `localStorage.setItem('boo_auth_debug','1')` in the
   console and reload. Logs auth resolution, state transitions, and events. */
function dbg(...args) {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('boo_auth_debug') === '1') {
      console.log('%c[auth]', 'color:#4C5FF5;font-weight:bold', ...args);
    }
  } catch { /* ignore */ }
}

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
/* NAV_H: approximate pill height used to compute FAB / content clearance */
export const MOB_NAV_CLEARANCE = 'calc(env(safe-area-inset-bottom,0px) + 5.5rem)';
const NAV_BOTTOM               = 'calc(env(safe-area-inset-bottom,0px) + 0.75rem)';

const BOTTOM_NAV = [
  { id: 'home',          icon: Home,          label: 'Home'    },
  { id: 'messages',      icon: MessageSquare, label: 'Msgs'    },
  { id: 'notifications', icon: Bell,          label: 'Alerts'  },
  { id: 'connections',   icon: Users,         label: 'Network' },
  { id: 'profile',       icon: User,          label: 'Profile' },
];

function BottomNav({ pathname }) {
  const router = useRouter();
  const section = pathname?.split('/')[2] || 'home';
  // Hide on messages/ai — the chat composer sits at the bottom and the nav would cover it
  if (section === 'messages' || section === 'ai') return null;
  const active = section;
  return (
    <nav
      className="md:hidden fixed left-3 right-3 z-50 pointer-events-none"
      style={{ bottom: NAV_BOTTOM }}
    >
      <div className="pointer-events-auto flex items-center bg-white/[0.97] dark:bg-zinc-900/[0.97] backdrop-blur-2xl border border-gray-100 dark:border-zinc-800 rounded-[22px] shadow-[0_8px_32px_rgba(0,0,0,0.10),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)] px-1.5 py-1.5">
        {BOTTOM_NAV.map(({ id, icon: Icon, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => router.push('/dash/' + id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-[3px] h-[50px] rounded-[16px] transition-all duration-200 active:scale-[0.93] ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-gray-400 dark:text-zinc-500'
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[8.5px] font-bold leading-none tracking-tight ${isActive ? 'opacity-90' : 'opacity-60'}`}>
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/50" />
              )}
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
function DashLayoutContent({ children, isAuthenticated }) {
  const [isLeftOpen, setIsLeftOpen]         = useState(false);
  const [isRightOpen, setIsRightOpen]       = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  /* Read persisted collapse preference on mount (client only). Lazy useState
     init can't be used here: readCollapsed() is client-only, so seeding it in
     the initializer would diverge from the server render and cause a hydration
     mismatch. Applying it in a layout effect keeps hydration stable. */
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see note above
    setIsSidebarCollapsed(readCollapsed());
  }, []);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch {}
      return next;
    });
  };

  // Close the mobile drawers whenever the route changes (sync UI to navigation).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset drawer UI on route change
    setIsLeftOpen(false);
    setIsRightOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = (isLeftOpen || isRightOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isLeftOpen, isRightOpen]);

  const isMessages = pathname?.endsWith('/messages') || pathname?.endsWith('/ai');
  // The admin console is a wide, data-dense workspace — reclaim the right rail
  // (network panel) at lg+ so the center column isn't squeezed between two rails.
  const isAdminConsole = pathname?.startsWith('/dash/admin');

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
        fixed top-0 left-0 z-50 flex flex-col
        h-[100dvh]
        w-[272px] max-w-[88vw]
        bg-white dark:bg-[#111115]
        border-r border-gray-100 dark:border-zinc-800/60
        shadow-xl shadow-black/4 dark:shadow-black/40
        transition-transform duration-300 ease-in-out
        md:relative md:shadow-none md:h-auto md:inset-auto
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
          {/* Spacer so last nav items clear the floating bottom nav */}
          <div className="md:hidden shrink-0" style={{ height: MOB_NAV_CLEARANCE }} aria-hidden="true" />
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
        <div className={`flex-1 min-h-0 ${isMessages ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
          {children}
          {/* Mobile bottom nav clearance — keeps content from hiding behind the pill */}
          {!isMessages && (
            <div
              className="md:hidden w-full shrink-0"
              style={{ height: !isAuthenticated ? 'calc(' + MOB_NAV_CLEARANCE + ' + 4rem)' : MOB_NAV_CLEARANCE }}
              aria-hidden="true"
            />
          )}
        </div>
      </main>

      {/* ══ RIGHT SIDEBAR ════════════════════════════════════════ */}
      <aside className={`
        fixed top-0 right-0 z-50 flex flex-col
        h-[100dvh]
        w-[288px] max-w-[90vw]
        bg-white dark:bg-[#111115]
        border-l border-gray-100 dark:border-zinc-800/60
        shadow-xl shadow-black/4 dark:shadow-black/40
        transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:shadow-none lg:h-auto lg:inset-auto
        lg:w-64 xl:w-72
        ${isAdminConsole ? 'lg:hidden' : ''}
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
          {/* Spacer so last items clear the floating bottom nav */}
          <div className="lg:hidden shrink-0" style={{ height: MOB_NAV_CLEARANCE }} aria-hidden="true" />
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // Debounced availability result, keyed to the username it was checked for.
  const [avail, setAvail] = useState({ user: null, result: null });

  // Status is derived from the current input + last debounced result — no
  // synchronous setState in the effect (react-hooks/set-state-in-effect).
  const status = !username ? 'idle'
    : !USERNAME_RE.test(username) ? 'invalid'
    : (avail.user === username && avail.result) ? avail.result
    : 'checking';

  useEffect(() => {
    if (!username || !USERNAME_RE.test(username)) return;
    const t = setTimeout(async () => {
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('username', username);
      setAvail({ user: username, result: count === 0 ? 'available' : 'taken' });
    }, 400);
    return () => clearTimeout(t);
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
      setAvail({ user: username, result: 'taken' });
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

/* ── Session-expired sign-in card ─────────────────────────────── */
function SessionExpiredCard({ onDismiss }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="w-11 h-11 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-4">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-amber-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
        </div>
        <h3 className="text-base font-black text-gray-900 dark:text-gray-100 mb-1 tracking-tight">Session expired</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
          You were signed out automatically. Sign in again to continue.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/auth')}
            className="flex-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-sm shadow-blue-500/20"
          >
            Sign in
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-bold text-sm transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashLayout({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // `authResolved` = the REAL getSession() check has completed at least once.
  // The optimistic `hasCachedSession()` render below skips the full-screen
  // spinner, but we must not draw auth-dependent UI (the "Guest mode" bar or the
  // session-expired card) until the token is actually validated — otherwise a
  // stale/expired token flashes the dashboard authenticated and then snaps to
  // guest, which is the "flash logged-in / flash logged-out" symptom.
  const [authResolved, setAuthResolved] = useState(false);
  const [showPickUsername, setShowPickUsername] = useState(false);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const router = useRouter();
  const wasAuthenticatedRef = useRef(false);

  useLayoutEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- optimistic auth seeded
       from cached session / localStorage on mount; lazy state init would read
       client-only storage and diverge from the server render (flash of guest
       UI + hydration mismatch). A layout effect keeps hydration stable. */
    if (hasCachedSession()) {
      dbg('optimistic render — cached token present, skipping spinner');
      setIsLoading(false);
      setIsAuthenticated(true);
      wasAuthenticatedRef.current = true;
    }
    if (typeof window !== 'undefined' && localStorage.getItem('pick_username') === '1') {
      setShowPickUsername(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      dbg('getSession resolved →', session ? `authed uid=${session.user.id}` : 'no session');
      setIsAuthenticated(!!session);
      if (session) wasAuthenticatedRef.current = true;
      setIsLoading(false);
      setAuthResolved(true);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const authed = !!session;
      dbg('onAuthStateChange', event, authed ? `uid=${session.user.id}` : '(no session)');
      setIsAuthenticated(authed);
      setAuthResolved(true);
      if (!authed && wasAuthenticatedRef.current) {
        // Session ended while the user was logged in → show the expired card.
        // Only SIGNED_OUT with no session is a genuine end-of-session; a
        // TOKEN_REFRESHED normally carries a fresh session, so a null there is
        // the real "silent refresh failed" case worth surfacing.
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (!session) setShowSessionExpired(true);
        } else {
          setShowSessionExpired(true);
        }
        wasAuthenticatedRef.current = false;
      }
      if (authed) wasAuthenticatedRef.current = true;
    });

    return () => { active = false; authListener.subscription?.unsubscribe(); };
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
      {showSessionExpired && (
        <SessionExpiredCard onDismiss={() => setShowSessionExpired(false)} />
      )}
      {authResolved && !isAuthenticated && !showSessionExpired && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md"
          style={{ bottom: 'calc(env(safe-area-inset-bottom,0px) + 5.75rem)' }}
        >
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
      <DashLayoutContent isAuthenticated={isAuthenticated}>{children}</DashLayoutContent>
    </DashboardProvider>
  );
}
