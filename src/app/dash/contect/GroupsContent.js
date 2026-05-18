"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { 
  Plus, 
  Users, 
  Lock, 
  Globe, 
  Search, 
  ChevronRight, 
  X, 
  Image as ImageIcon,
  Loader2,
  Check,
  UserPlus,
  UserMinus,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  Send,
  Paperclip,
  MessageSquare,
  Hash,
  BadgeCheck,
  ThumbsUp
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import ProfileContent from "./ProfileContent";

export default function GroupsContent() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Create Group Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isPrivateSelection, setIsPrivateSelection] = useState(false);
  const fileInputRef = useRef(null);

  // Invite User States
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [inviteUsername, setInviteUsername] = useState("");

  // Delete Group States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);

  // Join Request States
  const [groupToJoin, setGroupToJoin] = useState(null);

  // Manage Members States
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);

  // Workspace Chat States
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [workspaceMessages, setWorkspaceMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const workspaceScrollRef = useRef(null);
  const imageInputRef = useRef(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [chatImageFile, setChatImageFile] = useState(null);
  const [chatImagePreview, setChatImagePreview] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  // Fetch Groups
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCurrentUserId(session.user.id);
      await fetchGroups();
    };
    init();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      // Fetch groups and the count of members
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members(count)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setGroups(data || []);
    } catch (err) {
      console.error("Error fetching groups:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- WORKSPACE CHAT LOGIC ---
  useEffect(() => {
    if (!activeWorkspace) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*, profiles(username, avatar_url, is_verified), replied_message:reply_to_message_id(*, text, image_url, profiles(username, is_verified)), group_message_reactions(id, user_id, emoji)')
        .eq('group_id', activeWorkspace.id)
        .order('created_at', { ascending: true });
      
      if (!error) setWorkspaceMessages(data || []);
      if (error) {
        showToast(`Failed to load messages: ${error.message}`, "error");
      } else {
        setWorkspaceMessages(data || []);
      }
    };

    fetchMessages();

    const channel = supabase.channel(`group-${activeWorkspace.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${activeWorkspace.id}` }, (payload) => {
        const fetchNewMsg = async () => {
           const { data } = await supabase.from('group_messages').select('*, profiles(username, avatar_url, is_verified), replied_message:reply_to_message_id(*, text, image_url, profiles(username, is_verified)), group_message_reactions(id, user_id, emoji)').eq('id', payload.new.id).maybeSingle();
           if (data) {
             setWorkspaceMessages(prev => {
               if (prev.some(m => m.id === data.id)) return prev;
               return [...prev, data];
             });
           }
        };
        fetchNewMsg();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_message_reactions' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeWorkspace]);

  useEffect(() => {
    if (workspaceScrollRef.current) workspaceScrollRef.current.scrollTop = workspaceScrollRef.current.scrollHeight;
  }, [workspaceMessages, activeWorkspace]);

  // --- GROUP IMAGE UPLOAD LOGIC ---
  const handleGroupImageClick = () => fileInputRef.current?.click();

  const handleGroupFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveGroupImage = (e) => {
    e.stopPropagation();
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- CHAT IMAGE UPLOAD LOGIC ---
  const handleChatFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setChatImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveChatImage = (e) => {
    e.stopPropagation();
    setChatImageFile(null);
    setChatImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const showToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // --- CREATE GROUP ---
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!name.trim() || !currentUserId) return;
    setIsProcessing(true);

    try {
      // 1. Create the Group
      const { data: newGroup, error: groupError } = await supabase.from('groups').insert({
        name,
        description,
        is_private: isPrivateSelection,
        created_by: currentUserId
      }).select().single();
      if (groupError) throw groupError;

      // 2. Add the creator as the Admin in group_members
      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: newGroup.id,
        user_id: currentUserId,
        role: 'admin'
      });
      if (memberError) {
        // Rollback: if adding the member fails, delete the group we just created to prevent ghost channels
        await supabase.from('groups').delete().eq('id', newGroup.id);
        throw memberError;
      }

      showToast("Channel created successfully!");
      setIsModalOpen(false);
      setName("");
      setDescription("");
      setIsPrivateSelection(false);
      setImagePreview(null);
      fetchGroups();
    } catch (err) {
      showToast("Failed to create channel: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- INVITE USER ---
  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !selectedGroup) return;
    setIsProcessing(true);

    try {
      // Find user by username
      const { data: profile, error: profileErr } = await supabase.from('profiles').select('id').eq('username', inviteUsername.trim()).maybeSingle();
      if (profileErr || !profile) throw new Error(`User @${inviteUsername} not found.`);

      if (profile.id === currentUserId) throw new Error("You cannot invite yourself to the group.");

      // Insert into members
      const { error: inviteErr } = await supabase.from('group_members').insert({ group_id: selectedGroup.id, user_id: profile.id, role: 'member' });
      if (inviteErr) {
        // Catch PostgreSQL duplicate key error (code 23505)
        if (inviteErr.code === '23505' || inviteErr.message.includes('duplicate')) {
          throw new Error(`@${inviteUsername} is already a member of this channel.`);
        }
        throw inviteErr;
      }

      // Send Notification to the invited user
      const { error: notifErr } = await supabase.from('notifications').insert({
        receiver_id: profile.id,
        actor_id: currentUserId,
        type: 'group_invite',
        content: selectedGroup.name
      });
      if (notifErr) throw new Error("Invite sent, but notification failed: " + notifErr.message);

      showToast(`@${inviteUsername} has been granted access!`);
      setInviteModalOpen(false);
      setInviteUsername("");
      fetchGroups();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- DELETE GROUP ---
  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsProcessing(true);

    try {
      // 1. Delete associated members first to avoid Foreign Key constraint errors
      const { error: membersError } = await supabase.from('group_members').delete().eq('group_id', groupToDelete.id);
      if (membersError) throw membersError;

      // 2. Delete the group
      // Use .select() to force Supabase to return the deleted row. If it's empty, RLS blocked it!
      const { data: deletedGroup, error: groupError } = await supabase.from('groups').delete().eq('id', groupToDelete.id).select();
      if (groupError) throw groupError;
      
      if (!deletedGroup || deletedGroup.length === 0) {
        throw new Error("Deletion blocked by database (RLS). You don't have permission.");
      }

      showToast("Channel deleted successfully");
      setDeleteModalOpen(false);
      setGroupToDelete(null);
      fetchGroups();
    } catch (err) {
      showToast("Failed to delete channel: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- DELETE ALL GROUPS ---
  const executeDeleteAllGroups = async () => {
    setIsProcessing(true);
    try {
      // 1. Fetch all groups created by the user
      const { data: userGroups } = await supabase.from('groups').select('id').eq('created_by', currentUserId);
      
      if (userGroups && userGroups.length > 0) {
        const groupIds = userGroups.map(g => g.id);
        
        // 2. Delete all members for these groups first
        await supabase.from('group_members').delete().in('group_id', groupIds);

        // 3. Delete the groups themselves
        const { data: deletedGroups, error: groupError } = await supabase.from('groups').delete().in('id', groupIds).select();
        if (groupError) throw groupError;
        
        if (!deletedGroups || deletedGroups.length === 0) {
          throw new Error("Deletion blocked by database (RLS). You don't have permission.");
        }
      }

      showToast("All your channels have been deleted.");
      setDeleteAllModalOpen(false);
      fetchGroups();
    } catch (err) {
      showToast("Failed to delete all channels: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- ENTER WORKSPACE ---
  const handleGroupClick = async (group) => {
    setIsProcessing(true);
    try {
      // Check if current user is an active member
      const { data: member, error } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', currentUserId)
        .maybeSingle();
        
      if (error) throw error;
      if (!member) {
        setGroupToJoin(group);
        return;
      }
      
      setActiveWorkspace(group);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- MANAGE MEMBERS ---
  const fetchWorkspaceMembers = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id, role, profiles(username, avatar_url, is_verified)')
        .eq('group_id', activeWorkspace.id);
      if (error) throw error;
      setWorkspaceMembers(data || []);
    } catch(err) {
      showToast(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKickUser = async (userId, username) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('group_members').delete().eq('group_id', activeWorkspace.id).eq('user_id', userId);
      if (error) throw error;
      showToast(`@${username} has been removed from the channel.`);
      setWorkspaceMembers(prev => prev.filter(m => m.user_id !== userId));
    } catch(err) {
      showToast(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- SEND WORKSPACE MESSAGE ---
  const handleSendWorkspaceMessage = async (e) => {
    e.preventDefault();
    const text = messageInput;
    const imageToUpload = chatImageFile;
    const replyToId = replyingTo?.id;

    if (!text.trim() && !imageToUpload) return;

    setIsProcessing(true);

    // Store values and reset UI immediately for responsiveness
    setMessageInput('');
    setChatImageFile(null);
    setChatImagePreview(null);
    setReplyingTo(null);
    if (imageInputRef.current) imageInputRef.current.value = '';

    try {
      let imageUrl = null;
      if (imageToUpload) {
        const fileExt = imageToUpload.name.split('.').pop();
        const fileName = `msg-${Date.now()}.${fileExt}`;
        const filePath = `${activeWorkspace.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('group_images')
          .upload(filePath, imageToUpload);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('group_images').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      // Insert message.
      const { data: newMsg, error } = await supabase.from('group_messages').insert({
        group_id: activeWorkspace.id,
        user_id: currentUserId,
        text: text.trim() || "",
        image_url: imageUrl,
        reply_to_message_id: replyToId,
      }).select('*, profiles(username, avatar_url, is_verified), replied_message:reply_to_message_id(*, text, image_url, profiles(username, is_verified)), group_message_reactions(id, user_id, emoji)').single();

      if (error) throw error;

      if (newMsg) {
        setWorkspaceMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    } catch (err) {
      showToast('Failed to send message: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HANDLE REACTION ---
  const handleReaction = async (messageId, emoji) => {
    const msg = workspaceMessages.find(m => m.id === messageId);
    if (!msg) return;
    
    const existing = msg.group_message_reactions?.find(r => r.user_id === currentUserId && r.emoji === emoji);
    
    // Optimistic UI Update: Instantly update the local state
    setWorkspaceMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = m.group_message_reactions || [];
        if (existing) {
          return { ...m, group_message_reactions: reactions.filter(r => r.id !== existing.id) };
        } else {
          return { ...m, group_message_reactions: [...reactions, { id: `temp-${Date.now()}`, message_id: messageId, user_id: currentUserId, emoji }] };
        }
      }
      return m;
    }));

    try {
      if (existing) {
         await supabase.from('group_message_reactions').delete().eq('id', existing.id);
      } else {
         const { error } = await supabase.from('group_message_reactions').insert({ message_id: messageId, user_id: currentUserId, emoji });
         if (error) throw error;
      }
    } catch (err) {
      showToast("Reaction failed. Make sure the 'group_message_reactions' table exists.", "error");
    }
  };

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="max-w-3xl mx-auto relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      {activeWorkspace ? (
        /* ── WORKSPACE CHAT ── */
        <div className="w-full flex flex-col h-[calc(100vh-160px)] bg-white dark:bg-[#0d0d1a] rounded-2xl border border-gray-100 dark:border-white/[0.05] overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-300">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.05] bg-white dark:bg-[#0d0d1a] flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setActiveWorkspace(null)}
                className="p-2 bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-all active:scale-95 shrink-0"
              >
                <ChevronLeft size={17} />
              </button>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
                <Hash size={16} />
              </div>
              <div className="min-w-0">
                <h2 className="text-gray-900 dark:text-gray-100 font-black text-sm leading-tight truncate">{activeWorkspace.name}</h2>
                <p className="text-[9px] font-black tracking-[2px] text-emerald-500 uppercase flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> Secure Channel
                </p>
              </div>
            </div>
            <button
              onClick={() => { fetchWorkspaceMembers(); setMembersModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-all text-xs font-bold shrink-0"
            >
              <Users size={14} /> <span className="hidden sm:inline">Members</span>
            </button>
          </div>

          {/* Messages */}
          <div ref={workspaceScrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3 custom-scrollbar flex flex-col">
            {workspaceMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/15 rounded-2xl flex items-center justify-center mb-4 text-blue-400 dark:text-blue-500">
                  <Hash size={24} />
                </div>
                <p className="font-black text-gray-900 dark:text-gray-100 text-base tracking-tight mb-1">Channel initialized</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[200px] leading-relaxed">Be the first to broadcast a message to this workspace.</p>
              </div>
            ) : (
              workspaceMessages.map((msg, idx) => {
                const isMe = msg.user_id === currentUserId;
                const hasLiked = msg.group_message_reactions?.some(r => r.user_id === currentUserId && r.emoji === '👍');
                const prevMsg = workspaceMessages[idx - 1];
                const sameAsPrev = prevMsg?.user_id === msg.user_id;
                return (
                  <div key={msg.id} className={`flex gap-2 group ${isMe ? "justify-end" : "justify-start"}`}>
                    {/* Avatar (other users) */}
                    {!isMe && (
                      <div
                        onClick={() => setSelectedUserId(msg.user_id)}
                        className={`relative w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/15 text-blue-500 flex items-center justify-center font-bold text-[10px] uppercase shrink-0 mt-auto cursor-pointer hover:opacity-80 transition-opacity overflow-hidden ${sameAsPrev ? "opacity-0 pointer-events-none" : ""}`}
                        title={`View @${msg.profiles?.username}`}
                      >
                        {msg.profiles?.avatar_url
                          ? <Image src={msg.profiles.avatar_url} alt="avatar" fill sizes="28px" className="object-cover" />
                          : msg.profiles?.username?.substring(0, 2) || "??"}
                      </div>
                    )}

                    {/* Message content */}
                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[78%] sm:max-w-[70%]`}>
                      {!isMe && !sameAsPrev && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mb-1 ml-1 flex items-center gap-1">
                          @{msg.profiles?.username}
                          {msg.profiles?.is_verified && <BadgeCheck size={9} className="text-blue-500" fill="currentColor" stroke="white" />}
                        </span>
                      )}

                      <div className={`rounded-2xl px-3.5 py-2.5 ${
                        isMe
                          ? "bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-500/20"
                          : `bg-gray-100 dark:bg-white/[0.06] text-gray-800 dark:text-gray-100 border border-gray-200/60 dark:border-white/[0.04] ${sameAsPrev ? "rounded-tl-2xl" : "rounded-tl-sm"}`
                      }`}>
                        {msg.replied_message && (
                          <div className="border-l-2 border-current/30 pl-2 mb-2 text-xs opacity-70">
                            <p className="font-bold flex items-center gap-1">@{msg.replied_message.profiles?.username}</p>
                            <p className="opacity-80 line-clamp-1">{msg.replied_message.text || 'Image'}</p>
                          </div>
                        )}
                        {msg.image_url && (
                          <div className="relative w-full max-w-[240px] aspect-video rounded-lg overflow-hidden mb-2 cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')}>
                            <Image src={msg.image_url} alt="attachment" fill sizes="240px" className="object-cover" />
                          </div>
                        )}
                        {msg.text && <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>}
                      </div>

                      {msg.group_message_reactions?.filter(r => r.emoji === '👍').length > 0 && (
                        <button
                          onClick={() => handleReaction(msg.id, '👍')}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 transition-all ${hasLiked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:border-blue-300'}`}
                        >
                          <ThumbsUp size={9} className={hasLiked ? "fill-current" : ""} />
                          {msg.group_message_reactions.filter(r => r.emoji === '👍').length}
                        </button>
                      )}
                      <span className="text-[9px] text-gray-400 dark:text-gray-600 mt-1 mx-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Reaction actions */}
                    <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0 ${isMe ? "order-first" : ""}`}>
                      <button onClick={() => handleReaction(msg.id, '👍')} className={`p-1.5 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-white/[0.06] ${hasLiked ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600 hover:text-blue-500'}`} title="Like">
                        <ThumbsUp size={13} className={hasLiked ? "fill-current" : ""} />
                      </button>
                      <button onClick={() => setReplyingTo(msg)} className="p-1.5 rounded-lg text-gray-400 dark:text-gray-600 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all" title="Reply">
                        <MessageSquare size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Area */}
          <div className="px-3 pb-3 pt-2 bg-white dark:bg-[#0d0d1a] border-t border-gray-100 dark:border-white/[0.05] shrink-0">
            {replyingTo && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl px-3 py-2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    Replying to <span className="font-black text-blue-600 dark:text-blue-400">@{replyingTo.profiles?.username}</span>
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{replyingTo.text || 'Image'}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0 ml-2"><X size={14} /></button>
              </div>
            )}
            {chatImagePreview && (
              <div className="mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.08]">
                  <Image src={chatImagePreview} alt="preview" fill sizes="56px" className="object-cover" />
                  <button onClick={handleRemoveChatImage} className="absolute top-0.5 right-0.5 bg-gray-900/70 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"><X size={10} /></button>
                </div>
              </div>
            )}
            <form onSubmit={handleSendWorkspaceMessage} className="flex items-center gap-2 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.07] rounded-xl p-1 pl-3 focus-within:border-blue-300 dark:focus-within:border-blue-500/40 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
              <input type="file" ref={imageInputRef} onChange={handleChatFileChange} accept="image/*" className="hidden" />
              <button type="button" onClick={() => imageInputRef.current?.click()} className="p-1.5 text-gray-400 dark:text-gray-600 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10">
                <Paperclip size={16} />
              </button>
              <input
                type="text"
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                placeholder="Broadcast to workspace..."
                className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 py-2"
              />
              <button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-lg transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50">
                <Send size={15} strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ── CHANNEL LIST ── */
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-violet-600 rounded-full" />
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[2px]">Network</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Channels</h1>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Communities & collaboration spaces.</p>
            </div>
            <div className="flex items-center gap-2 sm:shrink-0">
              <button
                onClick={() => setDeleteAllModalOpen(true)}
                className="flex items-center justify-center gap-1.5 bg-white dark:bg-gray-900/60 hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 border border-gray-100 dark:border-white/[0.05] hover:border-red-200 dark:hover:border-red-500/20 px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs shadow-sm active:scale-95"
              >
                <Trash2 size={14} /> Clear All
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl transition-all font-bold text-xs shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <Plus size={14} /> New Channel
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 pointer-events-none" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels..."
              className="w-full bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-white/[0.05] rounded-xl py-3 pl-10 pr-9 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-blue-300 dark:focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Channel List */}
          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-white/[0.05] rounded-2xl p-4 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-32" />
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-12" />
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-20" />
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-white/[0.04] rounded-2xl">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/15 rounded-2xl flex items-center justify-center mb-4 text-blue-400 dark:text-blue-500">
                <Hash size={24} />
              </div>
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100 mb-1 tracking-tight">No channels found</h3>
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center max-w-[220px] leading-relaxed">Create or search for an existing channel to get started.</p>
              <button onClick={() => setIsModalOpen(true)} className="mt-5 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                <Plus size={13} /> Create Channel
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGroups.map((group) => {
                const isAdmin = group.created_by === currentUserId;
                const memberCount = group.group_members?.[0]?.count || 1;
                return (
                  <div key={group.id} className="group relative bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-white/[0.05] rounded-2xl overflow-hidden hover:border-blue-200 dark:hover:border-blue-500/20 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-200">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none dark:from-blue-500/[0.03]" />

                    <div className="flex items-center gap-3 p-4 relative z-10">
                      {/* Clickable main row */}
                      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => handleGroupClick(group)}>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/15 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Hash size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{group.name}</h3>
                            <span className={`flex items-center gap-0.5 text-[9px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded-lg border ${
                              group.is_private
                                ? 'border-amber-100 dark:border-amber-500/15 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10'
                                : 'border-blue-100 dark:border-blue-500/15 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
                            }`}>
                              {group.is_private ? <Lock size={8} /> : <Globe size={8} />}
                              {group.is_private ? 'Private' : 'Public'}
                            </span>
                            {isAdmin && <span className="text-[9px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-500/15">Admin</span>}
                          </div>
                          {group.description && <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">{group.description}</p>}
                          <p className="text-[10px] text-gray-400 dark:text-gray-600 font-semibold mt-0.5 flex items-center gap-1">
                            <Users size={9} />{memberCount.toLocaleString()} members
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedGroup(group); setInviteModalOpen(true); }}
                              className="flex items-center gap-1 px-2.5 py-2 bg-gray-50 dark:bg-white/[0.04] hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all text-xs font-bold border border-gray-100 dark:border-white/[0.05]"
                            >
                              <UserPlus size={13} /> <span className="hidden sm:inline">Invite</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setGroupToDelete(group); setDeleteModalOpen(true); }}
                              className="p-2 bg-gray-50 dark:bg-white/[0.04] hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-xl transition-all border border-gray-100 dark:border-white/[0.05]"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                        <button className="p-1.5 cursor-pointer" onClick={() => handleGroupClick(group)}>
                          <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* CREATE GROUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-md"
            onClick={() => {
              setIsModalOpen(false);
              setImagePreview(null);
            }}
          />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create New Channel</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-5" onSubmit={handleCreateGroup}>
              <div className="flex items-center gap-4">
                <input type="file" ref={fileInputRef} onChange={handleGroupFileChange} accept="image/*" className="hidden" />
                <div 
                  onClick={handleGroupImageClick}
                  className={`h-16 w-16 rounded-2xl flex items-center justify-center cursor-pointer transition-all overflow-hidden border ${
                    imagePreview ? 'border-transparent' : 'bg-gray-50 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400'
                  }`}
                >
                  {imagePreview ? (
                    <div className="relative w-full h-full group">
                      <Image src={imagePreview} alt="Preview" fill sizes="64px" className="object-cover" />
                      <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={16} className="text-white bg-red-500 hover:bg-red-600 rounded-full p-0.5" onClick={handleRemoveGroupImage} />
                      </div>
                    </div>
                  ) : (
                    <ImageIcon size={24} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Channel Icon</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">PNG, JPG up to 5MB</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Channel Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Next.js Masters" className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Description</label>
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this channel about?" className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsPrivateSelection(false)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${!isPrivateSelection ? 'border-blue-500 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                  >
                    <Globe size={16} /> Public
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsPrivateSelection(true)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${isPrivateSelection ? 'border-amber-500 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                  >
                    <Lock size={16} /> Private
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={isProcessing} className="flex-1 flex justify-center py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 size={20} className="animate-spin" /> : "Create Channel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE USER MODAL */}
      {inviteModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setInviteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <h2 className="text-lg font-bold flex items-center gap-2"><UserPlus size={18} /> Invite to Channel</h2>
              <button onClick={() => setInviteModalOpen(false)} className="text-blue-400 hover:text-blue-600 transition-colors"><X size={18} /></button>
            </div>
            <form className="p-6 space-y-5" onSubmit={handleInviteUser}>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  Grant access to <span className="font-bold text-gray-900 dark:text-gray-100">{selectedGroup.name}</span>. Enter the exact username of the user you wish to invite.
                </p>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-bold">@</span>
                  <input type="text" required value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} placeholder="john_doe" className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>
              <button type="submit" disabled={isProcessing} className="w-full flex justify-center py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : "Send Invitation"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE GROUP MODAL */}
      {deleteModalOpen && groupToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/50">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Channel?</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-gray-100">{groupToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDeleteGroup} 
                disabled={isProcessing} 
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Delete'}
              </button>
              <button 
                onClick={() => setDeleteModalOpen(false)} 
                className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition border border-gray-200 dark:border-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    {/* DELETE ALL GROUPS MODAL */}
    {deleteAllModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setDeleteAllModalOpen(false)} />
        <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 border border-red-100 dark:border-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Delete All Channels?</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-gray-100">ALL</span> channels you created? This action cannot be undone.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={executeDeleteAllGroups} 
              disabled={isProcessing} 
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Delete All'}
            </button>
            <button 
              onClick={() => setDeleteAllModalOpen(false)} 
              className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition border border-gray-200 dark:border-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

      {/* REQUEST JOIN MODAL */}
      {groupToJoin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setGroupToJoin(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hash size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Request Access?</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
              You are not a member of <span className="font-bold text-gray-900 dark:text-gray-100">{groupToJoin.name}</span>. Would you like to request access from the administrator?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={async () => {
                  setIsProcessing(true);
                  try {
                    if (!groupToJoin.created_by) {
                      throw new Error("This channel has no assigned administrator to receive requests.");
                    }
                    
                    const { error } = await supabase.from('notifications').insert({
                      receiver_id: groupToJoin.created_by,
                      actor_id: currentUserId,
                      type: 'group_join_request',
                      content: `${groupToJoin.id}|${groupToJoin.name}`
                    });
                    if (error) throw error;
                    showToast("Join request sent to the admin.");
                    setGroupToJoin(null);
                  } catch(e) { showToast(e.message, "error"); } 
                  finally { setIsProcessing(false); }
                }} 
                disabled={isProcessing} 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Send Join Request'}
              </button>
              <button onClick={() => setGroupToJoin(null)} className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition border border-gray-200 dark:border-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBERS MODAL */}
      {membersModalOpen && activeWorkspace && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setMembersModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Channel Members</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activeWorkspace.name}</p>
              </div>
              <button onClick={() => setMembersModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
              {isProcessing && workspaceMembers.length === 0 ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : (
                workspaceMembers.map(member => {
                  const isAdmin = member.user_id === activeWorkspace.created_by;
                  const isMe = member.user_id === currentUserId;
                  const canKick = activeWorkspace.created_by === currentUserId && !isAdmin;
                  
                  return (
                    <div key={member.user_id} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                          {member.profiles?.avatar_url ? (
                            <Image src={member.profiles.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" />
                          ) : (
                            member.profiles?.username?.substring(0, 2) || '??'
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                            @{member.profiles?.username}
                            {member.profiles?.is_verified && <BadgeCheck size={14} className="text-blue-500" fill="currentColor" stroke="white" />}
                            {isMe && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-widest">You</span>}
                          </h4>
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mt-0.5">
                            {isAdmin ? <span className="text-green-500">Administrator</span> : 'Member'}
                          </p>
                        </div>
                      </div>
                      
                      {canKick && (
                        <button 
                          onClick={() => handleKickUser(member.user_id, member.profiles?.username)}
                          disabled={isProcessing}
                          className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 hover:bg-red-600 dark:hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50"
                          title={`Kick @${member.profiles?.username}`}
                        >
                          <UserMinus size={16} />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto popup-scrollbar z-10 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-xl">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[250] p-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-2 sm:p-6">
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>
      )}

      {/* TOAST POPUP */}
      {toastMessage && (
        <div className={`fixed bottom-10 right-10 z-[150] flex items-center gap-3 bg-white dark:bg-gray-900 border px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-300 max-w-md ${toastType === 'error' ? 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500' : 'border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-500'}`}>
          {toastType === 'error' ? <AlertTriangle size={18} className="text-red-500 shrink-0" /> : <Check size={18} className="text-green-500 shrink-0" />}
          <span className="text-sm font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}