"use client";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Users, Lock, Globe, Search, ChevronRight, X,
  Image as ImageIcon, Loader2, Check, UserPlus, UserMinus,
  Trash2, AlertTriangle, ChevronLeft, Send, Paperclip,
  MessageSquare, Hash, BadgeCheck, ThumbsUp, Filter,
  MoreHorizontal, Smile, Crown, Bell, Pin, Settings,
  ChevronDown, Layers,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import ProfileContent from "./ProfileContent";
import { useLanguage } from '../../../lib/i18n';

// ─── Channel colour palette (derived from group id) ──────────────────────────
const CHANNEL_PALETTES = [
  { gradient: "from-blue-500 to-blue-600",    bg: "bg-blue-100 dark:bg-blue-950/50",    text: "text-blue-600 dark:text-blue-400",    ring: "ring-blue-500/20"    },
  { gradient: "from-violet-500 to-violet-600", bg: "bg-violet-100 dark:bg-violet-950/50", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-500/20" },
  { gradient: "from-emerald-500 to-emerald-600",bg:"bg-emerald-100 dark:bg-emerald-950/50",text:"text-emerald-600 dark:text-emerald-400",ring:"ring-emerald-500/20"},
  { gradient: "from-amber-500 to-amber-600",   bg: "bg-amber-100 dark:bg-amber-950/50",   text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-500/20"   },
  { gradient: "from-rose-500 to-rose-600",     bg: "bg-rose-100 dark:bg-rose-950/50",     text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500/20"     },
  { gradient: "from-indigo-500 to-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-950/50", text: "text-indigo-600 dark:text-indigo-400", ring: "ring-indigo-500/20" },
  { gradient: "from-teal-500 to-teal-600",     bg: "bg-teal-100 dark:bg-teal-950/50",     text: "text-teal-600 dark:text-teal-400",     ring: "ring-teal-500/20"     },
  { gradient: "from-pink-500 to-pink-600",     bg: "bg-pink-100 dark:bg-pink-950/50",     text: "text-pink-600 dark:text-pink-400",     ring: "ring-pink-500/20"     },
];
function getChannelPalette(id = "") {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return CHANNEL_PALETTES[hash % CHANNEL_PALETTES.length];
}

const QUICK_REACTIONS = ["👍","❤️","🔥","😂","🎉","👀"];

function formatRelTime(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}
function formatMsgTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDateLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso), today = new Date(), yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString())  return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export default function GroupsContent() {
  const { t } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all | mine | public | private
  const [memberGroupIds, setMemberGroupIds] = useState(new Set());
  const [reactionPickerFor, setReactionPickerFor] = useState(null);

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

  const showToast = useCallback((msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3000);
  }, []);

  const fetchGroups = useCallback(async (uid) => {
    setLoading(true);
    try {
      const resolvedUid = uid || currentUserId;
      const [{ data, error }, { data: memberData }] = await Promise.all([
        supabase.from('groups').select('*, group_members(count)').order('created_at', { ascending: false }),
        resolvedUid
          ? supabase.from('group_members').select('group_id').eq('user_id', resolvedUid)
          : Promise.resolve({ data: [] }),
      ]);
      if (error) throw error;
      setGroups(data || []);
      setMemberGroupIds(new Set((memberData || []).map(m => m.group_id)));
    } catch (err) {
      console.error("Error fetching groups:", err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Fetch Groups
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid) setCurrentUserId(uid);
      await fetchGroups(uid);
    };
    init();
    // fetchGroups intentionally omitted: run once on mount; including it would
    // re-fetch when currentUserId is set (double fetch on load).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        showToast(t('groups.toast_load_failed', { message: error.message }), "error");
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
    // t is only used inside an error toast; excluding it avoids tearing down
    // and resubscribing the realtime channel when translations load/switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace, showToast]);

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

      showToast(t('groups.toast_channel_created'));
      setIsModalOpen(false);
      setName("");
      setDescription("");
      setIsPrivateSelection(false);
      setImagePreview(null);
      fetchGroups();
    } catch (err) {
      showToast(t('groups.toast_create_failed', { message: err.message }), "error");
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
      if (profileErr || !profile) throw new Error(t('groups.toast_user_not_found', { username: inviteUsername }));

      if (profile.id === currentUserId) throw new Error(t('groups.toast_invite_self'));

      // Insert into members
      const { error: inviteErr } = await supabase.from('group_members').insert({ group_id: selectedGroup.id, user_id: profile.id, role: 'member' });
      if (inviteErr) {
        // Catch PostgreSQL duplicate key error (code 23505)
        if (inviteErr.code === '23505' || inviteErr.message.includes('duplicate')) {
          throw new Error(t('groups.toast_already_member', { username: inviteUsername }));
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
      if (notifErr) throw new Error(t('groups.toast_invite_notif_failed', { message: notifErr.message }));

      showToast(t('groups.toast_access_granted', { username: inviteUsername }));
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
        throw new Error(t('groups.toast_rls_blocked'));
      }

      showToast(t('groups.toast_channel_deleted'));
      setDeleteModalOpen(false);
      setGroupToDelete(null);
      fetchGroups();
    } catch (err) {
      showToast(t('groups.toast_delete_failed', { message: err.message }), "error");
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
          throw new Error(t('groups.toast_rls_blocked'));
        }
      }

      showToast(t('groups.toast_all_deleted'));
      setDeleteAllModalOpen(false);
      fetchGroups();
    } catch (err) {
      showToast(t('groups.toast_delete_all_failed', { message: err.message }), "error");
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
      showToast(t('groups.toast_member_removed', { username }));
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
      showToast(t('groups.toast_send_failed', { message: err.message }), 'error');
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
      showToast(t('groups.toast_reaction_failed'), "error");
    }
  };

  const filteredGroups = groups.filter(g => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || g.name.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q);
    const matchesFilter =
      activeFilter === "all"     ? true :
      activeFilter === "mine"    ? memberGroupIds.has(g.id) :
      activeFilter === "public"  ? !g.is_private :
      activeFilter === "private" ? g.is_private : true;
    return matchesSearch && matchesFilter;
  });

  // Build grouped messages with date dividers
  const groupedMessages = [];
  let lastDateKey = "";
  workspaceMessages.forEach((msg, idx) => {
    const dk = msg.created_at ? new Date(msg.created_at).toDateString() : "";
    if (dk && dk !== lastDateKey) {
      groupedMessages.push({ type: "date", label: formatDateLabel(msg.created_at), key: `d-${dk}` });
      lastDateKey = dk;
    }
    const prev = workspaceMessages[idx - 1];
    const grouped = prev?.user_id === msg.user_id && dk === (prev?.created_at ? new Date(prev.created_at).toDateString() : "");
    groupedMessages.push({ type: "msg", ...msg, grouped });
  });

  const wspalette = activeWorkspace ? getChannelPalette(activeWorkspace.id) : null;

  return (
    <div className="max-w-3xl mx-auto relative animate-in fade-in slide-in-from-bottom-4 duration-500" onClick={() => reactionPickerFor && setReactionPickerFor(null)}>
      {activeWorkspace ? (
        /* ══════════════════════════════════════
           WORKSPACE CHAT
        ══════════════════════════════════════ */
        <div className="w-full flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] bg-white dark:bg-[#0d0d1a] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-300">

          {/* Chat header */}
          <div className="relative flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.05] bg-white dark:bg-[#0d0d1a] shrink-0 overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-r ${wspalette?.gradient} opacity-[0.04] pointer-events-none`} />
            <div className="relative flex items-center gap-3 min-w-0">
              <button onClick={() => setActiveWorkspace(null)}
                className="p-2 bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-xl text-gray-500 dark:text-gray-400 transition-all active:scale-95 shrink-0">
                <ChevronLeft size={17} />
              </button>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${wspalette?.gradient} text-white flex items-center justify-center shrink-0 shadow-md`}>
                <Hash size={16} />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">{activeWorkspace.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-[9px] font-black tracking-[1.5px] text-emerald-500 uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{t('groups.secure')}
                  </span>
                  {activeWorkspace.is_private && (
                    <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-500 uppercase tracking-[1.5px]"><Lock size={8} />{t('groups.private_group')}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="relative flex items-center gap-2 shrink-0">
              <button onClick={() => { fetchWorkspaceMembers(); setMembersModalOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-xl text-gray-600 dark:text-gray-400 text-xs font-bold transition-all">
                <Users size={13} /> <span className="hidden sm:inline">{t('groups.members')}</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={workspaceScrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-0.5 flex flex-col">
            {groupedMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                <div className={`w-14 h-14 bg-gradient-to-br ${wspalette?.gradient} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                  <Hash size={24} className="text-white" />
                </div>
                <p className="font-black text-gray-900 dark:text-gray-100 text-base tracking-tight mb-1">{t('groups.channel_initialized')}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[200px] leading-relaxed">{t('groups.be_first_post', { name: activeWorkspace.name })}</p>
              </div>
            ) : (
              groupedMessages.map(item => {
                if (item.type === "date") return (
                  <div key={item.key} className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.05]" />
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 shrink-0">{item.label}</span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.05]" />
                  </div>
                );

                const isMe = item.user_id === currentUserId;
                const reactionGroups = QUICK_REACTIONS.map(emoji => ({
                  emoji,
                  count: item.group_message_reactions?.filter(r => r.emoji === emoji).length || 0,
                  iMine: item.group_message_reactions?.some(r => r.emoji === emoji && r.user_id === currentUserId) || false,
                })).filter(r => r.count > 0);

                return (
                  <div key={item.id} className={`flex gap-2 group ${isMe ? "flex-row-reverse" : "flex-row"} ${item.grouped ? "mt-0.5" : "mt-3"}`}>
                    {/* Avatar */}
                    {!isMe && (
                      <div onClick={() => setSelectedUserId(item.user_id)}
                        className={`relative w-7 h-7 rounded-full bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.05] flex items-center justify-center font-bold text-[9px] uppercase shrink-0 self-end cursor-pointer hover:ring-2 ${wspalette?.ring} transition-all overflow-hidden ${item.grouped ? "opacity-0 pointer-events-none" : ""}`}>
                        {item.profiles?.avatar_url
                          ? <Image src={item.profiles.avatar_url} alt="av" fill sizes="28px" className="object-cover" />
                          : (item.profiles?.username || "?").substring(0, 2)}
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[80%] sm:max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                      {!isMe && !item.grouped && (
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 ml-1 flex items-center gap-1">
                          @{item.profiles?.username}
                          {item.profiles?.is_verified && <BadgeCheck size={9} className="text-blue-500" fill="currentColor" stroke="white" />}
                          <span className="text-[8px] text-gray-300 dark:text-gray-700 font-normal ml-1">{formatMsgTime(item.created_at)}</span>
                        </span>
                      )}

                      {/* Bubble */}
                      <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed break-words whitespace-pre-wrap ${
                        isMe
                          ? `bg-gradient-to-br ${wspalette?.gradient} text-white rounded-br-sm shadow-sm`
                          : `bg-gray-100 dark:bg-white/[0.06] text-gray-800 dark:text-gray-100 border border-gray-200/60 dark:border-white/[0.04] ${item.grouped ? "rounded-tl-2xl" : "rounded-tl-sm"}`
                      }`}>
                        {item.replied_message && (
                          <div className="border-l-2 border-current/30 pl-2 mb-2 text-xs opacity-70">
                            <p className="font-bold">@{item.replied_message.profiles?.username}</p>
                            <p className="opacity-80 line-clamp-1">{item.replied_message.text || t('groups.image_fallback')}</p>
                          </div>
                        )}
                        {item.image_url && (
                          <div className="relative w-full max-w-[220px] aspect-video rounded-lg overflow-hidden mb-2 cursor-pointer"
                            onClick={() => window.open(item.image_url, "_blank")}>
                            <Image src={item.image_url} alt="attachment" fill sizes="220px" className="object-cover" />
                          </div>
                        )}
                        {item.text && <p>{item.text}</p>}
                      </div>

                      {/* Reaction bubbles */}
                      {reactionGroups.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1 ml-1">
                          {reactionGroups.map(rg => (
                            <button key={rg.emoji} onClick={() => handleReaction(item.id, rg.emoji)}
                              className={`flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border transition-all ${rg.iMine ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-gray-300 hover:border-blue-300"}`}>
                              {rg.emoji} <span className="text-[9px] font-bold">{rg.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {isMe && item.grouped && (
                        <span className="text-[8px] text-gray-300 dark:text-gray-700 mt-0.5 mr-1">{formatMsgTime(item.created_at)}</span>
                      )}
                    </div>

                    {/* Hover actions */}
                    <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0 self-center ${isMe ? "order-first mr-1" : "ml-1"}`}>
                      {/* Reaction picker */}
                      <div className="relative">
                        <button onClick={e => { e.stopPropagation(); setReactionPickerFor(reactionPickerFor === item.id ? null : item.id); }}
                          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
                          <Smile size={13} />
                        </button>
                        {reactionPickerFor === item.id && (
                          <div onClick={e => e.stopPropagation()}
                            className={`absolute z-20 bottom-full mb-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl px-2 py-1.5 flex gap-1 ${isMe ? "right-0" : "left-0"}`}>
                            {QUICK_REACTIONS.map(emoji => (
                              <button key={emoji} onClick={() => { handleReaction(item.id, emoji); setReactionPickerFor(null); }}
                                className="text-lg hover:scale-125 transition-transform p-0.5 rounded">
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setReplyingTo(item)}
                        className="p-1.5 rounded-lg text-gray-400 dark:text-gray-600 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
                        <MessageSquare size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 bg-white dark:bg-[#0d0d1a] border-t border-gray-100 dark:border-white/[0.05] shrink-0">
            {replyingTo && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl px-3 py-2 mb-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    {t('groups.reply_to')} <span className="font-black text-blue-600 dark:text-blue-400">@{replyingTo.profiles?.username}</span>
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">{replyingTo.text || t('groups.image_fallback')}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-2 shrink-0"><X size={14} /></button>
              </div>
            )}
            {chatImagePreview && (
              <div className="mb-2">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.08]">
                  <Image src={chatImagePreview} alt="preview" fill sizes="56px" className="object-cover" />
                  <button onClick={handleRemoveChatImage} className="absolute top-0.5 right-0.5 bg-gray-900/70 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"><X size={10} /></button>
                </div>
              </div>
            )}
            <form onSubmit={handleSendWorkspaceMessage}
              className="flex items-center gap-2 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.07] rounded-2xl p-1.5 pl-3.5 focus-within:border-blue-300 dark:focus-within:border-blue-500/40 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
              <input type="file" ref={imageInputRef} onChange={handleChatFileChange} accept="image/*" className="hidden" />
              <button type="button" onClick={() => imageInputRef.current?.click()}
                className="p-1.5 text-gray-400 dark:text-gray-600 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 shrink-0">
                <Paperclip size={15} />
              </button>
              <input type="text" value={messageInput} onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendWorkspaceMessage(e); }}}
                placeholder={t('groups.message_placeholder', { name: activeWorkspace.name })}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 py-1.5 min-w-0" />
              <button type="submit" disabled={isProcessing}
                className={`bg-gradient-to-r ${wspalette?.gradient} text-white p-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-sm`}>
                <Send size={14} strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </div>

      ) : (
        /* ══════════════════════════════════════
           CHANNEL LIST
        ══════════════════════════════════════ */
        <>
          {/* Hero header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 dark:from-[#0a0a12] dark:to-[#0f0f1f] border border-white/[0.07] mb-6 p-5 shadow-xl">
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full">
                    <Layers size={9} className="text-blue-400" />
                    <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{t('groups.network')}</span>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter mb-1">{t('groups.channels_title')}</h1>
                <p className="text-sm text-white/50 font-medium">{t('groups.channels_subtitle')}</p>
              </div>
              <div className="flex flex-col sm:items-end gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="text-center hidden sm:block">
                    <p className="text-xl font-black text-white">{groups.length}</p>
                    <p className="text-[9px] text-white/40">{t('groups.stat_channels')}</p>
                  </div>
                  <div className="w-px h-8 bg-white/10 hidden sm:block" />
                  <div className="text-center hidden sm:block">
                    <p className="text-xl font-black text-white">{memberGroupIds.size}</p>
                    <p className="text-[9px] text-white/40">{t('groups.stat_joined')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDeleteAllModalOpen(true)}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-red-500/20 border border-white/10 hover:border-red-400/30 text-white/60 hover:text-red-300 px-3 py-2 rounded-xl transition-all font-bold text-xs">
                    <Trash2 size={13} /> <span className="hidden sm:inline">{t('groups.clear')}</span>
                  </button>
                  <button onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-xl transition-all font-bold text-xs shadow-lg shadow-blue-500/30 active:scale-95">
                    <Plus size={14} /> {t('groups.new_channel')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 pointer-events-none" size={14} />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('groups.search_channels')}
                className="w-full bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/[0.06] rounded-xl py-2.5 pl-10 pr-9 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500/40 transition-all shadow-sm" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"><X size={13} /></button>
              )}
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-white/[0.05] rounded-xl p-1 overflow-x-auto shrink-0">
              {[
                { id: "all",     label: t('groups.filter_all'),     count: groups.length },
                { id: "mine",    label: t('groups.filter_joined'),  count: memberGroupIds.size },
                { id: "public",  label: t('groups.filter_public'),  count: groups.filter(g => !g.is_private).length },
                { id: "private", label: t('groups.filter_private'), count: groups.filter(g => g.is_private).length },
              ].map(f => (
                <button key={f.id} onClick={() => setActiveFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeFilter === f.id ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                  {f.label}
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeFilter === f.id ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Channel grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-white/[0.05] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-full" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-white/[0.04] rounded-2xl">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/15 rounded-2xl flex items-center justify-center mb-4 text-blue-400">
                <Hash size={24} />
              </div>
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100 mb-1">{t('groups.no_channels_found')}</h3>
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center max-w-[220px] leading-relaxed">
                {activeFilter !== "all" ? t('groups.no_channels_filter') : t('groups.create_first_channel')}
              </p>
              {activeFilter !== "all"
                ? <button onClick={() => setActiveFilter("all")} className="mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">{t('groups.show_all_channels')}</button>
                : <button onClick={() => setIsModalOpen(true)} className="mt-5 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"><Plus size={13} /> {t('groups.create_channel')}</button>
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredGroups.map(group => {
                const isAdmin  = group.created_by === currentUserId;
                const isMember = memberGroupIds.has(group.id);
                const memberCount = group.group_members?.[0]?.count || 1;
                const palette = getChannelPalette(group.id);
                return (
                  <div key={group.id}
                    className="group relative bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-white/[0.05] rounded-2xl overflow-hidden hover:border-gray-200 dark:hover:border-white/[0.10] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col"
                    onClick={() => handleGroupClick(group)}>
                    {/* Colour accent top bar */}
                    <div className={`h-0.5 bg-gradient-to-r ${palette.gradient} w-full shrink-0`} />

                    <div className="p-4 flex flex-col gap-3 flex-1">
                      {/* Row 1: icon + name + badges */}
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${palette.gradient} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                          <Hash size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">{group.name}</h3>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className={`flex items-center gap-0.5 text-[9px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded-lg border ${group.is_private ? "border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10" : "border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"}`}>
                              {group.is_private ? <Lock size={7} /> : <Globe size={7} />}
                              {group.is_private ? t('groups.private_group') : t('groups.public_group')}
                            </span>
                            {isAdmin && <span className="text-[9px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20">{t('groups.badge_admin')}</span>}
                            {isMember && !isAdmin && <span className="text-[9px] uppercase font-black tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-500/20">{t('groups.badge_joined')}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {group.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{group.description}</p>
                      )}

                      {/* Footer: member count + date + actions */}
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-600 font-semibold">
                          <span className="flex items-center gap-1"><Users size={10} />{memberCount.toLocaleString()}</span>
                          <span>{formatRelTime(group.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          {isAdmin && (
                            <>
                              <button onClick={() => { setSelectedGroup(group); setInviteModalOpen(true); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                                title={t('groups.invite')}>
                                <UserPlus size={13} />
                              </button>
                              <button onClick={() => { setGroupToDelete(group); setDeleteModalOpen(true); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                title={t('groups.delete')}>
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                          <ChevronRight size={14} className={`${palette.text} opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all`} />
                        </div>
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('groups.create_new_channel')}</h2>
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
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('groups.channel_icon')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('groups.image_hint')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">{t('groups.channel_name')}</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('groups.channel_name_placeholder')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">{t('groups.group_description')}</label>
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('groups.description_placeholder')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsPrivateSelection(false)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${!isPrivateSelection ? 'border-blue-500 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                  >
                    <Globe size={16} /> {t('groups.public_group')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsPrivateSelection(true)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${isPrivateSelection ? 'border-amber-500 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                  >
                    <Lock size={16} /> {t('groups.private_group')}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                  {t('groups.cancel')}
                </button>
                <button type="submit" disabled={isProcessing} className="flex-1 flex justify-center py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 size={20} className="animate-spin" /> : t('groups.create_channel')}
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
              <h2 className="text-lg font-bold flex items-center gap-2"><UserPlus size={18} /> {t('groups.invite_to_channel')}</h2>
              <button onClick={() => setInviteModalOpen(false)} className="text-blue-400 hover:text-blue-600 transition-colors"><X size={18} /></button>
            </div>
            <form className="p-6 space-y-5" onSubmit={handleInviteUser}>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  {t('groups.invite_intro', { name: selectedGroup.name })}
                </p>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">{t('groups.username')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-bold">@</span>
                  <input type="text" required value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} placeholder={t('groups.username_placeholder')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>
              <button type="submit" disabled={isProcessing} className="w-full flex justify-center py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : t('groups.send_invitation')}
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('groups.delete_channel_q')}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
              {t('groups.delete_channel_body', { name: groupToDelete.name })}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDeleteGroup} 
                disabled={isProcessing} 
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : t('groups.confirm_delete')}
              </button>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition border border-gray-200 dark:border-gray-700"
              >
                {t('groups.cancel')}
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('groups.delete_all_q')}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
            {t('groups.delete_all_body')}
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={executeDeleteAllGroups} 
              disabled={isProcessing} 
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : t('groups.confirm_delete_all')}
            </button>
            <button
              onClick={() => setDeleteAllModalOpen(false)}
              className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition border border-gray-200 dark:border-gray-700"
            >
              {t('groups.cancel')}
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('groups.request_access_q')}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
              {t('groups.request_access_body', { name: groupToJoin.name })}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={async () => {
                  setIsProcessing(true);
                  try {
                    if (!groupToJoin.created_by) {
                      throw new Error(t('groups.toast_no_admin'));
                    }
                    
                    const { error } = await supabase.from('notifications').insert({
                      receiver_id: groupToJoin.created_by,
                      actor_id: currentUserId,
                      type: 'group_join_request',
                      content: `${groupToJoin.id}|${groupToJoin.name}`
                    });
                    if (error) throw error;
                    showToast(t('groups.toast_join_sent'));
                    setGroupToJoin(null);
                  } catch(e) { showToast(e.message, "error"); } 
                  finally { setIsProcessing(false); }
                }} 
                disabled={isProcessing} 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : t('groups.send_join_request')}
              </button>
              <button onClick={() => setGroupToJoin(null)} className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition border border-gray-200 dark:border-gray-700">{t('groups.cancel')}</button>
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
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('groups.channel_members')}</h2>
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
                            {isMe && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-widest">{t('groups.you')}</span>}
                          </h4>
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mt-0.5">
                            {isAdmin ? <span className="text-green-500">{t('groups.administrator')}</span> : t('groups.member')}
                          </p>
                        </div>
                      </div>
                      
                      {canKick && (
                        <button 
                          onClick={() => handleKickUser(member.user_id, member.profiles?.username)}
                          disabled={isProcessing}
                          className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 hover:bg-red-600 dark:hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50"
                          title={t('groups.kick_user', { username: member.profiles?.username })}
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