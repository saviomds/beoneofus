"use client";

import { useState } from "react";
import { 
  Bell, 
  UserPlus, 
  Heart, 
  MessageSquare, 
  Star, 
  MoreHorizontal,
  Circle
} from "lucide-react";

const NOTIFICATIONS = [
  { 
    id: 1, 
    type: 'mention', 
    user: 'Alex Rivera', 
    content: 'mentioned you in a comment: "This Next.js setup is clean!"', 
    time: '2m ago',
    unread: true,
    icon: <MessageSquare size={14} className="text-blue-500" />
  },
  { 
    id: 2, 
    type: 'follow', 
    user: 'Sarah Chen', 
    content: 'started following you.', 
    time: '1h ago',
    unread: true,
    icon: <UserPlus size={14} className="text-emerald-500" />
  },
  { 
    id: 3, 
    type: 'like', 
    user: 'Mauritius Dev Group', 
    content: 'liked your post "Building a global SaaS with Next.js 15"', 
    time: '5h ago',
    unread: false,
    icon: <Heart size={14} className="text-rose-500" />
  },
  { 
    id: 4, 
    type: 'system', 
    user: 'BeOneOfUs', 
    content: 'Your account has been upgraded to Pro.', 
    time: '1d ago',
    unread: false,
    icon: <Star size={14} className="text-amber-500" />
  },
];

export default function NotificationsContent() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Area */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Stay updated with your community.</p>
        </div>
        <button className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors">
          Mark all as read
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex flex-col gap-2 no-scrollbar">
        {notifications.map((notif) => (
          <div 
            key={notif.id} 
            className={`group relative flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer border ${
              notif.unread 
              ? 'bg-blue-600/5 border-blue-500/20' 
              : 'bg-[#0F0F0F] border-white/5 hover:border-white/10'
            }`}
          >
            {/* Status Indicator */}
            {notif.unread && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
            )}

            {/* Icon/Avatar Block */}
            <div className="relative flex-shrink-0 mt-1">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold text-xs">
                {notif.user[0]}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0A0A0A] border border-white/5 rounded-lg flex items-center justify-center shadow-lg">
                {notif.icon}
              </div>
            </div>

            {/* Content Block */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm text-gray-300 leading-relaxed">
                  <span className="font-bold text-white">{notif.user}</span> {notif.content}
                </p>
                <span className="text-[10px] text-gray-600 font-bold whitespace-nowrap mt-1">
                  {notif.time}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 text-gray-600 hover:text-white transition-colors">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem]">
            <Bell size={48} className="text-gray-800 mb-4" />
            <p className="text-gray-600 font-bold text-sm">All caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}