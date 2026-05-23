"use client";
import { useState, useRef, useEffect } from "react";
import {
  HelpCircle, Send, Loader2, Check, X, RefreshCw, ChevronRight,
  MessageSquare, Bot, Zap, BookOpen, FileText, Clock, CheckCircle2,
  Heart, UserPlus, Handshake, Users, Bell,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { Toast, useToast } from "./shared";

function TypewriterMessage({ content }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { setDisplayed(content.slice(0, i + 1)); i++; if (i >= content.length) clearInterval(t); }, 12);
    return () => clearInterval(t);
  }, [content]);
  return <ReactMarkdown components={mdComponents}>{displayed}</ReactMarkdown>;
}

const SUPPORT_CATEGORIES = [
  { id: "technical", label: "Technical Issue", color: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40" },
  { id: "account",   label: "Account & Profile", color: "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40" },
  { id: "feature",   label: "Feature Request", color: "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/40" },
  { id: "billing",   label: "Billing & Premium", color: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40" },
  { id: "bug",       label: "Bug Report", color: "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/40" },
  { id: "general",   label: "General Question", color: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40" },
];

const QUICK_PROMPTS = [
  "How do I reset my password?",
  "Why is my profile not showing up in search?",
  "How do I connect with another user?",
  "How do I upgrade to Premium?",
  "I can't upload a profile picture",
  "How do I delete my account?",
];

const FAQ_ITEMS = [
  {
    q: "How do I verify my profile?",
    a: "Go to **Settings → Profile** and click **Request Verification**. Our team reviews accounts within 48 hours. You need at least one connection and a complete profile to be eligible.",
  },
  {
    q: "Why aren't my notifications loading?",
    a: "Try a hard refresh (`Ctrl+Shift+R`). If the issue persists, clear your browser cache or check your notification permissions in **Settings → Notifications**.",
  },
  {
    q: "How do I cancel my Premium subscription?",
    a: "Navigate to **Settings → Billing** and click **Cancel Subscription**. Your Premium access continues until the end of the current billing period.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Go to **Settings → Privacy** and click **Download my data**. A JSON export will be emailed to your registered address within 24 hours.",
  },
  {
    q: "How does the AI Assistant work?",
    a: "The beoneofus AI uses large language models to provide career guidance, code review, and support. Conversations are not stored beyond your current session unless you explicitly save them.",
  },
  {
    q: "How do I report a user or content?",
    a: "Click the **⋯** menu on any post or profile and select **Report**. Our moderation team reviews all reports within 24 hours.",
  },
];

const SupportTool = () => {
  const [issue, setIssue] = useState("");
  const [category, setCategory] = useState("general");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [ratings, setRatings] = useState({});
  const [openFaq, setOpenFaq] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isProcessing]);

  const handleSubmit = async (text) => {
    const cur = (text || issue).trim();
    if (!cur || isProcessing) return;
    setIssue("");
    const msgId = Date.now();
    setMessages(prev => [...prev, { id: msgId, role: "user", content: cur, category }]);
    setIsProcessing(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: `You are the expert support AI for beoneofus — a professional networking and career platform. Category: ${category}. User issue: "${cur}". Respond with empathy and precision. Use markdown for structure when helpful.` }] }),
      });
      const responseText = await res.text();
      let data;
      try { data = JSON.parse(responseText); } catch { throw new Error("AI service unavailable. Try again shortly."); }
      if (!res.ok) throw new Error(data.error || "Failed to get response");
      setMessages(prev => [...prev, { id: Date.now(), role: "ai", content: data.message.content.replace(/^["']|["']$/g, "").trim(), isNew: true }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), role: "ai", content: `**Error:** ${err.message}`, isNew: false, isError: true }]);
    } finally { setIsProcessing(false); }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); });
  };

  const handleRate = (id, val) => setRatings(prev => ({ ...prev, [id]: prev[id] === val ? null : val }));

  const catColor = SUPPORT_CATEGORIES.find(c => c.id === category)?.color || "";

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-4">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-900 p-5 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 backdrop-blur-sm">
            <HelpCircle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="font-black text-base">Help & Support</h2>
              <span className="flex items-center gap-1 text-[10px] font-black bg-green-400/20 text-green-200 px-2 py-0.5 rounded-full border border-green-300/20">
                <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                AI Online
              </span>
            </div>
            <p className="text-xs text-blue-100/80 leading-relaxed">Ask anything about beoneofus — account help, technical issues, billing, and more.</p>
          </div>
          <div className="shrink-0 text-right hidden sm:block">
            <p className="text-[10px] text-blue-200/60 uppercase tracking-widest">Avg. response</p>
            <p className="text-sm font-black text-white">~3 sec</p>
          </div>
        </div>
      </div>

      {/* Category selector */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select a category</p>
        <div className="flex flex-wrap gap-2">
          {SUPPORT_CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all ${c.id === category ? c.color + " ring-2 ring-offset-1 ring-current/30" : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      {messages.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-black text-gray-900 dark:text-gray-100">Support Chat</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catColor}`}>
                {SUPPORT_CATEGORIES.find(c => c.id === category)?.label}
              </span>
            </div>
            <button onClick={() => setMessages([])} className="text-[11px] font-bold text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
              Clear chat
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5 ${msg.role === "user" ? "bg-blue-600 text-white" : msg.isError ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-gradient-to-br from-blue-500 to-violet-600 text-white"}`}>
                  {msg.role === "user" ? "You" : <Bot size={13} />}
                </div>

                <div className={`flex-1 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : msg.isError ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 rounded-tl-sm" : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm"}`}>
                    {msg.role === "user"
                      ? msg.content
                      : msg.isNew
                        ? <TypewriterMessage content={msg.content} />
                        : <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
                    }
                  </div>

                  {/* AI message actions */}
                  {msg.role === "ai" && !msg.isError && (
                    <div className="flex items-center gap-2 px-1">
                      <button onClick={() => handleCopy(msg.id, msg.content)} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        {copiedId === msg.id ? <><CheckCircle2 size={11} className="text-green-500" /> Copied</> : <><Copy size={11} /> Copy</>}
                      </button>
                      <span className="text-gray-200 dark:text-gray-700">·</span>
                      <button onClick={() => handleRate(msg.id, "up")} className={`text-[10px] transition-colors ${ratings[msg.id] === "up" ? "text-green-500" : "text-gray-400 hover:text-green-500"}`}>
                        👍
                      </button>
                      <button onClick={() => handleRate(msg.id, "down")} className={`text-[10px] transition-colors ${ratings[msg.id] === "down" ? "text-red-500" : "text-gray-400 hover:text-red-500"}`}>
                        👎
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
                  <Bot size={13} className="text-white" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Describe your issue</p>
        <textarea
          rows={3}
          value={issue}
          onChange={e => setIssue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
          disabled={isProcessing}
          placeholder="e.g. I can't log into my account after changing my email…"
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 resize-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
        />
        <div className="flex items-center gap-2">
          <button
            disabled={isProcessing || !issue.trim()}
            onClick={() => handleSubmit()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-black text-xs rounded-xl hover:bg-blue-500 transition-all disabled:opacity-40 shadow-sm"
          >
            {isProcessing ? <><Loader2 size={13} className="animate-spin" /> Thinking…</> : <><Send size={13} /> Send Message</>}
          </button>
          <p className="text-[10px] text-gray-400 shrink-0 hidden sm:block">Ctrl+Enter to send</p>
        </div>
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Common questions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => handleSubmit(prompt)}
                disabled={isProcessing}
                className="text-left text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800/40 rounded-xl px-3.5 py-2.5 transition-all font-medium leading-snug"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FAQ accordion */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <BookOpen size={14} className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-black text-gray-900 dark:text-gray-100">Frequently Asked Questions</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{item.q}</span>
                <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-xs text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-50 dark:border-gray-800/50 pt-3">
                  <ReactMarkdown components={mdComponents}>{item.a}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick resources */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: <Globe size={15} />, label: "Help Center", sub: "beoneofus.work/help", href: "https://beoneofus.work/help", color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30" },
          { icon: <Users size={15} />, label: "Community", sub: "Ask the community", href: "/dash/more?tool=community", color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30" },
          { icon: <FileText size={15} />, label: "Docs", sub: "beoneofus.work/docs", href: "https://beoneofus.work/docs", color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30" },
        ].map(item => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 hover:border-gray-300 dark:hover:border-gray-700 transition-all group"
          >
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>{item.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.label}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
};

// ─── User Dashboard ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  High:   { color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-950/30",    border: "border-red-200 dark:border-red-800/40",    bar: "bg-red-500",    dot: "bg-red-500"    },
  Medium: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800/40", bar: "bg-amber-500", dot: "bg-amber-500" },
  Low:    { color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-950/30",   border: "border-blue-200 dark:border-blue-800/40",   bar: "bg-blue-400",   dot: "bg-blue-400"   },
};

const STATUS_CONFIG = {
  pending:     { label: "To Do",       color: "text-gray-600 dark:text-gray-400",    bg: "bg-gray-100 dark:bg-gray-800",            icon: <Clock size={10} />       },
  in_progress: { label: "In Progress", color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30",          icon: <Loader2 size={10} />     },
  completed:   { label: "Completed",   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: <CheckCircle2 size={10} /> },
};

const CHANGELOG = [
  { version: "v2.3", title: "Community Hub Redesign", desc: "Real-time presence, channels, typing indicators and a full chat overhaul.", date: "May 19, 2026", tag: "Design" },
  { version: "v2.2", title: "Help & Support AI", desc: "Category-tagged tickets, FAQ accordion, quick prompts and chat-style responses.", date: "May 19, 2026", tag: "Feature" },
  { version: "v2.1", title: "Profile Dropdown Nav", desc: "New avatar dropdown in the main navbar with quick links and sign-out.", date: "May 18, 2026", tag: "UX" },
  { version: "v2.0", title: "Notification Bell", desc: "Live unread count, per-type routing, mark-all-read and real-time Supabase push.", date: "May 17, 2026", tag: "Feature" },
  { version: "v1.9", title: "Public Profiles /u/[username]", desc: "Shareable public profile pages with social links and work history.", date: "May 10, 2026", tag: "Feature" },
  { version: "v1.8", title: "Premium Tier", desc: "Premium subscription system with admin review and badge display.", date: "May 5, 2026", tag: "Feature" },
];

const NOTIF_ICONS = {
  like: <Heart size={12} className="text-red-500" />,
  comment: <MessageSquare size={12} className="text-blue-500" />,
  connection_request: <UserPlus size={12} className="text-violet-500" />,
  handshake: <Handshake size={12} className="text-green-500" />,
  group_invite: <Users size={12} className="text-amber-500" />,
  message: <Bell size={12} className="text-blue-500" />,
  partnership_update: <Handshake size={12} className="text-indigo-500" />,
};

const TASK_STATUSES = ["All", "pending", "in_progress", "completed"];

export default SupportTool;
