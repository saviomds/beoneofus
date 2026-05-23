"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, MessageSquare, Wifi, WifiOff, Code2, Lock, Loader2,
  Smile, Paperclip, ImagePlus, Reply, X, FileText, Download,
  ChevronDown, Copy, Check, Sparkles, Sticker,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";

// ── Setup SQL (show to user if table missing or RLS blocks insert) ────────────
const CHAT_SQL = `-- Run in Supabase SQL Editor (safe to re-run)

-- 0. Fix project_members RLS policies (root cause: RLS enabled but no policies = deny all)
create table if not exists project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'contributor' check (role in ('owner','contributor','viewer')),
  status text default 'pending' check (status in ('pending','approved','rejected')),
  joined_at timestamptz default now(),
  unique(project_id, user_id)
);
alter table project_members enable row level security;
drop policy if exists "Members view own memberships" on project_members;
create policy "Members view own memberships" on project_members
  for select using (
    user_id = auth.uid()
    or project_id in (select id from projects where created_by = auth.uid())
  );
drop policy if exists "Users request membership" on project_members;
create policy "Users request membership" on project_members
  for insert with check (
    user_id = auth.uid()
    or project_id in (select id from projects where created_by = auth.uid())
  );
drop policy if exists "Owners manage members" on project_members;
create policy "Owners manage members" on project_members
  for update using (
    project_id in (select id from projects where created_by = auth.uid())
  );
drop policy if exists "Owners remove members" on project_members;
create policy "Owners remove members" on project_members
  for delete using (
    user_id = auth.uid()
    or project_id in (select id from projects where created_by = auth.uid())
  );

-- 1. project_messages table
create table if not exists project_messages (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  text text not null default '',
  attachment_url text,
  attachment_type text,
  attachment_name text,
  attachment_size integer,
  reply_to_id uuid,
  reply_preview text,
  created_at timestamptz default now()
);
alter table project_messages add column if not exists attachment_url  text;
alter table project_messages add column if not exists attachment_type text;
alter table project_messages add column if not exists attachment_name text;
alter table project_messages add column if not exists attachment_size integer;
alter table project_messages add column if not exists reply_to_id     uuid;
alter table project_messages add column if not exists reply_preview   text;
alter table project_messages enable row level security;
drop policy if exists "Team read messages" on project_messages;
create policy "Team read messages" on project_messages
  for select using (auth.uid() is not null);
drop policy if exists "Team send messages" on project_messages;
create policy "Team send messages" on project_messages
  for insert with check (auth.uid() = user_id);

-- 3. project_message_reactions table
create table if not exists project_message_reactions (
  message_id uuid references project_messages(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  emoji      text not null,
  primary key (message_id, user_id, emoji)
);
alter table project_message_reactions enable row level security;
drop policy if exists "Team read reactions" on project_message_reactions;
create policy "Team read reactions" on project_message_reactions
  for select using (true);
drop policy if exists "Team add reactions" on project_message_reactions;
create policy "Team add reactions" on project_message_reactions
  for insert with check (user_id = auth.uid());
drop policy if exists "Remove own reactions" on project_message_reactions;
create policy "Remove own reactions" on project_message_reactions
  for delete using (user_id = auth.uid());

-- 4. Storage: create a public bucket named "chat-attachments" in
--    Supabase dashboard → Storage → New bucket`;

// ── Emoji / sticker data ──────────────────────────────────────────────────────
const EMOJI_CATS = [
  { id: "faces",   label: "😊", emojis: ["😀","😂","🥹","😊","😇","🥰","😍","🤩","😘","😅","😎","🤔","😏","🙄","😬","🤗","🫡","🥳","😤","🤯","😴","😱","😭","😡","🤬","😈","👿","💀","🫠","🥺","🤤","😵","🥵","🥶","🤢","🤮","🤧"] },
  { id: "hands",   label: "👋", emojis: ["👍","👎","👏","🙌","🤝","🫶","🤲","👐","✊","💪","🤜","🤛","✋","👋","🫱","🫲","☝️","🫵","👆","👇","👈","👉","🤞","✌️","🤟","🤘","🖖","👌","🤏","🖕","🙏","💅","🫂"] },
  { id: "symbols", label: "❤️", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","💕","💞","💖","💘","🔥","⭐","🌟","✨","💫","🎉","🎊","🎈","🎯","🏆","🥇","💯","✅","❌","⚠️","🔴","🟢","🔵","🟡","⚡","💡","🚀","👑","💎","🎓","🌈","🫧"] },
  { id: "tech",    label: "💻", emojis: ["💻","🖥️","📱","⌨️","🖱️","💾","📂","🔒","🔓","⚙️","🛠️","🔧","📊","📈","🤖","👾","🎮","🕹️","📡","🔭","🔬","⚗️","🧬","🧪","📡","🔌","💡","🔋","📲","☎️","📟","🖨️","🗜️","💿","📀"] },
];

const STICKERS = [
  "🎉","🔥","💯","🚀","👑","⚡","🌟","💪","🙌","❤️",
  "😍","🤩","🥳","😂","💀","🫡","🤝","💡","🎯","🏆",
  "✅","❌","⚠️","💬","📣","🎓","🔑","💎","🌈","🫶",
  "😎","🤯","🥹","😱","🙏","🤞","👀","🫠","💥","🎪",
];

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "🔥", "🎉"];
const SNIPPET_LANGS   = ["javascript","typescript","python","rust","go","bash","sql","json","html","css","java","cpp","ruby","swift","kotlin"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Avatar({ profile, size = 28, className = "" }) {
  const [imgErr, setImgErr] = useState(false);
  const src     = profile?.avatar_url;
  const name    = profile?.full_name || profile?.username || "?";
  const initial = name[0]?.toUpperCase() ?? "?";
  const style   = { width: size, height: size, minWidth: size, minHeight: size };
  if (src && !imgErr) {
    return <img src={src} alt={name} style={style}
      className={`rounded-full object-cover shrink-0 ${className}`} onError={() => setImgErr(true)} />;
  }
  return (
    <div style={{ ...style, fontSize: Math.floor(size * 0.42) }}
      className={`rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 ${className}`}>
      {initial}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} title="Copy"
      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

function SnippetBlock({ code, lang, isMe }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };
  return (
    <div className={`rounded-2xl overflow-hidden border text-left w-full max-w-[340px] sm:max-w-[420px] ${
      isMe ? "border-blue-400/20" : "border-gray-200 dark:border-gray-700"
    }`}>
      <div className={`flex items-center justify-between px-3 py-1.5 ${isMe ? "bg-blue-700" : "bg-gray-800 dark:bg-gray-900"}`}>
        <div className="flex items-center gap-1.5">
          <Code2 size={11} className="text-gray-400" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lang}</span>
        </div>
        <button onClick={copy} className="text-[10px] font-bold text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
          {copied ? <><Check size={9} className="text-emerald-400" /> Copied</> : <><Copy size={9} /> Copy</>}
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 text-[11px] font-mono px-3 py-2.5 overflow-x-auto leading-5 whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function MessageContent({ text }) {
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3).replace(/^\n/, "").replace(/\n$/, "");
          return <pre key={i} className="mt-2 bg-gray-900 dark:bg-black text-gray-100 text-[11px] font-mono rounded-xl p-3 overflow-x-auto whitespace-pre leading-5">{code}</pre>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function LiveChat({ project, currentUser, teamMemberIds = new Set() }) {
  // Core state
  const [messages, setMessages]           = useState([]);
  const [profileCache, setProfileCache]   = useState({});
  const [reactions, setReactions]         = useState({});

  // Connection
  const [isConnected, setIsConnected]     = useState(false);
  const [onlineCount, setOnlineCount]     = useState(0);
  const [typingUsers, setTypingUsers]     = useState([]);

  // Auth
  const [isMember, setIsMember]           = useState(false);
  const [memberChecked, setMemberChecked] = useState(false);

  // Loading
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [dbSetupNeeded, setDbSetupNeeded]   = useState(false);
  const [sending, setSending]               = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [uploadError, setUploadError]       = useState(null);

  // Input
  const [input, setInput]                   = useState("");
  const [replyTo, setReplyTo]               = useState(null);
  const [pendingAttachment, setPendingAttachment] = useState(null);

  // UI panels
  const [panel, setPanel]                   = useState(null); // 'emoji' | 'sticker' | 'snippet' | null
  const [activeEmojiCat, setActiveEmojiCat] = useState("faces");
  const [snippetCode, setSnippetCode]       = useState("");
  const [snippetLang, setSnippetLang]       = useState("javascript");

  // Hover/reaction
  const [hoveredMsgId, setHoveredMsgId]           = useState(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);

  // Lightbox
  const [lightboxSrc, setLightboxSrc]       = useState(null);

  // Scroll
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Refs
  const bottomRef     = useRef(null);
  const scrollRef     = useRef(null);
  const channelRef    = useRef(null);
  const typingTimer   = useRef(null);
  const fetchedIds    = useRef(new Set());
  const imageInputRef = useRef(null);
  const fileInputRef  = useRef(null);
  const panelRef      = useRef(null);

  const isDemo     = !project.id?.toString().match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
  const myProfile  = currentUser ? (profileCache[currentUser.id] ?? null) : null;
  const myUsername = myProfile?.username ?? currentUser?.user_metadata?.username ?? currentUser?.email?.split("@")[0] ?? "You";

  // ── Close panel when clicking outside ───────────────────────────────────────
  useEffect(() => {
    if (!panel) return;
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setPanel(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panel]);

  // ── Membership check ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || isDemo) { setMemberChecked(true); return; }
    if (project.created_by === currentUser.id) { setIsMember(true); setMemberChecked(true); return; }
    supabase.from("project_members")
      .select("id").eq("project_id", project.id).eq("user_id", currentUser.id).eq("status", "approved")
      .maybeSingle().then(({ data }) => { setIsMember(!!data); setMemberChecked(true); });
  }, [project.id, project.created_by, currentUser, isDemo]);

  // ── Profile fetcher ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async (userId) => {
    if (!userId || fetchedIds.current.has(userId)) return;
    fetchedIds.current.add(userId);
    const { data } = await supabase.from("profiles")
      .select("id, username, full_name, avatar_url").eq("id", userId).single();
    if (data) setProfileCache((prev) => ({ ...prev, [data.id]: data }));
  }, []);

  useEffect(() => { if (currentUser?.id) fetchProfile(currentUser.id); }, [currentUser?.id, fetchProfile]);

  // ── Load history + reactions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!memberChecked || !isMember || isDemo) { setLoadingHistory(false); return; }
    supabase.from("project_messages")
      .select("id, project_id, user_id, text, attachment_url, attachment_type, attachment_name, attachment_size, reply_to_id, reply_preview, created_at")
      .eq("project_id", project.id).order("created_at", { ascending: true }).limit(100)
      .then(({ data, error }) => {
        if (error?.code === "42P01" || error?.code === "42501" || error?.message?.includes("row-level security") || error?.message?.includes("project_messages")) {
          setDbSetupNeeded(true); setLoadingHistory(false); return;
        }
        if (data) {
          setMessages(data.map((m) => ({ ...m, ts: new Date(m.created_at).getTime() })));
          const ids = [...new Set(data.map((m) => m.user_id).filter(Boolean))];
          ids.forEach(fetchProfile);
          // Load reactions
          const msgIds = data.map((m) => m.id);
          if (msgIds.length > 0) {
            supabase.from("project_message_reactions").select("message_id, user_id, emoji")
              .in("message_id", msgIds).then(({ data: rData }) => {
                if (!rData) return;
                const map = {};
                rData.forEach((r) => {
                  if (!map[r.message_id]) map[r.message_id] = {};
                  if (!map[r.message_id][r.emoji]) map[r.message_id][r.emoji] = { count: 0, mine: false };
                  map[r.message_id][r.emoji].count++;
                  if (r.user_id === currentUser?.id) map[r.message_id][r.emoji].mine = true;
                });
                setReactions(map);
              });
          }
        }
        setLoadingHistory(false);
      });
  }, [memberChecked, isMember, isDemo, project.id, fetchProfile, currentUser?.id]);

  // ── Real-time subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!memberChecked || !isMember || isDemo || !currentUser?.id) return;
    const channel = supabase.channel(`project:chat:${project.id}`, {
      config: { broadcast: { self: false }, presence: { key: currentUser.id } },
    });
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "project_messages",
        filter: `project_id=eq.${project.id}` }, ({ new: msg }) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, { ...msg, ts: new Date(msg.created_at).getTime() }];
        });
        fetchProfile(msg.user_id);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload?.userId || payload.userId === currentUser.id) return;
        const uname = payload.username || "Someone";
        setTypingUsers((prev) => prev.includes(uname) ? prev : [...prev, uname]);
        setTimeout(() => setTypingUsers((prev) => prev.filter((u) => u !== uname)), 2500);
      })
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        const { messageId, emoji, userId, action } = payload ?? {};
        if (!messageId || !emoji) return;
        setReactions((prev) => {
          const msgR = { ...(prev[messageId] ?? {}) };
          if (action === "add") {
            const cur = msgR[emoji] ?? { count: 0, mine: false };
            msgR[emoji] = { count: cur.count + 1, mine: cur.mine || userId === currentUser.id };
          } else {
            if (msgR[emoji]) {
              const newCount = msgR[emoji].count - 1;
              if (newCount <= 0) delete msgR[emoji];
              else msgR[emoji] = { count: newCount, mine: userId === currentUser.id ? false : msgR[emoji].mine };
            }
          }
          return { ...prev, [messageId]: msgR };
        });
      })
      .on("presence", { event: "sync" }, () => {
        const online = Object.values(channel.presenceState()).map((a) => a[a.length - 1]).filter(Boolean);
        const count  = teamMemberIds.size > 0 ? online.filter((p) => teamMemberIds.has(p.user_id)).length : online.length;
        setOnlineCount(count);
      })
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") channel.track({ user_id: currentUser.id, username: myUsername });
      });
    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [memberChecked, isMember, isDemo, project.id, currentUser?.id, myUsername, teamMemberIds, fetchProfile]);

  // ── Scroll tracking ───────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollDown(distFromBottom > 150);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!showScrollDown) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers, showScrollDown]);

  // ── Broadcast typing ──────────────────────────────────────────────────────────
  const broadcastTyping = useCallback(() => {
    if (!currentUser) return;
    clearTimeout(typingTimer.current);
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: currentUser.id, username: myUsername } });
  }, [currentUser, myUsername]);

  // ── Upload file via server route (bypasses storage RLS/policies) ─────────────
  const uploadFile = async (file) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated.");
    const ext  = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${project.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const form = new FormData();
    form.append("file", file);
    form.append("path", path);
    const res = await fetch("/api/storage/upload-chat-file", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Upload failed.");
    }
    const { url } = await res.json();
    return url;
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadError(null);
    setPendingAttachment({
      file, type,
      previewUrl: type === "image" ? URL.createObjectURL(file) : null,
    });
    setPanel(null);
  };

  const showError = (msg) => {
    setUploadError(msg);
    setTimeout(() => setUploadError(null), 6000);
  };

  // ── Core send via server route (bypasses RLS entirely) ───────────────────────
  const doSend = async ({ text = "", attachment_type = null, attachment_url = null, attachment_name = null, attachment_size = null }) => {
    const rPreview = replyTo ? `${replyTo.sender}: ${(replyTo.text || "").slice(0, 80)}` : null;
    const rId      = replyTo?.id ?? null;
    const tempId   = `temp-${Date.now()}`;

    setMessages((prev) => [...prev, {
      id: tempId, project_id: project.id, user_id: currentUser.id,
      text, attachment_type, attachment_url, attachment_name, attachment_size,
      reply_to_id: rId, reply_preview: rPreview, created_at: new Date().toISOString(), ts: Date.now(),
    }]);
    setReplyTo(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      showError("Session expired — please refresh.");
      return false;
    }

    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ project_id: project.id, text, attachment_type, attachment_url, attachment_name, attachment_size, reply_to_id: rId, reply_preview: rPreview }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (body.error?.includes("does not exist") || body.error?.includes("42P01")) {
        setDbSetupNeeded(true);
      } else {
        showError(body.error || "Failed to send message.");
      }
      return false;
    }

    const { data: inserted } = await res.json();
    setMessages((prev) => {
      const without = prev.filter((m) => m.id !== tempId);
      if (without.some((m) => m.id === inserted.id)) return without;
      return [...without, { ...inserted, ts: new Date(inserted.created_at).getTime() }];
    });
    fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ type: "chat_message_sent", content: `Sent a message in ${project.title}`, metadata: { project_id: project.id } }) }).catch(() => {});
    return true;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && !pendingAttachment) || !currentUser || !isMember || sending || uploading) return;
    setSending(true);
    try {
      if (pendingAttachment) {
        const { file, type } = pendingAttachment;
        setUploading(true);
        let url;
        try {
          url = await uploadFile(file);
        } catch (err) {
          showError(err.message);
          return; // leave pendingAttachment intact so user can retry
        } finally {
          setUploading(false);
        }
        // Upload succeeded — clear input + attachment then send
        const caption = input.trim();
        setInput("");
        setPendingAttachment(null);
        await doSend({ text: caption, attachment_type: type, attachment_url: url, attachment_name: file.name, attachment_size: file.size });
      } else {
        setInput("");
        await doSend({ text });
      }
    } finally {
      setSending(false);
    }
  };

  const sendSticker = async (emoji) => {
    if (!currentUser || !isMember) return;
    setPanel(null);
    await doSend({ text: emoji, attachment_type: "sticker" });
  };

  const sendSnippet = async () => {
    if (!snippetCode.trim() || !currentUser || !isMember) return;
    setPanel(null);
    const code = snippetCode; const lang = snippetLang;
    setSnippetCode(""); setSnippetLang("javascript");
    await doSend({ text: code, attachment_type: "snippet", attachment_name: lang });
  };

  const toggleReaction = async (messageId, emoji) => {
    if (!currentUser || !isMember) return;
    const mine = reactions[messageId]?.[emoji]?.mine ?? false;
    // Optimistic
    setReactions((prev) => {
      const msgR = { ...(prev[messageId] ?? {}) };
      if (mine) {
        const c = (msgR[emoji]?.count ?? 1) - 1;
        if (c <= 0) delete msgR[emoji]; else msgR[emoji] = { count: c, mine: false };
      } else {
        msgR[emoji] = { count: (msgR[emoji]?.count ?? 0) + 1, mine: true };
      }
      return { ...prev, [messageId]: msgR };
    });
    channelRef.current?.send({ type: "broadcast", event: "reaction",
      payload: { messageId, emoji, userId: currentUser.id, action: mine ? "remove" : "add" } });
    if (mine) {
      await supabase.from("project_message_reactions").delete()
        .eq("message_id", messageId).eq("user_id", currentUser.id).eq("emoji", emoji);
    } else {
      await supabase.from("project_message_reactions").insert({ message_id: messageId, user_id: currentUser.id, emoji });
    }
    setReactionPickerMsgId(null);
  };

  const onKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const hasCode   = (text) => text.includes("```") || text.includes("`");
  const togglePanel = (name) => setPanel((p) => (p === name ? null : name));

  // ── Guard screens ─────────────────────────────────────────────────────────────
  if (!currentUser) return (
    <Wall icon={<MessageSquare className="text-gray-400 dark:text-gray-600" size={28} />}
      title="Sign in to view team chat" sub="Chat is available to team members only." />
  );
  if (!memberChecked) return <WallLoader />;
  if (!isMember) return (
    <Wall icon={<Lock className="text-gray-400 dark:text-gray-600" size={28} />}
      title="Team Members Only" sub="Request to join the project team to participate in chat." />
  );
  if (isDemo) return (
    <Wall icon={<MessageSquare className="text-gray-400 dark:text-gray-600" size={24} />}
      title="Demo project" sub="Create a real project to enable team chat." />
  );

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col min-h-[480px] sm:min-h-[560px] h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/60 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-500/20">
            <MessageSquare size={14} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Team Chat</span>
            {onlineCount > 0 && (
              <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 px-2 py-0.5 rounded-full font-bold tabular-nums">
                ● {onlineCount} online
              </span>
            )}
          </div>
        </div>
        <span className={`flex items-center gap-1 text-[11px] font-semibold ${isConnected ? "text-emerald-500" : "text-gray-400"}`}>
          {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
          {isConnected ? "Live" : "Connecting…"}
        </span>
      </div>

      {/* DB setup notice */}
      {dbSetupNeeded && <SqlSetupNotice sql={CHAT_SQL} onDismiss={() => setDbSetupNeeded(false)} />}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4 scroll-smooth">
        {loadingHistory ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-400" size={22} /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center select-none">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-800/30">
              <MessageSquare className="text-blue-400" size={28} />
            </div>
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Start the conversation</p>
            <p className="text-xs text-gray-400 mt-1.5 max-w-[240px]">Share code, images, files, and ideas with your team.</p>
          </div>
        ) : messages.map((msg) => {
          if (msg.isSystem) return <p key={msg.id} className="text-center text-xs text-gray-400 italic py-1">{msg.text}</p>;
          const isMe    = msg.user_id === currentUser?.id;
          const profile = profileCache[msg.user_id] ?? null;
          const name    = profile?.full_name || profile?.username || (msg.user_id?.slice(0, 8) + "…");
          const msgReact = reactions[msg.id] ?? {};
          const isSticker = msg.attachment_type === "sticker";

          return (
            <div key={msg.id}
              className={`flex gap-2 sm:gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"} relative group`}
              onMouseEnter={() => setHoveredMsgId(msg.id)}
              onMouseLeave={() => { setHoveredMsgId(null); setReactionPickerMsgId(null); }}
            >
              <Avatar profile={profile} size={28} className="mt-0.5 shrink-0 self-end" />

              <div className={`flex flex-col gap-1 min-w-0 ${isMe ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[78%]`}>
                {/* Meta */}
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-600 px-1">
                  {isMe ? "You" : name} · {formatTime(msg.ts)}
                </span>

                {/* Reply context */}
                {msg.reply_preview && (
                  <div className={`text-[10px] px-2.5 py-1.5 rounded-xl border mb-0.5 max-w-full truncate ${
                    isMe ? "bg-blue-700/20 border-blue-500/20 text-blue-300" : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
                  }`}>
                    <span className="font-bold">↩ </span>{msg.reply_preview}
                  </div>
                )}

                {/* Bubble */}
                {isSticker ? (
                  <div className="text-[52px] sm:text-[60px] leading-none select-none py-1">{msg.text}</div>
                ) : msg.attachment_type === "image" ? (
                  <div className="rounded-2xl overflow-hidden cursor-zoom-in max-w-[220px] sm:max-w-[260px] border border-gray-200 dark:border-gray-700"
                    onClick={() => setLightboxSrc(msg.attachment_url)}>
                    <img src={msg.attachment_url} alt="shared" className="block w-full max-h-[200px] object-cover" />
                    {msg.text && (
                      <div className={`px-3 py-2 text-sm ${isMe ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"}`}>
                        {msg.text}
                      </div>
                    )}
                  </div>
                ) : msg.attachment_type === "file" ? (
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border min-w-[180px] max-w-[260px] ${
                    isMe ? "bg-blue-600 border-blue-500 text-white" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isMe ? "bg-blue-500/60" : "bg-blue-50 dark:bg-blue-900/30"}`}>
                      <FileText size={16} className={isMe ? "text-white" : "text-blue-600 dark:text-blue-400"} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isMe ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>{msg.attachment_name || "File"}</p>
                      {msg.attachment_size ? <p className={`text-[10px] ${isMe ? "text-blue-200" : "text-gray-400"}`}>{formatSize(msg.attachment_size)}</p> : null}
                    </div>
                    <a href={msg.attachment_url} download target="_blank" rel="noreferrer"
                      className={`shrink-0 transition-colors ${isMe ? "text-blue-200 hover:text-white" : "text-gray-400 hover:text-blue-500"}`}>
                      <Download size={14} />
                    </a>
                  </div>
                ) : msg.attachment_type === "snippet" ? (
                  <SnippetBlock code={msg.text} lang={msg.attachment_name || "code"} isMe={isMe} />
                ) : (
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                    isMe ? "bg-blue-600 text-white rounded-tr-md" : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-md"
                  } ${hasCode(msg.text) ? "w-full max-w-full" : ""}`}>
                    <MessageContent text={msg.text} />
                  </div>
                )}

                {/* Reactions */}
                {Object.keys(msgReact).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {Object.entries(msgReact).map(([emoji, { count, mine }]) => (
                      <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${
                          mine ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                               : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}>
                        {emoji}<span>{count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover action bar */}
              {hoveredMsgId === msg.id && isMember && !isSticker && (
                <div className={`absolute -top-1 flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-1 py-0.5 z-10 ${
                  isMe ? "right-9 sm:right-10" : "left-9 sm:left-10"
                }`}>
                  {/* Quick reactions picker */}
                  <div className="relative">
                    <button onClick={() => setReactionPickerMsgId((p) => (p === msg.id ? null : msg.id))}
                      className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      <Smile size={13} />
                    </button>
                    {reactionPickerMsgId === msg.id && (
                      <div className={`absolute bottom-full mb-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-2 flex gap-1 z-20 ${isMe ? "right-0" : "left-0"}`}>
                        {QUICK_REACTIONS.map((e) => (
                          <button key={e} onClick={() => toggleReaction(msg.id, e)}
                            className="text-xl sm:text-2xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl w-9 h-9 flex items-center justify-center transition-all active:scale-90">
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Reply */}
                  <button onClick={() => setReplyTo({ id: msg.id, text: msg.text || msg.attachment_name || "attachment", sender: name })}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <Reply size={13} />
                  </button>
                  {/* Copy */}
                  {msg.text && msg.attachment_type !== "snippet" && msg.attachment_type !== "sticker" && <CopyButton text={msg.text} />}
                </div>
              )}
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 font-bold shrink-0">
              {typingUsers[0][0].toUpperCase()}
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-1 py-0.5">
              <TypingDots />
            </div>
            <span className="text-[10px] text-gray-400">{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollDown && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <button onClick={() => { setShowScrollDown(false); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg shadow-blue-500/20 transition-all active:scale-95">
            <ChevronDown size={13} /> Latest
          </button>
        </div>
      )}

      {/* ── Floating panels ── */}
      {panel && (
        <div ref={panelRef} className="border-t border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">

          {/* Emoji picker */}
          {panel === "emoji" && (
            <div className="p-3">
              {/* Category tabs */}
              <div className="flex gap-1 mb-3">
                {EMOJI_CATS.map((cat) => (
                  <button key={cat.id} onClick={() => setActiveEmojiCat(cat.id)}
                    className={`flex-1 py-1.5 rounded-lg text-base transition-all ${activeEmojiCat === cat.id ? "bg-blue-50 dark:bg-blue-900/20 scale-110" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-0.5 max-h-[160px] overflow-y-auto">
                {EMOJI_CATS.find((c) => c.id === activeEmojiCat)?.emojis.map((e) => (
                  <button key={e} onClick={() => { setInput((v) => v + e); setPanel(null); }}
                    className="text-xl sm:text-2xl h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all active:scale-90">
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sticker picker */}
          {panel === "sticker" && (
            <div className="p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Stickers</p>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-[180px] overflow-y-auto">
                {STICKERS.map((e) => (
                  <button key={e} onClick={() => sendSticker(e)}
                    className="text-4xl sm:text-[42px] h-14 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all active:scale-90 hover:scale-110">
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Snippet editor */}
          {panel === "snippet" && (
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><Code2 size={12} className="text-violet-500" /> Code Snippet</p>
                <select value={snippetLang} onChange={(e) => setSnippetLang(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-[11px] text-gray-700 dark:text-gray-300 font-bold focus:outline-none">
                  {SNIPPET_LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <textarea value={snippetCode} onChange={(e) => setSnippetCode(e.target.value)} autoFocus rows={5}
                placeholder="// paste or type code here…"
                className="w-full bg-gray-900 text-gray-100 text-[12px] font-mono rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 placeholder:text-gray-600"
              />
              <div className="flex gap-2">
                <button onClick={sendSnippet} disabled={!snippetCode.trim()}
                  className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-40 active:scale-95">
                  <Send size={12} /> Send Snippet
                </button>
                <button onClick={() => { setPanel(null); setSnippetCode(""); }}
                  className="px-4 py-2 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mx-3 mb-1 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2.5 shrink-0">
          <span className="text-red-500 text-sm shrink-0 mt-0.5">⚠</span>
          <p className="text-xs text-red-700 dark:text-red-400 font-medium flex-1">{uploadError}</p>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 shrink-0 ml-1"><X size={13} /></button>
        </div>
      )}

      {/* Attachment preview */}
      {pendingAttachment && (
        <div className="mx-3 mb-2 flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 shrink-0">
          {pendingAttachment.type === "image" ? (
            <img src={pendingAttachment.previewUrl} alt="preview" className="h-14 w-14 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={18} className="text-blue-600" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{pendingAttachment.file.name}</p>
            <p className="text-[10px] text-gray-400">{formatSize(pendingAttachment.file.size)}</p>
          </div>
          <button onClick={() => setPendingAttachment(null)} className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Reply context */}
      {replyTo && (
        <div className="mx-3 mb-1 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl px-3 py-2 shrink-0">
          <Reply size={12} className="text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400">Replying to {replyTo.sender}</p>
            <p className="text-[10px] text-gray-400 truncate">{replyTo.text?.slice(0, 80) || "attachment"}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={12} /></button>
        </div>
      )}

      {/* Code hint */}
      {input.trim() && !input.includes("```") && panel === null && (
        <div className="px-4 py-1 border-t border-gray-50 dark:border-gray-800/50 shrink-0">
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <Code2 size={9} /> Use <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">`code`</code> or <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">```blocks```</code>
          </p>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-100 dark:border-gray-800 shrink-0">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-3 pt-2.5 pb-1">
          <ToolBtn icon={<Smile size={15} />} active={panel === "emoji"}   onClick={() => togglePanel("emoji")}   title="Emoji" />
          <ToolBtn icon={<Sticker size={15} />} active={panel === "sticker"} onClick={() => togglePanel("sticker")} title="Stickers" />
          <ToolBtn icon={<Code2 size={15} />}  active={panel === "snippet"} onClick={() => togglePanel("snippet")} title="Code snippet" />
          <ToolBtn icon={<ImagePlus size={15} />} onClick={() => { setPanel(null); imageInputRef.current?.click(); }} title="Send image" />
          <ToolBtn icon={<Paperclip size={15} />} onClick={() => { setPanel(null); fileInputRef.current?.click(); }} title="Attach file" />
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, "image")} />
          <input ref={fileInputRef}  type="file" className="hidden" onChange={(e) => handleFileSelect(e, "file")} />
        </div>

        {/* Text + send */}
        <div className="flex items-end gap-2 px-3 pb-3">
          <textarea value={input} onChange={(e) => { setInput(e.target.value); broadcastTyping(); }} onKeyDown={onKeyDown}
            placeholder={pendingAttachment ? "Add a caption… (optional)" : "Message…"}
            rows={1}
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all leading-5"
            style={{ maxHeight: "100px" }}
          />
          <button onClick={sendMessage} disabled={(!input.trim() && !pendingAttachment) || sending || uploading}
            title={uploading ? "Uploading…" : "Send"}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0 shadow-sm shadow-blue-500/20">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>

      {/* Image lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
          <img src={lightboxSrc} alt="full size" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────
function ToolBtn({ icon, onClick, active, title }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-2 rounded-xl transition-all ${
        active
          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}>
      {icon}
    </button>
  );
}

function SqlSetupNotice({ sql, onDismiss }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(sql).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div className="border-b border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 shrink-0">
      <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2">
        <div>
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">⚠ Database setup required</p>
          <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">Run this SQL in Supabase → SQL Editor, then refresh.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={copy}
            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 bg-amber-200 dark:bg-amber-800/40 hover:bg-amber-300 dark:hover:bg-amber-700/50 text-amber-800 dark:text-amber-300 rounded-lg transition-colors">
            {copied ? <><Check size={9} className="text-emerald-600" /> Copied!</> : <><Copy size={9} /> Copy SQL</>}
          </button>
          <button onClick={onDismiss} className="text-amber-400 hover:text-amber-600 p-1"><X size={13} /></button>
        </div>
      </div>
      <pre className="text-[10px] bg-gray-900 text-gray-100 mx-4 mb-3 rounded-xl p-3 overflow-x-auto whitespace-pre max-h-48 leading-4">{sql}</pre>
    </div>
  );
}

function Wall({ icon, title, sub }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-3 p-8 text-center min-h-[480px]">
      <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">{icon}</div>
      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{title}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[260px]">{sub}</p>
    </div>
  );
}

function WallLoader() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-center min-h-[480px]">
      <Loader2 className="animate-spin text-blue-500" size={24} />
    </div>
  );
}
