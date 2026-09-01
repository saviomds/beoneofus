"use client";

import {
  Home, Users, MessageSquare, Bookmark, FileText,
  Bell, Settings, LogOut, Terminal, CheckCheck, UserPlus, Crown,
  CalendarDays, Handshake, Newspaper, LayoutDashboard,
  ShoppingBag, User, Zap, Compass, BarChart2, Briefcase,
  Map, Trophy, ScrollText, Building2, TrendingUp, Globe,
  Search, ChevronLeft, ChevronRight, ChevronDown, Plus, Store, Orbit, Rocket,
} from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../supabaseClient';
import { signOutEverywhere } from '../../lib/signOutEverywhere';
import { useRouter, usePathname } from 'next/navigation';
import VerifiedBadge from './VerifiedBadge';
import PremiumBadge from './PremiumBadge';
import { getAvatarSrc } from '../../lib/avatar';
import { useLanguage } from '../../lib/i18n';
import { consolePathFor } from '../../lib/orgVerticals';
import { usePlatformVersion } from '../../hooks/usePlatformVersion';

/* ── Collapsed nav item (icon + tooltip) ─────────────────────── */
function NavItemCollapsed({ icon: Icon, label, badge, active, onClick, isRinging, isBouncing }) {
  return (
    <div
      title={label}
      onClick={onClick}
      className={`relative flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer mx-auto transition-all duration-150 select-none ${
        active
          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
          : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      <Icon
        size={18}
        strokeWidth={active ? 2.5 : 1.8}
        className={`${isRinging ? 'animate-ring' : ''} ${isBouncing ? 'animate-message-bounce' : ''} transition-none`}
      />
      {badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[7px] font-black min-w-[14px] h-3.5 flex items-center justify-center rounded-full border border-white dark:border-zinc-900 px-0.5 leading-none shadow-sm">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </div>
  );
}

/* ── Expanded nav item ───────────────────────────────────────── */
function NavItemExpanded({ icon: Icon, label, badge, active, onClick, onBadgeAction, isRinging, isBouncing, index, isNew }) {
  const { t } = useLanguage();
  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${(index || 0) * 30}ms`, animationFillMode: 'both' }}
      className={`group flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer select-none transition-all duration-150 ${
        active
          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex items-center justify-center shrink-0">
          <Icon
            size={16}
            strokeWidth={active ? 2.5 : 1.8}
            className={`${isRinging ? 'animate-ring' : ''} ${isBouncing ? 'animate-message-bounce' : ''} transition-none`}
          />
          {badge > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[7px] font-black min-w-[14px] h-3.5 flex items-center justify-center rounded-full border border-white dark:border-zinc-900 px-0.5 shadow-sm">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        <span className={`text-[13px] truncate ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
        {isNew && !active && (
          <span className="shrink-0 text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white px-1.5 py-0.5 rounded-full leading-none">
            NEW
          </span>
        )}
      </div>
      {onBadgeAction && badge > 0 && (
        <button
          onClick={e => { e.stopPropagation(); onBadgeAction(); }}
          title={t('nav.mark_all_read')}
          className={`opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity p-1 rounded-md ${
            active ? 'hover:bg-white/20' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500'
          }`}
        >
          <CheckCheck size={12} />
        </button>
      )}
    </div>
  );
}

/* ── Cache helpers ───────────────────────────────────────────── */
const SIDEBAR_CACHE_KEY = 'sidebar_profile_v1';
const SIDEBAR_CACHE_TTL = 5 * 60 * 1000;

// Read the currently signed-in user's id synchronously from the Supabase auth
// token in localStorage. Used to guarantee the cached profile below belongs to
// THIS user — otherwise, after a logout→login on the same device, the sidebar
// could hydrate with the previous account's name/avatar/orgs.
function getStoredUid() {
  if (typeof window === 'undefined') return null;
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
        let raw = localStorage.getItem(k);
        if (!raw) continue;
        if (raw.startsWith('base64-')) raw = atob(raw.slice(7));
        const parsed = JSON.parse(raw);
        return parsed?.user?.id ?? parsed?.currentSession?.user?.id ?? null;
      }
    }
  } catch { /* fall through */ }
  return null;
}

function getCachedProfile() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SIDEBAR_CACHE_KEY);
    if (!raw) return null;
    const { uid, data, ts } = JSON.parse(raw);
    if (Date.now() - ts > SIDEBAR_CACHE_TTL) return null;
    // Only trust the cache if it belongs to the user who is signed in RIGHT NOW.
    if (!uid || uid !== getStoredUid()) return null;
    return data;
  } catch { return null; }
}

function setCachedProfile(data) {
  try {
    sessionStorage.setItem(SIDEBAR_CACHE_KEY, JSON.stringify({ uid: data?.id ?? null, data, ts: Date.now() }));
  } catch {}
}

/* ── Workspace model ─────────────────────────────────────────────
   The vision reframes the flat "journey" nav as an operating system of
   named Workspaces. Every section still maps to exactly ONE workspace so
   there's no duplication and the active workspace can auto-expand.        */
const SECTION_WORKSPACE = {
  home: 'universe', feed: 'universe', messages: 'universe', notifications: 'universe',
  resume: 'career', pathways: 'career', matches: 'career',
  jobs: 'opportunity', freelance: 'opportunity', companies: 'opportunity', contracts: 'opportunity', partnerships: 'opportunity', discover: 'opportunity', apply: 'opportunity',
  market: 'creator', marketplace: 'creator', services: 'creator', blog: 'creator', orders: 'creator',
  projects: 'innovation', 'tech-hub': 'innovation', startups: 'innovation',
  connections: 'network', groups: 'network', events: 'network', leaderboard: 'network',
  analytics: 'command', admin: 'command',
  premium: 'account', settings: 'account', more: 'account', profile: 'account', search: 'account', docs: 'account', bookmarks: 'account', pages: 'account',
};

/* accent tokens per workspace — literal strings so Tailwind v4 detects them */
const WS_ACCENT = {
  blue: 'text-blue-600 dark:text-blue-400', violet: 'text-violet-600 dark:text-violet-400',
  cyan: 'text-cyan-600 dark:text-cyan-400', fuchsia: 'text-fuchsia-600 dark:text-fuchsia-400',
  amber: 'text-amber-600 dark:text-amber-400', teal: 'text-teal-600 dark:text-teal-400',
  orange: 'text-orange-600 dark:text-orange-400', sky: 'text-sky-600 dark:text-sky-400',
  slate: 'text-slate-600 dark:text-slate-400',
};
const WS_ACCENT_BG = {
  blue: 'bg-blue-50 dark:bg-blue-500/10', violet: 'bg-violet-50 dark:bg-violet-500/10',
  cyan: 'bg-cyan-50 dark:bg-cyan-500/10', fuchsia: 'bg-fuchsia-50 dark:bg-fuchsia-500/10',
  amber: 'bg-amber-50 dark:bg-amber-500/10', teal: 'bg-teal-50 dark:bg-teal-500/10',
  orange: 'bg-orange-50 dark:bg-orange-500/10', sky: 'bg-sky-50 dark:bg-sky-500/10',
  slate: 'bg-slate-100 dark:bg-slate-500/10',
};
const WS_OPEN_KEY = 'sidebar_ws_open_v1';

/* ── Main Sidebar component ──────────────────────────────────── */
export default function Sidebar({ onClose, isCollapsed = false, onToggleCollapse }) {
  const { t } = useLanguage();
  const { versionData } = usePlatformVersion();
  const [profile, setProfile]                   = useState(() => getCachedProfile());
  const [authSession, setAuthSession]           = useState(null);
  const [unreadMessages, setUnreadMessages]     = useState(0);
  const [unreadNotifs, setUnreadNotifs]         = useState(0);
  const [unreadGroups, setUnreadGroups]         = useState(0);
  const [isProfileLoading, setIsProfileLoading] = useState(() => !getCachedProfile());
  const [myOrgs, setMyOrgs]                     = useState([]);
  const [isRinging, setIsRinging]               = useState(false);
  const [isGroupRinging, setIsGroupRinging]     = useState(false);
  const [isBouncing, setIsBouncing]             = useState(false);
  const prevNotifsRef    = useRef(0);
  const prevMessagesRef  = useRef(0);
  const prevGroupsRef    = useRef(0);
  const messagePopAudioRef = useRef(null);
  const router           = useRouter();
  const pathname         = usePathname();
  const activeSection    = pathname?.split('/')[2] || 'feed';
  const activeWorkspaceId = SECTION_WORKSPACE[activeSection] || 'universe';
  const channelRef       = useRef(null);
  const profileLoadedRef = useRef(!!getCachedProfile());

  /* Which workspace accordions the user has expanded (persisted). The active
     workspace is derived-open at render time so the current page is always
     visible without writing to state inside an effect. */
  const [openWs, setOpenWs] = useState([]);

  useEffect(() => {
    // Hydrate persisted state from localStorage only on the client, after initial render.
    try {
      const raw = localStorage.getItem(WS_OPEN_KEY);
      if (raw) setOpenWs(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(WS_OPEN_KEY, JSON.stringify(openWs)); } catch {}
  }, [openWs]);
  const toggleWs = (id) => setOpenWs(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  useEffect(() => {
    if (typeof window !== "undefined") {
      messagePopAudioRef.current = new Audio("/sounds/pop.ogg");
    }
  }, []);

  useEffect(() => {
    if (unreadNotifs > prevNotifsRef.current) {
      setIsRinging(true);
      const t = setTimeout(() => setIsRinging(false), 500);
      prevNotifsRef.current = unreadNotifs;
      return () => clearTimeout(t);
    }
    prevNotifsRef.current = unreadNotifs;
  }, [unreadNotifs]);

  useEffect(() => {
    if (unreadMessages > prevMessagesRef.current) {
      setIsBouncing(true);
      if (messagePopAudioRef.current) {
        if (localStorage.getItem('beoneofus_muted') !== 'true') {
          messagePopAudioRef.current.currentTime = 0;
          messagePopAudioRef.current.play().catch(() => {});
        }
      }
      const t = setTimeout(() => setIsBouncing(false), 800);
      prevMessagesRef.current = unreadMessages;
      return () => clearTimeout(t);
    }
    prevMessagesRef.current = unreadMessages;
  }, [unreadMessages]);

  useEffect(() => {
    if (unreadGroups > prevGroupsRef.current) {
      setIsGroupRinging(true);
      const t = setTimeout(() => setIsGroupRinging(false), 500);
      prevGroupsRef.current = unreadGroups;
      return () => clearTimeout(t);
    }
    prevGroupsRef.current = unreadGroups;
  }, [unreadGroups]);

  useEffect(() => {
    const fetchCounts = async (uid) => {
      const { data: connections } = await supabase
        .from('connections')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .eq('status', 'accepted');

      let validSenderIds = [];
      if (connections?.length > 0) {
        validSenderIds = connections.map(c => c.sender_id === uid ? c.receiver_id : c.sender_id);
      }

      if (validSenderIds.length > 0) {
        const { data: unreadData } = await supabase
          .from('messages')
          .select('sender_id')
          .eq('receiver_id', uid)
          .eq('is_read', false)
          .in('sender_id', validSenderIds);
        const uniqueSenders = new Set(unreadData?.map(m => m.sender_id)).size;
        setUnreadMessages(uniqueSenders || 0);
      } else {
        setUnreadMessages(0);
      }

      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, type')
        .eq('receiver_id', uid)
        .eq('unread', true);

      let notifsCount = 0;
      let groupsCount = 0;
      if (notifications) {
        notifications.forEach(n => {
          if (n.type === 'group_invite' || n.type === 'group_join_request') groupsCount++;
          else notifsCount++;
        });
      }
      setUnreadNotifs(notifsCount);
      setUnreadGroups(groupsCount);
    };

    const initData = async (event) => {
      try {
        // Skeleton only on the very first load — never flash it again on a
        // background auth refresh (that made the profile "disappear").
        if (!profileLoadedRef.current) setIsProfileLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setAuthSession(session);
          const uid = session.user.id;

          // If a previous account's profile is still on screen (in-tab account
          // switch), drop it immediately so we never show the wrong identity.
          setProfile(prev => (prev && prev.id !== uid ? null : prev));

          const { data: profileData } = await supabase
            .from('profiles').select('*').eq('id', uid).single();
          if (profileData) { setProfile(profileData); setCachedProfile(profileData); profileLoadedRef.current = true; }

          await fetchCounts(uid);

          // Organizations this user owns or manages → business console shortcuts
          try {
            const orgCols = 'id, name, slug, type, logo_url, is_verified';
            const [{ data: owned }, { data: memberships }] = await Promise.all([
              supabase.from('organizations').select(orgCols).eq('owner_id', uid),
              supabase.from('organization_members')
                .select(`role, organizations(${orgCols})`)
                .eq('user_id', uid),
            ]);
            const map = new Map();
            (owned || []).forEach(o => o && map.set(o.id, o));
            (memberships || []).forEach(m => {
              const o = m.organizations;
              if (o && ['owner', 'admin', 'recruiter', 'program_manager'].includes(m.role)) map.set(o.id, o);
            });
            setMyOrgs([...map.values()]);
          } catch { setMyOrgs([]); }

          if (channelRef.current) supabase.removeChannel(channelRef.current);
          channelRef.current = supabase
            .channel(`sidebar-updates-${uid}-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages',      filter: `receiver_id=eq.${uid}` }, () => fetchCounts(uid))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `receiver_id=eq.${uid}` }, () => fetchCounts(uid))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'connections',   filter: `receiver_id=eq.${uid}` }, () => fetchCounts(uid))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'connections',   filter: `sender_id=eq.${uid}`   }, () => fetchCounts(uid))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` }, async () => {
              const { data: up } = await supabase.from('profiles').select('*').eq('id', uid).single();
              if (up) { setProfile(up); setCachedProfile(up); }
            })
            .subscribe();
        } else if (event === 'SIGNED_OUT') {
          // Only wipe identity on an explicit sign-out — not on a transient
          // "no session" blip during token refresh, which would blank the rail.
          profileLoadedRef.current = false;
          setProfile(null);
          setUnreadMessages(0); setUnreadNotifs(0); setUnreadGroups(0);
          setMyOrgs([]);
          try { sessionStorage.removeItem(SIDEBAR_CACHE_KEY); } catch {}
        }
      } catch (err) {
        console.error("Sidebar init error:", err);
      } finally {
        setIsProfileLoading(false);
      }
    };

    initData();
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => initData(event));
    return () => {
      authSub.unsubscribe();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  useEffect(() => {
    const totalUnread = unreadMessages + unreadNotifs + unreadGroups;
    let favicon = document.querySelector("link[rel~='icon']");
    if (!favicon) { favicon = document.createElement('link'); favicon.rel = 'icon'; document.head.appendChild(favicon); }
    if (!favicon.dataset.originalHref) favicon.dataset.originalHref = favicon.href || '/favicon.ico';
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) beoneofus`;
      favicon.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%233b82f6'/%3E%3Ccircle cx='85' cy='15' r='15' fill='%23ef4444'/%3E%3C/svg%3E";
    } else {
      document.title = 'beoneofus';
      favicon.href = favicon.dataset.originalHref;
    }
  }, [unreadMessages, unreadNotifs, unreadGroups]);

  const handleLogout = async () => {
    setProfile(null);
    setMyOrgs([]);
    await signOutEverywhere();
    // Hard navigation (not router.push) guarantees a clean slate: no retained
    // React state, in-memory caches, or open realtime channels from this session.
    window.location.href = '/auth';
  };

  const handleMarkAllMessagesRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from('messages').update({ is_read: true }).eq('receiver_id', session.user.id).eq('is_read', false);
      setUnreadMessages(0);
    } catch (err) { console.error('Error marking messages read:', err); }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: notifs } = await supabase.from('notifications').select('id, type').eq('receiver_id', session.user.id).eq('unread', true);
      if (notifs) {
        const ids = notifs.filter(n => n.type !== 'group_invite' && n.type !== 'group_join_request').map(n => n.id);
        if (ids.length > 0) await supabase.from('notifications').update({ unread: false }).in('id', ids);
      }
      setUnreadNotifs(0);
    } catch (err) { console.error('Error marking notifs read:', err); }
  };

  const handleMarkAllGroupsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: notifs } = await supabase.from('notifications').select('id, type').eq('receiver_id', session.user.id).eq('unread', true).in('type', ['group_invite', 'group_join_request']);
      if (notifs?.length > 0) await supabase.from('notifications').update({ unread: false }).in('id', notifs.map(n => n.id));
      setUnreadGroups(0);
    } catch (err) { console.error('Error marking group notifs read:', err); }
  };

  const handleNavClick = (id) => { router.push('/dash/' + id); onClose?.(); };

  // The platform as an OPERATING SYSTEM — one shell, ten workspaces. Each
  // workspace is an accordion that expands to its modules; every existing
  // destination lives under exactly one workspace (see SECTION_WORKSPACE).
  const WORKSPACES = [
    {
      id: 'universe', label: 'My Universe', icon: Orbit, accent: 'blue',
      items: [
        { id: 'home',          icon: LayoutDashboard, label: 'Overview' },
        { id: 'feed',          icon: Home,            label: t('nav.items.feed') },
        { id: 'messages',      icon: MessageSquare,   label: t('nav.items.messages'),      badge: unreadMessages, onBadge: handleMarkAllMessagesRead, isBouncing },
        { id: 'notifications', icon: Bell,            label: t('nav.items.notifications'), badge: unreadNotifs,   onBadge: handleMarkAllNotifsRead,   isRinging },
      ],
    },
    {
      id: 'career', label: 'Career', icon: TrendingUp, accent: 'violet',
      items: [
        { id: 'resume',    icon: FileText, label: 'Resume Builder' },
        { id: 'pathways',  icon: Map,      label: 'Career Pathways' },
        { id: 'matches',   icon: Zap,      label: 'Matches' },
      ],
    },
    {
      id: 'opportunity', label: 'Opportunity Engine', icon: Compass, accent: 'cyan',
      items: [
        { id: 'jobs',         icon: Briefcase,  label: 'Jobs' },
        { id: 'freelance',    icon: Globe,      label: 'Remote Work' },
        { id: 'companies',    icon: Building2,   label: 'Companies' },
        { id: 'contracts',    icon: ScrollText,  label: 'Contracts' },
        { id: 'partnerships', icon: Handshake,   label: 'Partnerships' },
        { id: 'discover',     icon: Compass,     label: 'Discover' },
      ],
    },
    {
      id: 'creator', label: 'Creator Economy', icon: Store, accent: 'amber',
      items: [
        { id: 'market',   icon: Store,        label: 'Marketplace', href: '/market', isNew: true },
        { id: 'services', icon: ShoppingBag,  label: 'Sell Services' },
        { id: 'blog',     icon: Newspaper,    label: 'Publish' },
      ],
    },
    {
      id: 'innovation', label: 'Innovation Hub', icon: Rocket, accent: 'orange',
      items: [
        { id: 'projects', icon: Map,      label: 'Build Together' },
        { id: 'tech-hub', icon: Terminal, label: 'Tech Hub' },
        { id: 'startups', icon: Rocket,   label: 'Startups' },
      ],
    },
    {
      id: 'network', label: 'World Network', icon: Globe, accent: 'sky',
      items: [
        { id: 'connections', icon: UserPlus,     label: t('nav.items.connections') },
        { id: 'groups',      icon: Users,        label: t('nav.items.groups'), badge: unreadGroups, onBadge: handleMarkAllGroupsRead, isRinging: isGroupRinging },
        { id: 'events',      icon: CalendarDays, label: t('nav.items.events') },
        { id: 'leaderboard', icon: Trophy,       label: 'Leaderboard' },
      ],
    },
    {
      id: 'command', label: 'Command Center', icon: BarChart2, accent: 'slate',
      items: [
        { id: 'analytics', icon: BarChart2, label: 'Analytics' },
        ...(profile?.is_admin ? [{ id: 'admin', icon: Terminal, label: 'Admin' }] : []),
      ],
    },
    {
      id: 'account', label: 'Account', icon: Settings, accent: 'slate',
      items: [
        { id: 'premium',  icon: Crown,    label: t('nav.items.premium') },
        { id: 'settings', icon: Settings, label: t('nav.items.settings') },
        { id: 'more',     icon: Terminal, label: 'More' },
      ],
    },
  ];

  /* ── Collapsed sidebar ───────────────────────────────────────── */
  if (isCollapsed) {
    // Collapsed rail shows one icon per WORKSPACE (not every module) — jumps to
    // the workspace's primary destination and rolls up unread counts.
    const wsItems = WORKSPACES.map(ws => ({
      id: ws.id,
      icon: ws.icon,
      label: ws.label,
      badge: ws.items.reduce((n, it) => n + (it.badge || 0), 0),
      target: ws.items[0]?.href || ws.items[0]?.id,
      isHref: !!ws.items[0]?.href,
    }));
    const orgItems = myOrgs.map(o => ({ id: `org-${o.slug}`, icon: Building2, label: o.name, target: consolePathFor(o.type, o.slug), isHref: true }));
    const allItems = [...wsItems, ...orgItems];
    return (
      <>
        <style>{`
          @keyframes ring { 0%,100%{transform:rotate(0)} 25%{transform:rotate(15deg) scale(1.15)} 50%{transform:rotate(-15deg) scale(1.15)} 75%{transform:rotate(15deg) scale(1.15)} }
          .animate-ring{animation:ring .5s ease-in-out;transform-origin:top center}
          @keyframes message-bounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.1)}}
          .animate-message-bounce{animation:message-bounce .4s ease-in-out 2}
        `}</style>
        <aside className="w-full h-full flex flex-col items-center py-4 gap-1 bg-transparent">

          {/* Logo icon */}
          <Link href="/" title="BeOneOfUs" className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/25 hover:scale-110 transition-transform duration-200 shrink-0 mb-3">
            <Terminal size={15} className="text-white" />
          </Link>

          {/* Nav icons */}
          <nav className="flex-1 flex flex-col gap-0.5 w-full items-center overflow-y-auto no-scrollbar px-2">
            {allItems.map(item => (
              <NavItemCollapsed
                key={item.id}
                icon={item.icon}
                label={item.label}
                badge={item.badge}
                active={item.id === activeWorkspaceId || item.id === `org-${activeSection}`}
                onClick={() => {
                  if (item.isHref) { router.push(item.target); onClose?.(); }
                  else handleNavClick(item.target);
                }}
                isRinging={item.id === 'universe' && isRinging}
                isBouncing={item.id === 'universe' && isBouncing}
              />
            ))}
          </nav>

          {/* Divider */}
          <div className="w-8 h-px bg-gray-100 dark:bg-gray-800 my-1 shrink-0" />

          {/* Expand button */}
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shrink-0"
          >
            <ChevronRight size={15} />
          </button>

          {/* Avatar (collapsed) */}
          {!isProfileLoading && (
            <div
              title={profile ? `@${profile.username}` : 'Guest'}
              onClick={() => { router.push('/dash/profile'); onClose?.(); }}
              className="w-9 h-9 rounded-xl overflow-hidden ring-2 ring-blue-500/30 cursor-pointer hover:ring-blue-500/60 hover:scale-105 transition-all shrink-0 mb-2 relative"
            >
              {getAvatarSrc(profile, authSession) ? (
                <Image src={getAvatarSrc(profile, authSession)} alt="Avatar" fill sizes="36px" className="object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold text-xs uppercase">
                  {profile?.username?.substring(0, 2) || '??'}
                </div>
              )}
              {/* Online dot */}
              {profile && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-zinc-900" />
              )}
            </div>
          )}
        </aside>
      </>
    );
  }

  /* ── Expanded sidebar ────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes ring { 0%,100%{transform:rotate(0)} 25%{transform:rotate(15deg) scale(1.15)} 50%{transform:rotate(-15deg) scale(1.15)} 75%{transform:rotate(15deg) scale(1.15)} }
        .animate-ring{animation:ring .5s ease-in-out;transform-origin:top center}
        @keyframes message-bounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.1)}}
        .animate-message-bounce{animation:message-bounce .4s ease-in-out 2}
      `}</style>
      <aside className="w-full h-full bg-transparent flex flex-col">

        {/* ── Logo + collapse toggle ── */}
        <div className="flex items-center justify-between px-4 pt-5 pb-2 shrink-0">
          <Link
            href="/"
            title="Go Home"
            className="font-black text-[17px] tracking-tighter flex items-center gap-2.5 text-gray-900 dark:text-gray-100 hover:opacity-80 transition-opacity select-none group min-w-0"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Terminal size={14} className="text-white" />
            </div>
            <span className="truncate">beone<span className="text-blue-600">of</span>us</span>
          </Link>

          {/* Desktop collapse button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center text-gray-300 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shrink-0 ml-1"
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>

        {/* ── Search bar ── */}
        <div className="px-4 pb-3 shrink-0">
          <button
            onClick={() => { router.push('/dash/search'); onClose?.(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 text-gray-400 dark:text-gray-500 hover:border-blue-300 dark:hover:border-blue-800/60 hover:text-blue-500 dark:hover:text-blue-400 transition-all group"
          >
            <Search size={13} className="shrink-0" />
            <span className="text-[12px] font-medium flex-1 text-left">Search platform…</span>
            <span className="text-[9px] font-black text-gray-300 dark:text-gray-600 bg-gray-100 dark:bg-gray-700/60 px-1.5 py-0.5 rounded-md shrink-0">⌘K</span>
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar pb-2 px-3 space-y-1.5">

          {/* Identity: your profile + pages you manage (LinkedIn-style) */}
          {isProfileLoading ? (
            <div className="flex items-center gap-3 p-2.5 rounded-2xl animate-pulse">
              <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-16" />
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-1">
              <button
                onClick={() => { router.push('/dash/profile'); onClose?.(); }}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left group"
              >
                <div className="w-11 h-11 rounded-full ring-2 ring-blue-500/30 overflow-hidden shrink-0 relative bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold text-sm uppercase">
                  {getAvatarSrc(profile, authSession)
                    ? <Image src={getAvatarSrc(profile, authSession)} alt="Avatar" fill sizes="44px" className="object-cover" referrerPolicy="no-referrer" />
                    : (profile.username?.substring(0, 2) || '??')}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-[#111115]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                    <span className="truncate">{profile.full_name || `@${profile.username}`}</span>
                    {profile.is_verified && <VerifiedBadge size={12} />}
                    {(profile.is_premium || profile.is_admin) && profile.profile_visibility?.premium_badge !== false && (
                      <PremiumBadge size={12} isTrial={!!profile.is_trial_premium} />
                    )}
                  </p>
                  <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">View your page</p>
                </div>
              </button>

              {/* ── Organization section — logo + name, like LinkedIn Pages ── */}
              {myOrgs.length > 0 && (
                <div className="pt-2">
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[2px] px-2 mb-1">Organization</p>
                  {myOrgs.map(o => (
                    <button
                      key={o.slug}
                      onClick={() => { router.push(consolePathFor(o.type, o.slug)); onClose?.(); }}
                      className="w-full flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                        {o.logo_url
                          ? <Image src={o.logo_url} alt="" width={36} height={36} className="w-full h-full object-cover" referrerPolicy="no-referrer" unoptimized />
                          : <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase">{(o.name || '?').slice(0, 2)}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate flex items-center gap-1">
                          <span className="truncate">{o.name}</span>
                          {o.is_verified && <VerifiedBadge size={11} />}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-bold truncate">
                          {(o.type || 'business')} · Manage
                        </p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => { router.push('/organizations/new'); onClose?.(); }}
                    className="w-full flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center shrink-0"><Plus size={14} /></div>
                    <span className="text-[12px] font-semibold">Add another page</span>
                  </button>
                </div>
              )}
              {myOrgs.length === 0 && (
                <button
                  onClick={() => { router.push('/organizations/new'); onClose?.(); }}
                  className="w-full flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center shrink-0"><Plus size={14} /></div>
                  <span className="text-[12px] font-semibold">Create a company page</span>
                </button>
              )}
            </div>
          ) : (
            <Link href="/auth" onClick={onClose} className="flex items-center gap-3 p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white shrink-0"><User size={20} /></div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Sign in</p>
                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Access your account</p>
              </div>
            </Link>
          )}

          <div className="h-px bg-gray-100 dark:bg-gray-800 mx-1 my-1.5" />

          {/* Workspaces — the platform as one intelligent operating system.
              Each accordion expands to its modules; the active workspace is
              always open, and unread rolls up onto the collapsed header. */}
          {WORKSPACES.map((ws) => {
            const isActiveWs = ws.id === activeWorkspaceId;
            const open = openWs.includes(ws.id) || isActiveWs;
            const rollup = ws.items.reduce((n, it) => n + (it.badge || 0), 0);
            const WsIcon = ws.icon;
            return (
              <div key={ws.id} className="pt-0.5">
                <button
                  onClick={() => toggleWs(ws.id)}
                  aria-expanded={open}
                  className={`w-full group flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors ${
                    isActiveWs ? 'bg-gray-50 dark:bg-gray-800/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${WS_ACCENT_BG[ws.accent]} ${WS_ACCENT[ws.accent]}`}>
                    <WsIcon size={15} strokeWidth={2.2} />
                  </span>
                  <span className={`flex-1 text-left text-[12.5px] font-bold tracking-tight truncate ${isActiveWs ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    {ws.label}
                  </span>
                  {rollup > 0 && !open && (
                    <span className="shrink-0 bg-red-500 text-white text-[8px] font-black min-w-[15px] h-4 px-1 rounded-full flex items-center justify-center">
                      {rollup > 9 ? '9+' : rollup}
                    </span>
                  )}
                  <ChevronDown size={14} className={`shrink-0 text-gray-300 dark:text-gray-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>
                <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
                  <div className="overflow-hidden">
                    <div className="pl-2.5 pr-0.5 py-0.5 space-y-0.5 border-l border-gray-100 dark:border-gray-800 ml-4 mt-0.5">
                      {ws.items.map((item, i) => (
                        <NavItemExpanded
                          key={item.id}
                          index={i}
                          icon={item.icon}
                          label={item.label}
                          badge={item.badge}
                          active={activeSection === item.id}
                          onClick={() => { if (item.href) { router.push(item.href); onClose?.(); } else handleNavClick(item.id); }}
                          onBadgeAction={item.onBadge}
                          isBouncing={item.isBouncing || false}
                          isRinging={item.isRinging || false}
                          isNew={item.isNew}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── User profile footer ── */}
        <div className="mt-auto shrink-0 border-t border-gray-100 dark:border-gray-800">

          {/* Version tag */}
          {versionData?.version && (
            <div className="px-5 pt-3 pb-1 flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Platform</span>
              <span className="text-[9px] font-black text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 px-1.5 py-0.5 rounded-full">
                v{versionData.version}
              </span>
              {versionData.label && (
                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{versionData.label}</span>
              )}
            </div>
          )}

          {/* Sign out (profile identity now lives at the top of the rail) */}
          {profile && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 py-2 px-3 mx-3 my-2 w-[calc(100%-24px)] rounded-xl text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group select-none min-w-0"
            >
              <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wide truncate">{t('nav.sign_out')}</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
