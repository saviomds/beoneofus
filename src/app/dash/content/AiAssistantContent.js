"use client";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  Send, User, Loader2, RotateCcw, Copy, Check,
  ChevronDown, RefreshCw, Download, Sparkles,
  Code, Briefcase, BookOpen, Square,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, prism as syntaxLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { supabase } from "../../supabaseClient";
import { useLanguage } from "../../../lib/i18n";

// ─── Code block with copy button ──────────────────────────────────────────────
function CodeBlock({ match, children, ...props }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const code = String(children).replace(/\n$/, "");
  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl overflow-hidden my-3 border border-gray-200 dark:border-white/10 text-[11px]">
      <div className="bg-gray-100 dark:bg-[#1e2433] px-3 py-1.5 flex items-center justify-between border-b border-gray-200 dark:border-white/5">
        <span className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase tracking-widest">{match[1]}</span>
        <button onClick={copy}
          className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
          {copied ? <><Check size={10} /> {t("ai.copied")}</> : <><Copy size={10} /> {t("ai.copy")}</>}
        </button>
      </div>
      <SyntaxHighlighter
        {...props}
        style={isDark ? vscDarkPlus : syntaxLight}
        language={match[1]}
        PreTag="div"
        customStyle={{
          margin: 0, padding: "0.75rem",
          background: isDark ? "transparent" : "#f9fafb",
          fontSize: "0.8rem",
        }}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function CopyButton({ text, className = "" }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title={t("ai.copy")} className={`flex items-center gap-1 text-[10px] transition-all ${className}`}>
      {copied ? <><Check size={11} /> {t("ai.copied")}</> : <><Copy size={11} /> {t("ai.copy")}</>}
    </button>
  );
}

const markdownComponents = {
  p:      ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
  ul:     ({ node, ...props }) => <ul className="list-disc ml-5 mb-4 space-y-1" {...props} />,
  ol:     ({ node, ...props }) => <ol className="list-decimal ml-5 mb-4 space-y-1" {...props} />,
  li:     ({ node, ...props }) => <li className="pl-1" {...props} />,
  h1:     ({ node, ...props }) => <h1 className="text-xl font-black mb-3 mt-5" {...props} />,
  h2:     ({ node, ...props }) => <h2 className="text-lg font-bold mb-3 mt-5" {...props} />,
  h3:     ({ node, ...props }) => <h3 className="text-base font-bold mb-2 mt-4" {...props} />,
  a:      ({ node, ...props }) => <a className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match
      ? <CodeBlock match={match} {...props}>{children}</CodeBlock>
      : <code {...props} className="bg-gray-100 dark:bg-white/10 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono text-[12px]">{children}</code>;
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
    }, 10);
    return () => clearInterval(t);
  }, [content, onUpdate]);
  return <ReactMarkdown components={markdownComponents}>{shown}</ReactMarkdown>;
}

// ─── Modes ────────────────────────────────────────────────────────────────────
const MODES = [
  { id: "general",   labelKey: "ai.modes.general",   icon: <Sparkles size={12} /> },
  { id: "code",      labelKey: "ai.modes.code",      icon: <Code size={12} /> },
  { id: "career",    labelKey: "ai.modes.career",    icon: <Briefcase size={12} /> },
  { id: "interview", labelKey: "ai.modes.interview", icon: <BookOpen size={12} /> },
];

const SYSTEM_PROMPTS = {
  general:   "You are beoneofus AI, a helpful assistant for developers. Be concise, friendly, and practical.",
  code:      "You are beoneofus AI, a senior software engineer. Focus on code quality, best practices, and clear explanations. Always include working code examples.",
  career:    "You are beoneofus AI, a career coach for developers. Help with resumes, job searching, salary negotiation, and professional growth. Be direct and actionable.",
  interview: "You are beoneofus AI, a technical interview coach. Give mock interview questions, detailed answers, and study strategies. Be thorough and encouraging.",
};

const SUGGESTIONS = {
  general: [
    { labelKey: "ai.suggestions.general.career_advice",   prompt: "Give me career advice for a developer looking to grow professionally." },
    { labelKey: "ai.suggestions.general.review_code",     prompt: "Help me review and improve a piece of code." },
    { labelKey: "ai.suggestions.general.interview_prep",  prompt: "Help me prepare for a technical interview." },
    { labelKey: "ai.suggestions.general.project_ideas",   prompt: "Give me interesting portfolio project ideas for a developer." },
    { labelKey: "ai.suggestions.general.cover_letter",    prompt: "Help me write a professional cover letter for a developer role." },
    { labelKey: "ai.suggestions.general.explain_concept", prompt: "Explain async/await in JavaScript with clear examples." },
  ],
  code: [
    { labelKey: "ai.suggestions.code.debug",           prompt: "I have a bug in my code, can you help me debug it?" },
    { labelKey: "ai.suggestions.code.code_review",     prompt: "Please review this code and suggest improvements." },
    { labelKey: "ai.suggestions.code.binary_search",   prompt: "Explain how to implement a binary search algorithm with code." },
    { labelKey: "ai.suggestions.code.clean_code",      prompt: "What are the best practices for writing clean JavaScript?" },
    { labelKey: "ai.suggestions.code.design_patterns", prompt: "Explain the most useful design patterns for web development." },
    { labelKey: "ai.suggestions.code.api_design",      prompt: "Help me design a RESTful API for a social media app." },
  ],
  career: [
    { labelKey: "ai.suggestions.career.resume_tips",        prompt: "Help me improve my developer resume to stand out." },
    { labelKey: "ai.suggestions.career.salary_negotiation", prompt: "How should I negotiate my salary as a software developer?" },
    { labelKey: "ai.suggestions.career.cover_letter",       prompt: "Help me write a cover letter for a senior frontend role." },
    { labelKey: "ai.suggestions.career.career_switch",      prompt: "How do I transition from backend to full-stack development?" },
    { labelKey: "ai.suggestions.career.linkedin",           prompt: "Help me optimize my LinkedIn profile as a developer." },
    { labelKey: "ai.suggestions.career.portfolio",          prompt: "What should I include in my developer portfolio?" },
  ],
  interview: [
    { labelKey: "ai.suggestions.interview.mock_interview",   prompt: "Give me a mock technical interview for a frontend developer role." },
    { labelKey: "ai.suggestions.interview.system_design",    prompt: "How do I approach system design questions in interviews?" },
    { labelKey: "ai.suggestions.interview.behavioural",      prompt: "Help me prepare for common behavioral interview questions." },
    { labelKey: "ai.suggestions.interview.leetcode",         prompt: "How should I approach LeetCode problems effectively?" },
    { labelKey: "ai.suggestions.interview.react_qs",         prompt: "What are the most common questions asked in React interviews?" },
    { labelKey: "ai.suggestions.interview.coding_challenge", prompt: "Give me a coding challenge to practice my problem-solving skills." },
  ],
};

const INPUT_LIMIT = 2000;

export default function AiAssistantContent() {
  const { t } = useLanguage();
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState("");
  const [isLoading, setIsLoading]         = useState(false);
  const [isFetchingHistory, setFetching]  = useState(true);
  const [mode, setMode]                   = useState("general");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [abortCtrl, setAbortCtrl]         = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const scrollRef      = useRef(null);

  const hasMessages = messages.length > 0;

  // Pre-fill from the dashboard "assistant-first" bar (Home → Ask AI)
  useEffect(() => {
    try {
      const p = sessionStorage.getItem('ai_prefill');
      if (p) {
        setInput(p);
        sessionStorage.removeItem('ai_prefill');
        setTimeout(() => inputRef.current?.focus(), 60);
      }
    } catch { /* sessionStorage unavailable */ }
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  };

  // Load history
  useEffect(() => {
    if (!supabase) { setFetching(false); return; }
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase
          .from("ai_chat_messages")
          .select("role, content, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true });
        if (!error && data?.length) setMessages(data);
      }
      setFetching(false);
    };
    run();
  }, []);

  useEffect(() => { if (hasMessages) scrollToBottom(); }, [messages, hasMessages, scrollToBottom]);

  const adjustHeight = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  };

  const sendMessage = async (e, overrideText) => {
    e?.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    const userMsg = { role: "user", content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    if (inputRef.current) { inputRef.current.style.height = "auto"; }
    setIsLoading(true);
    setTimeout(() => inputRef.current?.focus(), 50);

    const ctrl = new AbortController();
    setAbortCtrl(ctrl);

    try {
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;

      if (session) {
        await supabase.from("ai_chat_messages").insert({
          user_id: session.user.id, role: "user", content: text,
        });
      }

      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPTS[mode] },
        ...[...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
      ];

      const res  = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      const aiMsg = { ...data.message, isNew: true, created_at: new Date().toISOString() };
      setMessages(prev => [...prev, aiMsg]);

      if (session) {
        await supabase.from("ai_chat_messages").insert({
          user_id: session.user.id, role: "assistant", content: data.message.content,
        });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: t("ai.error_generic", { message: err.message }),
          created_at: new Date().toISOString(),
        }]);
      }
    } finally {
      setIsLoading(false);
      setAbortCtrl(null);
    }
  };

  const stopGenerating = () => {
    abortCtrl?.abort();
    setIsLoading(false);
    setAbortCtrl(null);
  };

  const regenerate = () => {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    setMessages(prev => {
      const idx = [...prev].reverse().findIndex(m => m.role === "assistant");
      if (idx === -1) return prev;
      return prev.slice(0, prev.length - 1 - idx);
    });
    sendMessage(null, lastUser.content);
  };

  const clearChat = async () => {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.from("ai_chat_messages").delete().eq("user_id", session.user.id);
    }
    setMessages([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const exportChat = () => {
    const text = messages.map(m => `${m.role === "user" ? t("ai.you") : t("ai.ai_label")}: ${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "beoneofus-ai-chat.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const lastAiIdx = messages.length - 1 - [...messages].reverse().findIndex(m => m.role === "assistant");
  const hasLastAi = messages[lastAiIdx]?.role === "assistant";

  return (
    /* Root — relative so scroll button can be absolutely positioned inside */
    <div className="relative flex flex-col w-full h-full bg-white dark:bg-[#080d17] text-gray-900 dark:text-white overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-white/[0.07] bg-white/90 dark:bg-[#0a1020]/90 backdrop-blur-md shrink-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
            <Image src="/ai.gif" alt="beoneofus AI" width={32} height={32} unoptimized className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900 dark:text-white leading-none truncate">beoneofus AI</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse inline-block" />
              {t("ai.status", { mode: t(MODES.find(m => m.id === mode)?.labelKey || "ai.modes.general") })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasMessages && (
            <>
              <button onClick={exportChat} title={t("ai.export_chat")}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-all">
                <Download size={14} />
              </button>
              <button onClick={clearChat}
                className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all active:scale-95">
                <RotateCcw size={11} /> {t("ai.new_chat")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      {isFetchingHistory ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={22} className="animate-spin text-blue-500" />
        </div>

      ) : !hasMessages ? (
        /* Welcome */
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 gap-6 overflow-y-auto no-scrollbar min-h-0">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-48 h-48 rounded-full bg-blue-500/10 dark:bg-blue-600/20 blur-3xl" />
            <div className="absolute w-32 h-32 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-2xl" />
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-blue-200 dark:border-blue-500/25 shadow-xl shadow-blue-100 dark:shadow-blue-500/20">
              <Image src="/ai.gif" alt="beoneofus AI" width={144} height={144} unoptimized className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">{t("ai.how_can_help")}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
              {mode === "code"      && t("ai.desc_code")}
              {mode === "career"    && t("ai.desc_career")}
              {mode === "interview" && t("ai.desc_interview")}
              {mode === "general"   && t("ai.desc_general")}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-md">
            {SUGGESTIONS[mode].map((s, i) => (
              <button key={i} onClick={() => sendMessage(null, s.prompt)}
                className="text-left px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/[0.10] border border-gray-200 dark:border-white/[0.07] hover:border-gray-300 dark:hover:border-white/[0.16] text-[11px] sm:text-[12px] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 font-semibold leading-snug">
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        </div>

      ) : (
        /* Chat messages */
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 sm:px-5 py-5 space-y-4 min-h-0">

          {messages.map((msg, i) => {
            const isUser  = msg.role === "user";
            const timeStr = msg.created_at
              ? new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
              : "";
            return (
              <div key={i} className={`flex gap-2.5 w-full max-w-3xl group ${isUser ? "flex-row-reverse ml-auto" : "mr-auto"}`}>
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full shrink-0 mt-1 overflow-hidden flex items-center justify-center">
                  {isUser
                    ? <div className="w-full h-full bg-blue-600 flex items-center justify-center"><User size={13} className="text-white" /></div>
                    : <Image src="/ai.gif" alt="AI" width={28} height={28} unoptimized className="w-full h-full object-cover" />}
                </div>

                {/* Bubble */}
                <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[80%]">
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-gray-100 dark:bg-white/[0.07] border border-gray-200 dark:border-white/[0.08] text-gray-800 dark:text-gray-100 rounded-tl-sm"
                  }`}>
                    {isUser ? (
                      <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                    ) : msg.isNew ? (
                      <TypewriterMessage content={msg.content} onUpdate={() => scrollToBottom(false)} />
                    ) : (
                      <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                    )}
                  </div>

                  {/* Actions row — visible on hover */}
                  <div className={`flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? "justify-end" : "justify-start"}`}>
                    <span className="text-[9px] text-gray-400 dark:text-white/25">{timeStr}</span>
                    <CopyButton text={msg.content}
                      className={isUser
                        ? "text-gray-400 hover:text-gray-700 dark:text-white/40 dark:hover:text-white/80 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/10"
                        : "text-gray-400 hover:text-gray-700 dark:text-white/30 dark:hover:text-white/70 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/8"
                      } />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading dots */}
          {isLoading && (
            <div className="flex gap-2.5 max-w-3xl w-full mr-auto">
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-1">
                <Image src="/ai.gif" alt="AI" width={28} height={28} unoptimized className="w-full h-full object-cover" />
              </div>
              <div className="bg-gray-100 dark:bg-white/[0.07] border border-gray-200 dark:border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── Scroll-to-bottom — absolute inside root, above input bar ── */}
      {showScrollBtn && hasMessages && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-36 right-4 z-20 p-2.5 bg-white dark:bg-[#1a2236] border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e2840] rounded-full shadow-lg transition-all">
          <ChevronDown size={16} />
        </button>
      )}

      {/* ── Regenerate / Stop ── */}
      {hasMessages && (
        <div className="shrink-0 px-4 py-1.5 flex justify-center gap-3">
          {isLoading ? (
            <button onClick={stopGenerating}
              className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 bg-gray-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/10 border border-gray-200 dark:border-white/8 hover:border-red-200 dark:hover:border-red-500/30 px-3 py-1.5 rounded-full transition-all">
              <Square size={10} className="fill-current" /> {t("ai.stop_generating")}
            </button>
          ) : hasLastAi ? (
            <button onClick={regenerate}
              className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/8 px-3 py-1.5 rounded-full transition-all">
              <RefreshCw size={11} /> {t("ai.regenerate")}
            </button>
          ) : null}
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="shrink-0 px-3 sm:px-5 pt-1 pb-4 border-t border-gray-200 dark:border-white/[0.06] bg-white/90 dark:bg-[#0a1020]/90 backdrop-blur-md">
        <form onSubmit={sendMessage} className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => { setInput(e.target.value.slice(0, INPUT_LIMIT)); adjustHeight(e.target); }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); }
              }}
              placeholder={t("ai.input_placeholder")}
              disabled={isLoading || isFetchingHistory}
              className="w-full bg-gray-50 dark:bg-white/[0.07] border border-gray-200 dark:border-white/[0.12] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500/40 transition-all disabled:opacity-50 resize-none overflow-hidden leading-relaxed"
              style={{ minHeight: "48px", maxHeight: "140px" }}
            />
            {input.length > INPUT_LIMIT * 0.85 && (
              <span className={`absolute bottom-2 right-3 text-[9px] font-medium tabular-nums ${input.length >= INPUT_LIMIT ? "text-red-500" : "text-amber-500"}`}>
                {input.length}/{INPUT_LIMIT}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isFetchingHistory}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-blue-500/20 shrink-0 active:scale-95 mb-0.5">
            <Send size={16} />
          </button>
        </form>

        <div className="max-w-3xl mx-auto flex items-center justify-between mt-1.5 px-1">
          <div className="flex gap-1 flex-wrap">
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                  mode === m.id
                    ? "bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30"
                    : "text-gray-400 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/50"
                }`}>
                {t(m.labelKey)}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-gray-400 dark:text-white/20">{t("ai.disclaimer")}</p>
        </div>
      </div>
    </div>
  );
}
