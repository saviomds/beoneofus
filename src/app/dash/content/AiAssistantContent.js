"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, User, Loader2, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { supabase } from "../../supabaseClient";

const markdownComponents = {
  p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-4 space-y-1" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-4 space-y-1" {...props} />,
  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
  h1: ({ node, ...props }) => <h1 className="text-xl font-black mb-3 mt-5" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-3 mt-5" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-base font-bold mb-2 mt-4" {...props} />,
  a: ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div className="rounded-xl overflow-hidden my-3 border border-white/10 text-[11px]">
        <div className="bg-gray-800 px-3 py-1.5 text-[9px] font-mono text-gray-400 uppercase tracking-widest border-b border-white/5">
          {match[1]}
        </div>
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, padding: "0.75rem", background: "transparent", fontSize: "0.8rem" }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code {...props} className="bg-white/10 text-blue-300 px-1.5 py-0.5 rounded font-mono text-[12px]">
        {children}
      </code>
    );
  },
};

function TypewriterMessage({ content, onUpdate }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setShown(content.slice(0, i + 1));
      i++;
      onUpdate?.();
      if (i >= content.length) clearInterval(t);
    }, 13);
    return () => clearInterval(t);
  }, [content, onUpdate]);
  return <ReactMarkdown components={markdownComponents}>{shown}</ReactMarkdown>;
}

const SUGGESTIONS = [
  { label: "Career advice",        prompt: "Give me career advice for a developer looking to grow professionally." },
  { label: "Review my code",       prompt: "Help me review and improve a piece of code." },
  { label: "Interview prep",       prompt: "Help me prepare for a technical interview." },
  { label: "Project ideas",        prompt: "Give me interesting portfolio project ideas for a developer." },
  { label: "Write a cover letter", prompt: "Help me write a professional cover letter for a developer role." },
  { label: "Explain a concept",    prompt: "Explain async/await in JavaScript with clear examples." },
];

export default function AiAssistantContent() {
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState("");
  const [isLoading, setIsLoading]         = useState(false);
  const [isFetchingHistory, setFetching]  = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const hasMessages = messages.length > 0;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const fetch_ = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase
          .from("ai_chat_messages")
          .select("role, content")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true });
        if (!error && data?.length) setMessages(data);
      }
      setFetching(false);
    };
    fetch_();
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async (e, overrideText) => {
    e?.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setTimeout(() => inputRef.current?.focus(), 50);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("ai_chat_messages").insert({
          user_id: session.user.id, role: "user", content: text,
        });
      }

      const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res  = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setMessages(prev => [...prev, { ...data.message, isNew: true }]);
      if (session) {
        await supabase.from("ai_chat_messages").insert({
          user_id: session.user.id, role: "assistant", content: data.message.content,
        });
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await supabase.from("ai_chat_messages").delete().eq("user_id", session.user.id);
    setMessages([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#080d17] text-white overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] bg-[#0a1020]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 shrink-0">
            <img src="/ai.gif" alt="beoneofus AI" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-black text-white leading-none">beoneofus AI</p>
            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Online
            </p>
          </div>
        </div>

        {hasMessages && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all active:scale-95"
          >
            <RotateCcw size={11} /> New chat
          </button>
        )}
      </div>

      {/* ── Body ── */}
      {isFetchingHistory ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-blue-400" />
        </div>

      ) : !hasMessages ? (
        /* Welcome state */
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6 gap-7">

          {/* ai.gif with glow */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-48 h-48 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="absolute w-32 h-32 rounded-full bg-indigo-500/15 blur-2xl" />
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-2 border-blue-500/25 shadow-2xl shadow-blue-500/20">
              <img src="/ai.gif" alt="beoneofus AI" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">How can I help you?</h1>
            <p className="text-sm text-gray-400 max-w-xs">
              Ask me about career, code, interviews, or anything on your mind.
            </p>
          </div>

          {/* Suggestion chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-md">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(null, s.prompt)}
                className="text-left px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.08] hover:border-white/[0.18] text-[12px] text-gray-300 hover:text-white transition-all active:scale-95 font-semibold"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

      ) : (
        /* Chat messages */
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 min-h-0">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 w-full max-w-3xl ${msg.role === "user" ? "flex-row-reverse ml-auto" : "mr-auto"}`}
            >
              <div className="w-7 h-7 rounded-full shrink-0 mt-0.5 overflow-hidden flex items-center justify-center">
                {msg.role === "user"
                  ? <div className="w-full h-full bg-blue-600 flex items-center justify-center"><User size={13} className="text-white" /></div>
                  : <img src="/ai.gif" alt="AI" className="w-full h-full object-cover" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-white/[0.07] border border-white/[0.08] text-gray-100 rounded-tl-sm"
              }`}>
                {msg.role === "user" ? (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                ) : msg.isNew ? (
                  <TypewriterMessage content={msg.content} onUpdate={scrollToBottom} />
                ) : (
                  <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-3xl w-full mr-auto">
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5">
                <img src="/ai.gif" alt="AI" className="w-full h-full object-cover" />
              </div>
              <div className="bg-white/[0.07] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── Input ── */}
      <div className="shrink-0 px-4 py-4 border-t border-white/[0.07] bg-[#0a1020]/90 backdrop-blur-md">
        <form
          onSubmit={sendMessage}
          className="flex items-center gap-2 max-w-3xl mx-auto"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask beoneofus AI anything…"
            disabled={isLoading || isFetchingHistory}
            className="flex-1 bg-white/[0.07] border border-white/[0.12] text-white placeholder-gray-500 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isFetchingHistory}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-blue-500/20 shrink-0 active:scale-95"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-600 mt-2.5">
          beoneofus AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
