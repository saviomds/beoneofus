"use client";

import {
  Home, Users, MessageSquare, Bookmark, FileText,
  MoreHorizontal, Bell, Settings, LogOut
} from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../supabaseClient'; 
import { useRouter } from 'next/navigation';
import VerifiedBadge from './VerifiedBadge';

const SidebarItem = ({ icon: Icon, label, badge, active, onClick }) => (
  <div
    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
      active ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
    }`}
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <Icon size={20} />
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </div>
    {badge > 0 && (
      <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </div>
);

export default function Sidebar({ activeSection, onSectionChange }) {
  const [profile, setProfile] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0); // State for real notification count
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const router = useRouter();

  // 1. Fetch Profile & Real Counts (Messages + Notifications)
  useEffect(() => {
    const fetchData = async () => {
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

        // Fetch Real Message Count (Incoming to the user)
        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', uid);
        
        setUnreadMessages(msgCount || 0);

        // Fetch Real Notification Count (Unread packets only)
        const { count: notifCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', uid)
          .eq('unread', true);
        
        setUnreadNotifs(notifCount || 0);
      } else {
        setProfile(null);
        setUnreadMessages(0);
        setUnreadNotifs(0);
      }
      setIsProfileLoading(false);
    };

    fetchData();

    // 2. Real-time Listener for Auth, Messages, and Notifications
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      fetchData();
    });

    const sidebarSub = supabase
      .channel('sidebar-live-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, () => fetchData())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications' 
      }, () => fetchData())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles'
      }, () => fetchData())
      .subscribe();

    return () => {
      authSub.unsubscribe();
      supabase.removeChannel(sidebarSub);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/auth');
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
      {/* SIDEBAR ASIDE */}
      <aside className="w-full h-full bg-transparent p-4 md:p-6 flex flex-col">
        
        {/* Logo Area */}
        <div className="flex items-center gap-2 mb-6 md:mb-10 px-2 shrink-0">
          <Image src="/logo.png" alt="beoneofus" width={100} height={24} />
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar pb-2">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-[2px] mb-4 px-3">Main Menu</p>
          {sidebarItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              active={activeSection === item.id}
              onClick={() => handleNavClick(item.id)}
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