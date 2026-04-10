import {
  Home,
  Users,
  MessageSquare,
  Bookmark,
  MoreHorizontal,
  Bell,
  Settings,
  Code2
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';

const SidebarItem = ({ icon: Icon, label, badge, active, onClick }) => (
  <div
    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5 ${active ? 'text-brand-orange bg-white/5' : 'text-gray-400 hover:text-white'}`}
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <Icon size={22} color={active ? 'rgb(23, 136, 235)' : 'currentColor'} />
      <span className="font-medium text-[15px]">{label}</span>
    </div>
    {badge && (
      <span className="bg-brand-orange text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </div>
);

export default function Sidebar({ activeSection, onSectionChange }) {
  const sidebarItems = [
    { id: 'feed', icon: Home, label: 'My Feed', active: activeSection === 'feed' },
    { id: 'groups', icon: Users, label: 'Groups', active: activeSection === 'groups' },
    { id: 'messages', icon: MessageSquare, label: 'Messages', badge: '1', active: activeSection === 'messages' },
    { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks', active: activeSection === 'bookmarks' },
    { id: 'more', icon: MoreHorizontal, label: 'More', active: activeSection === 'more' },
  ];

  const bottomItems = [
    { id: 'notifications', icon: Bell, label: 'Notifications', badge: '3', active: activeSection === 'notifications' },
    { id: 'settings', icon: Settings, label: 'Settings', active: activeSection === 'settings' },
  ];

  return (
    <aside className="w-64 flex flex-col h-screen sticky top-0 p-6 border-r border-white/10 bg-black">
      {/* Logo Area */}
      <div className="flex items-center gap-2 px-2">
        <Image src="/logo.png" alt="Logo" width={120} height={30} className="object-contain" />
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 space-y-2">
        {sidebarItems.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            active={item.active}
            onClick={() => onSectionChange(item.id)}
          />
        ))}

        <div className="pt-8 space-y-2">
          {bottomItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              active={item.active}
              onClick={() => onSectionChange(item.id)}
            />
          ))}
        </div>
      </nav>

      {/* User Profile Section at Bottom */}
      <div className="mt-auto pt-6 border-t border-white/5 flex items-center gap-3 px-2">
        <Image
          src="/user.png"
          alt="User Avatar"
          width={40}
          height={40}
          className="rounded-full"
        />
        <div className="flex-1">
         <Link href="/auth" className="block text-sm font-medium text-white">
           <p className="text-sm font-bold text-white">Guest</p>
          <p className="text-[11px] text-gray-500">Free Account</p>
          </Link>
        </div>
      </div>
    </aside>
  );
}