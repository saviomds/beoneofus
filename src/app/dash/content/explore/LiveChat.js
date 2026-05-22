"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageSquare, Wifi, WifiOff, Code2 } from "lucide-react";
import { supabase } from "../../../supabaseClient";

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Detect ```code``` blocks and inline `code`
function MessageContent({ text }) {
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3).replace(/^\n/, "").replace(/\n$/, "");
          return (
            <pre key={i} className="mt-2 bg-gray-900 dark:bg-black text-gray-100 text-[11px] font-mono rounded-xl p-3 overflow-x-auto whitespace-pre leading-5">
              {code}
            </pre>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[11px] font-mono">
              {part.slice(1, -1)}
            </code>
          );
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
        <span
          key={i}
          className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function LiveChat({ project, currentUser }) {
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState("");
  const [isConnected, setIsConnected]   = useState(false);
  const [onlineCount, setOnlineCount]   = useState(0);
  const [typingUsers, setTypingUsers]   = useState([]);

  const bottomRef    = useRef(null);
  const channelRef   = useRef(null);
  const typingTimer  = useRef(null);
  const myUsername   = currentUser?.user_metadata?.username
    ?? currentUser?.email?.split("@")[0]
    ?? "You";

  useEffect(() => {
    const key = currentUser?.id ?? `anon-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(`project:chat:${project.id}`, {
      config: {
        broadcast: { self: true },
        presence:  { key },
      },
    });

    channel
      .on("broadcast", { event: "msg" }, ({ payload }) => {
        setMessages((prev) => [...prev, payload]);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.username && payload.username !== myUsername) {
          setTypingUsers((prev) => {
            if (prev.includes(payload.username)) return prev;
            return [...prev, payload.username];
          });
          // Remove typing indicator after 2.5s
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u !== payload.username));
          }, 2500);
        }
      })
      .on("presence", { event: "sync" }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED" && currentUser) {
          channel.track({ user_id: currentUser.id, username: myUsername });
        }
      });

    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [project.id, currentUser, myUsername]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const broadcastTyping = useCallback(() => {
    if (!currentUser) return;
    clearTimeout(typingTimer.current);
    channelRef.current?.send({
      type:    "broadcast",
      event:   "typing",
      payload: { username: myUsername },
    });
  }, [currentUser, myUsername]);

  const handleInput = (e) => {
    setInput(e.target.value);
    broadcastTyping();
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    if (!currentUser) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: "Sign in to send messages.", sender: "System", senderId: "system", ts: Date.now(), isSystem: true },
      ]);
      return;
    }
    setInput("");
    await channelRef.current?.send({
      type:    "broadcast",
      event:   "msg",
      payload: {
        id:       Date.now(),
        text,
        sender:   myUsername,
        senderId: currentUser.id,
        ts:       Date.now(),
      },
    });
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const hasCode = (text) => text.includes("```") || text.includes("`");

  return (
    <div
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col"
      style={{ height: "540px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <MessageSquare size={14} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Live Chat</span>
            {onlineCount > 0 && (
              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 px-2 py-0.5 rounded-full font-semibold tabular-nums">
                {onlineCount} online
              </span>
            )}
          </div>
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium ${isConnected ? "text-emerald-500" : "text-gray-400"}`}>
          {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isConnected ? "Live" : "Connecting"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center select-none">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-3">
              <MessageSquare className="text-gray-400 dark:text-gray-600" size={24} />
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No messages yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Start the conversation — share code, ideas, or questions.</p>
            {!currentUser && (
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-3 font-medium">Sign in to chat</p>
            )}
          </div>
        )}

        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <p key={msg.id} className="text-center text-xs text-gray-400 italic py-1">{msg.text}</p>
            );
          }
          const isMe = msg.senderId === currentUser?.id;
          return (
            <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                isMe
                  ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              }`}>
                {msg.sender?.[0]?.toUpperCase() ?? "U"}
              </div>

              {/* Bubble */}
              <div className={`max-w-[76%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-600 px-1">
                  {isMe ? "You" : msg.sender} · {formatTime(msg.ts)}
                </span>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                  isMe
                    ? "bg-blue-600 text-white rounded-tr-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-md"
                } ${hasCode(msg.text) ? "max-w-full w-full" : ""}`}>
                  <MessageContent text={msg.text} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 font-black shrink-0">
              {typingUsers[0][0].toUpperCase()}
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-1 py-0.5">
              <TypingDots />
            </div>
            <span className="text-[10px] text-gray-400">
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Code hint */}
      {input.trim() && !input.includes("```") && (
        <div className="px-4 py-1.5 border-t border-gray-50 dark:border-gray-800/50">
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <Code2 size={10} /> Wrap code in <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">`backticks`</code> or <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">```blocks```</code>
          </p>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex items-end gap-2 shrink-0">
        <textarea
          value={input}
          onChange={handleInput}
          onKeyDown={onKeyDown}
          placeholder={currentUser ? "Message… (Enter to send, Shift+Enter for newline)" : "Sign in to chat…"}
          disabled={!currentUser}
          rows={1}
          className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ maxHeight: "120px" }}
        />
        <button
          onClick={sendMessage}
          disabled={!currentUser || !input.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0 shadow-sm shadow-blue-500/20"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
