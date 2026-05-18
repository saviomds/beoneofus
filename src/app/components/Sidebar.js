"use client";

import {
  Home, Users, MessageSquare, Bookmark, FileText,
  Bell, Settings, LogOut, Terminal, CheckCheck, UserPlus, Crown,
  GraduationCap, CalendarDays, Handshake, Newspaper, HeartHandshake, LayoutDashboard,
  ShoppingBag, User, BookOpen, Sparkles, Zap, Compass, BarChart2, Briefcase,
  Map, Trophy, ScrollText,
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

const SidebarItem = ({ icon: Icon, label, badge, active, onClick, onBadgeAction, isRinging, isBouncing, index, isNew }) => {
  const { t } = useLanguage();
  return (
  <div
    className={`group flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer select-none transition-all animate-in fade-in slide-in-from-left-4 duration-500 ${
      active
        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-blue-600 dark:hover:text-blue-400'
    }`}
    style={{ animationDelay: `${(index || 0) * 40}ms`, animationFillMode: 'both' }}
    onClick={onClick}
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="relative flex items-center justify-center shrink-0">
        <Icon size={17} className={`${isRinging ? 'animate-ring text-blue-500' : ''} ${isBouncing ? 'animate-message-bounce text-blue-500' : ''} transition-colors`} />
        {badge > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900 shadow-sm">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className={`text-[13px] tracking-wide truncate ${active ? 'font-bold' : 'font-semibold'}`}>{label}</span>
      {isNew && !active && (
        <span className="shrink-0 text-[8px] font-black uppercase tracking-widest bg-green-500 text-white px-1.5 py-0.5 rounded-full">
          {t('nav.badge_new')}
        </span>
      )}
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {onBadgeAction && badge > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onBadgeAction(); }}
          className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
          title={t('nav.mark_all_read')}
        >
          <CheckCheck size={14} />
        </button>
      )}
    </div>
  </div>
  );
};

export default function Sidebar({ onClose }) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [authSession, setAuthSession] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0); // State for real notification count
  const [unreadGroups, setUnreadGroups] = useState(0);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isRinging, setIsRinging] = useState(false);
  const [isGroupRinging, setIsGroupRinging] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const prevNotifsRef = useRef(0);
  const prevMessagesRef = useRef(0);
  const prevGroupsRef = useRef(0);
  const messagePopAudioRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const activeSection = pathname?.split('/')[2] || 'feed';
  const channelRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      messagePopAudioRef.current = new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg");
    }
  }, []);

  // Trigger ringing animation when unread count goes up
  useEffect(() => {
    if (unreadNotifs > prevNotifsRef.current) {
      setIsRinging(true);
      const timer = setTimeout(() => setIsRinging(false), 500);
      prevNotifsRef.current = unreadNotifs;
      return () => clearTimeout(timer);
    }
    prevNotifsRef.current = unreadNotifs;
  }, [unreadNotifs]);

  // Trigger bouncing animation when unread messages count goes up
  useEffect(() => {
    if (unreadMessages > prevMessagesRef.current) {
      setIsBouncing(true);
      if (messagePopAudioRef.current) {
        if (localStorage.getItem('beoneofus_muted') !== 'true') {
          messagePopAudioRef.current.currentTime = 0;
          messagePopAudioRef.current.play().catch(e => console.warn("Audio playback blocked (requires user interaction first)"));
        }
      }
      const timer = setTimeout(() => setIsBouncing(false), 800);
      prevMessagesRef.current = unreadMessages;
      return () => clearTimeout(timer);
    }
    prevMessagesRef.current = unreadMessages;
  }, [unreadMessages]);

  // Trigger ringing animation when unread groups count goes up
  useEffect(() => {
    if (unreadGroups > prevGroupsRef.current) {
      setIsGroupRinging(true);
      const timer = setTimeout(() => setIsGroupRinging(false), 500);
      prevGroupsRef.current = unreadGroups;
      return () => clearTimeout(timer);
    }
    prevGroupsRef.current = unreadGroups;
  }, [unreadGroups]);

  // 1. Fetch Profile & Real Counts (Messages + Notifications)
  useEffect(() => {
    const fetchCounts = async (uid) => {
      // 1. Get active connections to prevent counting messages from blocked/severed nodes
      const { data: connections } = await supabase
        .from('connections')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .eq('status', 'accepted');

      let validSenderIds = [];
      if (connections && connections.length > 0) {
        validSenderIds = connections.map(c => c.sender_id === uid ? c.receiver_id : c.sender_id);
      }

      // 2. Fetch unread conversations (unique senders) instead of total raw messages
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

      // 3. Fetch Notifications and separate by type
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, type')
        .eq('receiver_id', uid)
        .eq('unread', true);

      let notifsCount = 0;
      let groupsCount = 0;

      if (notifications) {
        notifications.forEach(n => {
          if (n.type === 'group_invite' || n.type === 'group_join_request') {
            groupsCount++;
          } else {
            notifsCount++;
          }
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

          // Fetch Profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();

          if (profileData) setProfile(profileData);
  
          await fetchCounts(uid);
  
          // Remove existing subscription if any
          if (channelRef.current) supabase.removeChannel(channelRef.current);
  
          // Set up targeted real-time listeners using the user's ID
          channelRef.current = supabase
            .channel(`sidebar-updates-${uid}-${Date.now()}`)
            .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'messages',
              filter: `receiver_id=eq.${uid}`
            }, () => fetchCounts(uid))
            .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'notifications',
              filter: `receiver_id=eq.${uid}`
            }, () => fetchCounts(uid))
            .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'connections',
              filter: `receiver_id=eq.${uid}`
            }, () => fetchCounts(uid))
            .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'connections',
              filter: `sender_id=eq.${uid}`
            }, () => fetchCounts(uid))
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${uid}`
            }, async () => {
              const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', uid).single();
              if (updatedProfile) setProfile(updatedProfile);
            })
            .subscribe();
  
        } else {
          setProfile(null);
          setUnreadMessages(0);
          setUnreadNotifs(0);
          setUnreadGroups(0);
        }
      } catch (error) {
        console.error("Sidebar init error:", error);
      } finally {
        setIsProfileLoading(false);
      }
    };

    initData();

    // 2. Real-time Listener for Auth, Messages, and Notifications
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      initData();
    });

    return () => {
      authSub.unsubscribe();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // Update browser tab title and favicon with unread count
  useEffect(() => {
    const totalUnread = unreadMessages + unreadNotifs + unreadGroups;
    
    // Find or create the favicon link element
    let favicon = document.querySelector("link[rel~='icon']");
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }

    // Remember the original favicon so we can restore it when all messages are read
    if (!favicon.dataset.originalHref) {
      favicon.dataset.originalHref = favicon.href || '/favicon.ico';
    }

    if (totalUnread > 0) {
      document.title = `(${totalUnread}) beoneofus`;
      // Swap to a dynamic SVG favicon that features a red notification dot!
      favicon.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%233b82f6'/%3E%3Ccircle cx='85' cy='15' r='15' fill='%23ef4444'/%3E%3C/svg%3E";
    } else {
      document.title = 'beoneofus';
      // Restore original favicon
      favicon.href = favicon.dataset.originalHref;
    } 
  }, [unreadMessages, unreadNotifs, unreadGroups]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/auth');
  };

  const handleMarkAllMessagesRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', uid)
        .eq('is_read', false);
      
      if (error) throw error;
      setUnreadMessages(0);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;

      const { data: notifs } = await supabase
        .from('notifications')
        .select('id, type')
        .eq('receiver_id', uid)
        .eq('unread', true);
      
      if (notifs) {
        const idsToMark = notifs
          .filter(n => n.type !== 'group_invite' && n.type !== 'group_join_request')
          .map(n => n.id);
          
        if (idsToMark.length > 0) {
          await supabase.from('notifications').update({ unread: false }).in('id', idsToMark);
        }
      }
      setUnreadNotifs(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleMarkAllGroupsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;

      const { data: notifs } = await supabase
        .from('notifications')
        .select('id, type')
        .eq('receiver_id', uid)
        .eq('unread', true)
        .in('type', ['group_invite', 'group_join_request']);
        
      if (notifs && notifs.length > 0) {
        const ids = notifs.map(n => n.id);
        await supabase.from('notifications').update({ unread: false }).in('id', ids);
      }
      setUnreadGroups(0);
    } catch (error) {
      console.error('Error marking group notifications as read:', error);
    }
  };

  const handleNavClick = (id) => {
    router.push('/dash/' + id);
    onClose?.();
  };

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
        { id: 'groups',      icon: Users,         label: t('nav.items.groups'),   badge: unreadGroups, onBadge: handleMarkAllGroupsRead, isRinging: isGroupRinging },
        { id: 'pages',       icon: FileText,      label: t('nav.items.pages')       },
        { id: 'events',      icon: CalendarDays,  label: t('nav.items.events')      },
      ],
    },
    {
      label: t('nav.groups.opportunities'),
      items: [
        { id: 'marketplace',  icon: ShoppingBag,    label: t('nav.items.marketplace')  },
        { id: 'services',     icon: Briefcase,      label: 'Services',          isNew: true },
        { id: 'contracts',    icon: ScrollText,     label: 'Contracts',         isNew: true },
        { id: 'coaching',     icon: GraduationCap,  label: t('nav.items.coaching')     },
        { id: 'mentorship',   icon: HeartHandshake, label: t('nav.items.mentorship')   },
        { id: 'partnerships', icon: Handshake,      label: t('nav.items.partnerships') },
      ],
    },
    {
      label: t('nav.groups.content'),
      items: [
        { id: 'learn',     icon: Compass,   label: t('nav.items.learn'),     isNew: true },
        { id: 'pathways',  icon: Map,       label: 'Pathways',               isNew: true },
        { id: 'blog',      icon: Newspaper, label: t('nav.items.blog')       },
        { id: 'bookmarks', icon: Bookmark,  label: t('nav.items.bookmarks')  },
        { id: 'docs',      icon: BookOpen,  label: t('nav.items.docs')       },
      ],
    },
    {
      label: t('nav.groups.tools'),
      items: [
        { id: 'ai',          icon: Sparkles,  label: t('nav.items.ai'),        isNew: true },
        { id: 'analytics',   icon: BarChart2, label: 'Analytics',             isNew: true },
        { id: 'leaderboard', icon: Trophy,    label: 'Leaderboard',           isNew: true },
      ],
    },
    {
      label: t('nav.groups.account'),
      items: [
        { id: 'profile',  icon: User,     label: t('nav.items.profile')  },
        { id: 'premium',  icon: Crown,    label: t('nav.items.premium')  },
        { id: 'settings', icon: Settings, label: t('nav.items.settings') },
      ],
    },
  ];

  return (
    <>
      <style>{`
        @keyframes ring {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg) scale(1.15); }
          50% { transform: rotate(-15deg) scale(1.15); }
          75% { transform: rotate(15deg) scale(1.15); }
        }
        .animate-ring { animation: ring 0.5s ease-in-out; transform-origin: top center; }

        @keyframes message-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.1); }
        }
        .animate-message-bounce { animation: message-bounce 0.4s ease-in-out 2; }
      `}</style>
      {/* SIDEBAR ASIDE */}
      <aside className="w-full h-full bg-transparent p-4 md:p-6 flex flex-col">
        
        {/* Logo Area */}
        <div className="flex items-center mb-6 px-3 shrink-0 w-full">
          <Link href="/" title="Go Home" className="font-black text-xl tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100 hover:opacity-80 transition-opacity select-none group min-w-0">
            <Terminal className="text-blue-500 group-hover:scale-110 transition-transform duration-300 shrink-0" size={22} />
            <span className="truncate">beone<span className="text-blue-600">of</span>us</span>
          </Link>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar pb-2 space-y-5">
          {navGroups.map((group, gi) => {
            let itemIndex = 0;
            for (let g = 0; g < gi; g++) itemIndex += navGroups[g].items.length;
            return (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-1.5 px-3">
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[2.5px] shrink-0">
                    {group.label}
                  </p>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item, i) => (
                    <SidebarItem
                      key={item.id}
                      index={itemIndex + i}
                      icon={item.icon}
                      label={item.label}
                      badge={item.badge}
                      active={activeSection === item.id}
                      onClick={() => handleNavClick(item.id)}
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

        {/* User Profile Section */}
        <div 
          className="mt-auto pt-4 md:pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-4 px-2 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '400ms', animationFillMode: 'both' }}
        >
          {isProfileLoading ? (
            <div className="flex items-center gap-3 py-2.5 px-3 w-full">
              <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-24" />
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-16" />
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-3 py-2.5 px-3 w-full rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all select-none min-w-0"
              onClick={() => { if (profile) { router.push('/dash/profile'); onClose?.(); } }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 p-[1.5px] shadow-md shadow-blue-500/20 shrink-0">
                <div className="relative w-full h-full rounded-[9px] bg-white dark:bg-gray-900 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase overflow-hidden">
                  {getAvatarSrc(profile, authSession) ? (
                    <Image src={getAvatarSrc(profile, authSession)} alt="Avatar" fill sizes="40px" className="object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    profile ? profile.username?.substring(0, 2) : '??'
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {profile ? (
                  <>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1 max-w-full">
                      <span className="truncate">@{profile.username}</span>
                      {profile.is_verified && <VerifiedBadge size={13} />}
                      {(profile.is_premium || profile.is_admin) && <PremiumBadge size={13} />}
                    </p>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0" />
                      <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest truncate">
                        {profile.status || t('nav.active_node')}
                      </p>
                    </div>
                  </>
                ) : (
                  <Link href="/auth" className="block hover:opacity-80 transition-opacity min-w-0" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase italic truncate">Guest_Node</p>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest truncate">{t('nav.authorize_access')}</p>
                  </Link>
                )}
              </div>
            </div>
          )}

          {profile && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 py-2.5 px-3 w-full rounded-xl text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group select-none min-w-0"
            >
              <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-tighter truncate">{t('nav.sign_out')}</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}