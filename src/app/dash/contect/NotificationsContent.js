"use client";

import { useState, useEffect } from "react";
import { 
  Bell, Heart, MessageSquare, Check, Zap, 
  ShieldAlert, ShieldCheck, MoreHorizontal, Users 
} from "lucide-react"; // FIXED: Corrected from lucide-center
import { supabase } from "../../supabaseClient";

export default function NotificationsContent() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

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
            actor:actor_id (username)
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
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (seconds < 60) return 'NOW';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}M AGO`;
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20">
      <Zap className="text-blue-500 animate-pulse mb-4" size={32} />
      <p className="text-gray-500 font-black text-xs uppercase tracking-[0.2em]">Syncing Terminal...</p>
    </div>
  );

  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-8 px-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Terminal_Updates</h1>
          <p className="text-gray-600 text-xs mt-1 font-mono uppercase tracking-tighter">Monitoring incoming data packets...</p>
        </div>
        <button onClick={markAllRead} className="text-[10px] font-black uppercase tracking-widest text-blue-500 border border-blue-500/20 px-4 py-2 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 transition-all">
          Flush Buffer
        </button>
      </div>

      <div className="flex flex-col gap-2 px-2 pb-20">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div key={notif.id} className={`group relative flex items-start gap-4 p-5 rounded-2xl transition-all border ${notif.unread ? 'bg-blue-600/5 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]' : 'bg-[#0A0A0A] border-white/5'}`}>
              <div className="relative flex-shrink-0 mt-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-white font-black text-sm uppercase">
                  {notif.actor?.username?.[0] || 'S'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-black border border-white/10 rounded-lg flex items-center justify-center shadow-2xl">
                  {getIcon(notif.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-gray-300 leading-relaxed font-bold italic uppercase tracking-tighter">
                      <span className="font-black text-white">@{notif.actor?.username || 'SYSTEM_NODE'}</span> 
                      {notif.type === 'like' && ' performed a post synchronization.'}
                      {notif.type === 'comment' && ` replied: "${notif.content}"`}
                      {notif.type === 'handshake' && ' authorized secure link.'}
                      {notif.type === 'blocked' && ' severed handshake link.'}
                      {notif.type === 'group_invite' && ` invited you to join the group "${notif.content}".`}
                      {!['like', 'comment', 'handshake', 'blocked', 'group_invite'].includes(notif.type) && ` ${notif.content}`}
                    </div>
                    <div className="flex items-center gap-3">
                       <p className="text-[9px] font-black uppercase tracking-widest text-blue-500/60">{notif.type} PROT</p>
                       <p className="text-[9px] font-bold text-gray-700">STAMP: {formatTime(notif.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-32 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[3rem] opacity-50">
            <Bell size={48} className="text-gray-900 mb-6" />
            <p className="text-gray-700 font-black text-xs uppercase tracking-[0.3em]">Network Feed Silent</p>
            <p className="text-gray-800 text-[10px] mt-2 font-mono italic uppercase">Searching for encrypted packets...</p>
          </div>
        )}
      </div>
    </div>
  );
}