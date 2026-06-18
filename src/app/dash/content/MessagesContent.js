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
  ChevronDown, CornerUpLeft, Code2, Home, BarChart2,
  Settings, ListChecks, Inbox, Zap, Hash, AtSign,
  Maximize2, Tag, Heart, ArrowRight, FileText, Link2,
  PanelRightOpen, PanelRightClose
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import ProfileContent from "./ProfileContent";
import { useDashboard } from "./DashboardContext";
import { useOnlineUsers } from "../../contexts/OnlineUsersContext";

/* ─── HELPERS ───────────────────────────────────────────────── */
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
const SNIPPET_LANGS = ["text","javascript","typescript","python","rust","go","bash","sql","json","html","css","java","cpp","ruby","swift","kotlin"];

function parseSnippet(text) {
  if (!text || !text.startsWith('{')) return null;
  try { const p = JSON.parse(text); if (p.__snippet) return p; } catch {}
  return null;
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const map = {
    new:        { label: "New",         bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
    active:     { label: "Active",      bg: "#FFF7ED", color: "#C2410C", dot: "#F97316" },
    completed:  { label: "Done",        bg: "#F0FDF4", color: "#15803D", dot: "#22C55E" },
    important:  { label: "Important",   bg: "#FDF4FF", color: "#A21CAF", dot: "#D946EF" },
    waiting:    { label: "Waiting",     bg: "#F8FAFC", color: "#64748B", dot: "#94A3B8" },
    blocked:    { label: "Blocked",     bg: "#FFF1F2", color: "#BE123C", dot: "#F43F5E" },
    incoming:   { label: "Pending",     bg: "#EFF6FF", color: "#1E40AF", dot: "#60A5FA" },
    none:       { label: "Connect",     bg: "#F5F3FF", color: "#6D28D9", dot: "#8B5CF6" },
  };
  const s = map[status] || map.none;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.01em",
      padding: "2px 8px", borderRadius: 100,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

/* ── Code snippet block ── */
function SnippetBlock({ snippet, isMine }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(snippet.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      border: `1px solid ${isMine ? "rgba(96,165,250,0.25)" : "#E2E8F0"}`,
      maxWidth: 400, width: "100%", textAlign: "left",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 12px", background: isMine ? "#1E3A5F" : "#1E293B",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Code2 size={11} color="#94A3B8" />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{snippet.lang}</span>
        </div>
        <button onClick={copy} style={{
          fontSize: 10, fontWeight: 700, color: copied ? "#34D399" : "#94A3B8",
          background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        }}>
          {copied ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
        </button>
      </div>
      <pre style={{
        background: "#0F172A", color: "#E2E8F0", fontSize: 11, fontFamily: "monospace",
        padding: "10px 14px", overflowX: "auto", margin: 0,
        lineHeight: 1.6, whiteSpace: "pre", maxHeight: 240,
      }}>{snippet.code}</pre>
    </div>
  );
}

/* ── Attachment card ── */
function AttachmentCard({ url, name }) {
  const ext = (name || url || "").split(".").pop().toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      background: "#F8FAFC", border: "1px solid #E2E8F0",
      borderRadius: 12, padding: "8px 12px", marginTop: 6, maxWidth: 240,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: isImage ? "#DBEAFE" : "#F1F5F9",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {isImage ? <Camera size={16} color="#3B82F6" /> : <FileText size={16} color="#64748B" />}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#1E293B", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
          {name || "Attachment"}
        </p>
        <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>{ext.toUpperCase()}</p>
      </div>
      <a href={url} download target="_blank" rel="noreferrer" style={{ color: "#94A3B8", flexShrink: 0, lineHeight: 0 }}>
        <Download size={14} />
      </a>
    </div>
  );
}

/* ── AI Summary panel ── */
function AISummaryPanel({ messages, activeChat }) {
  const lastMessages = messages.slice(-5);
  const hasContent = lastMessages.length > 0;
  return (
    <div style={{
      background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
      border: "1px solid #DDD6FE", borderRadius: 16, padding: 16, marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: "#7C3AED",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Sparkles size={14} color="white" />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#5B21B6", letterSpacing: "0.03em" }}>AI Summary</span>
      </div>
      {hasContent ? (
        <p style={{ fontSize: 12, color: "#6D28D9", lineHeight: 1.6, margin: 0 }}>
          This conversation with <strong>@{activeChat?.username}</strong> has {messages.length} message{messages.length !== 1 ? "s" : ""}. 
          {messages.some(m => m.image_url) ? " Contains shared images." : ""}
          {messages.some(m => parseSnippet(m.text)) ? " Includes code snippets." : ""}
        </p>
      ) : (
        <p style={{ fontSize: 12, color: "#7C3AED", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
          No messages yet. Start a conversation to see AI insights.
        </p>
      )}
    </div>
  );
}

/* ── Task card ── */
function TaskCard({ task, onToggle, onRename, onAssign, chatUsername }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef(null);

  const commitRename = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.title) onRename(task.id, trimmed);
    else setDraft(task.title);
  };

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 12px", borderRadius: 12,
      background: "#F8FAFC", border: "1px solid #E2E8F0",
      marginBottom: 8, transition: "all 0.15s",
    }}>
      <button onClick={() => onToggle(task.id)} style={{
        width: 18, height: 18, borderRadius: 5, border: `2px solid ${task.done ? "#22C55E" : "#CBD5E1"}`,
        background: task.done ? "#22C55E" : "white", cursor: "pointer", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2,
        transition: "all 0.15s",
      }}>
        {task.done && <Check size={11} color="white" strokeWidth={3} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setEditing(false); setDraft(task.title); } }}
            style={{ width: "100%", fontSize: 13, fontWeight: 500, color: "#1E293B", border: "none", borderBottom: "1.5px solid #6366F1", outline: "none", background: "transparent", padding: "0 0 2px", boxSizing: "border-box" }}
          />
        ) : (
          <p
            onClick={() => { setEditing(true); setDraft(task.title); }}
            title="Click to rename"
            style={{ fontSize: 13, fontWeight: 500, color: task.done ? "#94A3B8" : "#1E293B", margin: 0, textDecoration: task.done ? "line-through" : "none", cursor: "text", wordBreak: "break-word" }}
          >
            {task.title}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
          {task.due && (
            <span style={{ fontSize: 11, color: "#64748B", display: "flex", alignItems: "center", gap: 3 }}>
              <Clock size={10} /> {task.due}
            </span>
          )}
          {task.priority && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 100,
              background: task.priority === "high" ? "#FFF1F2" : "#FFF7ED",
              color: task.priority === "high" ? "#BE123C" : "#C2410C",
            }}>
              {task.priority === "high" ? "🔥 High" : "⚡ Med"}
            </span>
          )}
          {task.assigned_to ? (
            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 100, background: "#EEF2FF", color: "#4F46E5", display: "flex", alignItems: "center", gap: 3 }}>
              <AtSign size={9} /> {chatUsername}
            </span>
          ) : (
            <button
              onClick={() => onAssign(task)}
              style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 100, border: "1px dashed #CBD5E1", background: "transparent", color: "#94A3B8", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, transition: "all 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.color = "#6366F1"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.color = "#94A3B8"; }}
            >
              <AtSign size={9} /> Assign to @{chatUsername}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Vertical nav icon ── */
function NavIcon({ icon: Icon, active, onClick, tooltip }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      style={{
        width: 40, height: 40, borderRadius: 11, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "#EFF6FF" : "transparent",
        color: active ? "#2563EB" : "#94A3B8",
        transition: "all 0.15s",
        marginBottom: 4,
      }}
    >
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function MessagesContent() {
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const { targetChatUser, setTargetChatUser } = useDashboard();
  const onlineUsers = useOnlineUsers();
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessagePreviews, setLastMessagePreviews] = useState({});

  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all");
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
  const [showSnippetPanel, setShowSnippetPanel] = useState(false);
  const [snippetCode, setSnippetCode] = useState("");
  const [snippetLang, setSnippetLang] = useState("javascript");
  const [messageSendError, setMessageSendError] = useState(null);
  const [showRightPanel, setShowRightPanel] = useState(typeof window !== 'undefined' ? window.innerWidth > 1400 : false);
  const [activeNav, setActiveNav] = useState("messages");
  const [tasksByUser, setTasksByUser] = useState({});
  const currentTasks = activeChat ? (tasksByUser[activeChat.id] || []) : [];

  // Load tasks from DB whenever the active chat changes
  useEffect(() => {
    if (!activeChat || !currentUserId) return;
    supabase
      .from('chat_tasks')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('chat_user_id', activeChat.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setTasksByUser(prev => ({ ...prev, [activeChat.id]: data }));
      });
  }, [activeChat?.id, currentUserId]);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const showToast = useCallback((msg, type = "success") => {
    setToastMessage(msg); setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
  }, []);

  const addTask = useCallback(async () => {
    if (!activeChat || !currentUserId) return;
    const { data, error } = await supabase
      .from('chat_tasks')
      .insert({ user_id: currentUserId, chat_user_id: activeChat.id, title: 'New task', priority: 'medium', done: false })
      .select()
      .single();
    if (!error && data) {
      setTasksByUser(prev => ({ ...prev, [activeChat.id]: [...(prev[activeChat.id] || []), data] }));
    }
  }, [activeChat, currentUserId]);

  const toggleTask = useCallback(async (taskId) => {
    if (!activeChat) return;
    setTasksByUser(prev => {
      const list = prev[activeChat.id] || [];
      return { ...prev, [activeChat.id]: list.map(t => t.id === taskId ? { ...t, done: !t.done } : t) };
    });
    const task = (tasksByUser[activeChat.id] || []).find(t => t.id === taskId);
    if (task) await supabase.from('chat_tasks').update({ done: !task.done }).eq('id', taskId);
  }, [activeChat, tasksByUser]);

  const renameTask = useCallback(async (taskId, newTitle) => {
    if (!activeChat) return;
    setTasksByUser(prev => ({
      ...prev,
      [activeChat.id]: (prev[activeChat.id] || []).map(t => t.id === taskId ? { ...t, title: newTitle } : t),
    }));
    await supabase.from('chat_tasks').update({ title: newTitle }).eq('id', taskId);
  }, [activeChat]);

  const assignTask = useCallback(async (task) => {
    if (!activeChat || !currentUserId) return;
    setTasksByUser(prev => ({
      ...prev,
      [activeChat.id]: (prev[activeChat.id] || []).map(t => t.id === task.id ? { ...t, assigned_to: activeChat.id } : t),
    }));
    await supabase.from('chat_tasks').update({ assigned_to: activeChat.id }).eq('id', task.id);

    // Send email notification to the assigned user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      showToast("Task assigned, but couldn't send email — not authenticated.", "error");
      return;
    }

    const [{ data: assigneeProfile, error: assigneeErr }, { data: myProfile }] = await Promise.all([
      supabase.from('profiles').select('email, username').eq('id', activeChat.id).single(),
      supabase.from('profiles').select('username').eq('id', currentUserId).single(),
    ]);

    if (assigneeErr || !assigneeProfile?.email) {
      showToast("Task assigned. Could not find assignee email to notify.", "error");
      return;
    }

    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          type: 'chat_task_assigned',
          email: assigneeProfile.email,
          name: assigneeProfile.username || 'there',
          extra: {
            taskTitle: task.title,
            assignerName: myProfile?.username || 'Someone',
            due: task.due || null,
            priority: task.priority || 'medium',
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(`Task assigned, but email failed: ${body.error || res.status}`, "error");
      } else {
        showToast(`Task assigned — @${assigneeProfile.username} notified by email.`);
      }
    } catch (err) {
      showToast(`Task assigned, but email error: ${err.message}`, "error");
    }
  }, [activeChat, currentUserId, showToast]);

  const forceScrollRef = useRef(false);

  const [mutedChats, setMutedChats] = useState(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("muted_chats") || "[]"); }
      catch { return []; }
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

  const broadcastRef = useRef(null);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth <= 768) setShowRightPanel(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── 1. Contacts ── */
  useEffect(() => {
    let isMounted = true;
    const fetchContacts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      if (isMounted) setCurrentUserId(uid);

      const { data: connections } = await supabase
        .from("connections").select("sender_id, receiver_id")
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

      const connectedIds = (connections || []).map(c => c.sender_id === uid ? c.receiver_id : c.sender_id);

      if (connectedIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles").select("id, username, status, avatar_url, is_verified").in("id", connectedIds);
        if (isMounted) {
          setContacts(profiles || []);
          setActiveChat(prev => {
            if (prev && profiles?.some(p => p.id === prev.id)) return prev;
            return profiles?.length > 0 ? profiles[0] : null;
          });
        }
      } else {
        if (isMounted) { setContacts([]); setActiveChat(null); }
      }
    };
    fetchContacts();
    const channel = supabase.channel("messages-contacts-update")
      .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, fetchContacts)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchContacts)
      .subscribe();
    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (targetChatUser) {
      setActiveChat(targetChatUser);
      setContacts(prev => prev.find(c => c.id === targetChatUser.id) ? prev : [targetChatUser, ...prev]);
      setTargetChatUser(null);
      setIsMobileChatOpen(true);
    }
  }, [targetChatUser, setTargetChatUser]);

  /* ── 2. Unread ── */
  useEffect(() => {
    if (!currentUserId) return;
    const fetchUnreadAndPreviews = async () => {
      const { data } = await supabase.from("messages")
        .select("sender_id, receiver_id, is_read, text, image_url, created_at")
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      const counts = {}, previews = {};
      (data || []).forEach(msg => {
        const otherId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
        if (msg.receiver_id === currentUserId && !msg.is_read && activeChatRef.current?.id !== msg.sender_id)
          counts[otherId] = (counts[otherId] || 0) + 1;
        if (!previews[otherId]) {
          const isSender = msg.sender_id === currentUserId;
          previews[otherId] = { text: (isSender ? "You: " : "") + (msg.text || (msg.image_url ? "📷 Image" : "New message")), isSender, isRead: msg.is_read };
        }
      });
      setUnreadCounts(counts); setLastMessagePreviews(previews);
    };
    fetchUnreadAndPreviews();
    const ch = supabase.channel("messages-unread-update")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${currentUserId}` }, fetchUnreadAndPreviews)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `sender_id=eq.${currentUserId}` }, fetchUnreadAndPreviews)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [currentUserId]);

  /* ── 4. Messages ── */
  const fetchMessages = useCallback(async (chatId, uid) => {
    setIsLoadingMessages(true);
    const { data, error } = await supabase.from("messages")
      .select("*, replied_message:reply_to_message_id(*), message_reactions(id, user_id, emoji)")
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${uid})`)
      .order("created_at", { ascending: true });
    setIsLoadingMessages(false);
    if (error) { showToast("Failed to load messages: " + error.message, "error"); return; }
    setMessages(data || []);
    setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
    await supabase.from("messages").update({ is_read: true }).eq("receiver_id", uid).eq("sender_id", chatId).eq("is_read", false);
  }, [showToast]);

  useEffect(() => {
    if (!activeChat || !currentUserId) return;
    const checkConnection = async () => {
      const { data: conn } = await supabase.from("connections").select("*")
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUserId})`)
        .maybeSingle();
      if (!conn) { setConnectionStatus("none"); setBlockerId(null); setActiveConnectionId(null); setMessages([]); }
      else {
        setActiveConnectionId(conn.id);
        if (conn.status === "blocked") { setConnectionStatus("blocked"); setBlockerId(conn.blocked_by); setMessages([]); }
        else if (conn.status === "pending") { setConnectionStatus(conn.sender_id === currentUserId ? "waiting" : "incoming"); setMessages([]); }
        else { setConnectionStatus("accepted"); setBlockerId(null); fetchMessages(activeChat.id, currentUserId); }
      }
    };
    checkConnection();
    const chId = `chat-${[currentUserId, activeChat.id].sort().join("-")}`;
    channelRef.current = supabase.channel(chId)
      .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, checkConnection)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async payload => {
        const msg = payload.new;
        if (msg.sender_id !== activeChat.id && msg.receiver_id !== activeChat.id) return;
        const { data } = await supabase.from("messages").select("*, replied_message:reply_to_message_id(*), message_reactions(id, user_id, emoji)").eq("id", msg.id).maybeSingle();
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, data || msg]);
        if (msg.receiver_id === currentUserId) await supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, payload => {
        const upd = payload.new;
        if (upd.sender_id !== activeChat.id && upd.receiver_id !== activeChat.id) return;
        setMessages(prev => prev.map(m => m.id === upd.id ? { ...m, is_read: upd.is_read, text: upd.text } : m));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, payload => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        fetchMessages(activeChat.id, currentUserId);
      })
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [activeChat, currentUserId, fetchMessages]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    if (isNearBottom || forceScrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      forceScrollRef.current = false;
    }
  }, [messages, connectionStatus, typingUsers]);

  /* ── 5. Broadcast ── */
  useEffect(() => {
    if (!currentUserId) return;
    broadcastRef.current = supabase.channel(`broadcast-${currentUserId}-${Date.now()}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.targetId !== currentUserId) return;
        setTypingUsers(prev => ({ ...prev, [payload.senderId]: true }));
        if (typingTimeoutsRef.current[payload.senderId]) clearTimeout(typingTimeoutsRef.current[payload.senderId]);
        typingTimeoutsRef.current[payload.senderId] = setTimeout(() => {
          setTypingUsers(prev => ({ ...prev, [payload.senderId]: false }));
        }, 3000);
      }).subscribe();
    return () => { if (broadcastRef.current) supabase.removeChannel(broadcastRef.current); };
  }, [currentUserId]);

  /* ── Connection handlers ── */
  const handleSendRequest = async () => {
    const { error } = await supabase.from("connections").insert({ sender_id: currentUserId, receiver_id: activeChat.id, status: "pending" });
    if (error) {
      if (error.code === "23503") { showToast("This user no longer exists.", "error"); setContacts(p => p.filter(c => c.id !== activeChat.id)); setActiveChat(null); }
      else showToast("Failed to send request: " + error.message, "error");
      return;
    }
    setConnectionStatus("waiting");
    await supabase.from("notifications").insert({ receiver_id: activeChat.id, actor_id: currentUserId, type: "connection_request", content: "wants to connect" });
  };

  const handleAcceptRequest = async () => {
    if (!activeConnectionId) return;
    const { error } = await supabase.from("connections").update({ status: "accepted" }).eq("id", activeConnectionId);
    if (!error) {
      setConnectionStatus("accepted");
      await supabase.from("notifications").insert({ receiver_id: activeChat.id, actor_id: currentUserId, type: "handshake", content: "accepted your connection request" });
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: senderProfile } = await supabase.from('profiles').select('email, username').eq('id', activeChat.id).single();
        const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', currentUserId).single();
        if (session && senderProfile?.email) {
          fetch('/api/notifications/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ type: 'connection_accepted', email: senderProfile.email, name: senderProfile.username || 'there', extra: { acceptorName: myProfile?.username || 'Someone' } }) }).catch(() => {});
        }
      })();
    }
  };

  const handleBlockUser = async () => {
    if (!activeConnectionId || !currentUserId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from("connections").update({ status: "blocked", blocked_by: currentUserId }).eq("id", activeConnectionId);
      if (error) throw error;
      setShowBlockConfirm(false); setShowMoreMenu(false);
    } catch (e) { showToast("Could not block user: " + e.message, "error"); }
    finally { setIsProcessing(false); }
  };

  const handleUnblockUser = async () => {
    if (!activeConnectionId || !currentUserId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from("connections").update({ status: "accepted", blocked_by: null }).eq("id", activeConnectionId).eq("blocked_by", currentUserId);
      if (error) throw error;
      setShowMoreMenu(false);
    } catch (e) { showToast("Could not unblock: " + e.message, "error"); }
    finally { setIsProcessing(false); }
  };

  const handleDeleteMessage = async (msgId) => {
    setDeletingMsgId(msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
    setShowDeleteConfirm(null);
    const { error } = await supabase.from("messages").delete().eq("id", msgId).eq("sender_id", currentUserId);
    if (error) { showToast("Failed to delete message.", "error"); fetchMessages(activeChat.id, currentUserId); }
    setDeletingMsgId(null);
  };

  const handleSuggestReply = async () => {
    if (isSuggesting || !activeChat) return;
    const lastMsg = [...messages].reverse().find(m => m.sender_id === activeChat.id);
    const prompt = lastMsg?.text
      ? `Draft a brief, friendly reply (1-2 sentences) to this message: "${lastMsg.text}". Return ONLY the reply text, no quotes or preamble.`
      : "Draft a friendly one-sentence opening message to start a conversation. Return ONLY the message text.";
    setIsSuggesting(true);
    let attempt = 0;
    while (attempt < 3) {
      try {
        const res = await fetch("/api/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }) });
        const textResponse = await res.text();
        let data;
        try { data = JSON.parse(textResponse); } catch { throw new Error("AI API returned invalid response."); }
        if (!res.ok) throw new Error(data?.error || "Failed to fetch AI response");
        let suggested = "";
        if (typeof data?.message?.content === "string") suggested = data.message.content;
        else if (Array.isArray(data?.message?.content)) suggested = data.message.content.filter(b => b.type === "text").map(b => b.text).join("");
        else if (typeof data?.content === "string") suggested = data.content;
        else if (Array.isArray(data?.content)) suggested = data.content.filter(b => b.type === "text").map(b => b.text).join("");
        setInputValue(suggested.replace(/^["']|["']$/g, "").trim());
        textareaRef.current?.focus();
        break;
      } catch (err) {
        attempt++;
        if (attempt >= 3) showToast("AI suggestion failed: " + err.message, "error");
        else await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    setIsSuggesting(false);
  };

  const handleReaction = async (msgId, emoji) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const existing = msg.message_reactions?.find(r => r.user_id === currentUserId && r.emoji === emoji);
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const reactions = m.message_reactions || [];
      if (existing) return { ...m, message_reactions: reactions.filter(r => r.id !== existing.id) };
      return { ...m, message_reactions: [...reactions, { id: `temp-${Date.now()}`, message_id: msgId, user_id: currentUserId, emoji }] };
    }));
    setEmojiPickerMsgId(null);
    try {
      if (existing) { await supabase.from("message_reactions").delete().eq("id", existing.id); }
      else { const { error } = await supabase.from("message_reactions").insert({ message_id: msgId, user_id: currentUserId, emoji }); if (error) throw error; }
    } catch { showToast("Reaction failed.", "error"); fetchMessages(activeChat.id, currentUserId); }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (!activeChat || !currentUserId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      broadcastRef.current?.send({ type: "broadcast", event: "typing", payload: { targetId: activeChat.id, senderId: currentUserId } });
      lastTypingSentRef.current = now;
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [inputValue]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent?.isComposing) {
      const isTouchDevice = typeof window !== "undefined" && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
      if (isTouchDevice) return;
      e.preventDefault();
      if (inputValue.trim() || imageFile) handleSendMessage(e);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (connectionStatus !== "accepted") return;
    const msgText = inputValue.trim();
    const imageToUpload = imageFile;
    const replyToId = replyingTo?.id;
    if (!msgText && !imageToUpload) return;
    setMessageSendError(null);
    const optimisticId = `opt-${Date.now()}`;
    const optimistic = { id: optimisticId, sender_id: currentUserId, receiver_id: activeChat.id, text: msgText, image_url: imagePreview, replied_message: replyingTo, created_at: new Date().toISOString(), isSending: true, message_reactions: [] };
    forceScrollRef.current = true;
    setMessages(prev => [...prev, optimistic]);
    setLastMessagePreviews(prev => ({ ...prev, [activeChat.id]: { text: `You: ${msgText || (imageToUpload ? "📷 Image" : "New message")}`, isSender: true, isRead: false } }));
    setInputValue(""); setImageFile(null); setImagePreview(null); setReplyingTo(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    try {
      let imageUrl = null;
      if (imageToUpload) {
        const ext = imageToUpload.name.split(".").pop();
        const path = `${currentUserId}/msg-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat_images").upload(path, imageToUpload);
        if (upErr) throw new Error("Image upload failed: " + upErr.message);
        const { data: urlData } = supabase.storage.from("chat_images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const { data: inserted, error } = await supabase.from("messages").insert({ sender_id: currentUserId, receiver_id: activeChat.id, text: msgText || "", image_url: imageUrl, reply_to_message_id: replyToId }).select().single();
      if (error) throw error;
      setMessages(prev => {
        if (prev.some(m => m.id === inserted.id && !m.isSending)) return prev.filter(m => m.id !== optimisticId);
        return prev.map(m => m.id === optimisticId ? { ...m, ...inserted, image_url: imageUrl || m.image_url, isSending: false } : m);
      });
      await supabase.from("notifications").insert({ receiver_id: activeChat.id, actor_id: currentUserId, type: "message", content: msgText ? (msgText.length > 100 ? msgText.slice(0, 100) + "…" : msgText) : "Sent an image" });
      notifyRecipient();
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setMessageSendError(err.message);
      showToast("Failed to send: " + err.message, "error");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast("Image must be under 10MB.", "error"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const toggleMute = (contactId) => {
    setMutedChats(prev => {
      const next = prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId];
      localStorage.setItem("muted_chats", JSON.stringify(next));
      return next;
    });
  };

  const copyMessage = (text) => { navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard")); };

  const notifyRecipient = useCallback(async () => {
    if (!activeChat || !currentUserId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    fetch('/api/messages/notify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ receiver_id: activeChat.id }) }).catch(() => {});
  }, [activeChat, currentUserId]);

  const sendSnippet = useCallback(async () => {
    if (!snippetCode.trim() || connectionStatus !== "accepted" || !currentUserId || !activeChat) return;
    const encoded = JSON.stringify({ __snippet: true, lang: snippetLang, code: snippetCode });
    setShowSnippetPanel(false); setSnippetCode(""); setSnippetLang("javascript");
    const optimisticId = `opt-${Date.now()}`;
    forceScrollRef.current = true;
    setMessages(prev => [...prev, { id: optimisticId, sender_id: currentUserId, receiver_id: activeChat.id, text: encoded, image_url: null, replied_message: null, created_at: new Date().toISOString(), isSending: true, message_reactions: [] }]);
    try {
      const { data: inserted, error } = await supabase.from('messages').insert({ sender_id: currentUserId, receiver_id: activeChat.id, text: encoded }).select().single();
      if (error) throw error;
      setMessages(prev => {
        if (prev.some(m => m.id === inserted.id && !m.isSending)) return prev.filter(m => m.id !== optimisticId);
        return prev.map(m => m.id === optimisticId ? { ...m, ...inserted, isSending: false } : m);
      });
      notifyRecipient();
    } catch (err) { setMessages(prev => prev.filter(m => m.id !== optimisticId)); showToast("Failed to send snippet: " + err.message, "error"); }
  }, [snippetCode, snippetLang, connectionStatus, currentUserId, activeChat, notifyRecipient, showToast]);

  const handlePaste = useCallback((e) => {
    const pasted = e.clipboardData?.getData('text') || '';
    if (pasted.length > 500 && connectionStatus === "accepted") { e.preventDefault(); setSnippetCode(pasted); setShowSnippetPanel(true); }
  }, [connectionStatus]);

  const hasAnyUnread = Object.values(unreadCounts).some(n => n > 0);
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const filteredContacts = contacts.filter(c => {
    const matchSearch = c.username.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterTab === "unread") return matchSearch && (unreadCounts[c.id] || 0) > 0;
    return matchSearch;
  });

  /* ── Loading ── */
  if (!currentUserId) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#F8FAFC" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Loader2 size={28} color="#6366F1" className="animate-spin" />
          <p style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase" }}>Connecting…</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <>
      {/* Global styles */}
      <style>{`
        .msg-hover-actions { opacity: 0; pointer-events: none; transition: opacity 0.15s; }
        .msg-row:hover .msg-hover-actions { opacity: 1; pointer-events: all; }
        .contact-card:hover { background: #F8FAFC !important; }
        .contact-card.active { background: #EFF6FF !important; }
        .nav-icon:hover { background: #F1F5F9 !important; color: #475569 !important; }
        .composer-area:focus-within { border-color: #6366F1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.08) !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 100px; }
        ::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .slide-up { animation: slideUp 0.2s ease; }
        .fade-in { animation: fadeIn 0.15s ease; }
      `}</style>

      {/* ── LIGHTBOX ── */}
      {lightboxImage && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setLightboxImage(null)}>
          <button style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white", zIndex: 10 }}>
            <X size={20} />
          </button>
          <a href={lightboxImage} download style={{ position: "absolute", top: 20, right: 72, background: "rgba(255,255,255,0.1)", borderRadius: 10, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: "white", zIndex: 10 }} onClick={e => e.stopPropagation()}>
            <Download size={18} />
          </a>
          <div style={{ position: "relative", maxWidth: 900, maxHeight: "88vh", width: "100%", height: "80vh" }}>
            <Image src={lightboxImage} alt="Full size" fill sizes="100vw" style={{ objectFit: "contain" }} />
          </div>
        </div>
      )}

      {/* ── BLOCK CONFIRM ── */}
      {showBlockConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="slide-up" style={{ background: "white", borderRadius: 20, padding: 32, maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
            <div style={{ width: 56, height: 56, background: "#FFF7ED", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <ShieldAlert size={24} color="#F97316" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>Block @{activeChat?.username}?</h3>
            <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 24px", lineHeight: 1.6 }}>They won't be able to message you. You can unblock anytime.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowBlockConfirm(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1.5px solid #E2E8F0", background: "white", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleBlockUser} disabled={isProcessing} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: "#F97316", fontSize: 13, fontWeight: 700, color: "white", cursor: "pointer", opacity: isProcessing ? 0.6 : 1 }}>
                {isProcessing ? "Blocking…" : "Block User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="slide-up" style={{ background: "white", borderRadius: 18, padding: 24, maxWidth: 320, width: "100%", textAlign: "center", boxShadow: "0 16px 50px rgba(0,0,0,0.1)" }}>
            <Trash2 size={22} color="#EF4444" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", margin: "0 0 6px" }}>Delete message?</p>
            <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 20px" }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowDeleteConfirm(null)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "white", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleDeleteMessage(showDeleteConfirm)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: "#EF4444", fontSize: 13, fontWeight: 700, color: "white", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE MODAL ── */}
      {selectedUserId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }} onClick={() => setSelectedUserId(null)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 900, maxHeight: "90vh", overflowY: "auto", zIndex: 10, background: "white", borderRadius: 24, border: "1px solid #F1F5F9", boxShadow: "0 24px 80px rgba(0,0,0,0.12)" }}>
            <button onClick={() => setSelectedUserId(null)} style={{ position: "absolute", top: 16, right: 16, zIndex: 10, width: 32, height: 32, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}>
              <X size={16} />
            </button>
            <div style={{ padding: "20px 24px" }}>
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MAIN LAYOUT
      ══════════════════════════════════════════════════════ */}
      <div style={{ 
        display: "flex", 
        height: "100%", 
        background: "#F8FAFC", 
        overflow: "hidden", 
        fontFamily: "'Inter', -apple-system, sans-serif",
        position: "relative" 
      }}>

        {/* Narrow icon nav removed for responsive layout */}

        {/* ── INBOX PANEL ── */}
        <div style={{
          width: 'clamp(280px,24vw,340px)', display: isMobileChatOpen ? "none" : "flex", flexDirection: "column",
          background: "white", borderRight: "1px solid #F1F5F9", flexShrink: 0,
          // Show on md+
        }} className="md:flex">
          {/* Inbox header */}
          <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", margin: 0 }}>Inbox</h2>
              {hasAnyUnread && (
                <span style={{ fontSize: 11, fontWeight: 700, background: "#6366F1", color: "white", padding: "2px 8px", borderRadius: 100 }}>{totalUnread}</span>
              )}
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <Search size={13} color="#94A3B8" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                style={{ width: "100%", background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 10, padding: "7px 28px 7px 30px", fontSize: 12, color: "#334155", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", lineHeight: 0 }}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 4 }}>
              {[["all", "All"], ["unread", "Unread"]].map(([val, label]) => (
                <button key={val} onClick={() => setFilterTab(val)} style={{
                  flex: 1, padding: "5px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                  background: filterTab === val ? "#EEF2FF" : "transparent",
                  color: filterTab === val ? "#4F46E5" : "#94A3B8",
                  transition: "all 0.15s",
                }}>
                  {label}
                  {label === "Unread" && hasAnyUnread && <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#6366F1", marginLeft: 4, verticalAlign: "middle" }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Contact list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
            {filteredContacts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <MessageSquare size={28} color="#E2E8F0" style={{ margin: "0 auto 10px" }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>
                  {filterTab === "unread" ? "No unread messages" : searchQuery ? `No results for "${searchQuery}"` : "No conversations yet"}
                </p>
                {filterTab === "unread" && (
                  <button onClick={() => setFilterTab("all")} style={{ fontSize: 12, color: "#6366F1", fontWeight: 600, background: "none", border: "none", cursor: "pointer", marginTop: 6 }}>Show all</button>
                )}
              </div>
            ) : filteredContacts.map((contact, i) => {
              const isActive = activeChat?.id === contact.id;
              const isOnline = onlineUsers.has(contact.id);
              const unread = unreadCounts[contact.id] || 0;
              const preview = lastMessagePreviews[contact.id];
              const isTyping = typingUsers[contact.id];
              const isMuted = mutedChats.includes(contact.id);

              return (
                <div key={contact.id}
                  className={`contact-card${isActive ? " active" : ""}`}
                  onClick={() => { setActiveChat(contact); setShowMoreMenu(false); setIsMobileChatOpen(true); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px", cursor: "pointer",
                    borderRadius: 12, marginBottom: 2, transition: "background 0.12s",
                    background: isActive ? "#EFF6FF" : "transparent",
                    animation: `slideUp 0.2s ease ${i * 25}ms both`,
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, overflow: "hidden", position: "relative", cursor: "pointer", border: isActive ? "2px solid #BFDBFE" : "2px solid transparent" }}
                      onClick={e => { e.stopPropagation(); setSelectedUserId(contact.id); }}>
                      {contact.avatar_url ? (
                        <Image src={contact.avatar_url} alt="" fill sizes="40px" style={{ objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: isActive ? "#DBEAFE" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: isActive ? "#2563EB" : "#64748B" }}>
                          {contact.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    {isOnline && <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, background: "#22C55E", borderRadius: "50%", border: "2px solid white" }} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? "#1D4ED8" : "#1E293B", display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {contact.username}
                        {contact.is_verified && <BadgeCheck size={12} color="#3B82F6" fill="#3B82F6" stroke="white" strokeWidth={2} />}
                        {isMuted && <BellOff size={10} color="#94A3B8" />}
                      </span>
                      {unread > 0 && <span style={{ fontSize: 10, fontWeight: 800, background: "#6366F1", color: "white", padding: "1px 6px", borderRadius: 100, flexShrink: 0 }}>{unread}</span>}
                    </div>
                    <p style={{ fontSize: 11.5, color: isTyping ? "#6366F1" : unread > 0 ? "#334155" : "#94A3B8", fontWeight: isTyping || unread > 0 ? 500 : 400, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: isTyping ? "italic" : "normal" }}>
                      {isTyping ? "typing…" : preview?.text || (isOnline ? "Online" : "Start a conversation")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            MAIN CHAT AREA
        ══════════════════════════════════════════════ */}
        <div style={{ flex: 1, display: isMobileChatOpen || contacts.length > 0 ? "flex" : "flex", flexDirection: "column", minWidth: 0, minHeight: 0, background: "#F8FAFC", position: "relative" }}>

          {activeChat ? (
            <>
              {/* ── Chat header ── */}
              <div style={{
                padding: "14px 20px", background: "white", borderBottom: "1px solid #F1F5F9",
                display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, zIndex: 5,
                boxShadow: "0 1px 0 #F1F5F9",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <button onClick={() => setIsMobileChatOpen(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 4, lineHeight: 0, display: "flex" }}
                    className="md:hidden">
                    <ChevronLeft size={20} />
                  </button>

                  <div style={{ position: "relative", width: 36, height: 36, borderRadius: 10, overflow: "hidden", flexShrink: 0, cursor: "pointer" }}
                    onClick={() => setSelectedUserId(activeChat.id)}>
                    {activeChat.avatar_url ? (
                      <Image src={activeChat.avatar_url} alt="" fill sizes="36px" style={{ objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#7C3AED" }}>
                        {activeChat.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div style={{ cursor: "pointer", minWidth: 0 }} onClick={() => setSelectedUserId(activeChat.id)}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{activeChat.username}</span>
                      {activeChat.is_verified && <BadgeCheck size={14} color="#6366F1" fill="#6366F1" stroke="white" strokeWidth={2} />}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: connectionStatus === "blocked" ? "#EF4444" : onlineUsers.has(activeChat.id) ? "#22C55E" : "#CBD5E1" }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>
                        {connectionStatus === "blocked" ? "Blocked" : onlineUsers.has(activeChat.id) ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginLeft: 8 }}>
                    <StatusBadge status={connectionStatus || "none"} />
                  </div>
                </div>

                {/* Header right actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => setShowRightPanel(p => !p)} style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #F1F5F9", background: showRightPanel ? "#EEF2FF" : "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: showRightPanel ? "#6366F1" : "#64748B", transition: "all 0.15s" }} title="Toggle panel">
                    {showRightPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                  </button>

                  <div style={{ position: "relative" }} ref={moreMenuRef}>
                    <button onClick={() => setShowMoreMenu(p => !p)} style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #F1F5F9", background: showMoreMenu ? "#F8FAFC" : "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748B", transition: "all 0.15s" }}>
                      <MoreHorizontal size={16} />
                    </button>
                    {showMoreMenu && (
                      <div className="slide-up" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 200, background: "white", border: "1px solid #F1F5F9", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", zIndex: 50, padding: "6px 0", overflow: "hidden" }}>
                        {[
                          { label: "View Profile", icon: Users, action: () => { setSelectedUserId(activeChat.id); setShowMoreMenu(false); } },
                          { label: mutedChats.includes(activeChat.id) ? "Unmute" : "Mute", icon: mutedChats.includes(activeChat.id) ? Bell : BellOff, action: () => { toggleMute(activeChat.id); setShowMoreMenu(false); } },
                        ].map(item => (
                          <button key={item.label} onClick={item.action} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#334155", textAlign: "left", transition: "background 0.1s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                            <item.icon size={14} /> {item.label}
                          </button>
                        ))}
                        <div style={{ borderTop: "1px solid #F1F5F9", margin: "4px 0" }} />
                        {connectionStatus === "blocked" && blockerId === currentUserId ? (
                          <button onClick={handleUnblockUser} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#16A34A", textAlign: "left" }}>
                            <ShieldCheck size={14} /> Unblock User
                          </button>
                        ) : (
                          <button onClick={() => { setShowBlockConfirm(true); setShowMoreMenu(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#F97316", textAlign: "left" }}>
                            <ShieldAlert size={14} /> Block User
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Body: messages + side panel ── */}
              <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
              {/* ── Message area ── */}
              <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>

                {isLoadingMessages && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                    <Loader2 size={22} color="#6366F1" className="animate-spin" />
                  </div>
                )}

                {connectionStatus === "accepted" ? (
                  <>
                    {messages.map((msg, idx) => {
                      const isMine = msg.sender_id === currentUserId;
                      const reactionsByEmoji = (msg.message_reactions || []).reduce((acc, r) => { acc[r.emoji] = acc[r.emoji] || []; acc[r.emoji].push(r); return acc; }, {});
                      const isHovered = hoveredMsgId === msg.id;
                      const prevMsg = messages[idx - 1];
                      const sameAsPrev = prevMsg?.sender_id === msg.sender_id;
                      const snip = parseSnippet(msg.text);

                      return (
                        <div key={msg.id} className="msg-row" style={{ display: "flex", gap: 8, justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: sameAsPrev ? 2 : 10, padding: "0 0", position: "relative" }}
                          onMouseEnter={() => setHoveredMsgId(msg.id)}
                          onMouseLeave={() => setHoveredMsgId(null)}>

                          {/* Avatar */}
                          {!isMine && (
                            <div style={{ width: 30, height: 30, borderRadius: 10, overflow: "hidden", flexShrink: 0, alignSelf: "flex-end", marginBottom: 2, cursor: "pointer", opacity: sameAsPrev ? 0 : 1, pointerEvents: sameAsPrev ? "none" : "auto", position: "relative" }}
                              onClick={() => setSelectedUserId(activeChat.id)}>
                              {activeChat.avatar_url ? (
                                <Image src={activeChat.avatar_url} alt="" fill sizes="30px" style={{ objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: "100%", height: "100%", background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#7C3AED" }}>
                                  {activeChat.username[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                          )}

                          <div style={{ display: "flex", flexDirection: "column", maxWidth: "min(700px,85%)", alignItems: isMine ? "flex-end" : "flex-start" }}>
                            {/* Reply preview */}
                            {msg.replied_message && (
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4, padding: "6px 10px", borderRadius: 10, background: isMine ? "rgba(99,102,241,0.06)" : "#F8FAFC", border: `1px solid ${isMine ? "rgba(99,102,241,0.12)" : "#F1F5F9"}`, maxWidth: "100%" }}>
                                <CornerUpLeft size={11} color="#94A3B8" style={{ flexShrink: 0, marginTop: 1 }} />
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: "#6366F1", margin: "0 0 1px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    @{msg.replied_message.sender_id === currentUserId ? "You" : activeChat.username}
                                  </p>
                                  <p style={{ fontSize: 11.5, color: "#64748B", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {msg.replied_message.text || "📷 Image"}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Bubble */}
                            <div style={{
                              position: "relative",
                              background: snip ? "transparent" : (!msg.text && msg.image_url) ? "transparent" : isMine ? "#4F46E5" : "white",
                              color: isMine && !snip ? "white" : "#1E293B",
                              borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                              border: snip ? "none" : (!msg.text && msg.image_url) ? "none" : isMine ? "none" : "1px solid #F1F5F9",
                              boxShadow: snip || (!msg.text && msg.image_url) ? "none" : isMine ? "0 2px 12px rgba(79,70,229,0.2)" : "0 1px 4px rgba(0,0,0,0.04)",
                              opacity: msg.isSending ? 0.65 : 1,
                              transition: "opacity 0.2s",
                            }}>
                              {msg.image_url && (
                                <div style={{ position: "relative", width: 220, aspectRatio: "4/3", borderRadius: 14, overflow: "hidden", cursor: "zoom-in", background: "#F1F5F9", margin: msg.text ? "0 0 4px 0" : 0 }}
                                  onClick={() => setLightboxImage(msg.image_url)}>
                                  <Image src={msg.image_url} alt="attachment" fill sizes="220px" style={{ objectFit: "cover" }} />
                                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", transition: "background 0.15s" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.08)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0)"}>
                                    <ZoomIn size={18} color="white" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0 }} />
                                  </div>
                                </div>
                              )}
                              {msg.text && (snip ? <SnippetBlock snippet={snip} isMine={isMine} /> : (
                                <p style={{ padding: "10px 14px", margin: 0, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.text}</p>
                              ))}

                              {/* Floating action bar */}
                              <div className="msg-hover-actions" style={{
                                position: "absolute", top: "50%", transform: "translateY(-50%)",
                                [isMine ? "right" : "left"]: "calc(100% + 6px)",
                                display: "flex", alignItems: "center", gap: 2,
                                background: "white", border: "1px solid #F1F5F9", borderRadius: 10,
                                boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "3px 4px", zIndex: 20,
                              }}>
                                <div style={{ position: "relative" }}>
                                  <button onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: emojiPickerMsgId === msg.id ? "#FFF7ED" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", transition: "all 0.12s" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#FFF7ED"; e.currentTarget.style.color = "#F97316"; }}
                                    onMouseLeave={e => { if (emojiPickerMsgId !== msg.id) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#94A3B8"; } }}>
                                    <Smile size={14} />
                                  </button>
                                  {emojiPickerMsgId === msg.id && (
                                    <div className="slide-up" style={{ position: "absolute", [isMine ? "right" : "left"]: 0, bottom: "calc(100% + 6px)", display: "flex", gap: 6, background: "white", border: "1px solid #F1F5F9", borderRadius: 100, padding: "6px 10px", boxShadow: "0 8px 28px rgba(0,0,0,0.1)", zIndex: 100, whiteSpace: "nowrap" }}>
                                      {QUICK_EMOJIS.map(e => (
                                        <button key={e} onClick={() => handleReaction(msg.id, e)} style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", padding: "0 2px", transition: "transform 0.1s", lineHeight: 1 }}
                                          onMouseEnter={el => el.currentTarget.style.transform = "scale(1.3) translateY(-2px)"}
                                          onMouseLeave={el => el.currentTarget.style.transform = "scale(1)"}>
                                          {e}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button onClick={() => setReplyingTo(msg)} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", transition: "all 0.12s" }}
                                  onMouseEnter={e => { e.currentTarget.style.background = "#EFF6FF"; e.currentTarget.style.color = "#3B82F6"; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#94A3B8"; }}>
                                  <Reply size={14} />
                                </button>
                                {msg.text && (
                                  <button onClick={() => { const s = parseSnippet(msg.text); copyMessage(s ? s.code : msg.text); }} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", transition: "all 0.12s" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.color = "#475569"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#94A3B8"; }}>
                                    <Copy size={14} />
                                  </button>
                                )}
                                {isMine && (
                                  <button onClick={() => setShowDeleteConfirm(msg.id)} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", transition: "all 0.12s" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#FFF1F2"; e.currentTarget.style.color = "#EF4444"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#94A3B8"; }}>
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Reactions */}
                            {Object.keys(reactionsByEmoji).length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, justifyContent: isMine ? "flex-end" : "flex-start" }}>
                                {Object.entries(reactionsByEmoji).map(([emoji, reactors]) => {
                                  const myReaction = reactors.find(r => r.user_id === currentUserId);
                                  return (
                                    <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 600, padding: "2px 7px", borderRadius: 100, border: `1.5px solid ${myReaction ? "#6366F1" : "#F1F5F9"}`, background: myReaction ? "#EEF2FF" : "white", color: myReaction ? "#4F46E5" : "#64748B", cursor: "pointer", transition: "all 0.12s" }}>
                                      <span>{emoji}</span>
                                      {reactors.length > 1 && <span>{reactors.length}</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Timestamp & receipt */}
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, flexDirection: isMine ? "row-reverse" : "row" }}>
                              <span style={{ fontSize: 10.5, color: "#CBD5E1" }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {isMine && (
                                msg.isSending ? <Clock size={10} color="#CBD5E1" /> :
                                msg.is_read ? <><CheckCheck size={10} color="#6366F1" /><span style={{ fontSize: 10, color: "#6366F1", fontWeight: 600 }}>Seen</span></> :
                                <Check size={10} color="#CBD5E1" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing */}
                    {typingUsers[activeChat.id] && (
                      <div className="fade-in" style={{ display: "flex", gap: 8, justifyContent: "flex-start", marginBottom: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 10, overflow: "hidden", flexShrink: 0, position: "relative" }}>
                          {activeChat.avatar_url ? (
                            <Image src={activeChat.avatar_url} alt="" fill sizes="30px" style={{ objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#7C3AED" }}>
                              {activeChat.username[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div style={{ background: "white", border: "1px solid #F1F5F9", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            {[0, 150, 300].map(delay => (
                              <span key={delay} style={{ width: 7, height: 7, borderRadius: "50%", background: "#CBD5E1", display: "inline-block", animation: `bounce 1.2s ${delay}ms infinite` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Connection states */
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32, minHeight: "60%" }}>
                    {connectionStatus === "blocked" ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 60, height: 60, background: "#FFF1F2", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <ShieldAlert size={26} color="#F43F5E" />
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", margin: 0 }}>Connection blocked</p>
                        {blockerId === currentUserId ? (
                          <button onClick={handleUnblockUser} style={{ fontSize: 13, color: "#6366F1", fontWeight: 600, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                            Unblock @{activeChat.username}
                          </button>
                        ) : (
                          <p style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic", margin: 0 }}>You've been blocked by this user.</p>
                        )}
                      </div>
                    ) : connectionStatus === "none" ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 64, height: 64, background: "#F5F3FF", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <UserPlus size={28} color="#7C3AED" />
                        </div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", margin: "0 0 6px" }}>No connection yet</p>
                          <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>Send a request to start chatting.</p>
                        </div>
                        <button onClick={handleSendRequest} style={{ padding: "11px 28px", borderRadius: 12, background: "#6366F1", color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.3)", transition: "all 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#4F46E5"}
                          onMouseLeave={e => e.currentTarget.style.background = "#6366F1"}>
                          Send Connection Request
                        </button>
                      </div>
                    ) : connectionStatus === "waiting" ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 60, height: 60, background: "#F8FAFC", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Send size={24} color="#94A3B8" className="animate-pulse" />
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", margin: 0 }}>Request sent</p>
                        <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>Waiting for @{activeChat.username} to accept…</p>
                      </div>
                    ) : connectionStatus === "incoming" ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 64, height: 64, background: "#F0FDF4", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <UserPlus size={28} color="#22C55E" />
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", margin: 0 }}>@{activeChat.username} wants to connect</p>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={handleAcceptRequest} style={{ padding: "10px 22px", borderRadius: 11, background: "#22C55E", color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(34,197,94,0.25)" }}>
                            <Check size={14} /> Accept
                          </button>
                          <button onClick={() => { supabase.from("connections").delete().eq("id", activeConnectionId); setConnectionStatus("none"); }}
                            style={{ padding: "10px 22px", borderRadius: 11, background: "white", border: "1.5px solid #E2E8F0", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#FFF1F2"; e.currentTarget.style.borderColor = "#FECDD3"; e.currentTarget.style.color = "#EF4444"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#475569"; }}>
                            Decline
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* ── Right panel (shares height with messages only) ── */}
              {showRightPanel && (
                <div
                  className="right-ai-panel slide-up"
                  style={{ display: "flex", flexDirection: "column", background: "white", borderLeft: "1px solid #F1F5F9", flexShrink: 0, overflowY: "auto", padding: "16px 14px" }}
                >
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <button onClick={() => setShowRightPanel(false)} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 6, cursor: "pointer", color: "#64748B" }}>
                      <X size={16} />
                    </button>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "#F8FAFC", borderRadius: 14, border: "1px solid #F1F5F9", cursor: "pointer" }} onClick={() => setSelectedUserId(activeChat.id)}>
                      <div style={{ position: "relative", width: 40, height: 40, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
                        {activeChat.avatar_url ? (
                          <Image src={activeChat.avatar_url} alt="" fill sizes="40px" style={{ objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#7C3AED" }}>
                            {activeChat.username[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          @{activeChat.username}
                          {activeChat.is_verified && <BadgeCheck size={12} color="#6366F1" fill="#6366F1" stroke="white" strokeWidth={2} />}
                        </p>
                        <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>{activeChat.status || "Member"}</p>
                      </div>
                      <ArrowRight size={13} color="#CBD5E1" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Thread Info</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[
                        { label: "Status", value: <StatusBadge status={connectionStatus || "none"} /> },
                        { label: "Messages", value: <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{messages.length}</span> },
                        { label: "Online", value: <span style={{ fontSize: 12, fontWeight: 600, color: onlineUsers.has(activeChat.id) ? "#22C55E" : "#94A3B8" }}>{onlineUsers.has(activeChat.id) ? "Yes" : "No"}</span> },
                      ].map(row => (
                        <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F8FAFC" }}>
                          <span style={{ fontSize: 12, color: "#94A3B8" }}>{row.label}</span>
                          {row.value}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>AI Summary</p>
                    <AISummaryPanel messages={messages} activeChat={activeChat} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Tasks</p>
                      <button
                        onClick={addTask}
                        style={{ fontSize: 11, fontWeight: 600, color: "#6366F1", background: "none", border: "none", cursor: "pointer" }}>
                        + Add
                      </button>
                    </div>
                    {currentTasks.length === 0 && (
                      <p style={{ fontSize: 12, color: "#CBD5E1", textAlign: "center", padding: "12px 0", margin: 0 }}>No tasks yet for this chat.</p>
                    )}
                    {currentTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggle={toggleTask}
                        onRename={renameTask}
                        onAssign={assignTask}
                        chatUsername={activeChat?.username}
                      />
                    ))}
                  </div>
                </div>
              )}
              </div>{/* end body row */}

              {/* ── Composer ── */}
              <div style={{
                padding: "12px 16px 14px", background: "white", borderTop: "1px solid #F1F5F9", flexShrink: 0,
                opacity: connectionStatus === "accepted" ? 1 : 0.4,
                pointerEvents: connectionStatus === "accepted" ? "auto" : "none",
                transition: "opacity 0.2s",
              }}>
                {/* Reply banner */}
                {replyingTo && (
                  <div className="slide-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#EEF2FF", border: "1px solid #C7D2FE", borderBottom: "none", borderRadius: "12px 12px 0 0", padding: "8px 12px", marginBottom: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <CornerUpLeft size={12} color="#6366F1" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#4F46E5" }}>@{replyingTo.sender_id === currentUserId ? "You" : activeChat.username}</span>
                      <span style={{ fontSize: 12, color: "#818CF8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyingTo.text || "📷 Image"}</span>
                    </div>
                    <button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#818CF8", lineHeight: 0 }}>
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* Image preview */}
                {imagePreview && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8FAFC", border: "1px solid #F1F5F9", borderBottom: "none", borderRadius: replyingTo ? 0 : "12px 12px 0 0", padding: "8px 12px" }}>
                    <div style={{ position: "relative", width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid #E2E8F0" }}>
                      <Image src={imagePreview} alt="preview" fill sizes="48px" style={{ objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#334155", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{imageFile?.name}</p>
                      <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>{imageFile ? `${(imageFile.size / 1024).toFixed(0)} KB` : ""}</p>
                    </div>
                    <button onClick={() => { setImageFile(null); setImagePreview(null); if (imageInputRef.current) imageInputRef.current.value = ""; }} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", lineHeight: 0 }}>
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* Error */}
                {messageSendError && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 10, padding: "7px 10px", marginBottom: 8, fontSize: 12, color: "#BE123C" }}>
                    <AlertTriangle size={13} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{messageSendError}</span>
                    <button onClick={() => setMessageSendError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#BE123C", lineHeight: 0 }}><X size={12} /></button>
                  </div>
                )}

                {/* Main composer box */}
                <form onSubmit={handleSendMessage} className="composer-area" style={{
                  background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: replyingTo || imagePreview ? "0 0 14px 14px" : 14,
                  borderTop: replyingTo || imagePreview ? "none" : undefined, transition: "border-color 0.15s, box-shadow 0.15s", overflow: "hidden",
                }}>
                  <input type="file" ref={imageInputRef} onChange={handleFileChange} accept="image/*" style={{ display: "none" }} />

                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "10px 12px 6px" }}>
                    <textarea
                      ref={textareaRef} value={inputValue} onChange={handleInputChange}
                      onKeyDown={handleKeyDown} onPaste={handlePaste}
                      placeholder="Type a message…" rows={1}
                      style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 14, color: "#1E293B", lineHeight: 1.55, maxHeight: 120, fontFamily: "inherit", paddingTop: 2 }}
                    />
                    <button type="submit" disabled={!inputValue.trim() && !imageFile} style={{
                      width: 36, height: 36, borderRadius: 10, background: "#4F46E5", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      boxShadow: "0 2px 8px rgba(79,70,229,0.25)", transition: "all 0.15s", marginBottom: 2,
                      opacity: (!inputValue.trim() && !imageFile) ? 0.35 : 1,
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "#4338CA"}
                      onMouseLeave={e => e.currentTarget.style.background = "#4F46E5"}>
                      <Send size={15} color="white" strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Action row */}
                  <div style={{ display: "flex", alignItems: "center", padding: "0 8px 8px", gap: 2 }}>
                    {[
                      { icon: Paperclip, label: "Attach", title: "Attach image", action: () => imageInputRef.current?.click(), color: "#64748B", hoverBg: "#EEF2FF", hoverColor: "#4F46E5" },
                      { icon: isSuggesting ? Loader2 : Sparkles, label: isSuggesting ? "Thinking…" : "AI Reply", title: "AI suggest reply", action: handleSuggestReply, color: "#64748B", hoverBg: "#F5F3FF", hoverColor: "#7C3AED", spin: isSuggesting },
                      { icon: Code2, label: "Snippet", title: "Send code snippet", action: () => setShowSnippetPanel(p => !p), color: showSnippetPanel ? "#7C3AED" : "#64748B", hoverBg: "#F5F3FF", hoverColor: "#7C3AED" },
                    ].map(btn => (
                      <button key={btn.label} type="button" onClick={btn.action} title={btn.title}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 9px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 500, color: btn.color, transition: "all 0.12s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = btn.hoverBg; e.currentTarget.style.color = btn.hoverColor; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = btn.color; }}>
                        <btn.icon size={14} className={btn.spin ? "animate-spin" : ""} />
                        <span style={{ display: "none" }} className="sm:inline">{btn.label}</span>
                      </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    {inputValue.length > 0 && (
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: inputValue.length > 500 ? "#EF4444" : "#CBD5E1", paddingRight: 4 }}>{inputValue.length}</span>
                    )}
                    <span style={{ fontSize: 11, color: "#E2E8F0", fontWeight: 500 }}>⏎ send</span>
                  </div>
                </form>

                {/* Snippet panel */}
                {showSnippetPanel && (
                  <div className="slide-up" style={{ marginTop: 8, border: "1.5px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Code2 size={13} color="#7C3AED" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>Code / Long Text</span>
                      </div>
                      <select value={snippetLang} onChange={e => setSnippetLang(e.target.value)} style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 7, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#334155", outline: "none" }}>
                        {SNIPPET_LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <textarea value={snippetCode} onChange={e => setSnippetCode(e.target.value)} autoFocus rows={6}
                      placeholder="// paste or type code here…"
                      style={{ width: "100%", background: "#0F172A", color: "#E2E8F0", fontSize: 12, fontFamily: "monospace", padding: "10px 14px", resize: "vertical", outline: "none", border: "none", minHeight: 120, maxHeight: 300, boxSizing: "border-box", display: "block" }}
                    />
                    <div style={{ display: "flex", gap: 8, padding: 10, background: "#F8FAFC", borderTop: "1px solid #F1F5F9" }}>
                      <button type="button" onClick={sendSnippet} disabled={!snippetCode.trim()} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 9, background: "#7C3AED", color: "white", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", opacity: !snippetCode.trim() ? 0.4 : 1, transition: "all 0.15s" }}>
                        <Send size={11} /> Send
                      </button>
                      <button type="button" onClick={() => { setShowSnippetPanel(false); setSnippetCode(""); }} style={{ padding: "7px 14px", borderRadius: 9, background: "none", border: "none", color: "#64748B", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center" }}>
              <div style={{ width: 60, height: 60, background: "#F1F5F9", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={28} color="#CBD5E1" />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#64748B", margin: "0 0 6px" }}>No conversation selected</p>
                <p style={{ fontSize: 13, color: "#CBD5E1", margin: 0 }}>Choose a contact from the sidebar</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── TOAST ── */}
      {toastMessage && (
        <div className="slide-up" style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 300,
          display: "flex", alignItems: "center", gap: 10,
          background: "white", border: `1px solid ${toastType === "error" ? "#FECDD3" : "#BBF7D0"}`,
          padding: "10px 16px", borderRadius: 14, boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
          maxWidth: 360,
        }}>
          {toastType === "error"
            ? <AlertTriangle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
            : <Check size={15} color="#22C55E" style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: toastType === "error" ? "#BE123C" : "#15803D", flex: 1 }}>{toastMessage}</span>
          <button onClick={() => setToastMessage("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", lineHeight: 0 }}>
            <X size={13} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
        .md\\:flex { display: flex !important; }
        .sm\\:inline { display: inline !important; }
        @media (max-width: 768px) {
          .md\\:flex { display: none !important; }
          .md\\:hidden { display: none !important; }
        }
        @media (max-width: 640px) {
          .sm\\:inline { display: none !important; }
        }
        .right-ai-panel {
          width: 260px;
          flex-shrink: 0;
        }
        @media (max-width: 1100px) {
          .right-ai-panel { width: 220px; }
        }
        @media (max-width: 768px) {
          .right-ai-panel { display: none !important; }
        }
      `}</style>
    </>
  );
}