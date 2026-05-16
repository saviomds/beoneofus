"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Search, MoreVertical, Send,
  Paperclip, CheckCheck, UserPlus, Check, X,
  Trash2, AlertTriangle, MoreHorizontal, ShieldAlert, ShieldCheck,
  ChevronLeft, MessageSquare, BadgeCheck, Sparkles, Loader2,
  ThumbsUp, Camera, Smile, Star, Pin, Copy, Reply,
  ZoomIn, Download, Clock, Users, Filter, Bell, BellOff,
  ChevronDown, CornerUpLeft
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import ProfileContent from "./ProfileContent";
import { useDashboard } from "./DashboardContext";

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function MessagesContent() {
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const { targetChatUser, setTargetChatUser } = useDashboard();
  const [onlineUsers, setOnlineUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessagePreviews, setLastMessagePreviews] = useState({});

  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [blockerId, setBlockerId] = useState(null);
  const [activeConnectionId, setActiveConnectionId] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageSendError, setMessageSendError] = useState(null);
  const forceScrollRef = useRef(false);

  const [mutedChats, setMutedChats] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("muted_chats") || "[]");
      } catch {
        return [];
      }
    }
    return [];
  });

  const [deletingMsgId, setDeletingMsgId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const imageInputRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);
  const channelRef = useRef(null);
  const activeChatRef = useRef(null);
  const moreMenuRef = useRef(null);

  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutsRef = useRef({});
  const lastTypingSentRef = useRef(0);

  // Toast
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const showToast = useCallback((msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
  }, []);

  const broadcastRef = useRef(null);

  /* ── Sync ref ── */
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  /* ── Close more menu on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ─────────────────────────────────────────────────────────
     1. INITIAL CONTACT FETCH
  ───────────────────────────────────────────────────────── */
  useEffect(() => {
    let isMounted = true;

    const fetchContacts = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      if (isMounted) setCurrentUserId(uid);

      const { data: connections } = await supabase
        .from("connections")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

      const connectedIds = (connections || []).map((c) =>
        c.sender_id === uid ? c.receiver_id : c.sender_id
      );

      if (connectedIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, status, avatar_url, is_verified")
          .in("id", connectedIds);

        if (isMounted) {
          setContacts(profiles || []);
          setActiveChat((prev) => {
            if (prev && profiles?.some((p) => p.id === prev.id)) return prev;
            return profiles?.length > 0 ? profiles[0] : null;
          });
        }
      } else {
        if (isMounted) {
          setContacts([]);
          setActiveChat(null);
        }
      }
    };

    fetchContacts();

    const channel = supabase
      .channel("messages-contacts-update")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "connections" },
        fetchContacts
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        fetchContacts
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  /* ── Target chat from context ── */
  useEffect(() => {
    if (targetChatUser) {
      setActiveChat(targetChatUser);
      setContacts((prev) =>
        prev.find((c) => c.id === targetChatUser.id)
          ? prev
          : [targetChatUser, ...prev]
      );
      setTargetChatUser(null);
      setIsMobileChatOpen(true);
    }
  }, [targetChatUser, setTargetChatUser]);

  /* ─────────────────────────────────────────────────────────
     2. UNREAD COUNTS & PREVIEWS
  ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!currentUserId) return;

    const fetchUnreadAndPreviews = async () => {
      const { data } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, is_read, text, image_url, created_at")
        .or(
          `sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`
        )
        .order("created_at", { ascending: false });

      const counts = {};
      const previews = {};

      (data || []).forEach((msg) => {
        const otherId =
          msg.sender_id === currentUserId
            ? msg.receiver_id
            : msg.sender_id;
        if (
          msg.receiver_id === currentUserId &&
          !msg.is_read &&
          activeChatRef.current?.id !== msg.sender_id
        ) {
          counts[otherId] = (counts[otherId] || 0) + 1;
        }
        if (!previews[otherId]) {
          const isSender = msg.sender_id === currentUserId;
          previews[otherId] = {
            text:
              (isSender ? "You: " : "") +
              (msg.text || (msg.image_url ? "📷 Image" : "New message")),
            isSender,
            isRead: msg.is_read,
          };
        }
      });

      setUnreadCounts(counts);
      setLastMessagePreviews(previews);
    };

    fetchUnreadAndPreviews();

    const ch = supabase
      .channel("messages-unread-update")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        fetchUnreadAndPreviews
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${currentUserId}`,
        },
        fetchUnreadAndPreviews
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [currentUserId]);

  /* ─────────────────────────────────────────────────────────
     3. PRESENCE
  ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!currentUserId) return;
    const presenceCh = supabase.channel("online-users", {
      config: { presence: { key: currentUserId } },
    });
    presenceCh
      .on("presence", { event: "sync" }, () =>
        setOnlineUsers(presenceCh.presenceState())
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED")
          await presenceCh.track({ online_at: new Date().toISOString() });
      });
    return () => supabase.removeChannel(presenceCh);
  }, [currentUserId]);

  /* ─────────────────────────────────────────────────────────
     4. ACTIVE CHAT: messages + connection
  ───────────────────────────────────────────────────────── */
  const fetchMessages = useCallback(
    async (chatId, uid) => {
      setIsLoadingMessages(true);
      const { data, error } = await supabase
        .from("messages")
        .select(
          "*, replied_message:reply_to_message_id(*), message_reactions(id, user_id, emoji)"
        )
        .or(
          `and(sender_id.eq.${uid},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${uid})`
        )
        .order("created_at", { ascending: true });

      setIsLoadingMessages(false);
      if (error) {
        showToast("Failed to load messages: " + error.message, "error");
        return;
      }
      setMessages(data || []);
      setUnreadCounts((prev) => ({ ...prev, [chatId]: 0 }));

      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", uid)
        .eq("sender_id", chatId)
        .eq("is_read", false);
    },
    [showToast]
  );

  useEffect(() => {
    if (!activeChat || !currentUserId) return;

    const checkConnection = async () => {
      const { data: conn } = await supabase
        .from("connections")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUserId})`
        )
        .maybeSingle();

      if (!conn) {
        setConnectionStatus("none");
        setBlockerId(null);
        setActiveConnectionId(null);
        setMessages([]);
      } else {
        setActiveConnectionId(conn.id);
        if (conn.status === "blocked") {
          setConnectionStatus("blocked");
          setBlockerId(conn.blocked_by);
          setMessages([]);
        } else if (conn.status === "pending") {
          setConnectionStatus(
            conn.sender_id === currentUserId ? "waiting" : "incoming"
          );
          setMessages([]);
        } else {
          setConnectionStatus("accepted");
          setBlockerId(null);
          fetchMessages(activeChat.id, currentUserId);
        }
      }
    };

    checkConnection();

    const chId = `chat-${[currentUserId, activeChat.id].sort().join("-")}`;
    channelRef.current = supabase
      .channel(chId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "connections" },
        checkConnection
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new;
          if (
            msg.sender_id !== activeChat.id &&
            msg.receiver_id !== activeChat.id
          )
            return;
          const { data } = await supabase
            .from("messages")
            .select(
              "*, replied_message:reply_to_message_id(*), message_reactions(id, user_id, emoji)"
            )
            .eq("id", msg.id)
            .maybeSingle();
          setMessages((prev) =>
            prev.find((m) => m.id === msg.id)
              ? prev
              : [...prev, data || msg]
          );
          if (msg.receiver_id === currentUserId) {
            await supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", msg.id);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const upd = payload.new;
          if (
            upd.sender_id !== activeChat.id &&
            upd.receiver_id !== activeChat.id
          )
            return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === upd.id
                ? { ...m, is_read: upd.is_read, text: upd.text }
                : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) =>
            prev.filter((m) => m.id !== payload.old.id)
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => {
          fetchMessages(activeChat.id, currentUserId);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [activeChat, currentUserId, fetchMessages]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    if (isNearBottom || forceScrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      forceScrollRef.current = false;
    }
  }, [messages, connectionStatus, typingUsers]);

  /* ─────────────────────────────────────────────────────────
     5. BROADCAST (typing only)
  ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!currentUserId) return;

    broadcastRef.current = supabase
      .channel(`broadcast-${currentUserId}-${Date.now()}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.targetId !== currentUserId) return;
        setTypingUsers((prev) => ({ ...prev, [payload.senderId]: true }));
        if (typingTimeoutsRef.current[payload.senderId])
          clearTimeout(typingTimeoutsRef.current[payload.senderId]);
        typingTimeoutsRef.current[payload.senderId] = setTimeout(() => {
          setTypingUsers((prev) => ({ ...prev, [payload.senderId]: false }));
        }, 3000);
      })
      .subscribe();

    return () => {
      if (broadcastRef.current) supabase.removeChannel(broadcastRef.current);
    };
  }, [currentUserId]);

  /* ─────────────────────────────────────────────────────────
     6. CONNECTION HANDLERS
  ───────────────────────────────────────────────────────── */
  const handleSendRequest = async () => {
    const { error } = await supabase.from("connections").insert({
      sender_id: currentUserId,
      receiver_id: activeChat.id,
      status: "pending",
    });
    if (error) {
      if (error.code === "23503") {
        showToast("This user no longer exists.", "error");
        setContacts((p) => p.filter((c) => c.id !== activeChat.id));
        setActiveChat(null);
      } else {
        showToast("Failed to send request: " + error.message, "error");
      }
      return;
    }
    setConnectionStatus("waiting");
    await supabase.from("notifications").insert({
      receiver_id: activeChat.id,
      actor_id: currentUserId,
      type: "connection_request",
      content: "wants to connect",
    });
  };

  const handleAcceptRequest = async () => {
    if (!activeConnectionId) return;
    const { error } = await supabase
      .from("connections")
      .update({ status: "accepted" })
      .eq("id", activeConnectionId);
    if (!error) {
      setConnectionStatus("accepted");
      await supabase.from("notifications").insert({
        receiver_id: activeChat.id,
        actor_id: currentUserId,
        type: "handshake",
        content: "accepted your connection request",
      });

      // Email the requester
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: senderProfile } = await supabase
          .from('profiles').select('email, username').eq('id', activeChat.id).single();
        const { data: myProfile } = await supabase
          .from('profiles').select('username').eq('id', currentUserId).single();
        if (session && senderProfile?.email) {
          fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              type: 'connection_accepted',
              email: senderProfile.email,
              name: senderProfile.username || 'there',
              extra: { acceptorName: myProfile?.username || 'Someone' },
            }),
          }).catch(() => {});
        }
      })();
    }
  };

  /* ─────────────────────────────────────────────────────────
     7. BLOCK / UNBLOCK
  ───────────────────────────────────────────────────────── */
  const handleBlockUser = async () => {
    if (!activeConnectionId || !currentUserId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "blocked", blocked_by: currentUserId })
        .eq("id", activeConnectionId);
      if (error) throw error;
      setShowBlockConfirm(false);
      setShowMoreMenu(false);
    } catch (e) {
      showToast("Could not block user: " + e.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!activeConnectionId || !currentUserId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "accepted", blocked_by: null })
        .eq("id", activeConnectionId)
        .eq("blocked_by", currentUserId);
      if (error) throw error;
      setShowMoreMenu(false);
    } catch (e) {
      showToast("Could not unblock: " + e.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  /* ─────────────────────────────────────────────────────────
     8. DELETE MESSAGE
  ───────────────────────────────────────────────────────── */
  const handleDeleteMessage = async (msgId) => {
    setDeletingMsgId(msgId);
    // Optimistic remove
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    setShowDeleteConfirm(null);
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", msgId)
      .eq("sender_id", currentUserId);
    if (error) {
      showToast("Failed to delete message.", "error");
      fetchMessages(activeChat.id, currentUserId); // rollback
    }
    setDeletingMsgId(null);
  };

  /* ─────────────────────────────────────────────────────────
     9. AI SUGGEST REPLY
     FIX: Properly parse API response (content[0].text not message.content)
  ───────────────────────────────────────────────────────── */
  const handleSuggestReply = async () => {
    if (isSuggesting || !activeChat) return;
    const lastMsg = [...messages]
      .reverse()
      .find((m) => m.sender_id === activeChat.id);
    const prompt = lastMsg?.text
      ? `Draft a brief, friendly reply (1-2 sentences) to this message: "${lastMsg.text}". Return ONLY the reply text, no quotes or preamble.`
      : "Draft a friendly one-sentence opening message to start a conversation. Return ONLY the message text.";

    setIsSuggesting(true);
    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      try {
        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
          }),
        });

        const textResponse = await res.text();
        let data;
        try {
          data = JSON.parse(textResponse);
        } catch {
          throw new Error(
            "AI API returned invalid response. Please restart your dev server."
          );
        }
        if (!res.ok)
          throw new Error(data?.error || "Failed to fetch AI response");

        // FIX: handle both response shapes gracefully
        let suggested = "";
        if (typeof data?.message?.content === "string") {
          suggested = data.message.content;
        } else if (Array.isArray(data?.message?.content)) {
          suggested = data.message.content
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("");
        } else if (typeof data?.content === "string") {
          suggested = data.content;
        } else if (Array.isArray(data?.content)) {
          suggested = data.content
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("");
        }

        setInputValue(suggested.replace(/^["']|["']$/g, "").trim());
        textareaRef.current?.focus();
        break;
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) {
          showToast("AI suggestion failed: " + err.message, "error");
        } else {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * attempt)
          );
        }
      }
    }
    setIsSuggesting(false);
  };

  /* ─────────────────────────────────────────────────────────
     10. REACTIONS
  ───────────────────────────────────────────────────────── */
  const handleReaction = async (msgId, emoji) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    const existing = msg.message_reactions?.find(
      (r) => r.user_id === currentUserId && r.emoji === emoji
    );

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const reactions = m.message_reactions || [];
        if (existing)
          return {
            ...m,
            message_reactions: reactions.filter((r) => r.id !== existing.id),
          };
        return {
          ...m,
          message_reactions: [
            ...reactions,
            {
              id: `temp-${Date.now()}`,
              message_id: msgId,
              user_id: currentUserId,
              emoji,
            },
          ],
        };
      })
    );
    setEmojiPickerMsgId(null);

    try {
      if (existing) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existing.id);
      } else {
        const { error } = await supabase.from("message_reactions").insert({
          message_id: msgId,
          user_id: currentUserId,
          emoji,
        });
        if (error) throw error;
      }
    } catch {
      showToast("Reaction failed.", "error");
      fetchMessages(activeChat.id, currentUserId);
    }
  };

  /* ─────────────────────────────────────────────────────────
     11. TYPING
  ───────────────────────────────────────────────────────── */
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    // FIX: guard against null activeChat
    if (!activeChat || !currentUserId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      broadcastRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { targetId: activeChat.id, senderId: currentUserId },
      });
      lastTypingSentRef.current = now;
    }
  };

  // FIX: Auto-resize textarea — guard against null ref
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [inputValue]);

  const handleKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent?.isComposing
    ) {
      // FIX: Skip on touch devices so mobile keyboard Enter still adds newlines
      const isTouchDevice =
        typeof window !== "undefined" &&
        window.matchMedia("(hover: none) and (pointer: coarse)").matches;
      if (isTouchDevice) return;
      e.preventDefault();
      if (inputValue.trim() || imageFile) handleSendMessage(e);
    }
  };

  /* ─────────────────────────────────────────────────────────
     12. SEND MESSAGE
  ───────────────────────────────────────────────────────── */
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (connectionStatus !== "accepted") return;
    const msgText = inputValue.trim();
    const imageToUpload = imageFile;
    const replyToId = replyingTo?.id;
    if (!msgText && !imageToUpload) return;

    setMessageSendError(null);
    const optimisticId = `opt-${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      sender_id: currentUserId,
      receiver_id: activeChat.id,
      text: msgText,
      image_url: imagePreview,
      replied_message: replyingTo,
      created_at: new Date().toISOString(),
      isSending: true,
      message_reactions: [],
    };
    forceScrollRef.current = true;
    setMessages((prev) => [...prev, optimistic]);
    setLastMessagePreviews((prev) => ({
      ...prev,
      [activeChat.id]: {
        text: `You: ${
          msgText || (imageToUpload ? "📷 Image" : "New message")
        }`,
        isSender: true,
        isRead: false,
      },
    }));

    setInputValue("");
    setImageFile(null);
    setImagePreview(null);
    setReplyingTo(null);
    if (imageInputRef.current) imageInputRef.current.value = "";

    try {
      let imageUrl = null;
      if (imageToUpload) {
        const ext = imageToUpload.name.split(".").pop();
        const path = `${currentUserId}/msg-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("chat_images")
          .upload(path, imageToUpload);
        if (upErr) throw new Error("Image upload failed: " + upErr.message);
        const { data: urlData } = supabase.storage
          .from("chat_images")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { data: inserted, error } = await supabase
        .from("messages")
        .insert({
          sender_id: currentUserId,
          receiver_id: activeChat.id,
          text: msgText || "",
          image_url: imageUrl,
          reply_to_message_id: replyToId,
        })
        .select()
        .single();
      if (error) throw error;

      setMessages((prev) => {
        // If realtime already added it, just remove optimistic
        if (prev.some((m) => m.id === inserted.id && !m.isSending)) {
          return prev.filter((m) => m.id !== optimisticId);
        }
        return prev.map((m) =>
          m.id === optimisticId
            ? {
                ...m,
                ...inserted,
                image_url: imageUrl || m.image_url,
                isSending: false,
              }
            : m
        );
      });

      await supabase.from("notifications").insert({
        receiver_id: activeChat.id,
        actor_id: currentUserId,
        type: "message",
        content: msgText
          ? msgText.length > 100
            ? msgText.slice(0, 100) + "…"
            : msgText
          : "Sent an image",
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setMessageSendError(err.message);
      showToast("Failed to send: " + err.message, "error");
    }
  };

  /* ── File attach ── */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("Image must be under 10MB.", "error");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  /* ── Mute toggle ── */
  const toggleMute = (contactId) => {
    setMutedChats((prev) => {
      const next = prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId];
      localStorage.setItem("muted_chats", JSON.stringify(next));
      return next;
    });
  };

  /* ── Copy message ── */
  const copyMessage = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Copied to clipboard"));
  };

  /* ── Filtered contacts ── */
  const filteredContacts = contacts.filter((c) => {
    const matchSearch = c.username
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchUnread = filterUnread
      ? (unreadCounts[c.id] || 0) > 0
      : true;
    return matchSearch && matchUnread;
  });

  const hasAnyUnread = Object.values(unreadCounts).some((n) => n > 0);

  /* ─────────────────────────────────────────────────────────
     LOADING GATE
  ───────────────────────────────────────────────────────── */
  if (!currentUserId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-violet-500" />
          <p className="text-sm font-semibold text-gray-400 tracking-widest uppercase">
            Authenticating…
          </p>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── IMAGE LIGHTBOX ── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[400] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button className="absolute top-4 right-4 text-white/60 hover:text-white p-2 z-10">
            <X size={24} />
          </button>
          <a
            href={lightboxImage}
            download
            className="absolute top-4 right-16 text-white/60 hover:text-white p-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={22} />
          </a>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={lightboxImage}
              alt="Full size"
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* ── BLOCK CONFIRM MODAL ── */}
      {showBlockConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={28} className="text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Block @{activeChat?.username}?
            </h3>
            {/* FIX: removed duplicate paragraph */}
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              They won&apos;t be able to message you. You can unblock at any time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Blocking…" : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 w-full max-w-xs rounded-2xl p-6 shadow-2xl text-center animate-in fade-in zoom-in duration-150">
            <Trash2 size={24} className="text-red-500 mx-auto mb-3" />
            <p className="text-gray-900 dark:text-gray-100 font-semibold mb-1">
              Delete this message?
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-5">
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMessage(showDeleteConfirm)}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE MODAL ── */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedUserId(null)}
          />
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto z-10 bg-white dark:bg-gray-950 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl">
            <button
              onClick={() => setSelectedUserId(null)}
              className="absolute top-5 right-5 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 dark:text-gray-400 hover:text-red-600 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="p-4 sm:p-6">
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div className="w-full flex h-full bg-transparent overflow-hidden relative">

        {/* ════════════════════════════════════
            SIDEBAR
        ════════════════════════════════════ */}
        <div
          className={`w-full md:w-72 lg:w-80 flex-col shrink-0 ${
            isMobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="pb-3 px-4 md:px-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Messages
              </h2>
              {hasAnyUnread && (
                <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  {Object.values(unreadCounts).reduce((a, b) => a + b, 0)} new
                </span>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800/60 rounded-xl p-1 mb-3 gap-1">
              {(
                [
                  ["All", false],
                  ["Unread", true],
                ]
              ).map(([label, val]) => (
                <button
                  key={label}
                  onClick={() => setFilterUnread(val)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    filterUnread === val
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {label}
                  {label === "Unread" && hasAnyUnread && (
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative group">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2 pl-9 pr-8 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-4 md:pr-1 pb-2 custom-scrollbar">
            {filteredContacts.length === 0 && (
              <div className="text-center py-12 px-4">
                <MessageSquare
                  size={32}
                  className="text-gray-300 dark:text-gray-700 mx-auto mb-3"
                />
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                  {filterUnread
                    ? "No unread messages"
                    : searchQuery
                    ? `No results for "${searchQuery}"`
                    : "No connections yet"}
                </p>
                {filterUnread && (
                  <button
                    onClick={() => setFilterUnread(false)}
                    className="mt-2 text-xs text-blue-500 font-bold underline underline-offset-2"
                  >
                    Show all
                  </button>
                )}
              </div>
            )}

            {filteredContacts.map((contact, i) => {
              const isActive = activeChat?.id === contact.id;
              const isOnline = Object.keys(onlineUsers).includes(contact.id);
              const unread = unreadCounts[contact.id] || 0;
              const preview = lastMessagePreviews[contact.id];
              const isTyping = typingUsers[contact.id];
              const isMuted = mutedChats.includes(contact.id);

              return (
                <div
                  key={contact.id}
                  onClick={() => {
                    setActiveChat(contact);
                    setShowMoreMenu(false);
                    setIsMobileChatOpen(true);
                  }}
                  className={`group flex items-center gap-3 p-4 md:p-3 cursor-pointer rounded-2xl border transition-all duration-200 animate-in fade-in slide-in-from-left-2 ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60"
                      : "bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent hover:border-gray-200 dark:hover:border-gray-700/50"
                  }`}
                  style={{
                    animationDelay: `${i * 30}ms`,
                    animationFillMode: "both",
                  }}
                >
                  {/* Avatar */}
                  <div
                    className={`relative w-11 h-11 rounded-full shrink-0 overflow-hidden border-2 transition-all cursor-pointer ${
                      isActive
                        ? "border-blue-300 dark:border-blue-700"
                        : "border-transparent group-hover:border-blue-100 dark:group-hover:border-blue-900"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUserId(contact.id);
                    }}
                  >
                    {contact.avatar_url ? (
                      <Image
                        src={contact.avatar_url}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex items-center justify-center text-sm font-black ${
                          isActive
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {contact.username[0].toUpperCase()}
                      </div>
                    )}
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={`text-sm font-bold truncate flex items-center gap-1 ${
                          isActive
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {contact.username}
                        {contact.is_verified && (
                          <BadgeCheck
                            size={13}
                            className="text-blue-500 shrink-0"
                            fill="currentColor"
                            stroke="white"
                          />
                        )}
                        {isMuted && (
                          <BellOff size={11} className="text-gray-400 shrink-0" />
                        )}
                      </span>
                      {unread > 0 && (
                        <span className="text-[9px] font-black text-white bg-blue-600 px-1.5 py-0.5 rounded-md shrink-0 shadow-sm">
                          {unread}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <p
                        className={`text-xs truncate flex-1 ${
                          isTyping
                            ? "text-blue-500 italic font-semibold"
                            : unread > 0
                            ? "text-gray-700 dark:text-gray-200 font-semibold"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {isTyping
                          ? "typing…"
                          : preview?.text || (isOnline ? "Online" : "Tap to chat")}
                      </p>
                      {!isTyping && preview?.isSender && (
                        preview.isRead ? (
                          <CheckCheck size={13} className="text-blue-400 shrink-0" />
                        ) : (
                          <Check size={13} className="text-gray-400 shrink-0" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── DIVIDER ── */}
        <div className="hidden md:block w-px bg-gray-200 dark:bg-gray-800 mx-3 shrink-0" />

        {/* ════════════════════════════════════
            CHAT AREA
        ════════════════════════════════════ */}
        <div
          className={`flex-1 flex-col min-w-0 min-h-0 ${
            !isMobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {activeChat ? (
            <>
              {/* Chat Header - Mobile optimized */}
              <div className="pb-2 pt-1 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 z-10 relative bg-white dark:bg-gray-950 md:bg-transparent px-4 md:px-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    onClick={() => setIsMobileChatOpen(false)}
                    className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors shrink-0"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <div
                    className="relative w-9 h-9 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer shrink-0 hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedUserId(activeChat.id)}
                  >
                    {activeChat.avatar_url ? (
                      <Image
                        src={activeChat.avatar_url}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-sm font-black text-violet-600 dark:text-violet-300">
                        {activeChat.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div
                    className="cursor-pointer min-w-0 flex-1"
                    onClick={() => setSelectedUserId(activeChat.id)}
                  >
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight flex items-center gap-1 hover:text-violet-600 dark:hover:text-violet-400 transition-colors min-w-0">
                      <span className="truncate">@{activeChat.username}</span>
                      {activeChat.is_verified && (
                        <BadgeCheck
                          size={14}
                          className="text-violet-500 shrink-0"
                          fill="currentColor"
                          stroke="white"
                        />
                      )}
                    </h3>
                    <p className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          connectionStatus === "blocked"
                            ? "bg-red-500"
                            : Object.keys(onlineUsers).includes(activeChat.id)
                            ? "bg-green-500"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      />
                      <span className="text-gray-400 dark:text-gray-500 truncate">
                        {connectionStatus === "blocked"
                          ? "Blocked"
                          : Object.keys(onlineUsers).includes(activeChat.id)
                          ? "Online"
                          : "Offline"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Header actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <div className="relative" ref={moreMenuRef}>
                    <button
                      onClick={() => setShowMoreMenu((p) => !p)}
                      className={`p-2 rounded-xl transition-all ${
                        showMoreMenu
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          : "text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {showMoreMenu && (
                      <div className="absolute top-full right-0 mt-1 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                        <button
                          onClick={() => {
                            setSelectedUserId(activeChat.id);
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold"
                        >
                          <Users size={14} /> View Profile
                        </button>
                        <button
                          onClick={() => {
                            toggleMute(activeChat.id);
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold"
                        >
                          {mutedChats.includes(activeChat.id) ? (
                            <>
                              <Bell size={14} /> Unmute
                            </>
                          ) : (
                            <>
                              <BellOff size={14} /> Mute Notifications
                            </>
                          )}
                        </button>
                        <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                        {connectionStatus === "blocked" &&
                        blockerId === currentUserId ? (
                          <button
                            onClick={handleUnblockUser}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-bold"
                          >
                            <ShieldCheck size={14} /> Unblock User
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setShowBlockConfirm(true);
                              setShowMoreMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors font-bold"
                          >
                            <ShieldAlert size={14} /> Block User
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Messages ── */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto py-4 px-4 md:px-1 space-y-1 no-scrollbar mobile-chat-scroll relative"
              >
                {isLoadingMessages && (
                  <div className="flex justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                  </div>
                )}

                {connectionStatus === "accepted" ? (
                  <>
                    {messages.map((msg, idx) => {
                      const isMine = msg.sender_id === currentUserId;
                      const reactionsByEmoji = (
                        msg.message_reactions || []
                      ).reduce((acc, r) => {
                        acc[r.emoji] = acc[r.emoji] || [];
                        acc[r.emoji].push(r);
                        return acc;
                      }, {});
                      const isHovered = hoveredMsgId === msg.id;
                      // FIX: use strict same-sender check for grouping
                      const prevMsg = messages[idx - 1];
                      const sameAsPrev =
                        prevMsg?.sender_id === msg.sender_id;

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 px-4 md:px-1 ${
                            isMine ? "justify-end" : "justify-start"
                          } group/msg`}
                          onMouseEnter={() => setHoveredMsgId(msg.id)}
                          onMouseLeave={() => setHoveredMsgId(null)}
                        >
                          {/* Sender avatar — FIX: add relative positioning wrapper */}
                          {!isMine && (
                            <div
                              className={`relative w-7 h-7 shrink-0 rounded-full overflow-hidden mt-auto mb-1 cursor-pointer ${
                                sameAsPrev
                                  ? "opacity-0 pointer-events-none"
                                  : ""
                              }`}
                              onClick={() =>
                                setSelectedUserId(activeChat.id)
                              }
                            >
                              {activeChat.avatar_url ? (
                                <Image
                                  src={activeChat.avatar_url}
                                  alt=""
                                  fill
                                  sizes="28px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-xs font-black text-violet-600">
                                  {activeChat.username[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            className={`flex flex-col max-w-[85%] md:max-w-[78%] ${
                              isMine ? "items-end" : "items-start"
                            }`}
                          >
                            {/* Reply preview */}
                            {msg.replied_message && (
                              <div
                                className={`flex items-start gap-2 mb-1 px-3 py-1.5 rounded-xl text-xs border max-w-full ${
                                  isMine
                                    ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 text-right"
                                    : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-left"
                                }`}
                              >
                                <CornerUpLeft
                                  size={12}
                                  className="text-gray-400 shrink-0 mt-0.5"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide">
                                    @
                                    {msg.replied_message.sender_id ===
                                    currentUserId
                                      ? "You"
                                      : activeChat.username}
                                  </p>
                                  <p className="text-gray-500 dark:text-gray-400 truncate">
                                    {msg.replied_message.text || "📷 Image"}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Bubble */}
                            <div
                              className={`relative inline-block text-[14px] break-words rounded-2xl shadow-sm transition-all ${
                                msg.isSending ? "opacity-60" : ""
                              } ${
                                !msg.text && msg.image_url
                                  ? "bg-transparent shadow-none"
                                  : isMine
                                  ? "bg-blue-600 text-white rounded-br-md"
                                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md"
                              }`}
                            >
                              {msg.image_url && (
                                <div
                                  className={`relative w-48 sm:w-64 aspect-video rounded-xl overflow-hidden cursor-zoom-in ${
                                    msg.text ? "m-1.5" : ""
                                  } bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800`}
                                  onClick={() =>
                                    setLightboxImage(msg.image_url)
                                  }
                                >
                                  <Image
                                    src={msg.image_url}
                                    alt="attachment"
                                    fill
                                    sizes="256px"
                                    className="object-cover hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <ZoomIn
                                      size={20}
                                      className="text-white opacity-0 group-hover/msg:opacity-100 transition-opacity drop-shadow-lg"
                                    />
                                  </div>
                                </div>
                              )}
                              {msg.text && (
                                <p className="px-4 py-3 whitespace-pre-wrap leading-relaxed">
                                  {msg.text}
                                </p>
                              )}

                              {/* FIX: single floating action bar — removed duplicate */}
                              <div
                                className={`absolute top-1/2 -translate-y-1/2 ${
                                  isMine
                                    ? "right-full mr-2"
                                    : "left-full ml-2"
                                } flex items-center gap-1 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm transition-all duration-150 z-20 ${
                                  isHovered || emojiPickerMsgId === msg.id
                                    ? "opacity-100 translate-x-0"
                                    : `opacity-0 pointer-events-none ${
                                        isMine
                                          ? "translate-x-2"
                                          : "-translate-x-2"
                                      }`
                                }`}
                              >
                                {/* Emoji picker */}
                                <div className="relative">
                                  <button
                                    onClick={() =>
                                      setEmojiPickerMsgId(
                                        emojiPickerMsgId === msg.id
                                          ? null
                                          : msg.id
                                      )
                                    }
                                    className={`p-1.5 rounded-lg text-gray-500 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ${
                                      emojiPickerMsgId === msg.id
                                        ? "bg-gray-100 dark:bg-gray-800 text-yellow-500"
                                        : ""
                                    }`}
                                    title="React"
                                  >
                                    <Smile size={16} />
                                  </button>
                                  {emojiPickerMsgId === msg.id && (
                                    <div
                                      className={`absolute ${
                                        isMine ? "right-0" : "left-0"
                                      } bottom-full mb-3 flex w-max gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-2 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-100`}
                                    >
                                      {QUICK_EMOJIS.map((e) => (
                                        <button
                                          key={e}
                                          onClick={() =>
                                            handleReaction(msg.id, e)
                                          }
                                          className="text-xl hover:scale-125 hover:-translate-y-1 transition-transform focus:outline-none"
                                        >
                                          {e}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => setReplyingTo(msg)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                  title="Reply"
                                >
                                  <Reply size={16} />
                                </button>
                                {msg.text && (
                                  <button
                                    onClick={() => copyMessage(msg.text)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                    title="Copy"
                                  >
                                    <Copy size={16} />
                                  </button>
                                )}
                                {isMine && (
                                  <button
                                    onClick={() =>
                                      setShowDeleteConfirm(msg.id)
                                    }
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Reactions */}
                            {Object.keys(reactionsByEmoji).length > 0 && (
                              <div
                                className={`flex flex-wrap gap-1 mt-1 ${
                                  isMine ? "justify-end" : "justify-start"
                                }`}
                              >
                                {Object.entries(reactionsByEmoji).map(
                                  ([emoji, reactors]) => {
                                    const myReaction = reactors.find(
                                      (r) => r.user_id === currentUserId
                                    );
                                    return (
                                      <button
                                        key={emoji}
                                        onClick={() =>
                                          handleReaction(msg.id, emoji)
                                        }
                                        className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                                          myReaction
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                                        }`}
                                      >
                                        <span>{emoji}</span>
                                        {reactors.length > 1 && (
                                          <span>{reactors.length}</span>
                                        )}
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            )}

                            {/* Timestamp & read receipt */}
                            <div
                              className={`mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 px-0.5 ${
                                isMine ? "flex-row-reverse" : ""
                              }`}
                            >
                              <span>
                                {new Date(msg.created_at).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>
                              {isMine &&
                                (msg.isSending ? (
                                  <Clock
                                    size={11}
                                    className="text-gray-400 animate-pulse"
                                  />
                                ) : msg.is_read ? (
                                  <>
                                    <CheckCheck
                                      size={11}
                                      className="text-blue-500"
                                    />
                                    <span className="text-blue-500 font-semibold">
                                      Seen
                                    </span>
                                  </>
                                ) : (
                                  <Check
                                    size={11}
                                    className="text-gray-400"
                                  />
                                ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing indicator */}
                    {typingUsers[activeChat.id] && (
                      <div className="flex gap-3 px-4 md:px-1 justify-start animate-in fade-in slide-in-from-bottom-2">
                        {/* FIX: proper relative wrapper for avatar */}
                        <div className="relative w-7 h-7 shrink-0 rounded-full overflow-hidden">
                          {activeChat.avatar_url ? (
                            <Image
                              src={activeChat.avatar_url}
                              alt=""
                              fill
                              sizes="28px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-black text-gray-500">
                              {activeChat.username[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                          <span className="flex gap-1 items-center">
                            {[0, 150, 300].map((delay) => (
                              <span
                                key={delay}
                                className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                                style={{ animationDelay: `${delay}ms` }}
                              />
                            ))}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* ── Connection States ── */
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[60%] text-center px-6">
                    {connectionStatus === "blocked" ? (
                      <div className="space-y-3">
                        <div className="w-16 h-16 mx-auto bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center">
                          <ShieldAlert size={28} className="text-red-500" />
                        </div>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          Connection blocked
                        </p>
                        {blockerId === currentUserId ? (
                          <button
                            onClick={handleUnblockUser}
                            className="text-violet-500 text-sm font-bold hover:underline underline-offset-2"
                          >
                            Unblock @{activeChat.username}
                          </button>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            You&apos;ve been blocked by this user.
                          </p>
                        )}
                      </div>
                    ) : connectionStatus === "none" ? (
                      <div className="space-y-4">
                        <div className="w-16 h-16 mx-auto bg-violet-50 dark:bg-violet-900/20 rounded-2xl flex items-center justify-center">
                          <UserPlus size={28} className="text-violet-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                            No connection yet
                          </p>
                          <p className="text-xs text-gray-400">
                            Send a request to start chatting.
                          </p>
                        </div>
                        <button
                          onClick={handleSendRequest}
                          className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-violet-600/20"
                        >
                          Send Connection Request
                        </button>
                      </div>
                    ) : connectionStatus === "waiting" ? (
                      <div className="space-y-3">
                        <div className="w-16 h-16 mx-auto bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                          <Send
                            size={28}
                            className="text-gray-400 animate-pulse"
                          />
                        </div>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          Request sent
                        </p>
                        <p className="text-xs text-gray-400">
                          Waiting for @{activeChat.username} to accept…
                        </p>
                      </div>
                    ) : connectionStatus === "incoming" ? (
                      <div className="space-y-4">
                        <div className="w-16 h-16 mx-auto bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center">
                          <UserPlus size={28} className="text-green-500" />
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          @{activeChat.username} wants to connect
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={handleAcceptRequest}
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-green-600/20"
                          >
                            <Check size={16} /> Accept
                          </button>
                          <button
                            onClick={() => {
                              supabase
                                .from("connections")
                                .delete()
                                .eq("id", activeConnectionId);
                              setConnectionStatus("none");
                            }}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* ── Input Area ── Mobile optimized */}
              <div
                className={`pt-2 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-3 px-3 md:px-0 shrink-0 transition-all duration-300 bg-white dark:bg-gray-950 md:bg-transparent border-t border-gray-200 dark:border-gray-800 md:border-0 ${
                  connectionStatus === "accepted"
                    ? "opacity-100 translate-y-0"
                    : "opacity-30 translate-y-2 pointer-events-none"
                }`}
              >
                {/* Reply banner */}
                {replyingTo && (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 border-b-0 rounded-t-2xl px-4 py-2.5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center gap-2 min-w-0">
                      <CornerUpLeft
                        size={13}
                        className="text-blue-500 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          @
                          {replyingTo.sender_id === currentUserId
                            ? "You"
                            : activeChat.username}
                        </span>
                        <p className="text-gray-500 dark:text-gray-400 truncate">
                          {replyingTo.text || "📷 Image"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Image preview */}
                {imagePreview && (
                  <div
                    className={`bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 border-b-0 ${
                      replyingTo ? "" : "rounded-t-2xl"
                    } px-3 py-2.5 flex items-center gap-3 animate-in fade-in duration-150`}
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
                      <Image
                        src={imagePreview}
                        alt="preview"
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                        {imageFile?.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {imageFile
                          ? `${(imageFile.size / 1024).toFixed(0)} KB`
                          : ""}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview(null);
                        if (imageInputRef.current)
                          imageInputRef.current.value = "";
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Send error */}
                {messageSendError && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl px-3 py-2 mb-2 text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle size={13} />
                    <span className="flex-1 truncate">{messageSendError}</span>
                    <button
                      onClick={() => setMessageSendError(null)}
                      className="p-0.5 hover:text-red-800"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 ${
                    replyingTo || imagePreview
                      ? "rounded-b-2xl rounded-t-none border-t-0"
                      : "rounded-2xl"
                  } focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all shadow-sm overflow-hidden`}
                >
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Textarea row */}
                  <div className="flex items-end gap-2 px-3 pt-3 pb-1">
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message…"
                      rows={2}
                      className="flex-1 min-w-0 bg-transparent border-none focus:outline-none text-sm text-gray-900 dark:text-gray-100 resize-none max-h-[140px] leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500 py-1"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() && !imageFile}
                      className="w-9 h-9 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-all shadow-md shadow-blue-600/20 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shrink-0 mb-0.5"
                    >
                      <Send size={15} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Action bar row */}
                  <div className="flex items-center gap-0.5 px-2 pb-2 border-t border-gray-100 dark:border-gray-800 pt-1.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 rounded-lg transition-all min-h-[36px]"
                      title="Attach image"
                    >
                      <Paperclip size={15} />
                      <span className="hidden sm:inline">Attach</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSuggestReply}
                      disabled={isSuggesting}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 active:bg-violet-100 rounded-lg transition-all disabled:opacity-40 min-h-[36px]"
                      title="AI suggest reply"
                    >
                      {isSuggesting
                        ? <Loader2 size={15} className="animate-spin text-violet-500" />
                        : <Sparkles size={15} />}
                      <span className="hidden sm:inline">{isSuggesting ? "Thinking…" : "AI Reply"}</span>
                    </button>
                    <div className="flex-1" />
                    {inputValue.length > 0 && (
                      <span className={`text-[10px] font-mono px-2 ${inputValue.length > 500 ? "text-red-400" : "text-gray-300 dark:text-gray-600"}`}>
                        {inputValue.length}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-300 dark:text-gray-700 font-medium hidden sm:block pr-1">
                      Enter to send
                    </span>
                  </div>
                </form>
              </div>
            </>
          ) : (
            /* No active chat */
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <MessageSquare
                size={48}
                className="text-gray-200 dark:text-gray-800"
              />
              <div>
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500">
                  No conversation selected
                </p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                  Choose a contact from the sidebar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TOAST ── */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 bg-white dark:bg-gray-900 border px-4 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-sm ${
            toastType === "error"
              ? "border-red-200 dark:border-red-900/50"
              : "border-green-200 dark:border-green-900/50"
          }`}
        >
          {toastType === "error" ? (
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
          ) : (
            <Check size={16} className="text-green-500 shrink-0" />
          )}
          <span
            className={`text-sm font-semibold ${
              toastType === "error"
                ? "text-red-700 dark:text-red-400"
                : "text-green-700 dark:text-green-400"
            }`}
          >
            {toastMessage}
          </span>
          <button
            onClick={() => setToastMessage("")}
            className="ml-1 text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
