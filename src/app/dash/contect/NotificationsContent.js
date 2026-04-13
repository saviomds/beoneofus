"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Bell, Heart, MessageSquare, Check, Zap, 
  ShieldAlert, ShieldCheck, MoreHorizontal, Users, ChevronRight, Clock
} from "lucide-react"; 
import { supabase } from "../../supabaseClient";
import { useDashboard } from "./DashboardContext";

export default function NotificationsContent() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const { setActiveSection } = useDashboard();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select(`
            *,
            actor:actor_id (username, avatar_url)
          `)
          .eq('receiver_id', currentUserId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotifications(data || []);
      } catch (err) {
        console.error("System Error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    const channel = supabase.channel(`notif-feed-${currentUserId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notifications' }, 
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  const markAllRead = async () => {
    if (!currentUserId) return;
    await supabase.from('notifications').update({ unread: false }).eq('receiver_id', currentUserId);
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  // Handles marking the notification as read and instantly routing to the origin section
  const handleNotificationClick = async (notif) => {
    // 1. Mark as read optimistically and in DB
    if (notif.unread) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
      await supabase.from('notifications').update({ unread: false }).eq('id', notif.id);
    }

    // 2. Route to origin section based on your DashboardContext
    if (notif.link) {
      window.location.href = notif.link; // Fallback for external links
      return;
    }

    switch (notif.type) {
      case 'group_invite': 
        setActiveSection('groups'); break;
      case 'comment':
      case 'like': 
        setActiveSection('feed'); break;
      case 'handshake': 
      case 'blocked':
      case 'unblocked': 
        setActiveSection('messages'); break;
      default: break;
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart size={14} className="text-rose-500" />;
      case 'comment': return <MessageSquare size={14} className="text-blue-500" />;
      case 'handshake': return <Check size={14} className="text-emerald-500" />;
      case 'blocked': return <ShieldAlert size={14} className="text-orange-500" />;
      case 'unblocked': return <ShieldCheck size={14} className="text-green-500" />;
      case 'group_invite': return <Users size={14} className="text-purple-500" />;
      default: return <Zap size={14} className="text-amber-500" />;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((new Date() - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20">
      <Zap className="text-blue-500 animate-pulse mb-4" size={32} />
      <p className="text-gray-500 font-black text-xs uppercase tracking-[0.2em]">Syncing Terminal...</p>
    </div>
  );

  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            <Bell size={28} className="text-blue-500" />
            Notifications
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Monitor your incoming alerts and network handshakes.</p>
        </div>
        <button onClick={markAllRead} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/5">
          <Check size={16} /> Mark all read
        </button>
      </div>

      <div className="flex flex-col gap-2 px-2 pb-20">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div 
              key={notif.id} 
              onClick={() => handleNotificationClick(notif)}
              className={`group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-[1.5rem] transition-all border cursor-pointer overflow-hidden ${notif.unread ? 'bg-blue-900/10 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.08)]' : 'bg-[#0A0A0A] border-white/5 hover:border-blue-500/30 hover:bg-[#0F0F0F]'}`}
            >
              {/* Subtle background glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative flex-shrink-0 z-10">
                <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg transition-colors overflow-hidden ${notif.unread ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-white/5 border border-white/10 group-hover:bg-white/10'}`}>
                  {notif.actor?.avatar_url ? (
                    <Image src={notif.actor.avatar_url} alt="avatar" fill className="object-cover" />
                  ) : (
                    notif.actor?.username?.[0] || 'S'
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-[#0A0A0A] border border-white/10 rounded-xl flex items-center justify-center shadow-xl">
                  {getIcon(notif.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0 z-10 pt-1">
                <div className="text-sm text-gray-400 leading-relaxed">
                  <span className="font-bold text-white mr-1">@{notif.actor?.username || 'System'}</span> 
                  {notif.type === 'like' && 'liked your post.'}
                  {notif.type === 'comment' && <>replied: <span className="text-gray-300 italic">{notif.content}</span></>}
                  {notif.type === 'handshake' && 'accepted your connection request.'}
                  {notif.type === 'blocked' && 'severed the connection.'}
                  {notif.type === 'group_invite' && <>invited you to <span className="font-bold text-white">{notif.content}</span>.</>}
                  {!['like', 'comment', 'handshake', 'blocked', 'group_invite'].includes(notif.type) && `${notif.content}`}
                </div>
                
                <div className="flex items-center gap-3 mt-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${notif.unread ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-gray-500 border-white/10'}`}>
                    {notif.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
                    <Clock size={12} /> {formatTime(notif.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 z-10 pl-2 shrink-0">
                 {notif.unread && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />}
                 <ChevronRight size={18} className="text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))
        ) : (
          <div className="py-32 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[3rem] bg-gradient-to-b from-transparent to-white/[0.02]">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Bell size={40} className="text-gray-700" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No notifications yet</h3>
            <p className="text-gray-500 text-sm text-center max-w-sm">When you get network updates, handshakes, or messages, they will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}