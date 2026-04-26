"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Bell, Heart, MessageSquare, Check, Zap, 
  ShieldAlert, ShieldCheck, MoreHorizontal, Users, ChevronRight, Clock, UserPlus,
  BadgeCheck
} from "lucide-react"; 
import { supabase } from "../../supabaseClient";
import { useDashboard } from "./DashboardContext";

export default function NotificationsContent() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const { setActiveSection, setTargetChatUser } = useDashboard();

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
            actor:actor_id (username, avatar_url, is_verified)
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
      case 'group_join_request':
        setActiveSection('groups'); break;
      case 'comment':
      case 'like': 
        setActiveSection('feed'); break;
      case 'message':
        if (setTargetChatUser && notif.actor_id) {
          setTargetChatUser({ id: notif.actor_id, ...notif.actor });
        }
        setActiveSection('messages'); break;
      case 'connection_request':
      case 'handshake': 
      case 'blocked':
      case 'unblocked': 
        setActiveSection('messages'); break;
      default: break;
    }
  };

  const handleAcceptConnection = async (e, notif) => {
    e.stopPropagation();
    if (!currentUserId) return;

    await supabase.from('connections')
      .update({ status: 'accepted' })
      .eq('sender_id', notif.actor_id)
      .eq('receiver_id', currentUserId);

    await supabase.from('notifications').insert({
      receiver_id: notif.actor_id,
      actor_id: currentUserId,
      type: 'handshake',
      content: 'accepted your connection request'
    });

    await supabase.from('notifications').update({ unread: false }).eq('id', notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
  };

  const handleDeclineConnection = async (e, notif) => {
    e.stopPropagation();
    if (!currentUserId) return;

    // If the user who sent the request was deleted, gracefully clear the notification
    if (!notif.actor_id) {
      await supabase.from('notifications').update({ unread: false }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
      return;
    }

    // If the user who sent the request was deleted, gracefully clear the notification
    if (!notif.actor_id) {
      await supabase.from('notifications').update({ unread: false }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
      return;
    }

    await supabase.from('connections')
      .delete()
      .eq('sender_id', notif.actor_id)
      .eq('receiver_id', currentUserId);

    await supabase.from('notifications').update({ unread: false }).eq('id', notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
  };

  const handleAcceptGroupJoin = async (e, notif, groupId, groupName) => {
    e.stopPropagation();
    if (!currentUserId || !groupId) return;

    // If the user who sent the request was deleted, gracefully clear the notification
    if (!notif.actor_id) {
      await supabase.from('notifications').update({ unread: false }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
      return;
    }

    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: notif.actor_id,
      role: 'member'
    });

    if (!error || (error && error.message.includes('duplicate'))) {
      await supabase.from('notifications').insert({ receiver_id: notif.actor_id, actor_id: currentUserId, type: 'group_invite', content: groupName });
    }

    await supabase.from('notifications').update({ unread: false }).eq('id', notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
  };

  const handleDeclineGroupJoin = async (e, notif) => {
    e.stopPropagation();
    await supabase.from('notifications').update({ unread: false }).eq('id', notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart size={14} className="text-rose-500" />;
      case 'comment': return <MessageSquare size={14} className="text-blue-500" />;
      case 'message': return <MessageSquare size={14} className="text-violet-500" />;
      case 'handshake': return <Check size={14} className="text-emerald-500" />;
      case 'blocked': return <ShieldAlert size={14} className="text-orange-500" />;
      case 'unblocked': return <ShieldCheck size={14} className="text-green-500" />;
      case 'group_invite': return <Users size={14} className="text-purple-500" />;
      case 'group_join_request': return <Users size={14} className="text-blue-500" />;
      case 'connection_request': return <UserPlus size={14} className="text-blue-500" />;
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
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
            <Bell size={28} className="text-blue-500" />
            Notifications
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Monitor your incoming alerts and network handshakes.</p>
        </div>
        <button onClick={markAllRead} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm">
          <Check size={16} /> Mark all read
        </button>
      </div>

      <div className="flex flex-col gap-2 px-2 pb-20">
        {notifications.length > 0 ? (
          notifications.map((notif) => {
            let displayContent = notif.content;
            let groupId = null;
            if (notif.type === 'group_join_request') {
              const parts = notif.content?.split('|') || [];
              if (parts.length > 1) {
                groupId = parts[0];
                displayContent = parts.slice(1).join('|');
              }
            }

            return (
            <div 
              key={notif.id} 
              onClick={() => handleNotificationClick(notif)}
              className={`group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-[1.5rem] transition-all border cursor-pointer overflow-hidden ${notif.unread ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200 hover:border-blue-500/30 hover:shadow-md'}`}
            >
              {/* Subtle background glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative flex-shrink-0 z-10">
                <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg transition-colors overflow-hidden ${notif.unread ? 'bg-blue-600 shadow-sm' : 'bg-gray-100 text-gray-500 border border-gray-200 group-hover:bg-gray-200'}`}>
                  {notif.actor?.avatar_url ? (
                    <Image src={notif.actor.avatar_url} alt="avatar" fill sizes="48px" className="object-cover" />
                  ) : (
                    notif.actor?.username?.[0] || 'S'
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                  {getIcon(notif.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0 z-10 pt-1">
                <div className="text-sm text-gray-600 leading-relaxed">
                  <span className="font-bold text-gray-900 mr-1 inline-flex items-center gap-1 align-bottom">
                    @{notif.actor?.username || 'System'}
                    {notif.actor?.is_verified && <BadgeCheck size={14} className="text-blue-500" fill="currentColor" stroke="white" />}
                  </span> 
                  {notif.type === 'like' && 'liked your post.'}
                  {notif.type === 'message' && <>sent you a message: <span className="text-gray-700 italic">{displayContent}</span></>}
                  {notif.type === 'comment' && <>replied: <span className="text-gray-700 italic">{notif.content}</span></>}
                  {notif.type === 'handshake' && 'accepted your connection request.'}
                  {notif.type === 'connection_request' && 'sent you a connection request.'}
                  {notif.type === 'blocked' && 'severed the connection.'}
                  {notif.type === 'group_join_request' && <>requested to join <span className="font-bold text-gray-900">{displayContent}</span>.</>}
                  {notif.type === 'group_invite' && <>granted you access to <span className="font-bold text-gray-900">{displayContent}</span>.</>}
                  {!['like', 'comment', 'message', 'handshake', 'connection_request', 'blocked', 'unblocked', 'group_invite', 'group_join_request'].includes(notif.type) && `${displayContent}`}
                </div>
                
                <div className="flex items-center gap-3 mt-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${notif.unread ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {notif.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
                    <Clock size={12} /> {formatTime(notif.created_at)}
                  </span>
                </div>

                {/* ACTION BUTTONS FOR CONNECTION REQUEST */}
                {notif.type === 'connection_request' && notif.unread && (
                  <div className="flex items-center gap-2 mt-3 z-20">
                    <button 
                      onClick={(e) => handleAcceptConnection(e, notif)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={(e) => handleDeclineConnection(e, notif)}
                      className="bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors border border-gray-200"
                    >
                      Decline
                    </button>
                  </div>
                )}

                {/* ACTION BUTTONS FOR GROUP JOIN REQUEST */}
                {notif.type === 'group_join_request' && notif.unread && (
                  <div className="flex items-center gap-2 mt-3 z-20">
                    <button 
                      onClick={(e) => handleAcceptGroupJoin(e, notif, groupId, displayContent)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={(e) => handleDeclineGroupJoin(e, notif)}
                      className="bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors border border-gray-200"
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 z-10 pl-2 shrink-0">
                 {notif.unread && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />}
                 <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
            );
          })
        ) : (
          <div className="py-32 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-[3rem] bg-gray-50">
            <div className="w-20 h-20 bg-white border border-gray-200 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Bell size={40} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No notifications yet</h3>
            <p className="text-gray-500 text-sm text-center max-w-sm">When you get network updates, handshakes, or messages, they will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}