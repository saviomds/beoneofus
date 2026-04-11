"use client";

import { 
  Home, Users, MessageSquare, Bookmark, 
  MoreHorizontal, Bell, Settings, Menu, X, LogOut 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../supabaseClient'; 
import { useRouter } from 'next/navigation';

const SidebarItem = ({ icon: Icon, label, badge, active, onClick }) => (
  <div
    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
      active ? 'text-blue-500 bg-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
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
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const router = useRouter();

  // 1. Fetch Profile & Real Message Count
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Fetch Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileData) setProfile(profileData);

        // Fetch Real Message Count (Incoming to the user)
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', session.user.id);
        
        setUnreadMessages(count || 0);
      } else {
        setProfile(null);
        setUnreadMessages(0);
      }
    };

    fetchData();

    // 2. Real-time Listener for Auth and New Messages
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      fetchData();
    });

    const msgSub = supabase
      .channel('sidebar-counts')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, () => fetchData())
      .subscribe();

    return () => {
      authSub.unsubscribe();
      supabase.removeChannel(msgSub);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/auth');
  };

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleNavClick = (id) => {
    onSectionChange(id);
    setIsOpen(false); 
  };

  const sidebarItems = [
    { id: 'feed', icon: Home, label: 'My Feed' },
    { id: 'groups', icon: Users, label: 'Groups' },
    { id: 'messages', icon: MessageSquare, label: 'Messages', badge: unreadMessages }, // Real Count Added
    { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks' },
    { id: 'more', icon: MoreHorizontal, label: 'More' },
  ];

  const bottomItems = [
    { id: 'notifications', icon: Bell, label: 'Notifications', badge: 3 },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      {/* MOBILE TOGGLE BUTTON */}
      <button 
        onClick={toggleMenu}
        className="fixed top-4 left-4 z-[60] p-3 bg-[#0F0F0F] border border-white/5 rounded-2xl text-white md:hidden shadow-xl"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* MOBILE OVERLAY */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[50] md:hidden"
          onClick={toggleMenu}
        />
      )}

      {/* SIDEBAR ASIDE */}
      <aside className={`
        fixed inset-y-0 left-0 z-[55] w-64 bg-black border-r border-white/5 p-6 flex flex-col transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:h-screen sticky top-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Logo Area */}
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white italic">B</div>
          <p className="text-white font-black tracking-tighter text-xl">beone<span className="text-blue-500">of</span>us</p>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 space-y-1">
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
        <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 p-[1px]">
               <div className="w-full h-full rounded-xl bg-black flex items-center justify-center text-xs font-bold text-white uppercase">
                 {profile ? profile.username?.substring(0, 2) : '??'}
               </div>
            </div>

            <div className="flex-1 min-w-0">
              {profile ? (
                <>
                  <p className="text-sm font-bold text-white truncate">{profile.username}</p>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">{profile.status || 'Active Node'}</p>
                </>
              ) : (
                <Link href="/auth" className="block hover:opacity-80 transition-opacity">
                  <p className="text-sm font-bold text-white">Guest User</p>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Click to Login</p>
                </Link>
              )}
            </div>
          </div>

          {profile && (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 p-3 w-full rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all group"
            >
              <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-tighter">Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}