"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, X, Loader2, User, Bot,
  Minimize2, RotateCcw, Maximize2,
  PhoneCall, Image as ImageIcon, Paperclip,
  FileText, Check, AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { supabase } from "../supabaseClient";

/* ── Markdown renderers ──────────────────────────────────────── */
const md = {
  p:      ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
  ul:     ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-0.5" {...props} />,
  ol:     ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-0.5" {...props} />,
  li:     ({ node, ...props }) => <li className="pl-0.5" {...props} />,
  h1:     ({ node, ...props }) => <h1 className="text-sm font-black mb-2 mt-3" {...props} />,
  h2:     ({ node, ...props }) => <h2 className="text-sm font-bold mb-1 mt-3" {...props} />,
  h3:     ({ node, ...props }) => <h3 className="text-xs font-bold mb-1 mt-2" {...props} />,
  a:      ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div className="rounded-lg overflow-hidden my-2 border border-white/[0.08]">
        <div className="bg-[#0a1020] px-3 py-1 text-[9px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/[0.05]">
          {match[1]}
        </div>
        <SyntaxHighlighter
          {...props} style={vscDarkPlus} language={match[1]} PreTag="div"
          customStyle={{ margin: 0, padding: "0.5rem 0.75rem", background: "transparent", fontSize: "0.74rem" }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code {...props} className="bg-white/10 text-blue-300 px-1 py-0.5 rounded font-mono text-[10px]">
        {children}
      </code>
    );
  },
};

/* ── Typewriter for new AI messages ─────────────────────────── */
function Typewriter({ content, onUpdate }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setShown(content.slice(0, ++i));
      onUpdate?.();
      if (i >= content.length) clearInterval(t);
    }, 12);
    return () => clearInterval(t);
  }, [content, onUpdate]);
  return <ReactMarkdown components={md}>{shown}</ReactMarkdown>;
}

/* ── Resize image before upload (max 900px, JPEG 0.82) ─────── */
function resizeImage(dataUrl, maxPx = 900) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const { width, height } = img;
      if (width <= maxPx && height <= maxPx) { resolve(dataUrl); return; }
      const ratio  = Math.min(maxPx / width, maxPx / height);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.floor(width  * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const WELCOME = "Hi! I'm beoneofus AI. Ask me anything — career advice, code help, platform features.";

export default function AiFloatingChat() {
  const router = useRouter();

  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [ready,    setReady]    = useState(false);
  const [attaches, setAttaches] = useState([]); // {id, type:'image'|'file', name, url?, content?}

  const endRef     = useRef(null);
  const textRef    = useRef(null);
  const imgInput   = useRef(null);
  const fileInput  = useRef(null);
  const initDone   = useRef(false);

  const scrollDown = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  }, [input]);

  /* Load history once on first open */
  useEffect(() => {
    if (!open || initDone.current) return;
    initDone.current = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("ai_chat_messages")
          .select("role, content")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true })
          .limit(40);
        if (data?.length) { setMessages(data); setReady(true); return; }
      }
      setMessages([{ role: "assistant", content: WELCOME }]);
      setReady(true);
    })();
  }, [open]);

  useEffect(() => { scrollDown(); }, [messages, scrollDown]);

  useEffect(() => {
    if (open && ready) setTimeout(() => textRef.current?.focus(), 60);
  }, [open, ready]);

  /* ── Image picker ── */
  const pickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const resized = await resizeImage(reader.result);
      setAttaches(prev => [...prev, { id: Date.now(), type: "image", name: file.name, url: resized }]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* ── File picker (text files) ── */
  const pickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttaches(prev => [...prev, {
        id: Date.now(), type: "file", name: file.name,
        content: typeof reader.result === "string" ? reader.result.slice(0, 12000) : "",
      }]);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const removeAttach = (id) => setAttaches(prev => prev.filter(a => a.id !== id));

  /* ── Build API message content from text + attachments ── */
  const buildContent = (text, imgs, files) => {
    let textPart = text;
    if (files.length) {
      const fc = files.map(f => `[File: ${f.name}]\n${f.content}\n[End of file]`).join("\n\n");
      textPart  = fc + (text ? "\n\n" + text : "");
    }
    if (!imgs.length) return textPart || "";
    const parts = [];
    if (textPart) parts.push({ type: "text", text: textPart });
    imgs.forEach(img => parts.push({ type: "image_url", image_url: { url: img.url } }));
    return parts;
  };

  /* ── Send ── */
  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text && attaches.length === 0) return;
    if (loading) return;

    const imgs  = attaches.filter(a => a.type === "image");
    const files = attaches.filter(a => a.type === "file");
    const apiContent = buildContent(text, imgs, files);

    const userMsg = {
      role: "user",
      content: apiContent,
      displayText: text,
      attachments: [...attaches],
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setAttaches([]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const saveContent = typeof apiContent === "string" ? apiContent : JSON.stringify(apiContent);
      if (session) {
        await supabase.from("ai_chat_messages").insert({
          user_id: session.user.id, role: "user", content: saveContent,
        });
      }

      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res  = await fetch("/api/chats", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: apiMessages }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");

      setMessages(prev => [...prev, { ...json.message, isNew: true }]);
      if (session) {
        await supabase.from("ai_chat_messages").insert({
          user_id: session.user.id, role: "assistant", content: json.message.content,
        });
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await supabase.from("ai_chat_messages").delete().eq("user_id", session.user.id);
    setMessages([{ role: "assistant", content: WELCOME }]);
    setAttaches([]);
  };

  const canSend = (input.trim() || attaches.length > 0) && !loading && ready;

  /* ════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Hidden file inputs */}
      <input ref={imgInput}  type="file" accept="image/*" className="hidden" onChange={pickImage} />
      <input ref={fileInput} type="file" accept=".txt,.md,.js,.ts,.jsx,.tsx,.py,.json,.csv,.html,.css,.java,.c,.cpp,.go,.rs,.rb,.php,.sql" className="hidden" onChange={pickFile} />

      {/* ── Mobile backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-[60] sm:hidden"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Chat panel ── */}
      <div
        className={`
          fixed z-[65]
          inset-x-3 sm:inset-x-auto
          bottom-[76px] sm:right-4 sm:bottom-[88px]
          lg:right-6 lg:bottom-24
          sm:w-[400px]
          transition-all duration-300 ease-out origin-bottom-right
          ${open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-[0.97] pointer-events-none"}
        `}
      >
        {/* Glass panel */}
        <div
          className="flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
          style={{
            background: "rgba(10,16,32,0.88)",
            backdropFilter: "blur(28px) saturate(1.4)",
            WebkitBackdropFilter: "blur(28px) saturate(1.4)",
            border: "1px solid rgba(255,255,255,0.09)",
            maxHeight: "min(76vh, 580px)",
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              background: "rgba(6,10,20,0.70)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/15 shrink-0 shadow-md">
                <img src="/ai.gif" alt="AI" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-xs font-black text-white tracking-tight">beoneofus AI</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span className="text-[9px] text-emerald-400 font-semibold">Online</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              <button onClick={() => { setOpen(false); router.push("/beoneofus-ai/ai?talk=1"); }}
                title="Voice conversation"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                <PhoneCall size={12} />
              </button>
              <button onClick={clear} title="Clear chat"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                <RotateCcw size={12} />
              </button>
              <button onClick={() => { setOpen(false); router.push("/beoneofus-ai/ai"); }}
                title="Open full chat"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                <Maximize2 size={12} />
              </button>
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                <Minimize2 size={12} />
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0">
            {!ready ? (
              <div className="flex items-center justify-center h-full py-10">
                <Loader2 size={20} className="animate-spin text-blue-400" />
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>

                    {/* Avatar */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      msg.role === "user" ? "bg-blue-600" : "overflow-hidden border border-white/10"
                    }`}>
                      {msg.role === "user"
                        ? <User size={11} className="text-white" />
                        : <img src="/ai.gif" alt="AI" className="w-full h-full object-cover" />
                      }
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[84%] flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>

                      {/* Attachment previews */}
                      {msg.attachments?.map((a, ai) => (
                        <div key={ai}>
                          {a.type === "image" && (
                            <img src={a.url} alt={a.name}
                              className="max-w-[180px] max-h-[140px] rounded-xl object-cover border border-white/10 shadow-lg" />
                          )}
                          {a.type === "file" && (
                            <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1.5">
                              <FileText size={11} className="text-blue-400 shrink-0" />
                              <span className="text-[10px] text-gray-300 max-w-[140px] truncate font-medium">{a.name}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Text bubble */}
                      {(msg.displayText || (typeof msg.content === "string" && msg.role === "user") || msg.role === "assistant") && (
                        <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white rounded-tr-sm"
                            : msg.isError
                              ? "bg-red-500/10 border border-red-500/20 text-red-400 rounded-tl-sm"
                              : "bg-white/[0.07] border border-white/[0.07] text-gray-100 rounded-tl-sm"
                        }`}>
                          {msg.role === "user" ? (
                            <span className="whitespace-pre-wrap">
                              {msg.displayText || (typeof msg.content === "string" ? msg.content : "[message]")}
                            </span>
                          ) : msg.isNew ? (
                            <Typewriter content={msg.content} onUpdate={scrollDown} />
                          ) : (
                            <ReactMarkdown components={md}>{msg.content}</ReactMarkdown>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 shrink-0">
                      <img src="/ai.gif" alt="AI" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-white/[0.07] border border-white/[0.07] rounded-xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1.5">
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

          {/* ── Attachment preview strip ── */}
          {attaches.length > 0 && (
            <div
              className="flex flex-wrap gap-2 px-3.5 py-2.5 shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              {attaches.map(a => (
                <div key={a.id} className="relative group">
                  {a.type === "image" ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                      <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1.5 max-w-[140px]">
                      <FileText size={11} className="text-blue-400 shrink-0" />
                      <span className="text-[10px] text-gray-300 truncate">{a.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeAttach(a.id)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-700 hover:bg-red-600 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={8} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Input area ── */}
          <div
            className="px-3.5 py-3 shrink-0"
            style={{
              background: "rgba(6,10,20,0.60)",
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2 transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              {/* Attachment buttons */}
              <div className="flex items-center gap-0.5 shrink-0 pb-0.5">
                <button
                  onClick={() => imgInput.current?.click()}
                  title="Attach image"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                >
                  <ImageIcon size={13} />
                </button>
                <button
                  onClick={() => fileInput.current?.click()}
                  title="Attach file"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                >
                  <Paperclip size={13} />
                </button>
                <button
                  onClick={() => { setOpen(false); router.push("/beoneofus-ai/ai?talk=1"); }}
                  title="Start voice conversation"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                >
                  <PhoneCall size={13} />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={textRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="Ask anything… (Shift+Enter for new line)"
                disabled={loading || !ready}
                rows={1}
                className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 resize-none focus:outline-none disabled:opacity-40 leading-relaxed py-1"
                style={{ maxHeight: "110px", overflowY: "auto" }}
              />

              {/* Send */}
              <button
                onClick={send}
                disabled={!canSend}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all shadow-md shadow-blue-600/20 active:scale-95 shrink-0"
              >
                <Send size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── FAB toggle ── */}
      <div className="fixed z-[65] bottom-[76px] right-3 sm:bottom-[88px] sm:right-4 lg:bottom-24 lg:right-6">
        <button
          onClick={() => setOpen(o => !o)}
          className={`relative w-13 h-13 w-[52px] h-[52px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 border-2 border-white/20 ${
            open ? "hover:scale-95 ring-2 ring-blue-500/30" : "hover:scale-105"
          }`}
          aria-label="Toggle AI assistant"
        >
          <img src="/ai.gif" alt="beoneofus AI" className="w-full h-full object-cover" />
          {open && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <X size={18} className="text-white" />
            </div>
          )}
        </button>

        {/* Voice shortcut badge */}
        {!open && (
          <button
            onClick={() => { setOpen(false); router.push("/beoneofus-ai/ai?talk=1"); }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 border-2 border-[#06090f] text-white shadow-lg transition-all hover:scale-110 active:scale-95"
            title="Start voice conversation"
          >
            <PhoneCall size={8} />
          </button>
        )}
      </div>
    </>
  );
}
