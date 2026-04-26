"use client";

import {
  Home, Users, MessageSquare, Bookmark, FileText,
  MoreHorizontal, Bell, Settings, LogOut, Terminal, CheckCheck
} from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../supabaseClient'; 
import { useRouter } from 'next/navigation';
import VerifiedBadge from './VerifiedBadge';

const SidebarItem = ({ icon: Icon, label, badge, active, onClick, onBadgeAction, isRinging, isBouncing }) => (
  <div
    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
      active ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
    }`}
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <Icon size={20} className={`${isRinging ? 'animate-ring text-blue-500' : ''} ${isBouncing ? 'animate-message-bounce text-blue-500' : ''}`} />
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {onBadgeAction && badge > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onBadgeAction(); }}
          className="text-gray-400 hover:text-blue-600 md:opacity-0 group-hover:opacity-100 transition-all p-1"
          title="Mark all as read"
        >
          <CheckCheck size={16} />
        </button>
      )}
      {badge > 0 && (
        <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg shrink-0 shadow-sm">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
  </div>
);

export default function Sidebar({ activeSection, onSectionChange }) {
  const [profile, setProfile] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0); // State for real notification count
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isRinging, setIsRinging] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const prevNotifsRef = useRef(0);
  const prevMessagesRef = useRef(0);
  const messagePopAudioRef = useRef(null);
  const router = useRouter();
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

      // 3. Fetch Real Notification Count (Unread packets only)
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', uid)
        .eq('unread', true);
      setUnreadNotifs(notifCount || 0);
    };

    const initData = async () => {
      setIsProfileLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
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
      }
      setIsProfileLoading(false);
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
    const totalUnread = unreadMessages + unreadNotifs;
    
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
  }, [unreadMessages, unreadNotifs]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/auth');
  };

  const handleMarkAllMessagesRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;

    try {
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ unread: false })
        .eq('receiver_id', uid)
        .eq('unread', true);
      
      if (error) throw error;
      setUnreadNotifs(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleNavClick = (id) => {
    onSectionChange(id);
  };

  const sidebarItems = [
    { id: 'feed', icon: Home, label: 'My Feed' },
    { id: 'groups', icon: Users, label: 'Groups' },
    { id: 'pages', icon: FileText, label: 'Pages' },
    { id: 'messages', icon: MessageSquare, label: 'Messages', badge: unreadMessages },
    { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks' },
    { id: 'more', icon: MoreHorizontal, label: 'More' },
  ];

  const bottomItems = [
    { id: 'notifications', icon: Bell, label: 'Notifications', badge: unreadNotifs }, // Now using real database count
    { id: 'settings', icon: Settings, label: 'Settings' },
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
        <div className="flex items-center mb-6 md:mb-10 px-3 shrink-0 w-full text-gray-900">
          <div className="font-black text-2xl tracking-tighter flex items-center gap-2">
            <Terminal className="text-blue-500" size={28} />
            <span>beone<span className="text-blue-600">of</span>us</span>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pb-2">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-[2px] mb-4 px-3">Main Menu</p>
          {sidebarItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              active={activeSection === item.id}
              onClick={() => handleNavClick(item.id)}
              onBadgeAction={item.id === 'messages' ? handleMarkAllMessagesRead : undefined}
              isBouncing={item.id === 'messages' ? isBouncing : false}
            />
          ))}

          <div className="pt-8 space-y-1">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[2px] mb-4 px-3">System</p>
            {bottomItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                badge={item.badge}
                active={activeSection === item.id}
                onClick={() => handleNavClick(item.id)}
                onBadgeAction={item.id === 'notifications' ? handleMarkAllNotifsRead : undefined}
                isRinging={item.id === 'notifications' ? isRinging : false}
              />
            ))}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="mt-auto pt-4 md:pt-6 border-t border-gray-200 flex flex-col gap-4 px-2 shrink-0">
          {isProfileLoading ? (
            <div className="flex items-center gap-3 p-2 -mx-2">
              <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse shrink-0"></div>
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
                <div className="h-2 bg-gray-200 rounded animate-pulse w-16"></div>
              </div>
            </div>
          ) : (
            <div 
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-all"
              onClick={() => { if (profile) handleNavClick('profile'); }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 p-[1px] shadow-lg shadow-blue-500/10 shrink-0">
                 <div className="relative w-full h-full rounded-xl bg-white flex items-center justify-center text-xs font-bold text-gray-700 uppercase overflow-hidden">
                   {profile?.avatar_url ? (
                     <Image src={profile.avatar_url} alt="Avatar" fill sizes="40px" className="object-cover" />
                   ) : (
                     profile ? profile.username?.substring(0, 2) : '??'
                   )}
                 </div>
              </div>

              <div className="flex-1 min-w-0">
                {profile ? (
                  <>
                    <p className="text-sm font-bold text-gray-900 truncate flex items-center gap-1">
                      @{profile.username}
                      {profile.is_verified && <VerifiedBadge size={14} />}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest">{profile.status || 'Active Node'}</p>
                    </div>
                  </>
                ) : (
                  <Link href="/auth" className="block hover:opacity-80 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm font-bold text-gray-900 uppercase italic">Guest_Node</p>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Authorize Access</p>
                  </Link>
                )}
              </div>
            </div>
          )}

          {profile && (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 p-3 w-full rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all group border border-transparent hover:border-red-100"
            >
              <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Terminate Session</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}