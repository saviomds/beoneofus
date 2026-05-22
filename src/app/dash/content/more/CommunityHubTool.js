"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Globe, Send, Hash, Users, User, MessageSquare, Loader2, Check,
  X, Plus, Smile, Heart, Code2, Briefcase, Award, HelpCircle,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { Toast, useToast } from "./shared";

// ─── Community Hub ───────────────────────────────────────────────────────────

const COMMUNITY_CHANNELS = [
  { id: "general",  label: "general",  Icon: Globe,       desc: "Open discussion for all members",       color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950/30"   },
  { id: "tech",     label: "tech-talk",Icon: Code2,       desc: "Engineering, code & architecture",      color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30"},
  { id: "career",   label: "career",   Icon: Briefcase,   desc: "Jobs, growth & career advice",          color: "text-green-500",  bg: "bg-green-50 dark:bg-green-950/30" },
  { id: "showcase", label: "showcase", Icon: Award,       desc: "Share projects, wins & launches",       color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "help",     label: "help",     Icon: HelpCircle,  desc: "Ask the community for help",            color: "text-red-500",    bg: "bg-red-50 dark:bg-red-950/30"     },
];

function formatMsgTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

const CommunityHubTool = ({ currentUserId }) => {
  const [allMessages, setAllMessages]     = useState([]);
  const [input, setInput]                 = useState("");
  const [error, setError]                 = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeChannel, setActiveChannel] = useState("general");
  const [onlineUsers, setOnlineUsers]     = useState([]);
  const [typingUsers, setTypingUsers]     = useState([]);
  const [myProfile, setMyProfile]         = useState(null);
  const [hoveredMsg, setHoveredMsg]       = useState(null);
  const [copiedMsg, setCopiedMsg]         = useState(null);
  const [showSidebar, setShowSidebar]     = useState(false);
  const [sending, setSending]             = useState(false);
  const scrollRef       = useRef(null);
  const inputRef        = useRef(null);
  const presenceRef     = useRef(null);
  const typingTimers    = useRef({});

  const currentChannel = COMMUNITY_CHANNELS.find(c => c.id === activeChannel) || COMMUNITY_CHANNELS[0];

  /* fetch own profile */
  useEffect(() => {
    if (!currentUserId) return;
    supabase.from("profiles").select("username, avatar_url, is_verified")
      .eq("id", currentUserId).single()
      .then(({ data }) => { if (data) setMyProfile(data); });
  }, [currentUserId]);

  /* messages + realtime */
  useEffect(() => {
    const loadMessages = async () => {
      const { data, error: err } = await supabase
        .from("community_messages")
        .select("*, profiles:user_id(username, avatar_url, is_verified)")
        .order("created_at", { ascending: true })
        .limit(150);
      if (err) setError(true);
      else setAllMessages(data || []);
    };
    loadMessages();

    const ch = supabase.channel("community:messages-v2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, async (payload) => {
        const { data } = await supabase.from("community_messages")
          .select("*, profiles:user_id(username, avatar_url, is_verified)")
          .eq("id", payload.new.id).single();
        if (data) setAllMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  /* presence — online count + typing */
  useEffect(() => {
    if (!currentUserId || !myProfile) return;

    const pCh = supabase.channel("community:presence", {
      config: { presence: { key: currentUserId } },
    });

    pCh
      .on("presence", { event: "sync" }, () => {
        const state = pCh.presenceState();
        const users = Object.values(state).flat().map(u => u.info).filter(Boolean);
        setOnlineUsers(users);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.uid === currentUserId) return;
        const uname = payload.username || "Someone";
        setTypingUsers(prev => prev.includes(uname) ? prev : [...prev, uname]);
        clearTimeout(typingTimers.current[uname]);
        typingTimers.current[uname] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== uname));
        }, 3000);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await pCh.track({ info: { id: currentUserId, username: myProfile.username, avatar_url: myProfile.avatar_url } });
        }
      });

    presenceRef.current = pCh;
    return () => supabase.removeChannel(pCh);
  }, [currentUserId, myProfile]);

  /* auto-scroll */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [allMessages, typingUsers, activeChannel]);

  /* broadcast typing */
  const broadcastTyping = useCallback(() => {
    if (!presenceRef.current || !myProfile) return;
    presenceRef.current.send({ type: "broadcast", event: "typing", payload: { uid: currentUserId, username: myProfile.username } });
  }, [currentUserId, myProfile]);

  /* filter messages per channel */
  const messages = useMemo(() => {
    const hasChannel = allMessages.some(m => "channel" in m && m.channel);
    if (!hasChannel) return activeChannel === "general" ? allMessages : [];
    return allMessages.filter(m => (m.channel || "general") === activeChannel);
  }, [allMessages, activeChannel]);

  /* group by date */
  const grouped = useMemo(() => {
    const out = [];
    let lastDate = "";
    messages.forEach((msg, idx) => {
      const dateKey = msg.created_at ? new Date(msg.created_at).toDateString() : "";
      if (dateKey && dateKey !== lastDate) {
        out.push({ type: "date", label: formatDateLabel(msg.created_at), key: `d-${dateKey}` });
        lastDate = dateKey;
      }
      const prev = messages[idx - 1];
      const grouped = prev?.user_id === msg.user_id && dateKey === (prev?.created_at ? new Date(prev.created_at).toDateString() : "");
      out.push({ type: "msg", ...msg, grouped });
    });
    return out;
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !currentUserId || sending) return;
    setInput("");
    setSending(true);
    const optimistic = {
      id: `opt-${Date.now()}`,
      user_id: currentUserId,
      text,
      created_at: new Date().toISOString(),
      channel: activeChannel,
      profiles: myProfile || { username: "You" },
      grouped: false,
    };
    setAllMessages(prev => [...prev, optimistic]);
    try {
      const payload = { user_id: currentUserId, text };
      try { payload.channel = activeChannel; } catch {}
      await supabase.from("community_messages").insert(payload);
    } finally { setSending(false); }
  };

  const handleCopyMsg = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsg(id);
      setTimeout(() => setCopiedMsg(null), 2000);
    });
  };

  const onlineCount = onlineUsers.length || 1;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full p-10 text-center">
      <AlertCircle size={40} className="text-red-400/40 mb-4" />
      <p className="text-red-500 dark:text-red-400 font-bold text-sm mb-1">Community Hub Not Initialized</p>
      <p className="text-gray-400 text-xs max-w-xs leading-relaxed">
        The <code className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-mono">community_messages</code> table doesn't exist yet. Run the setup SQL migration to enable global chat.
      </p>
    </div>
  );

  return (
    <div className="flex h-full bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-w-4xl mx-auto shadow-sm">

      {/* ── Sidebar ── */}
      <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col w-52 shrink-0 border-r border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 absolute md:relative inset-y-0 left-0 z-30 md:z-auto`}>
        {/* Sidebar header */}
        <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={13} className="text-blue-500" />
            <span className="text-[11px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Community</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[10px] text-gray-400">{onlineCount} online</span>
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Channels</p>
          {COMMUNITY_CHANNELS.map(ch => {
            const isActive = ch.id === activeChannel;
            const count = ch.id === "general" ? allMessages.length : allMessages.filter(m => m.channel === ch.id).length;
            return (
              <button
                key={ch.id}
                onClick={() => { setActiveChannel(ch.id); setShowSidebar(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg transition-all text-left ${isActive ? "bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-800/50"}`}
              >
                <ch.Icon size={13} className={isActive ? ch.color : "text-gray-400 dark:text-gray-500"} />
                <span className={`flex-1 text-[11px] font-bold truncate ${isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}>
                  # {ch.label}
                </span>
                {count > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isActive ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Online users */}
        {onlineUsers.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-800 py-2 px-4">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Online now</p>
            <div className="space-y-1.5">
              {onlineUsers.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i).slice(0, 5).map((u, i) => (
                <div key={`${u.id}-${i}`} className="flex items-center gap-2">
                  <div className="relative shrink-0">
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-[8px] font-black text-gray-500">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                        : (u.username?.[0] || "?").toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white dark:border-gray-900" />
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate font-medium">@{u.username}</span>
                </div>
              ))}
              {onlineUsers.length > 5 && (
                <p className="text-[9px] text-gray-400">+{onlineUsers.length - 5} more</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {showSidebar && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/40 backdrop-blur-sm" onClick={() => setShowSidebar(false)} />
      )}

      {/* ── Main chat ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Channel header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-950">
          <button onClick={() => setShowSidebar(s => !s)} className="md:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
            <Menu size={16} />
          </button>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${currentChannel.bg}`}>
            <currentChannel.Icon size={14} className={currentChannel.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-gray-900 dark:text-gray-100"># {currentChannel.label}</span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{currentChannel.desc}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-900/40">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400">{onlineCount} online</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400">
              <MessageSquare size={11} />
              <span>{messages.length}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5" ref={scrollRef}>
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className={`w-14 h-14 rounded-2xl ${currentChannel.bg} flex items-center justify-center mb-4`}>
                <currentChannel.Icon size={24} className={currentChannel.color} />
              </div>
              <p className="font-black text-sm text-gray-700 dark:text-gray-300 mb-1"># {currentChannel.label}</p>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">{currentChannel.desc}. Be the first to post!</p>
            </div>
          ) : (
            grouped.map(item => {
              if (item.type === "date") return (
                <div key={item.key} className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 shrink-0">{item.label}</span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                </div>
              );

              const isMe = item.user_id === currentUserId;
              return (
                <div
                  key={item.id}
                  className={`flex gap-2.5 group ${isMe ? "flex-row-reverse" : "flex-row"} ${item.grouped ? "mt-0.5" : "mt-3"}`}
                  onMouseEnter={() => setHoveredMsg(item.id)}
                  onMouseLeave={() => setHoveredMsg(null)}
                >
                  {/* Avatar */}
                  {!isMe && (
                    <div
                      onClick={() => !item.id.toString().startsWith("opt-") && setSelectedUserId(item.user_id)}
                      className={`relative w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-[9px] text-gray-500 uppercase shrink-0 self-end overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400/50 transition-all ${item.grouped ? "opacity-0 pointer-events-none" : ""}`}
                    >
                      {item.profiles?.avatar_url
                        ? <Image src={item.profiles.avatar_url} alt="" fill sizes="28px" className="object-cover" />
                        : (item.profiles?.username || "?").substring(0, 2)}
                    </div>
                  )}

                  {/* Bubble + meta */}
                  <div className={`flex flex-col max-w-[78%] ${isMe ? "items-end" : "items-start"}`}>
                    {!item.grouped && !isMe && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">@{item.profiles?.username}</span>
                        {item.profiles?.is_verified && <VerifiedBadge size={9} />}
                        {item.created_at && (
                          <span className="text-[9px] text-gray-300 dark:text-gray-600">{formatMsgTime(item.created_at)}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-end gap-1.5">
                      {/* Hover actions (non-me messages, shown left) */}
                      {!isMe && hoveredMsg === item.id && (
                        <button
                          onClick={() => handleCopyMsg(item.id, item.text)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                        >
                          {copiedMsg === item.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                        </button>
                      )}

                      <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words max-w-full ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-sm shadow-sm shadow-blue-200 dark:shadow-blue-900/30"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200/70 dark:border-gray-700/50 rounded-bl-sm"
                      }`}>
                        {item.text}
                      </div>

                      {/* Hover actions (my messages, shown right) */}
                      {isMe && hoveredMsg === item.id && (
                        <button
                          onClick={() => handleCopyMsg(item.id, item.text)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                        >
                          {copiedMsg === item.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                        </button>
                      )}
                    </div>

                    {/* My message time */}
                    {isMe && !item.grouped && item.created_at && (
                      <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-0.5 px-1">{formatMsgTime(item.created_at)}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2.5 mt-3">
              <div className="w-7 h-7 shrink-0" />
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/50 px-3.5 py-2.5 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {typingUsers.length === 1 ? `${typingUsers[0]} is typing` : `${typingUsers.length} people are typing`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 focus-within:border-blue-400 dark:focus-within:border-blue-600 transition-all">
            <span className={`text-[11px] font-bold ${currentChannel.color} shrink-0`}># {currentChannel.label}</span>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); broadcastTyping(); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              placeholder={currentUserId ? `Message # ${currentChannel.label}…` : "Sign in to chat…"}
              disabled={!currentUserId || sending}
              className="flex-1 bg-transparent text-xs text-gray-900 dark:text-gray-100 focus:outline-none placeholder-gray-400 dark:placeholder-gray-600 min-w-0"
            />
            {input.length > 0 && (
              <span className={`text-[9px] font-bold shrink-0 ${input.length > 480 ? "text-red-500" : "text-gray-300 dark:text-gray-600"}`}>
                {input.length}/500
              </span>
            )}
            <button
              type="submit"
              disabled={!input.trim() || !currentUserId || sending || input.length > 500}
              className="w-7 h-7 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all shrink-0"
            >
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </button>
          </div>
          <p className="text-[10px] text-gray-300 dark:text-gray-700 mt-1.5 text-center">Enter to send · Be kind · No spam</p>
        </form>
      </div>

      {/* Profile modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/70 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto z-10 bg-white dark:bg-gray-950 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-2xl">
            <button onClick={() => setSelectedUserId(null)}
              className="absolute top-5 right-5 z-50 p-2 bg-gray-100 dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 rounded-full text-gray-500 transition-colors border border-gray-200 dark:border-gray-800">
              <X size={18} />
            </button>
            <div className="p-4 sm:p-6"><ProfileContent viewUserId={selectedUserId} /></div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Admin Panel ─────────────────────────────────────────────────────────────


export default CommunityHubTool;
