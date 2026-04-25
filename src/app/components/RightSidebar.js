"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import { 
  Users, X, Loader2, Sparkles, UserPlus, Check, Globe, Lock, ChevronRight, Zap, BookOpen, Copy, Plus, Mail, BadgeCheck
} from 'lucide-react';
import ProfileContent from "../dash/contect/ProfileContent";
import NewPost from "./NewPost";

const SectionHeader = ({ title, icon: Icon, isCollapsible, isOpen, onToggle }) => (
  <div className={`flex items-center justify-between mb-4 ${isCollapsible ? 'cursor-pointer group' : ''}`} onClick={isCollapsible ? onToggle : undefined}>
    <div className="flex items-center gap-2">
      <h3 className={`text-[10px] font-black text-gray-600 uppercase tracking-[2.5px] ${isCollapsible ? 'group-hover:text-blue-600 transition-colors' : ''}`}>
        {title}
      </h3>
    </div>
    <div className="flex items-center gap-2 text-gray-700">
      {Icon && <Icon size={14} />}
      {isCollapsible && <ChevronRight size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />}
    </div>
  </div>
);

export default function RightSidebar({ onSectionChange, setActiveTab }) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [followedIds, setFollowedIds] = useState([]);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [isSuggestedConnectionsOpen, setIsSuggestedConnectionsOpen] = useState(true);
  const [isDiscoverChannelsOpen, setIsDiscoverChannelsOpen] = useState(true);
  const [isInviteDevelopersOpen, setIsInviteDevelopersOpen] = useState(true);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(true);

  const [isCopied, setIsCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/auth`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleEmailInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setSendingEmail(true);
    
    try {
      const inviteLink = `${window.location.origin}/auth`;
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, inviteLink })
      });
      if (!response.ok) throw new Error('Failed to send invite');
      
      setEmailSuccess(true);
      setInviteEmail('');
      setTimeout(() => setEmailSuccess(false), 3000);
    } catch (error) {
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

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
        .select('id, username, status, avatar_url, is_verified')
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

  const handleDocsClick = () => {
    if (onSectionChange) {
      onSectionChange('docs');
    } else if (setActiveTab) {
      setActiveTab('docs');
    } else {
      router.push('/dash?tab=docs');
    }
  };

  return (
    <aside className="w-full flex flex-col p-6 space-y-8 h-screen sticky top-0 overflow-y-auto custom-scrollbar bg-transparent border-l border-gray-200 relative">
      
      {/* Primary Action Button */}
      <div className="shrink-0 pt-1">
        <button 
          onClick={() => setShowBroadcastModal(true)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={18} strokeWidth={3} /> Create Broadcast
        </button>
      </div>

      {/* 1. Suggested Connections */}
      <div>
        <SectionHeader 
          title="Suggested Connections" 
          icon={Users} 
          isCollapsible 
          isOpen={isSuggestedConnectionsOpen} 
          onToggle={() => setIsSuggestedConnectionsOpen(!isSuggestedConnectionsOpen)} 
        />
        {isSuggestedConnectionsOpen && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            {loading ? (
              <div className="space-y-3 max-h-[190px] overflow-hidden pr-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2 -mx-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse shrink-0"></div>
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="h-3.5 bg-gray-200 rounded animate-pulse w-24"></div>
                        <div className="h-2 bg-gray-200 rounded animate-pulse w-16"></div>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-gray-200 animate-pulse shrink-0 ml-2"></div>
                  </div>
                ))}
              </div>
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
                      className="flex items-center justify-between group cursor-pointer p-2 -mx-2 rounded-xl hover:bg-gray-50 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                          {user.avatar_url ? (
                            <Image src={user.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm uppercase">
                              {user.username?.[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors flex items-center gap-1">
                            @{user.username}
                            {user.is_verified && <BadgeCheck size={14} className="text-blue-500 drop-shadow-sm hover:scale-110 hover:-rotate-3 transition-all duration-300" fill="currentColor" stroke="white" />}
                          </span>
                          <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest truncate">{user.status || 'Active Node'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleFollowToggle(e, user.id, isFollowed)}
                        className={`group/btn shrink-0 p-2 rounded-xl transition-all border ${isFollowed ? 'bg-green-50 border-green-200 text-green-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
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
        )}
      </div>

      {/* 2. Discover Channels */}
      <div>
        <SectionHeader 
          title="Discover Channels" 
          icon={Globe} 
          isCollapsible 
          isOpen={isDiscoverChannelsOpen} 
          onToggle={() => setIsDiscoverChannelsOpen(!isDiscoverChannelsOpen)} 
        />
        {isDiscoverChannelsOpen && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col p-3 rounded-2xl bg-white border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="h-3.5 bg-gray-200 rounded animate-pulse w-24"></div>
                        <div className="w-2.5 h-2.5 bg-gray-200 rounded-full animate-pulse"></div>
                      </div>
                      <div className="w-3 h-3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-1.5 mt-1">
                        <div className="h-2 bg-gray-200 rounded animate-pulse w-full"></div>
                        <div className="h-2 bg-gray-200 rounded animate-pulse w-4/5"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="text-xs text-gray-600 font-medium">No active channels.</div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <div 
                    key={group.id} 
                    className="flex flex-col group cursor-pointer p-3 rounded-2xl bg-white border border-gray-200 hover:shadow-sm hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold text-gray-900 truncate">{group.name}</span>
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
        )}
      </div>

      {/* 3. Invite Users */}
      <div>
        <SectionHeader 
          title="Invite Developers" 
          icon={UserPlus} 
          isCollapsible 
          isOpen={isInviteDevelopersOpen} 
          onToggle={() => setIsInviteDevelopersOpen(!isInviteDevelopersOpen)} 
        />
        {isInviteDevelopersOpen && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-blue-500/30 transition-all group space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-gray-500 leading-relaxed">
              Know someone who belongs here? Share your unique invite link or send them an email to grow the network.
            </p>
            <button 
              onClick={handleCopyInvite}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isCopied 
                  ? 'bg-green-50 text-green-600 border border-green-200' 
                  : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600'
              }`}
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
              {isCopied ? 'Link Copied!' : 'Copy Invite Link'}
            </button>

            <div className="relative flex items-center gap-2">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="text-[9px] uppercase font-black text-gray-300 tracking-[2px]">OR</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <form onSubmit={handleEmailInvite} className="flex gap-2">
              <input
                type="email"
                placeholder="developer@gmail.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="flex-1 w-full bg-gray-50 border border-gray-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-w-0"
              />
              <button type="submit" disabled={sendingEmail} className="bg-gray-900 hover:bg-gray-800 text-white px-3 py-2 rounded-xl transition-colors flex items-center justify-center shrink-0 disabled:opacity-50" title="Send Email">
                {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : emailSuccess ? <Check size={14} className="text-green-400" /> : <Mail size={14} />}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 4. New Features */}
      <div>
        <SectionHeader 
          title="What's New" 
          icon={Sparkles} 
          isCollapsible 
          isOpen={isWhatsNewOpen} 
          onToggle={() => setIsWhatsNewOpen(!isWhatsNewOpen)} 
        />
        {isWhatsNewOpen && (
          <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
            <div className="relative z-10 space-y-4">
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Zap size={12} className="text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 mb-0.5">End-to-End Workspaces</h4>
                  <p className="text-[10px] text-gray-600 leading-relaxed">Secure, private channel chats are now active. Create a node to begin.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Users size={12} className="text-purple-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 mb-0.5">Global Connections</h4>
                  <p className="text-[10px] text-gray-600 leading-relaxed">Follow other developers and build your custom network feed.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Platform Documentation Link */}
      <div>
        <SectionHeader title="Resources" icon={BookOpen} />
        <div
          onClick={handleDocsClick}
          className="flex items-center justify-between group cursor-pointer p-4 rounded-2xl bg-white border border-gray-200 hover:shadow-md hover:border-blue-500/30 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <BookOpen size={16} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">Platform Docs</span>
              <span className="text-[10px] text-gray-500 line-clamp-1">Read the network reference manual</span>
            </div>
          </div>
          <ChevronRight size={14} className="text-gray-700 group-hover:text-blue-500 transition-all shrink-0" />
        </div>
      </div>

      {/* USER PROFILE MODAL */}
      {selectedUserId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar z-10 bg-white rounded-[2rem] border border-gray-200 shadow-xl">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[250] p-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-500 transition-colors"
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

      {/* CREATE BROADCAST MODAL */}
      {showBroadcastModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowBroadcastModal(false)} />
          <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-[2rem] shadow-xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 rounded-t-[2rem] shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Create Broadcast</h2>
              <button onClick={() => setShowBroadcastModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-gray-50 rounded-b-[2rem]">
              <NewPost onPostCreated={() => setShowBroadcastModal(false)} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Footer/About Section */}
      <div className="mt-auto pt-8 text-center">
        <p className="text-[10px] text-gray-500 font-mono">
          beoneofus network v1.0<br/>
          All systems operational.
        </p>
      </div>
    </aside>
  );
}