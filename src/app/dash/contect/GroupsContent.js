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
  Hash
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
        .select('*, profiles(username, avatar_url), replied_message:reply_to_message_id(*, text, image_url, profiles(username))')
        .eq('group_id', activeWorkspace.id)
        .order('created_at', { ascending: true });
      
      if (!error) setWorkspaceMessages(data || []);
    };

    fetchMessages();

    const channel = supabase.channel(`group-${activeWorkspace.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${activeWorkspace.id}` }, (payload) => {
        const fetchNewMsg = async () => {
           const { data } = await supabase.from('group_messages').select('*, profiles(username, avatar_url), replied_message:reply_to_message_id(*, text, image_url, profiles(username))').eq('id', payload.new.id).maybeSingle();
           if (data) {
             setWorkspaceMessages(prev => {
               if (prev.some(m => m.id === data.id)) return prev;
               return [...prev, data];
             });
           }
        };
        fetchNewMsg();
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
        .select('user_id, role, profiles(username, avatar_url)')
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

      // Insert message. The real-time subscription will update the UI.
      const { error } = await supabase.from('group_messages').insert({
        group_id: activeWorkspace.id,
        user_id: currentUserId,
        text: text.trim() || "",
        image_url: imageUrl,
        reply_to_message_id: replyToId,
      });

      if (error) throw error;
    } catch (err) {
      showToast('Failed to send message: ' + err.message, 'error');
    }
  };

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 max-w-4xl mx-auto relative">
      {activeWorkspace ? (
        <div className="w-full flex flex-col h-[calc(100vh-180px)] bg-[#0A0A0A] rounded-[2rem] border border-white/5 overflow-hidden relative animate-in fade-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="p-4 border-b border-white/5 bg-[#0F0F0F] flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveWorkspace(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition">
                <ChevronLeft size={20} />
              </button>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold uppercase">
                <Hash size={20} />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">{activeWorkspace.name}</h2>
                <p className="text-[10px] font-black tracking-widest text-green-500 uppercase">Secured Workspace</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                fetchWorkspaceMembers();
                setMembersModalOpen(true);
              }}
              className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors text-xs font-bold"
            >
              <Users size={16} /> <span className="hidden sm:inline">Members</span>
            </button>
          </div>

          {/* Messages */}
          <div ref={workspaceScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col">
            {workspaceMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                <Hash size={48} className="mb-4 opacity-20" />
                <p className="font-bold text-sm uppercase tracking-widest mb-1">Node Initialized</p>
                <p className="text-xs font-mono">End-to-end encrypted node. Say hello to the channel.</p>
              </div>
            ) : (
              workspaceMessages.map(msg => {
                const isMe = msg.user_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                    {!isMe ? (
                      <div 
                        onClick={() => setSelectedUserId(msg.user_id)}
                        className="relative w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs uppercase shrink-0 mt-auto cursor-pointer hover:bg-blue-500/30 transition-colors overflow-hidden"
                        title={`View @${msg.profiles?.username}'s Profile`}
                      >
                        {msg.profiles?.avatar_url ? (
                          <Image src={msg.profiles.avatar_url} alt="avatar" fill sizes="32px" className="object-cover" />
                        ) : (
                          msg.profiles?.username?.substring(0, 2) || "??"
                        )}
                      </div>
                    ) : (
                      <div className="flex items-end">
                        <button onClick={() => setReplyingTo(msg)} className="p-2 text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    )}
                    <div className={`flex flex-col group ${isMe ? "items-end" : "items-start"} max-w-[80%]`}>
                      {!isMe && <span className="text-[10px] text-gray-500 font-bold mb-1 ml-1">@{msg.profiles?.username}</span>}
                      <div className={`w-full p-1 rounded-2xl ${isMe ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/20" : "bg-[#111111] text-gray-300 border border-white/5 rounded-tl-none"}`}>
                        <div className="px-3 pt-1.5 pb-2">
                          {msg.replied_message && (
                            <div className="border-l-2 border-blue-500/50 pl-2 mb-2 text-xs opacity-80">
                              <p className="font-bold text-current">@{msg.replied_message.profiles?.username}</p>
                              <p className="text-current/80 line-clamp-1">{msg.replied_message.text || 'Image'}</p>
                            </div>
                          )}
                          {msg.image_url && (
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden my-2 cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')}>
                              <Image src={msg.image_url} alt="message attachment" fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                            </div>
                          )}
                          {msg.text && <p className="text-[13px] whitespace-pre-wrap break-words">{msg.text}</p>}
                        </div>
                      </div>
                      <span className="text-[9px] text-gray-600 mt-1 mx-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {!isMe && (
                      <div className="flex items-end">
                        <button onClick={() => setReplyingTo(msg)} className="p-2 text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MessageSquare size={14} />
                        </button>
                      </div>
                  )}
                  </div>
                )
              })
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-[#0F0F0F] border-t border-white/5 z-10 shrink-0">
            {replyingTo && (
              <div className="bg-black/30 rounded-t-xl px-4 py-2 text-xs flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="min-w-0">
                  <p className="text-gray-400">Replying to <span className="font-bold text-blue-400">@{replyingTo.profiles?.username}</span></p>
                  <p className="text-gray-500 truncate">{replyingTo.text || 'Image'}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-500 hover:text-white"><X size={16} /></button>
              </div>
            )}
            {chatImagePreview && (
              <div className="bg-black/30 rounded-t-xl p-2 flex animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                  <Image src={chatImagePreview} alt="preview" fill sizes="64px" className="object-cover" />
                  <button onClick={handleRemoveChatImage} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><X size={12} /></button>
                </div>
              </div>
            )}
            <form onSubmit={handleSendWorkspaceMessage} className="flex items-center gap-2 bg-black border border-white/10 rounded-2xl p-1.5 pl-4 focus-within:border-blue-500/30 transition-all">
              <input type="file" ref={imageInputRef} onChange={handleChatFileChange} accept="image/*" className="hidden" />
              <button 
                type="button" 
                onClick={() => imageInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-blue-400 transition-colors"
              >
                <Paperclip size={18} />
              </button>
              <input 
                type="text" 
                value={messageInput} 
                onChange={e => setMessageInput(e.target.value)} 
                placeholder="Broadcast to workspace..." 
                className="flex-1 bg-transparent border-none focus:outline-none text-sm text-white py-2" 
              />
              <button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50">
                <Send size={16} strokeWidth={3} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Channels</h1>
              <p className="text-gray-400 text-sm mt-1">Manage your communities and collaborations.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDeleteAllModalOpen(true)}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-5 py-2.5 rounded-xl transition-all font-semibold active:scale-95"
              >
                <Trash2 size={20} />
                 All
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all font-semibold shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <Plus size={20} />
                Create Channel
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Groups List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-500 mb-2" size={32} />
              <p className="text-gray-500 font-mono uppercase text-xs tracking-widest">Decrypting Nodes...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem]">
              <Hash size={48} className="text-gray-800 mb-4" />
              <p className="text-gray-600 font-bold">No channels found.</p>
            </div>
          ) : (
            <div className="space-y-4">
            {filteredGroups.map((group) => {
              const isAdmin = group.created_by === currentUserId;
              const memberCount = group.group_members?.[0]?.count || 1;
              return (
              <div 
                key={group.id} 
                onClick={() => handleGroupClick(group)}
              className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 hover:border-blue-500/30 hover:bg-white/[0.02] transition-all cursor-pointer"
          >
            <div className="p-4 bg-blue-500/10 rounded-xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <Hash size={28} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-bold text-white truncate">{group.name}</h3>
                <span className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md border ${
                    group.is_private ? 'border-amber-500/30 text-amber-500 bg-amber-500/5' : 'border-blue-500/30 text-blue-400 bg-blue-500/5'
                }`}>
                    {group.is_private ? <Lock size={10} /> : <Globe size={10} />}
                    {group.is_private ? 'Private' : 'Public'}
                </span>
                  {isAdmin && (
                    <span className="text-[9px] uppercase font-black tracking-widest text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">Admin</span>
                  )}
              </div>
              <p className="text-gray-400 text-sm line-clamp-1 group-hover:text-gray-300 transition-colors">
                {group.description}
              </p>
              <div className="mt-2 text-xs text-gray-500 font-medium">
                  {memberCount.toLocaleString()} active members
              </div>
            </div>

              <div className="hidden sm:flex items-center gap-3">
                {isAdmin && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedGroup(group); setInviteModalOpen(true); }}
                      className="px-4 py-2 bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 rounded-xl transition-all text-xs font-bold border border-white/5 flex items-center gap-2"
                    >
                      <UserPlus size={14} /> Invite
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setGroupToDelete(group); setDeleteModalOpen(true); }}
                      className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-all border border-white/5"
                      title="Delete Channel"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              <button className="p-2 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all">
                <ChevronRight size={24} />
              </button>
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
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setIsModalOpen(false);
              setImagePreview(null);
            }}
          />
          
          <div className="relative w-full max-w-lg bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create New Channel</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-5" onSubmit={handleCreateGroup}>
              <div className="flex items-center gap-4">
                <input type="file" ref={fileInputRef} onChange={handleGroupFileChange} accept="image/*" className="hidden" />
                <div 
                  onClick={handleGroupImageClick}
                  className={`h-16 w-16 rounded-2xl flex items-center justify-center cursor-pointer transition-all overflow-hidden border ${
                    imagePreview ? 'border-transparent' : 'bg-white/5 border-dashed border-white/20 hover:border-blue-500/50 text-gray-500 hover:text-blue-400'
                  }`}
                >
                  {imagePreview ? (
                    <div className="relative w-full h-full group">
                      <Image src={imagePreview} alt="Preview" fill sizes="64px" className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={16} className="text-white bg-red-500 rounded-full p-0.5" onClick={handleRemoveGroupImage} />
                      </div>
                    </div>
                  ) : (
                    <ImageIcon size={24} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Channel Icon</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Channel Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Next.js Masters" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this channel about?" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsPrivateSelection(false)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${!isPrivateSelection ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/10 bg-white/5 text-gray-400'}`}
                  >
                    <Globe size={16} /> Public
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsPrivateSelection(true)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${isPrivateSelection ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/10 bg-white/5 text-gray-400'}`}
                  >
                    <Lock size={16} /> Private
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl text-gray-400 font-medium hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={isProcessing} className="flex-1 flex justify-center py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50">
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setInviteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-blue-600/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={18} className="text-blue-500" /> Invite to Channel</h2>
              <button onClick={() => setInviteModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <form className="p-6 space-y-5" onSubmit={handleInviteUser}>
              <div>
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                  Grant access to <span className="font-bold text-white">{selectedGroup.name}</span>. Enter the exact username of the user you wish to invite.
                </p>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">@</span>
                  <input type="text" required value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} placeholder="tech_ninja_99" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" />
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Channel?</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white">{groupToDelete.name}</span>? This action cannot be undone.
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
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition border border-white/5"
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
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteAllModalOpen(false)} />
        <div className="relative w-full max-w-sm bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl p-6 text-center animate-in fade-in zoom-in duration-200">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Delete All Channels?</h3>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-white">ALL</span> channels you created? This action cannot be undone.
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
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition border border-white/5"
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setGroupToJoin(null)} />
          <div className="relative w-full max-w-sm bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hash size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Request Access?</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              You are not a member of <span className="font-bold text-white">{groupToJoin.name}</span>. Would you like to request access from the administrator?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={async () => {
                  setIsProcessing(true);
                  try {
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
              <button onClick={() => setGroupToJoin(null)} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition border border-white/5">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBERS MODAL */}
      {membersModalOpen && activeWorkspace && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMembersModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">Channel Members</h2>
                <p className="text-xs text-gray-500 mt-1">{activeWorkspace.name}</p>
              </div>
              <button onClick={() => setMembersModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors">
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
                    <div key={member.user_id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 rounded-xl bg-black overflow-hidden shrink-0 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-500 uppercase">
                          {member.profiles?.avatar_url ? (
                            <Image src={member.profiles.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" />
                          ) : (
                            member.profiles?.username?.substring(0,2) || '??'
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate flex items-center gap-2">
                            @{member.profiles?.username}
                            {isMe && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-widest">You</span>}
                          </h4>
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-0.5">
                            {isAdmin ? <span className="text-green-500">Administrator</span> : 'Member'}
                          </p>
                        </div>
                      </div>
                      
                      {canKick && (
                        <button 
                          onClick={() => handleKickUser(member.user_id, member.profiles?.username)}
                          disabled={isProcessing}
                          className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
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
        </div>
      )}

      {/* TOAST POPUP */}
      {toastMessage && (
        <div className={`fixed bottom-10 right-10 z-[150] flex items-center gap-3 bg-[#0D0D0D] border px-5 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-300 max-w-md ${toastType === 'error' ? 'border-red-500/30 text-red-400' : 'border-green-500/30 text-green-400'}`}>
          {toastType === 'error' ? <AlertTriangle size={18} className="text-red-500 shrink-0" /> : <Check size={18} className="text-green-500 shrink-0" />}
          <span className="text-sm font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}