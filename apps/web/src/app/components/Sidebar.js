"use client";

import {
  LogOut, CheckCheck, User, Building2,
  ChevronLeft, ChevronRight, Plus,
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
import { NAV_SECTIONS, sectionLabel } from '../dash/navConfig';

function Badge({ count, max = 99 }) {
  if (!count) return null;
  return (
    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none flex items-center justify-center tabular-nums">
      {count > max ? `${max}+` : count}
    </span>
  );
}

/* ── Collapsed nav item (icon + tooltip) ─────────────────────── */
function NavItemCollapsed({ icon: Icon, label, badge, active, onClick, isRinging, isBouncing }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={`relative flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-100'
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2.25 : 1.9} className={`${isRinging ? 'animate-ring' : ''} ${isBouncing ? 'animate-message-bounce' : ''}`} />
      {badge > 0 && <span className="absolute -top-0.5 -right-0.5"><Badge count={badge} max={9} /></span>}
    </button>
  );
}

/* ── Expanded nav item ───────────────────────────────────────── */
function NavItemExpanded({ icon: Icon, label, badge, active, onClick, onBadgeAction, isRinging, isBouncing }) {
  const { t } = useLanguage();
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={`w-full flex items-center gap-3 h-9 px-3 rounded-lg text-left transition-colors ${
          active
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-gray-100'
        }`}
      >
        <Icon size={17} strokeWidth={active ? 2.25 : 1.9} className={`shrink-0 ${isRinging ? 'animate-ring' : ''} ${isBouncing ? 'animate-message-bounce' : ''}`} />
        <span className={`flex-1 text-sm truncate ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
        <Badge count={badge} />
      </button>
      {onBadgeAction && badge > 0 && (
        <button
          type="button"
          onClick={onBadgeAction}
          title={t('nav.mark_all_read')}
          aria-label={t('nav.mark_all_read')}
          className="absolute right-9 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          <CheckCheck size={13} />
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
  const channelRef       = useRef(null);
  const profileLoadedRef = useRef(!!getCachedProfile());

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
  const go = (href) => { router.push(href); onClose?.(); };

  // Live counters and their actions, keyed by the `badge` names in navConfig.
  const badges = {
    messages:      { count: unreadMessages, onClear: handleMarkAllMessagesRead, isBouncing },
    notifications: { count: unreadNotifs,   onClear: handleMarkAllNotifsRead,   isRinging },
    groups:        { count: unreadGroups,   onClear: handleMarkAllGroupsRead,   isRinging: isGroupRinging },
  };

  const avatarSrc = getAvatarSrc(profile, authSession);
  const initials = (profile?.full_name || profile?.username || '?').substring(0, 2);

  const animationStyles = (
    <style>{`
      @keyframes ring { 0%,100%{transform:rotate(0)} 25%{transform:rotate(15deg) scale(1.15)} 50%{transform:rotate(-15deg) scale(1.15)} 75%{transform:rotate(15deg) scale(1.15)} }
      .animate-ring{animation:ring .5s ease-in-out;transform-origin:top center}
      @keyframes message-bounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.1)}}
      .animate-message-bounce{animation:message-bounce .4s ease-in-out 2}
    `}</style>
  );

  /* ── Collapsed sidebar: one icon per destination, grouped ───── */
  if (isCollapsed) {
    return (
      <>
        {animationStyles}
        <aside className="w-full h-full flex flex-col items-center py-4 gap-1">
          <Link href="/" title="beoneofus" className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mb-3">
            <Image src="/logo.svg" alt="beoneofus" width={28} height={28} unoptimized className="w-7 h-7" />
          </Link>

          <nav className="flex-1 w-full overflow-y-auto no-scrollbar px-2 space-y-0.5" aria-label="Dashboard">
            {NAV_SECTIONS.map((section, si) => (
              <div key={section.id} className="space-y-0.5">
                {si > 0 && <div className="w-6 h-px bg-gray-200 dark:bg-gray-800 mx-auto my-2" />}
                {section.items.map(item => {
                  const b = item.badge ? badges[item.badge] : null;
                  return (
                    <NavItemCollapsed
                      key={item.id}
                      icon={item.icon}
                      label={sectionLabel(t, item.id)}
                      badge={b?.count}
                      active={activeSection === item.id}
                      onClick={() => handleNavClick(item.id)}
                      isRinging={b?.isRinging}
                      isBouncing={b?.isBouncing}
                    />
                  );
                })}
              </div>
            ))}
            {myOrgs.length > 0 && <div className="w-6 h-px bg-gray-200 dark:bg-gray-800 mx-auto my-2" />}
            {myOrgs.map(o => (
              <NavItemCollapsed key={o.slug} icon={Building2} label={o.name} onClick={() => go(consolePathFor(o.type, o.slug))} />
            ))}
          </nav>

          <button
            type="button"
            onClick={onToggleCollapse}
            title={t('dash_nav.expand')}
            aria-label={t('dash_nav.expand')}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors shrink-0 mt-2"
          >
            <ChevronRight size={16} />
          </button>

          {!isProfileLoading && (
            <button
              type="button"
              title={profile ? (profile.full_name || `@${profile.username}`) : t('dash_nav.sign_in')}
              onClick={() => go(profile ? '/dash/profile' : '/auth')}
              className="relative w-9 h-9 rounded-full overflow-hidden bg-blue-600 text-white text-xs font-semibold uppercase flex items-center justify-center shrink-0 mt-1 mb-1 ring-2 ring-white dark:ring-[#111115] hover:opacity-90"
            >
              {profile && avatarSrc
                ? <Image src={avatarSrc} alt="" fill sizes="36px" className="object-cover" referrerPolicy="no-referrer" />
                : profile ? initials : <User size={16} />}
            </button>
          )}
        </aside>
      </>
    );
  }

  /* ── Expanded sidebar ────────────────────────────────────────── */
  return (
    <>
      {animationStyles}
      <aside className="w-full h-full flex flex-col">

        {/* Logo + collapse */}
        <div className="flex items-center justify-between h-16 px-4 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 min-w-0 font-bold text-[17px] tracking-tight text-gray-900 dark:text-gray-100 hover:opacity-80 transition-opacity">
            <Image src="/logo.svg" alt="" width={28} height={28} unoptimized className="w-7 h-7 shrink-0" />
            <span className="truncate">beone<span className="text-blue-600">of</span>us</span>
          </Link>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title={t('dash_nav.collapse')}
              aria-label={t('dash_nav.collapse')}
              className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Identity */}
        <div className="px-3 pb-3 shrink-0">
          {isProfileLoading ? (
            <div className="flex items-center gap-3 p-2 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded w-16" />
              </div>
            </div>
          ) : profile ? (
            <button
              type="button"
              onClick={() => go('/dash/profile')}
              className={`w-full flex items-center gap-3 p-2 rounded-xl text-left border transition-colors ${
                activeSection === 'profile'
                  ? 'border-blue-200 bg-blue-50/60 dark:border-blue-500/30 dark:bg-blue-500/10'
                  : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-blue-600 text-white text-sm font-semibold uppercase flex items-center justify-center">
                {avatarSrc
                  ? <Image src={avatarSrc} alt="" fill sizes="40px" className="object-cover" referrerPolicy="no-referrer" />
                  : initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                  <span className="truncate">{profile.full_name || `@${profile.username}`}</span>
                  {profile.is_verified && <VerifiedBadge size={12} />}
                  {(profile.is_premium || profile.is_admin) && profile.profile_visibility?.premium_badge !== false && (
                    <PremiumBadge size={12} isTrial={!!profile.is_trial_premium} />
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t('dash_nav.view_profile')}</p>
              </div>
            </button>
          ) : (
            <Link href="/auth" onClick={onClose} className="flex items-center gap-3 p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors">
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0"><User size={18} /></div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t('dash_nav.sign_in')}</p>
                <p className="text-xs text-blue-100">{t('dash_nav.sign_in_desc')}</p>
              </div>
            </Link>
          )}
        </div>

        {/* Navigation — every destination visible, grouped under plain headings */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3" aria-label="Dashboard">
          {NAV_SECTIONS.map((section) => (
            <div key={section.id} className={section.id === 'main' ? '' : 'mt-5'}>
              {section.id !== 'main' && (
                <p className="px-3 mb-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                  {t(`dash_nav.sections.${section.id}`)}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const b = item.badge ? badges[item.badge] : null;
                  return (
                    <NavItemExpanded
                      key={item.id}
                      icon={item.icon}
                      label={sectionLabel(t, item.id)}
                      badge={b?.count}
                      active={activeSection === item.id}
                      onClick={() => handleNavClick(item.id)}
                      onBadgeAction={b?.onClear}
                      isRinging={b?.isRinging}
                      isBouncing={b?.isBouncing}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Organization pages the user manages */}
          {profile && (
            <div className="mt-5">
              <p className="px-3 mb-1 text-xs font-medium text-gray-400 dark:text-gray-500">{t('dash_nav.organizations')}</p>
              <div className="space-y-0.5">
                {myOrgs.map(o => (
                  <button
                    key={o.slug}
                    type="button"
                    onClick={() => go(consolePathFor(o.type, o.slug))}
                    className="w-full flex items-center gap-3 h-10 px-3 rounded-lg text-left text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {o.logo_url
                        ? <Image src={o.logo_url} alt="" width={24} height={24} className="w-full h-full object-cover" referrerPolicy="no-referrer" unoptimized />
                        : <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">{(o.name || '?').slice(0, 2)}</span>}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{o.name}</span>
                    </span>
                    {o.is_verified && <VerifiedBadge size={11} />}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => go('/organizations/new')}
                  className="w-full flex items-center gap-3 h-9 px-3 rounded-lg text-left text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Plus size={17} className="shrink-0" />
                  <span className="text-sm font-medium">{myOrgs.length > 0 ? t('dash_nav.add_page') : t('dash_nav.create_page')}</span>
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 px-3 py-2 flex items-center justify-between gap-2">
          {profile ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={16} />
              {t('nav.sign_out')}
            </button>
          ) : <span />}
          {versionData?.version && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums pr-2">v{versionData.version}</span>
          )}
        </div>
      </aside>
    </>
  );
}
