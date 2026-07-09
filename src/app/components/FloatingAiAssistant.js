"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, User, Loader2, X, Sparkles,
  PhoneCall, BookOpen,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { supabase } from "../supabaseClient";

/* ── Markdown renderers ─────────────────────────────────────────── */
const mdComponents = {
  p:      ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
  ul:     ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
  ol:     ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
  li:     ({ node, ...props }) => <li className="pl-1" {...props} />,
  h1:     ({ node, ...props }) => <h1 className="text-sm font-black mb-2 mt-3" {...props} />,
  h2:     ({ node, ...props }) => <h2 className="text-sm font-bold mb-2 mt-3" {...props} />,
  h3:     ({ node, ...props }) => <h3 className="text-xs font-bold mb-1 mt-2" {...props} />,
  a:      ({ node, ...props }) => <a className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold text-gray-900 dark:text-gray-100" {...props} />,
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div className="rounded-lg overflow-hidden my-3 border border-gray-200 dark:border-gray-700 bg-[#1E1E1E]">
        <div className="bg-gray-800/80 px-3 py-1.5 text-[9px] font-mono text-gray-400 uppercase tracking-widest border-b border-white/5">
          {match[1]}
        </div>
        <SyntaxHighlighter
          {...props} style={vscDarkPlus} language={match[1]} PreTag="div"
          customStyle={{ margin: 0, padding: "0.75rem", background: "transparent", fontSize: "0.75rem" }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code {...props} className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded font-mono text-[10px] border border-gray-200 dark:border-gray-700">
        {children}
      </code>
    );
  },
};

/* ── Typewriter for new AI messages ─────────────────────────────── */
function Typewriter({ content, onUpdate }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setShown(content.slice(0, ++i));
      onUpdate?.();
      if (i >= content.length) clearInterval(t);
    }, 15);
    return () => clearInterval(t);
  }, [content, onUpdate]);
  return <ReactMarkdown components={mdComponents}>{shown}</ReactMarkdown>;
}

/* ── Speed-dial action config ───────────────────────────────────── */
const ACTIONS = [
  {
    id:    "guide",
    label: "Quick Guide",
    icon:  BookOpen,
    href:  "/quick-start",
    bg:    "bg-white dark:bg-slate-800",
    text:  "text-gray-700 dark:text-gray-200",
    ring:  "border border-gray-100 dark:border-slate-700/60",
  },
  {
    id:    "support",
    label: "Call Support",
    icon:  PhoneCall,
    href:  "/dash/support",
    bg:    "bg-white dark:bg-slate-800",
    text:  "text-gray-700 dark:text-gray-200",
    ring:  "border border-gray-100 dark:border-slate-700/60",
  },
  {
    id:    "chat",
    label: "AI Assistant",
    icon:  Sparkles,
    href:  null, // handled by onClick
    bg:    "bg-gradient-to-r from-indigo-600 to-blue-600",
    text:  "text-white",
    ring:  "border border-white/10",
  },
];

/* ── Main component ─────────────────────────────────────────────── */
export default function FloatingAiAssistant() {
  const router = useRouter();

  /* UI state */
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  /* Chat state (preserved from original) */
  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState("");
  const [isLoading,       setIsLoading]       = useState(false);
  const [isFetchingHist,  setIsFetchingHist]  = useState(false);
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  /* Close menu when chat opens */
  useEffect(() => { if (chatOpen) setMenuOpen(false); }, [chatOpen]);

  /* Lock scroll while chat is open on mobile */
  useEffect(() => {
    document.body.style.overflow = chatOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [chatOpen]);

  /* Close menu on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e) => {
      if (!containerRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handle, true);
    return () => document.removeEventListener("mousedown", handle, true);
  }, [menuOpen]);

  /* Fetch chat history once on first open */
  useEffect(() => {
    if (!chatOpen || messages.length > 0) return;
    (async () => {
      setIsFetchingHist(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data, error } = await supabase
            .from("ai_chat_messages")
            .select("role, content")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: true });
          if (!error && data?.length) { setMessages(data); return; }
        }
        setMessages([{ role: "assistant", content: "Hi! I'm beoneofus AI — ask me anything about the platform, your career, or code." }]);
      } catch {
        setMessages([{ role: "assistant", content: "Hi! I'm beoneofus AI — ask me anything about the platform, your career, or code." }]);
      } finally {
        setIsFetchingHist(false);
      }
    })();
  }, [chatOpen, messages.length]);

  const scrollDown = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  useEffect(() => { if (chatOpen) scrollDown(); }, [messages, chatOpen, scrollDown]);
  useEffect(() => { if (chatOpen && !isFetchingHist) setTimeout(() => inputRef.current?.focus(), 80); }, [chatOpen, isFetchingHist]);

  /* Send message */
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.from("ai_chat_messages").insert({ user_id: session.user.id, role: "user", content: userMsg.content });
      const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res  = await fetch("/api/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: apiMessages }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages(p => [...p, { ...data.message, isNew: true }]);
      if (session) await supabase.from("ai_chat_messages").insert({ user_id: session.user.id, role: "assistant", content: data.message.content });
    } catch (err) {
      setMessages(p => [...p, { role: "assistant", content: err.message, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  /* FAB click logic */
  const handleFabClick = () => {
    if (chatOpen) { setChatOpen(false); return; }
    setMenuOpen(o => !o);
  };

  /* Hover: desktop-only speed-dial */
  const handleMouseEnter = () => { if (!chatOpen) setMenuOpen(true); };
  const handleMouseLeave = () => setMenuOpen(false);

  /* Action handler */
  const handleAction = (action) => {
    setMenuOpen(false);
    if (action.id === "chat") { setChatOpen(true); return; }
    router.push(action.href);
  };

  const isAnyOpen  = menuOpen || chatOpen;
  const totalItems = ACTIONS.length;

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Mobile overlay behind chat window ── */}
      {chatOpen && (
        <div
          className="fixed inset-0 z-[55] sm:hidden"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setChatOpen(false)}
        />
      )}

      {/* ── Main container: bottom-RIGHT ── */}
      <div
        ref={containerRef}
        className="fixed bottom-6 right-3 sm:bottom-6 sm:right-6 z-[60] flex flex-col items-end gap-2.5"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >

        {/* ── Chat window (preserved, opens via "AI Assistant" action) ── */}
        <div
          className={`
            w-[88vw] sm:w-[380px] flex flex-col
            bg-white dark:bg-gray-900
            border border-gray-100 dark:border-gray-800
            rounded-[1.5rem] overflow-hidden
            shadow-[0_24px_64px_rgba(0,0,0,0.14),0_8px_24px_rgba(0,0,0,0.08)]
            dark:shadow-[0_24px_64px_rgba(0,0,0,0.55)]
            mb-1
            transition-all duration-300 ease-out origin-bottom-right
            ${chatOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 translate-y-3 scale-[0.96] pointer-events-none"}
          `}
          style={{ maxHeight: "min(70vh, 540px)" }}
        >
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                <Image src="/ai.gif" alt="AI" width={32} height={32} className="w-full h-full object-cover" unoptimized />
              </div>
              <div>
                <p className="text-[13px] font-black text-gray-900 dark:text-gray-100 tracking-tight">beoneofus AI</p>
                <div className="flex items-center gap-1 mt-px">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {isFetchingHist ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <Loader2 size={20} className="animate-spin text-blue-500" />
                <span className="text-xs font-medium">Loading…</span>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className="w-7 h-7 rounded-full shrink-0 overflow-hidden mt-0.5">
                      {msg.role === "user"
                        ? <div className="w-full h-full bg-blue-600 flex items-center justify-center"><User size={12} className="text-white" /></div>
                        : <Image src="/ai.gif" alt="AI" width={28} height={28} className="w-full h-full object-cover" unoptimized />}
                    </div>
                    <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : msg.isError
                          ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 rounded-tl-sm"
                          : "bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                    }`}>
                      {msg.role === "user" ? (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      ) : msg.isNew ? (
                        <Typewriter content={msg.content} onUpdate={scrollDown} />
                      ) : (
                        <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                      <Image src="/ai.gif" alt="AI" width={28} height={28} className="w-full h-full object-cover" unoptimized />
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3.5 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask beoneofus AI…"
                disabled={isLoading || isFetchingHist}
                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-400 dark:focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isFetchingHist}
                className="w-9 h-9 flex items-center justify-center bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all active:scale-95 shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* ── Speed-dial action stack ─────────────────────────────── */}
        {/*
         * Only shown when menuOpen is true (and chat is closed).
         * Items animate in from the bottom with a staggered delay
         * so they cascade upward one by one.
         * Rendered in reverse display order (closest to FAB last)
         * so stagger reads top-to-bottom visually.
         */}
        <div className="flex flex-col items-end gap-2 pointer-events-none mb-1">
          {ACTIONS.map((action, i) => {
            const Icon       = action.icon;
            // Stagger: first action (top) has the longest delay when entering
            const enterDelay = (totalItems - 1 - i) * 60;
            const shown      = menuOpen && !chatOpen;

            return (
              <div
                key={action.id}
                onClick={() => handleAction(action)}
                className={`
                  flex items-center gap-2.5
                  pl-3.5 pr-4 py-2.5
                  rounded-2xl cursor-pointer
                  shadow-[0_4px_16px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.05)]
                  dark:shadow-[0_4px_16px_rgba(0,0,0,0.35)]
                  hover:scale-[1.04] active:scale-95
                  whitespace-nowrap
                  pointer-events-auto
                  transition-all duration-200
                  ${action.bg} ${action.text} ${action.ring}
                  ${shown
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 translate-y-3 scale-95 pointer-events-none"}
                `}
                style={{ transitionDelay: shown ? `${enterDelay}ms` : "0ms" }}
                role="button"
                tabIndex={shown ? 0 : -1}
                aria-label={action.label}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  action.id === "chat"
                    ? "bg-white/20"
                    : "bg-gray-100 dark:bg-slate-700"
                }`}>
                  <Icon size={12} strokeWidth={2} />
                </div>
                <span className="text-[12.5px] font-bold">{action.label}</span>
              </div>
            );
          })}
        </div>

        {/* ── Main FAB ────────────────────────────────────────────── */}
        <button
          onClick={handleFabClick}
          className={`
            relative
            w-14 h-14 rounded-2xl
            bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-500
            hover:from-indigo-500 hover:via-blue-500 hover:to-blue-400
            shadow-[0_8px_24px_rgba(99,102,241,0.35),0_2px_8px_rgba(59,130,246,0.2)]
            hover:shadow-[0_12px_32px_rgba(99,102,241,0.45),0_4px_12px_rgba(59,130,246,0.3)]
            flex items-center justify-center
            border border-white/10
            transition-all duration-300
            hover:scale-[1.07] active:scale-95
          `}
          aria-label={isAnyOpen ? "Close" : "Open AI assistant menu"}
          aria-expanded={isAnyOpen}
        >
          {/* Subtle pulse ring when menu is closed */}
          {!isAnyOpen && (
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-blue-500/30 animate-ping opacity-30 pointer-events-none" />
          )}

          <span className={`transition-all duration-300 ease-in-out ${isAnyOpen ? "rotate-[135deg] scale-90" : "rotate-0 scale-100"}`}>
            {isAnyOpen
              ? <X size={20} className="text-white" strokeWidth={2.5} />
              : <Sparkles size={20} className="text-white" strokeWidth={2} />}
          </span>
        </button>

      </div>
    </>
  );
}
