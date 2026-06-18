"use client";

import {
  Home, Users, MessageSquare, Bookmark, FileText,
  Bell, Settings, LogOut, Terminal, CheckCheck, UserPlus, Crown,
  GraduationCap, CalendarDays, Handshake, Newspaper, HeartHandshake, LayoutDashboard,
  ShoppingBag, User, BookOpen, Sparkles, Zap, Compass, BarChart2, Briefcase,
  Map, Trophy, ScrollText, Building2, Library, TrendingUp,
  Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import VerifiedBadge from './VerifiedBadge';
import PremiumBadge from './PremiumBadge';
import { getAvatarSrc } from '../../lib/avatar';
import { useLanguage } from '../../lib/i18n';
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

function getCachedProfile() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SIDEBAR_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > SIDEBAR_CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setCachedProfile(data) {
  try { sessionStorage.setItem(SIDEBAR_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

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
  const channelRef       = useRef(null);

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

    const initData = async () => {
      try {
        setIsProfileLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setAuthSession(session);
          const uid = session.user.id;

          const { data: profileData } = await supabase
            .from('profiles').select('*').eq('id', uid).single();
          if (profileData) { setProfile(profileData); setCachedProfile(profileData); }

          await fetchCounts(uid);

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
        } else {
          setProfile(null);
          setUnreadMessages(0); setUnreadNotifs(0); setUnreadGroups(0);
        }
      } catch (err) {
        console.error("Sidebar init error:", err);
      } finally {
        setIsProfileLoading(false);
      }
    };

    initData();
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => initData());
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
    await supabase.auth.signOut();
    setProfile(null);
    try { sessionStorage.removeItem(SIDEBAR_CACHE_KEY); } catch {}
    router.push('/auth');
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

  const navGroups = [
    {
      label: t('nav.groups.core'),
      items: [
        { id: 'home',          icon: LayoutDashboard, label: t('nav.items.dashboard')     },
        { id: 'feed',          icon: Home,            label: t('nav.items.feed')           },
        { id: 'messages',      icon: MessageSquare,   label: t('nav.items.messages'),      badge: unreadMessages, onBadge: handleMarkAllMessagesRead, isBouncing },
        { id: 'notifications', icon: Bell,            label: t('nav.items.notifications'), badge: unreadNotifs,   onBadge: handleMarkAllNotifsRead,   isRinging  },
      ],
    },
    {
      label: t('nav.groups.network'),
      items: [
        { id: 'connections', icon: UserPlus,      label: t('nav.items.connections') },
        { id: 'groups',      icon: Users,         label: t('nav.items.groups'),      badge: unreadGroups, onBadge: handleMarkAllGroupsRead, isRinging: isGroupRinging },
        { id: 'pages',       icon: Building2,     label: t('nav.items.pages')        },
        { id: 'events',      icon: CalendarDays,  label: t('nav.items.events')       },
      ],
    },
    {
      label: 'Explore',
      items: [
        { id: 'contents',      icon: Library,    label: 'Contents',      href: '/contents'      },
        { id: 'opportunities', icon: TrendingUp, label: 'Opportunities', href: '/opportunities' },
      ],
    },
    {
      label: t('nav.groups.tools'),
      items: [
        { id: 'ai',          icon: Sparkles,  label: t('nav.items.ai'), isNew: true },
        { id: 'analytics',   icon: BarChart2, label: 'Analytics',       isNew: true },
        { id: 'leaderboard', icon: Trophy,    label: 'Leaderboard',     isNew: true },
        { id: 'resume',      icon: FileText,  label: 'Resume Builder',  isNew: true },
      ],
    },
    {
      label: t('nav.groups.account'),
      items: [
        { id: 'profile',  icon: User,     label: t('nav.items.profile')  },
        { id: 'premium',  icon: Crown,    label: t('nav.items.premium')  },
        { id: 'settings', icon: Settings, label: t('nav.items.settings') },
        { id: 'more',     icon: Terminal, label: 'More'                  },
      ],
    },
  ];

  /* ── Collapsed sidebar ───────────────────────────────────────── */
  if (isCollapsed) {
    const allItems = navGroups.flatMap(g => g.items);
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
                active={activeSection === item.id}
                onClick={() => {
                  if (item.href) { router.push(item.href); onClose?.(); }
                  else handleNavClick(item.id);
                }}
                isRinging={item.isRinging || (item.id === 'notifications' && isRinging)}
                isBouncing={item.isBouncing || (item.id === 'messages' && isBouncing)}
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
        <nav className="flex-1 overflow-y-auto custom-scrollbar pb-2 space-y-4 px-3">
          {navGroups.map((group, gi) => {
            let itemIndex = 0;
            for (let g = 0; g < gi; g++) itemIndex += navGroups[g].items.length;
            return (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-1.5 px-3">
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[2px] shrink-0">
                    {group.label}
                  </p>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item, i) => (
                    <NavItemExpanded
                      key={item.id}
                      index={itemIndex + i}
                      icon={item.icon}
                      label={item.label}
                      badge={item.badge}
                      active={activeSection === item.id}
                      onClick={() => {
                        if (item.href) { router.push(item.href); onClose?.(); }
                        else handleNavClick(item.id);
                      }}
                      onBadgeAction={item.onBadge}
                      isBouncing={item.isBouncing || false}
                      isRinging={item.isRinging || false}
                      isNew={item.isNew}
                    />
                  ))}
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

          {/* Profile card skeleton */}
          {isProfileLoading ? (
            <div className="flex items-center gap-3 mx-3 my-2 py-2.5 px-3 rounded-xl animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-800 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-16" />
              </div>
            </div>
          ) : (
            <>
              {/* Profile row */}
              <div
                className="flex items-center gap-3 mx-3 mt-2 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none min-w-0 group"
                onClick={() => { if (profile) { router.push('/dash/profile'); onClose?.(); } }}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 p-[1.5px] shadow-sm shadow-blue-500/20 shrink-0">
                  <div className="relative w-full h-full rounded-[9px] bg-white dark:bg-gray-900 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase overflow-hidden">
                    {getAvatarSrc(profile, authSession) ? (
                      <Image src={getAvatarSrc(profile, authSession)} alt="Avatar" fill sizes="36px" className="object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      profile ? profile.username?.substring(0, 2) : '??'
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {profile ? (
                    <>
                      <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1 max-w-full">
                        <span className="truncate">@{profile.username}</span>
                        {profile.is_verified && <VerifiedBadge size={12} />}
                        {(profile.is_premium || profile.is_admin) && profile.profile_visibility?.premium_badge !== false && (
                          <PremiumBadge size={12} isTrial={!!profile.is_trial_premium} />
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0" />
                        <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest truncate">
                          {profile.status || t('nav.active_node')}
                        </p>
                      </div>
                    </>
                  ) : (
                    <Link href="/auth" className="block hover:opacity-80 transition-opacity min-w-0" onClick={e => e.stopPropagation()}>
                      <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 uppercase italic truncate">Guest_Node</p>
                      <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest truncate">{t('nav.authorize_access')}</p>
                    </Link>
                  )}
                </div>
              </div>

              {/* Sign out */}
              {profile && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 py-2 px-3 mx-3 mb-3 mt-0.5 w-[calc(100%-24px)] rounded-xl text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group select-none min-w-0"
                >
                  <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wide truncate">{t('nav.sign_out')}</span>
                </button>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
