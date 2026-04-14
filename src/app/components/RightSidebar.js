"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import { 
  Users, X, Loader2, Sparkles, UserPlus, Check, Globe, Lock, ChevronRight, Zap
} from 'lucide-react';
import ProfileContent from "../dash/contect/ProfileContent";

const SectionHeader = ({ title, icon: Icon }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[2.5px]">
        {title}
      </h3>
    </div>
    {Icon && <Icon size={14} className="text-gray-700" />}
  </div>
);

export default function RightSidebar() {
  const [suggestions, setSuggestions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [followedIds, setFollowedIds] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchSidebarData = async (showLoader = true) => {
      if (showLoader) setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isMounted) {
        if (showLoader && isMounted) setLoading(false);
        return;
      }
      const uid = session.user.id;

      // Fetch existing connections to know who we already follow
      const { data: connections } = await supabase
        .from('connections')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

      let connectedIds = [];
      if (connections) {
        connectedIds = connections.map(c => c.sender_id === uid ? c.receiver_id : c.sender_id);
        if (isMounted) setFollowedIds(connectedIds);
      }

      // Fetch suggested users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, status, avatar_url')
        .neq('id', uid);

      if (profiles && isMounted) {
        // Filter out people we are already connected to
        const unassociated = profiles.filter(p => !connectedIds.includes(p.id));
        
        setSuggestions(prev => {
          if (!showLoader && prev.length > 0) {
            const remaining = prev.filter(p => !connectedIds.includes(p.id));
            if (remaining.length < 15) {
              // Add unfollowed users back into the active suggestions list
              const newToAdd = unassociated.filter(u => !remaining.some(r => r.id === u.id));
              return [...remaining, ...newToAdd].slice(0, 15);
            }
            return remaining;
          }
          return unassociated.sort(() => 0.5 - Math.random()).slice(0, 15);
        });
      }

      // Fetch active groups
      const { data: activeGroups } = await supabase
        .from('groups')
        .select('id, name, description, is_private')
        .order('created_at', { ascending: false })
        .limit(3);

      if (activeGroups && isMounted) {
        setGroups(activeGroups);
      }

      if (showLoader && isMounted) setLoading(false);
    };

    fetchSidebarData();

    const channel = supabase.channel('right-sidebar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => fetchSidebarData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => fetchSidebarData(false))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => fetchSidebarData(false))
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleFollowToggle = async (e, receiverId, isFollowed) => {
    e.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    if (isFollowed) {
      // Optimistically unfollow
      setFollowedIds(prev => prev.filter(id => id !== receiverId));
      const { data, error } = await supabase.from('connections')
        .delete()
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${session.user.id})`)
        .select();

      if (error || !data || data.length === 0) {
        console.error("Unfollow error:", error?.message || "Missing DELETE policy");
        setFollowedIds(prev => [...prev, receiverId]); // Revert UI
        alert("Error unfollowing: Database blocked the action. Ensure you added the SQL DELETE policy.");
      }
    } else {
      // Optimistically follow
      setFollowedIds(prev => [...prev, receiverId]);
      
      const { error } = await supabase.from('connections').insert({
        sender_id: session.user.id,
        receiver_id: receiverId,
        status: 'pending'
      });

      if (error) {
        console.error("Connection error:", error.message);
        setFollowedIds(prev => prev.filter(id => id !== receiverId)); // Revert UI
        alert("Error sending request: " + error.message);
        return;
      }

      const { error: notifError } = await supabase.from('notifications').insert({
        receiver_id: receiverId,
        actor_id: session.user.id,
        type: 'connection_request',
        content: 'wants to connect'
      });

      if (notifError) {
        console.error("Notification error:", notifError.message);
      }
    }
  };

  return (
    <aside className="w-full flex flex-col p-6 space-y-10 h-screen sticky top-0 overflow-y-auto no-scrollbar bg-transparent border-l border-white/5 relative">
      
      {/* 1. Suggested Connections */}
      <div className="pt-2">
        <SectionHeader title="Suggested Connections" icon={Users} />
        {loading ? (
          <div className="flex justify-center items-center h-24"><Loader2 size={20} className="animate-spin text-gray-600" /></div>
        ) : suggestions.length === 0 ? (
          <div className="text-xs text-gray-600 font-medium">No suggestions right now.</div>
        ) : (
          <div className="space-y-3 max-h-[190px] overflow-y-auto custom-scrollbar pr-2">
            {suggestions.map((user) => {
              const isFollowed = followedIds.includes(user.id);
              return (
                <div 
                  key={user.id} 
                  onClick={() => setSelectedUserId(user.id)}
                  className="flex items-center justify-between group cursor-pointer p-2 -mx-2 rounded-xl hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-xl bg-black overflow-hidden shrink-0 border border-white/10">
                      {user.avatar_url ? (
                        <Image src={user.avatar_url} alt="avatar" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm uppercase">
                          {user.username?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-gray-200 truncate group-hover:text-blue-400 transition-colors">@{user.username}</span>
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest truncate">{user.status || 'Active Node'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleFollowToggle(e, user.id, isFollowed)}
                    className={`group/btn shrink-0 p-2 rounded-xl transition-all border ${isFollowed ? 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                    title={isFollowed ? "Unfollow" : "Follow"}
                  >
                    {isFollowed ? (
                      <>
                        <Check size={14} className="group-hover/btn:hidden block" />
                        <X size={14} className="group-hover/btn:block hidden" />
                      </>
                    ) : (
                      <UserPlus size={14} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Discover Groups */}
      <div>
        <SectionHeader title="Discover Groups" icon={Globe} />
        {loading ? (
          <div className="flex justify-center items-center h-24"><Loader2 size={20} className="animate-spin text-gray-600" /></div>
        ) : groups.length === 0 ? (
          <div className="text-xs text-gray-600 font-medium">No active groups.</div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div 
                key={group.id} 
                className="flex flex-col group cursor-pointer p-3 rounded-2xl bg-[#0F0F0F] border border-white/5 hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold text-white truncate">{group.name}</span>
                    {group.is_private ? <Lock size={10} className="text-amber-500 shrink-0" /> : <Globe size={10} className="text-blue-500 shrink-0" />}
                  </div>
                  <ChevronRight size={14} className="text-gray-700 group-hover:text-blue-500 transition-all shrink-0" />
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {group.description || "A community node on beoneofus."}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. New Features */}
      <div>
        <SectionHeader title="What's New" icon={Sparkles} />
        <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
          <div className="relative z-10 space-y-4">
            <div className="flex gap-3 items-start">
              <div className="mt-0.5 w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0">
                <Zap size={12} className="text-blue-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white mb-0.5">End-to-End Workspaces</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed">Secure, private group chats are now active. Create a node to begin.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="mt-0.5 w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center shrink-0">
                <Users size={12} className="text-purple-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white mb-0.5">Global Connections</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed">Follow other developers and build your custom network feed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* USER PROFILE MODAL */}
      {selectedUserId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar z-10 bg-[#0A0A0A] rounded-[2rem] border border-white/10 shadow-2xl">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[250] p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-full text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-2 sm:p-6">
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Footer/About Section */}
      <div className="mt-auto pt-8 text-center">
        <p className="text-[10px] text-gray-700 font-mono">
          beoneofus network v1.0<br/>
          All systems operational.
        </p>
      </div>
    </aside>
  );
}