"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, Send, RotateCcw, Copy, Check, Square,
  Code2, Briefcase, BookOpen, FileText, Lightbulb, Target,
  Sparkles, ChevronDown, Download, ThumbsUp, ThumbsDown,
  Zap, Globe, Shield, TrendingUp, Users, Heart,
  RefreshCw, Hash, ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { supabase } from "../../supabaseClient";

/* ── Code block ─────────────────────────────────────────────── */
function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden my-3 border border-white/[0.08]">
      <div className="bg-[#0b1424] px-3 py-2 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500/60" />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{language || "code"}</span>
        </div>
        <button
          onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-md hover:bg-white/[0.06]"
        >
          {copied ? <><Check size={9} className="text-emerald-400" /> Copied</> : <><Copy size={9} /> Copy</>}
        </button>
      </div>
      <SyntaxHighlighter style={vscDarkPlus} language={language} PreTag="div"
        customStyle={{ margin: 0, padding: "0.875rem", background: "#060c18", fontSize: "0.775rem", lineHeight: 1.65 }}>
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

/* ── Markdown renderers ─────────────────────────────────────── */
const md = {
  p:          ({ node, ...p }) => <p className="mb-3 last:mb-0 leading-relaxed" {...p} />,
  ul:         ({ node, ...p }) => <ul className="list-disc ml-5 mb-3 space-y-1.5" {...p} />,
  ol:         ({ node, ...p }) => <ol className="list-decimal ml-5 mb-3 space-y-1.5" {...p} />,
  li:         ({ node, ...p }) => <li className="pl-1 leading-relaxed" {...p} />,
  h1:         ({ node, ...p }) => <h1 className="text-xl font-black mb-3 mt-5 text-white" {...p} />,
  h2:         ({ node, ...p }) => <h2 className="text-lg font-bold mb-2 mt-4 text-white" {...p} />,
  h3:         ({ node, ...p }) => <h3 className="text-base font-semibold mb-2 mt-3 text-white/90" {...p} />,
  a:          ({ node, ...p }) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer" {...p} />,
  strong:     ({ node, ...p }) => <strong className="font-bold text-white" {...p} />,
  em:         ({ node, ...p }) => <em className="italic text-gray-300" {...p} />,
  blockquote: ({ node, ...p }) => <blockquote className="border-l-2 border-blue-500/40 pl-4 my-2 text-gray-400 italic" {...p} />,
  hr:         () => <hr className="border-white/[0.08] my-4" />,
  table:      ({ node, ...p }) => <div className="overflow-x-auto my-3"><table className="text-sm w-full border-collapse" {...p} /></div>,
  thead:      ({ node, ...p }) => <thead className="bg-white/[0.04]" {...p} />,
  th:         ({ node, ...p }) => <th className="border border-white/[0.08] px-3 py-2 text-left text-xs font-semibold text-gray-300" {...p} />,
  td:         ({ node, ...p }) => <td className="border border-white/[0.06] px-3 py-2 text-xs text-gray-400" {...p} />,
  code({ node, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    if (match) return <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} />;
    return <code {...props} className="bg-white/[0.08] text-blue-300 px-1.5 py-0.5 rounded font-mono text-[12px]">{children}</code>;
  },
};

/* ── Typewriter ──────────────────────────────────────────────── */
function Typewriter({ content, onUpdate }) {
  const [shown, setShown] = useState("");
  const [done,  setDone]  = useState(false);
  useEffect(() => {
    let i = 0;
    Promise.resolve().then(() => { setShown(""); setDone(false); });
    const t = setInterval(() => {
      setShown(content.slice(0, ++i));
      onUpdate?.();
      if (i >= content.length) { clearInterval(t); setDone(true); }
    }, 8);
    return () => clearInterval(t);
  }, [content, onUpdate]);
  return (
    <>
      <ReactMarkdown components={md}>{shown}</ReactMarkdown>
      {!done && <span className="inline-block w-0.5 h-3.5 bg-blue-400/80 animate-pulse ml-px rounded-sm align-middle" />}
    </>
  );
}

/* ── Loading skeleton ────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
      {/* Animated logo area */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/[0.10] shadow-2xl shadow-blue-900/30">
          <Image src="/ai.gif" alt="AI" width={80} height={80} unoptimized className="w-full h-full object-cover" />
        </div>
        <div className="absolute -inset-3 rounded-3xl border border-blue-500/[0.12] animate-ping" style={{ animationDuration: "2s" }} />
        <div className="absolute -inset-6 rounded-3xl border border-blue-500/[0.06] animate-ping" style={{ animationDuration: "2s", animationDelay: "0.4s" }} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-blue-500/60 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
        <p className="text-xs text-gray-600 tracking-wider">Loading your AI assistant…</p>
      </div>
      {/* Skeleton messages */}
      <div className="w-full max-w-lg space-y-4 opacity-30">
        {[70, 45, 85].map((w, i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 1 ? "flex-row-reverse" : ""}`}>
            <div className="w-7 h-7 rounded-full bg-white/[0.06] shrink-0" />
            <div className={`h-8 rounded-2xl bg-white/[0.05] animate-pulse`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Timestamp ───────────────────────────────────────────────── */
const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

/* ── Export chat as text ─────────────────────────────────────── */
function exportChat(messages) {
  const lines = messages.map(m =>
    `[${m.role === "assistant" ? "beoneofus AI" : "You"}] ${fmtTime(m.time) || ""}\n${m.content}\n`
  );
  const blob = new Blob([lines.join("\n---\n\n")], { type: "text/plain" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `beoneofus-ai-chat-${new Date().toISOString().slice(0,10)}.txt`;
  a.click(); URL.revokeObjectURL(a.href);
}

/* ── Suggestion categories ───────────────────────────────────── */
const SUGGESTIONS = [
  { Icon: Briefcase, label: "Career advice",    color: "blue",   prompt: "Give me actionable career advice for a developer looking to grow professionally and get promoted." },
  { Icon: Code2,     label: "Code review",      color: "indigo", prompt: "Help me review and improve a piece of code I'm working on. I'll share it with you." },
  { Icon: Target,    label: "Interview prep",   color: "purple", prompt: "Help me prepare for a technical interview. Give me common questions and tips to ace them." },
  { Icon: FileText,  label: "Cover letter",     color: "pink",   prompt: "Help me write a professional, compelling cover letter for a senior developer role." },
  { Icon: Lightbulb, label: "Project ideas",    color: "amber",  prompt: "Give me 5 creative, portfolio-worthy project ideas for a developer that can impress employers." },
  { Icon: BookOpen,  label: "Learn a concept",  color: "green",  prompt: "Explain async/await in JavaScript with clear, practical examples a beginner can understand." },
  { Icon: TrendingUp,label: "Salary negotiation",color:"emerald",prompt: "Help me negotiate a higher salary. Give me scripts, tactics, and what to say when they lowball me." },
  { Icon: Globe,     label: "Remote jobs",      color: "cyan",   prompt: "What are the best strategies to land a high-paying remote tech job in 2025?" },
  { Icon: Users,     label: "LinkedIn profile", color: "sky",    prompt: "Help me optimize my LinkedIn profile to attract recruiters and land more interviews." },
  { Icon: Shield,    label: "Cybersecurity",    color: "red",    prompt: "Explain the top cybersecurity threats every developer should know and how to defend against them." },
  { Icon: Hash,      label: "System design",    color: "violet", prompt: "Walk me through how to design a scalable URL shortener like bit.ly — including architecture." },
  { Icon: Heart,     label: "Work-life balance",color: "rose",   prompt: "How do I prevent burnout as a developer while still growing my career? Give practical tips." },
];

const COLOR_MAP = {
  blue:    { icon: "text-blue-400",    bg: "bg-blue-500/[0.06]",    border: "border-blue-500/[0.12]",    hover: "hover:border-blue-500/30 hover:bg-blue-500/[0.12]"    },
  indigo:  { icon: "text-indigo-400",  bg: "bg-indigo-500/[0.06]",  border: "border-indigo-500/[0.12]",  hover: "hover:border-indigo-500/30 hover:bg-indigo-500/[0.12]"  },
  purple:  { icon: "text-purple-400",  bg: "bg-purple-500/[0.06]",  border: "border-purple-500/[0.12]",  hover: "hover:border-purple-500/30 hover:bg-purple-500/[0.12]"  },
  pink:    { icon: "text-pink-400",    bg: "bg-pink-500/[0.06]",    border: "border-pink-500/[0.12]",    hover: "hover:border-pink-500/30 hover:bg-pink-500/[0.12]"    },
  amber:   { icon: "text-amber-400",   bg: "bg-amber-500/[0.06]",   border: "border-amber-500/[0.12]",   hover: "hover:border-amber-500/30 hover:bg-amber-500/[0.12]"   },
  green:   { icon: "text-green-400",   bg: "bg-green-500/[0.06]",   border: "border-green-500/[0.12]",   hover: "hover:border-green-500/30 hover:bg-green-500/[0.12]"   },
  emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/[0.06]", border: "border-emerald-500/[0.12]", hover: "hover:border-emerald-500/30 hover:bg-emerald-500/[0.12]" },
  cyan:    { icon: "text-cyan-400",    bg: "bg-cyan-500/[0.06]",    border: "border-cyan-500/[0.12]",    hover: "hover:border-cyan-500/30 hover:bg-cyan-500/[0.12]"    },
  sky:     { icon: "text-sky-400",     bg: "bg-sky-500/[0.06]",     border: "border-sky-500/[0.12]",     hover: "hover:border-sky-500/30 hover:bg-sky-500/[0.12]"     },
  red:     { icon: "text-red-400",     bg: "bg-red-500/[0.06]",     border: "border-red-500/[0.12]",     hover: "hover:border-red-500/30 hover:bg-red-500/[0.12]"     },
  violet:  { icon: "text-violet-400",  bg: "bg-violet-500/[0.06]",  border: "border-violet-500/[0.12]",  hover: "hover:border-violet-500/30 hover:bg-violet-500/[0.12]"  },
  rose:    { icon: "text-rose-400",    bg: "bg-rose-500/[0.06]",    border: "border-rose-500/[0.12]",    hover: "hover:border-rose-500/30 hover:bg-rose-500/[0.12]"    },
};

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function BeoneofusAiPage() {
  const router = useRouter();

  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [fetching,  setFetching]  = useState(true);
  const [copied,    setCopied]    = useState(null);
  const [feedback,  setFeedback]  = useState({}); // { [idx]: "up"|"down" }
  const [showScroll,setShowScroll]= useState(false);

  const messagesRef = useRef([]);
  const endRef      = useRef(null);
  const textareaRef = useRef(null);
  const abortRef    = useRef(null);
  const bodyRef     = useRef(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const scrollDown = useCallback((force = false) => {
    if (force) endRef.current?.scrollIntoView({ behavior: "smooth" });
    else       endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  /* ── Scroll-to-bottom visibility ── */
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScroll(dist > 200);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Load chat history ── */
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase
          .from("ai_chat_messages")
          .select("role, content")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true })
          .limit(60);
        if (!error && data?.length) setMessages(data);
      }
      setFetching(false);
      setTimeout(() => textareaRef.current?.focus(), 120);
    })();
  }, []);

  useEffect(() => { scrollDown(); }, [messages, scrollDown]);

  /* ── Auto-resize textarea ── */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  /* ── API call ── */
  const callApi = async (history, signal) => {
    const res  = await fetch("/api/chats", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messages: history }),
      signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data.message.content;
  };

  /* ── Send message ── */
  const send = async (e, override) => {
    e?.preventDefault();
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const now     = Date.now();
    const userMsg = { role: "user", content: text, time: now };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => scrollDown(true), 50);

    let session = null;
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      session = s;
      if (session) await supabase.from("ai_chat_messages").insert({ user_id: session.user.id, role: "user", content: text });

      abortRef.current = new AbortController();
      const history = [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content }));
      const content = await callApi(history, abortRef.current.signal);

      const aiMsg = { role: "assistant", content, isNew: true, time: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
      if (session) await supabase.from("ai_chat_messages").insert({ user_id: session.user.id, role: "assistant", content });
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `**Something went wrong.** ${err.message}\n\nPlease try again or check your connection.`,
          time: Date.now(),
          isError: true,
        }]);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  /* ── Regenerate last AI response ── */
  const regenerate = async () => {
    const msgs = messagesRef.current;
    if (!msgs.length || loading) return;
    const lastUser = [...msgs].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    setMessages(prev => prev.filter((_, i) => i < prev.length - (prev[prev.length-1].role === "assistant" ? 1 : 0)));
    await send(null, lastUser.content);
  };

  const clearChat = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await supabase.from("ai_chat_messages").delete().eq("user_id", session.user.id);
    setMessages([]);
    setFeedback({});
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const copyMsg = async (content, idx) => {
    await navigator.clipboard.writeText(content);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const hasMessages = messages.length > 0;
  const charCount   = input.length;

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div
      className="relative flex flex-col h-screen text-white overflow-hidden"
      style={{
        background: "#050913",
        backgroundImage: "radial-gradient(rgba(59,130,246,0.022) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* ══ HEADER ══ */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-5 h-[58px] border-b border-white/[0.06] bg-[#07101e]/95 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.07] transition-all"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/[0.10] shrink-0 shadow-lg shadow-blue-900/20">
              <Image src="/ai.gif" alt="AI" width={36} height={36} unoptimized className="w-full h-full object-cover" />
              <div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#07101e]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-black text-white leading-none tracking-tight">beoneofus AI</p>
                <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/20 text-[9px] font-bold text-blue-300 tracking-wide">PRO</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Zap size={9} className="text-amber-400" />
                <span className="text-[10px] text-gray-500 font-medium">GPT-4 · Groq · Always on</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {hasMessages && (
            <>
              <button
                onClick={() => exportChat(messages)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-all"
                title="Export chat"
              >
                <Download size={14} />
              </button>
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all"
                title="New chat"
              >
                <RotateCcw size={10} />
                <span className="hidden sm:inline">New chat</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ══ BODY ══ */}
      {fetching ? (
        <LoadingSkeleton />

      ) : !hasMessages ? (
        /* ── Welcome screen ── */
        <div className="flex-1 overflow-y-auto" ref={bodyRef}>
          <div className="min-h-full flex flex-col items-center justify-start px-4 gap-7 py-8 max-w-2xl mx-auto">

            {/* Hero */}
            <div className="flex flex-col items-center gap-4 text-center pt-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 blur-2xl scale-150" />
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/[0.10] shadow-2xl shadow-blue-900/40">
                  <Image src="/ai.gif" alt="beoneofus AI" width={80} height={80} unoptimized className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center border-2 border-[#050913] shadow-lg">
                  <Sparkles size={11} className="text-white" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  Your AI Career{" "}
                  <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Co-pilot
                  </span>
                </h1>
                <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                  Built for professionals. Ask anything about careers, code, interviews, or business strategy.
                </p>
              </div>

              {/* Capability pills */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { icon: Code2,      label: "Write code" },
                  { icon: Briefcase,  label: "Career growth" },
                  { icon: Target,     label: "Interview prep" },
                  { icon: TrendingUp, label: "Business advice" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-gray-400">
                    <Icon size={11} className="text-blue-400/70" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="w-full">
              <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                <ChevronRight size={10} />
                Try asking
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SUGGESTIONS.map(({ Icon, label, color, prompt }, i) => {
                  const c = COLOR_MAP[color];
                  return (
                    <button
                      key={i}
                      onClick={() => send(null, prompt)}
                      className={`group flex items-center gap-2.5 text-left px-3.5 py-3 rounded-xl border transition-all duration-200 active:scale-[0.97] ${c.bg} ${c.border} ${c.hover}`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.04]`}>
                        <Icon size={14} className={c.icon} />
                      </div>
                      <p className="text-[11px] font-semibold text-gray-300 group-hover:text-white transition-colors leading-snug">{label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer note */}
            <p className="text-[10px] text-gray-700 text-center pb-2">
              Powered by GPT-4 with Groq fallback · Verify important information independently
            </p>
          </div>
        </div>

      ) : (
        /* ── Chat messages ── */
        <div className="flex-1 overflow-y-auto min-h-0 relative" ref={bodyRef}>
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                {msg.role === "assistant" ? (
                  <div className="group flex gap-3">
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 border border-white/[0.08] shadow-sm">
                      <Image src="/ai.gif" alt="AI" width={28} height={28} unoptimized className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-[11px] font-black text-blue-400 tracking-wide">beoneofus AI</p>
                        {msg.time && <span className="text-[10px] text-gray-700">{fmtTime(msg.time)}</span>}
                        {msg.isError && <span className="text-[10px] text-red-400/70 border border-red-500/20 px-1.5 py-0.5 rounded-md">Error</span>}
                      </div>
                      <div className="relative pl-3">
                        <div className={`absolute left-0 top-1 bottom-1 w-0.5 rounded-full ${msg.isError ? "bg-red-500/40" : "bg-gradient-to-b from-blue-500/70 via-indigo-500/50 to-purple-600/40"}`} />
                        <div className="text-sm text-gray-200 leading-relaxed">
                          {msg.isNew
                            ? <Typewriter content={msg.content} onUpdate={scrollDown} />
                            : <ReactMarkdown components={md}>{msg.content}</ReactMarkdown>}
                        </div>
                      </div>
                      {/* Actions row */}
                      <div className="mt-2 ml-3 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyMsg(msg.content, i)}
                          className="flex items-center gap-1 text-[10px] text-gray-700 hover:text-gray-400 transition-colors">
                          {copied === i ? <><Check size={9} className="text-emerald-400" /> Copied</> : <><Copy size={9} /> Copy</>}
                        </button>
                        <button onClick={() => setFeedback(f => ({ ...f, [i]: f[i] === "up" ? null : "up" }))}
                          className={`text-[10px] transition-colors flex items-center gap-0.5 ${feedback[i] === "up" ? "text-emerald-400" : "text-gray-700 hover:text-gray-400"}`}>
                          <ThumbsUp size={9} />
                        </button>
                        <button onClick={() => setFeedback(f => ({ ...f, [i]: f[i] === "down" ? null : "down" }))}
                          className={`text-[10px] transition-colors flex items-center gap-0.5 ${feedback[i] === "down" ? "text-red-400" : "text-gray-700 hover:text-gray-400"}`}>
                          <ThumbsDown size={9} />
                        </button>
                        {i === messages.length - 1 && !loading && (
                          <button onClick={regenerate}
                            className="flex items-center gap-1 text-[10px] text-gray-700 hover:text-blue-400 transition-colors">
                            <RefreshCw size={9} /> Regenerate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="flex flex-col items-end gap-1 max-w-[82%] sm:max-w-[70%]">
                      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 leading-relaxed whitespace-pre-wrap shadow-lg shadow-blue-700/20">
                        {msg.content}
                      </div>
                      {msg.time && <span className="text-[10px] text-gray-700 pr-1">{fmtTime(msg.time)}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Thinking indicator */}
            {loading && (
              <div className="flex gap-3 animate-in fade-in duration-200">
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/[0.08]">
                  <Image src="/ai.gif" alt="AI" width={28} height={28} unoptimized className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-blue-400 tracking-wide mb-2">beoneofus AI</p>
                  <div className="flex items-center gap-1.5 pl-3">
                    <div className="relative pl-0 flex gap-1">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-blue-500/60 animate-bounce"
                          style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-700 animate-pulse">Thinking…</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Scroll to bottom FAB */}
          {showScroll && (
            <button
              onClick={() => scrollDown(true)}
              className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-[#07101e] border border-white/[0.10] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 shadow-xl transition-all animate-in fade-in zoom-in-75 duration-200"
            >
              <ChevronDown size={16} />
            </button>
          )}
        </div>
      )}

      {/* ══ INPUT BAR ══ */}
      <div className="shrink-0 border-t border-white/[0.05] bg-[#07101e]/95 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>

          <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2.5 focus-within:border-blue-500/30 focus-within:bg-white/[0.055] transition-all duration-200">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything… (Shift+Enter for new line)"
              disabled={loading || fetching}
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-700 resize-none focus:outline-none disabled:opacity-40 leading-relaxed py-1"
              style={{ maxHeight: "160px", overflowY: "auto" }}
            />

            <div className="flex items-center gap-1.5 shrink-0 mb-0.5">
              {charCount > 0 && (
                <span className={`text-[10px] font-mono ${charCount > 3500 ? "text-amber-400" : "text-gray-700"}`}>
                  {charCount}
                </span>
              )}
              {loading ? (
                <button
                  onClick={() => abortRef.current?.abort()}
                  title="Stop generating"
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.08] hover:bg-red-500/10 hover:border-red-500/20 text-gray-300 hover:text-red-400 transition-all active:scale-95 border border-white/[0.08]"
                >
                  <Square size={11} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={send}
                  disabled={!input.trim()}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-20 disabled:cursor-not-allowed text-white transition-all active:scale-95 shadow-md shadow-blue-600/25"
                >
                  <Send size={13} />
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-[10px] text-gray-800 mt-2 select-none">
            beoneofus AI · GPT-4 powered · Verify important information
          </p>
        </div>
      </div>
    </div>
  );
}
