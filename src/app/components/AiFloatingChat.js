"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, X, Loader2, User, Minimize2, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { supabase } from "../supabaseClient";

const md = {
  p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-3 space-y-0.5" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-3 space-y-0.5" {...props} />,
  li: ({ node, ...props }) => <li className="pl-0.5" {...props} />,
  h1: ({ node, ...props }) => <h1 className="text-base font-black mb-2 mt-4" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-sm font-bold mb-2 mt-3" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1 mt-3" {...props} />,
  a: ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div className="rounded-lg overflow-hidden my-2 border border-white/10 text-[11px]">
        <div className="bg-gray-800 px-3 py-1 text-[9px] font-mono text-gray-400 uppercase tracking-widest border-b border-white/5">
          {match[1]}
        </div>
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, padding: "0.6rem 0.75rem", background: "transparent", fontSize: "0.78rem" }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code {...props} className="bg-white/10 text-blue-200 px-1 py-0.5 rounded font-mono text-[11px]">
        {children}
      </code>
    );
  },
};

function TypewriterMsg({ content, onUpdate }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setShown(content.slice(0, i + 1));
      i++;
      onUpdate?.();
      if (i >= content.length) clearInterval(t);
    }, 12);
    return () => clearInterval(t);
  }, [content, onUpdate]);
  return <ReactMarkdown components={md}>{shown}</ReactMarkdown>;
}

const WELCOME = "Hi! I'm beoneofus AI. Ask me anything — career advice, code help, platform features.";

export default function AiFloatingChat() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady]     = useState(false);
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const initialized = useRef(false);

  const scrollDown = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* Load history once when panel first opens */
  useEffect(() => {
    if (!open || initialized.current) return;
    initialized.current = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("ai_chat_messages")
          .select("role, content")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true })
          .limit(40);
        if (data?.length) {
          setMessages(data);
          setReady(true);
          return;
        }
      }
      setMessages([{ role: "assistant", content: WELCOME }]);
      setReady(true);
    })();
  }, [open]);

  useEffect(() => { scrollDown(); }, [messages, scrollDown]);

  /* Focus input when panel opens */
  useEffect(() => {
    if (open && ready) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open, ready]);

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("ai_chat_messages").insert({ user_id: session.user.id, role: "user", content: text });
      }

      const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res  = await fetch("/api/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: apiMessages }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");

      setMessages(prev => [...prev, { ...json.message, isNew: true }]);
      if (session) {
        await supabase.from("ai_chat_messages").insert({ user_id: session.user.id, role: "assistant", content: json.message.content });
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("ai_chat_messages").delete().eq("user_id", session.user.id);
    }
    setMessages([{ role: "assistant", content: WELCOME }]);
  };

  return (
    <>
      {/* Slide-in panel */}
      <div
        className={`
          fixed z-[65]
          right-3 bottom-[76px]
          md:right-5 md:bottom-[76px]
          lg:bottom-6
          w-[calc(100vw-24px)] max-w-[400px]
          transition-all duration-300 ease-out origin-bottom-right
          ${open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}
        `}
      >
        <div className="flex flex-col bg-[#0f1723] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden h-[520px] max-h-[70vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#0a1020] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
                <Bot size={14} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-white">beoneofus AI</p>
                <p className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clear}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                title="Clear chat"
              >
                <RotateCcw size={12} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <Minimize2 size={12} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {!ready ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={20} className="animate-spin text-blue-400" />
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-white/10 text-blue-300"}`}>
                      {msg.role === "user" ? <User size={11} /> : <Bot size={11} />}
                    </div>
                    <div className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white/[0.08] text-gray-100 border border-white/[0.08] rounded-tl-sm"}`}>
                      {msg.role === "user" ? (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      ) : msg.isNew ? (
                        <TypewriterMsg content={msg.content} onUpdate={scrollDown} />
                      ) : (
                        <ReactMarkdown components={md}>{msg.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 text-blue-300 flex items-center justify-center shrink-0">
                      <Bot size={11} />
                    </div>
                    <div className="bg-white/[0.08] border border-white/[0.08] rounded-xl rounded-tl-sm px-3 py-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-white/[0.08] shrink-0 bg-[#0a1020]">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything…"
              disabled={loading || !ready}
              className="flex-1 bg-white/[0.08] border border-white/[0.12] text-white placeholder-gray-500 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || !ready}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-md shadow-blue-600/25 shrink-0"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      </div>

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`
          fixed z-[65]
          bottom-[76px] right-3
          md:bottom-[76px] md:right-5
          lg:bottom-6 lg:right-6
          w-12 h-12 rounded-2xl shadow-xl transition-all duration-300
          flex items-center justify-center
          ${open
            ? "bg-gray-800 text-gray-300 hover:bg-gray-700 shadow-black/30"
            : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/35 hover:scale-105"
          }
        `}
        aria-label="Toggle AI assistant"
      >
        {open ? <X size={18} /> : <Bot size={20} />}
      </button>
    </>
  );
}
