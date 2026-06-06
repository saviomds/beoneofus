"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, Send, RotateCcw, Copy, Check,
  PhoneCall, PhoneOff, Loader2, Mic,
  AlertCircle, Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { supabase } from "../../supabaseClient";

/* ── Markdown renderers ─────────────────────────────────────── */
const md = {
  p:          ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
  ul:         ({ node, ...props }) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
  ol:         ({ node, ...props }) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />,
  li:         ({ node, ...props }) => <li className="pl-1" {...props} />,
  h1:         ({ node, ...props }) => <h1 className="text-xl font-black mb-3 mt-5 text-white" {...props} />,
  h2:         ({ node, ...props }) => <h2 className="text-lg font-bold mb-2 mt-4 text-white" {...props} />,
  h3:         ({ node, ...props }) => <h3 className="text-base font-bold mb-2 mt-3 text-white" {...props} />,
  a:          ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
  strong:     ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
  blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-blue-500/40 pl-3 my-2 text-gray-400 italic" {...props} />,
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div className="rounded-xl overflow-hidden my-3 border border-white/[0.07]">
        <div className="bg-[#0d1525] px-3 py-1.5 text-[9px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/[0.05] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/70" />{match[1]}
        </div>
        <SyntaxHighlighter
          {...props} style={vscDarkPlus} language={match[1]} PreTag="div"
          customStyle={{ margin: 0, padding: "0.75rem", background: "#080e1a", fontSize: "0.78rem" }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code {...props} className="bg-white/[0.08] text-blue-300 px-1.5 py-0.5 rounded font-mono text-[12px]">
        {children}
      </code>
    );
  },
};

/* ── Strip markdown so TTS reads clean text ─────────────────── */
const stripMd = (t) =>
  t.replace(/```[\s\S]*?```/g, "code block")
   .replace(/`([^`]+)`/g, "$1")
   .replace(/#{1,6}\s?/g, "")
   .replace(/\*\*([^*]+)\*\*/g, "$1")
   .replace(/\*([^*]+)\*/g, "$1")
   .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
   .replace(/[-*+]\s/gm, "")
   .replace(/\n+/g, " ")
   .trim();

/* ── Typewriter animation for new AI messages ───────────────── */
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

/* ══════════════════════════════════════════════════════════════
   VOICE MODE OVERLAY

   State machine:
     greeting → listening → processing → speaking → listening → …

   All mutable loop state lives in the S ref so none of the
   callbacks ever capture stale React state.
══════════════════════════════════════════════════════════════ */
function VoiceMode({ greetingRef, onSend, onExit }) {
  const [phase,    setPhase]    = useState("greeting");
  const [liveText, setLiveText] = useState("");  // interim speech
  const [caption,  setCaption]  = useState("");  // AI reply preview
  const [errMsg,   setErrMsg]   = useState("");

  /* Single ref for all mutable loop state — zero stale-closure risk */
  const S = useRef({ active: true, recog: null, resumeInt: null, watchdog: null, greetDog: null });

  /* ── Helpers ── */
  const clearTimers = () => {
    clearInterval(S.current.resumeInt);
    clearTimeout(S.current.watchdog);
    clearTimeout(S.current.greetDog);
  };

  const stopRecog = () => {
    try { S.current.recog?.abort(); } catch {}
    S.current.recog = null;
  };

  /* ── doSpeak(utt) — queues utterance, picks best voice if available ── */
  const doSpeak = (utt) => {
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const v =
        voices.find(vv => /microsoft david|microsoft mark|microsoft zira/i.test(vv.name)) ||
        voices.find(vv => /google us english/i.test(vv.name)) ||
        voices.find(vv => vv.lang === "en-US") ||
        voices.find(vv => vv.lang.startsWith("en")) ||
        voices[0];
      if (v) utt.voice = v; // only set if found — never null
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      /* Voices already loaded — pick and speak immediately (no delay = Chrome allows it) */
      pickVoice();
      if (S.current.active) window.speechSynthesis.speak(utt);
    } else {
      /* Voices not loaded yet — speak now with default voice, update voice after load */
      if (S.current.active) window.speechSynthesis.speak(utt);
      const handler = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handler);
        /* Only update voice if utterance hasn't started yet */
        if (!window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          pickVoice();
          if (S.current.active) window.speechSynthesis.speak(utt);
        }
      };
      window.speechSynthesis.addEventListener("voiceschanged", handler);
    }
  };

  /* ── speak(text, onDone)
     Reliable TTS:
       - Waits for voices to load (fixes Chrome cold-start silence)
       - Periodic resume() every 5 s (Chrome 15-s stall fix)
       - Watchdog so onend never permanently hangs the loop
  ── */
  const speak = (text, onDone) => {
    if (!S.current.active || !text) { onDone?.(); return; }

    setPhase("speaking");
    const clean = stripMd(text);
    setCaption(clean.slice(0, 140));
    clearTimers();
    window.speechSynthesis.cancel();

    const utt  = new SpeechSynthesisUtterance(clean);
    utt.lang   = "en-US";
    utt.rate   = 1.0;
    utt.pitch  = 1.0;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimers();
      setCaption("");
      if (S.current.active) onDone?.();
    };
    utt.onend   = finish;
    utt.onerror = (e) => { console.warn("TTS error:", e.error); finish(); };

    /* Chrome stall fix: resume every 5 s */
    S.current.resumeInt = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 5000);

    /* Watchdog: ~400 ms/word, min 3 s, max 20 s */
    const words = clean.split(/\s+/).length;
    S.current.watchdog = setTimeout(finish, Math.min(Math.max(words * 400, 3000), 20000));

    doSpeak(utt, finish);
  };

  /* ── processText(text) — call API then speak result ── */
  const processText = async (text) => {
    if (!S.current.active) return;
    setPhase("processing");
    setCaption(`"${text.length > 80 ? text.slice(0, 80) + "…" : text}"`);
    try {
      const reply = await onSend(text);
      if (!S.current.active) return;
      setCaption("");
      speak(reply || "Sorry, I couldn't get a response. Please try again.", listen);
    } catch {
      if (S.current.active) speak("Something went wrong. Please try again.", listen);
    }
  };

  /* ── listen() — one utterance, restarts on silence/error ── */
  const listen = () => {
    if (!S.current.active) return;

    const SR = window.webkitSpeechRecognition || window["SpeechRecognition"];
    if (!SR) {
      setErrMsg("Voice recognition not supported. Please use Chrome or Edge.");
      setPhase("error");
      return;
    }

    stopRecog();
    setPhase("listening");
    setLiveText("");

    let finalText = "";
    let bestText  = "";

    const r          = new SR();
    r.lang           = "en-US";
    r.continuous     = false;   // one utterance at a time — more reliable
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (ev) => {
      let interim = "";
      for (const res of ev.results) {
        if (res.isFinal) finalText += " " + res[0].transcript;
        else interim += res[0].transcript;
      }
      bestText = (finalText + " " + interim).trim();
      setLiveText(bestText);
    };

    r.onerror = (ev) => {
      setLiveText("");
      if (ev.error === "not-allowed") {
        setErrMsg("Microphone access was blocked. Allow the microphone in your browser settings and refresh.");
        setPhase("error");
      } else if (ev.error !== "aborted" && S.current.active) {
        /* no-speech / network / audio-capture → retry silently */
        setTimeout(listen, 500);
      }
    };

    r.onend = () => {
      setLiveText("");
      const text = finalText.trim() || bestText.trim();
      if (text && S.current.active) {
        processText(text);
      } else if (S.current.active) {
        setTimeout(listen, 400);
      }
    };

    S.current.recog = r;
    try { r.start(); } catch (e) {
      console.warn("STT start failed:", e);
      if (S.current.active) setTimeout(listen, 600);
    }
  };

  /* ── Mount: hook into the greeting utterance started in the
     click handler so Chrome TTS fires without autoplay block. ── */
  useEffect(() => {
    const s = S.current;
    s.active = true; // always reset — fixes React StrictMode double-invoke killing the loop

    const greet = greetingRef?.current;

    if (greet && !greet.done) {
      /* Watchdog: if greeting TTS is blocked or never ends, start listening after 5 s */
      S.current.greetDog = setTimeout(() => { if (s.active) listen(); }, 5000);
      greet.utt.onend   = () => { clearTimeout(S.current.greetDog); greet.done = true; if (s.active) listen(); };
      greet.utt.onerror = () => { clearTimeout(S.current.greetDog); greet.done = true; if (s.active) listen(); };
    } else {
      /* No greeting (URL-triggered or already done) — go straight to listening */
      const t = setTimeout(() => { if (s.active) listen(); }, 120);
      return () => {
        clearTimeout(t);
        s.active = false;
        clearTimers();
        stopRecog();
        window.speechSynthesis.cancel();
      };
    }

    return () => {
      s.active = false;
      clearTimers();
      stopRecog();
      window.speechSynthesis.cancel();
    };
  }, []); // eslint-disable-line

  const handleExit = () => {
    S.current.active = false;
    clearTimers();
    stopRecog();
    window.speechSynthesis.cancel();
    onExit();
  };

  /* ── Visual config ── */
  const cfg = {
    greeting:   { ring: "border-blue-400/50   shadow-blue-500/15",   dot: "bg-blue-400",    label: "Starting…",   pill: "border-blue-500/30  bg-blue-500/[0.08]    text-blue-400"    },
    listening:  { ring: "border-emerald-400/60 shadow-emerald-500/20",dot: "bg-emerald-400", label: "Listening…",  pill: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400" },
    processing: { ring: "border-purple-400/50  shadow-purple-500/15", dot: "bg-purple-400",  label: "Thinking…",   pill: "border-purple-500/30 bg-purple-500/[0.08]  text-purple-400"  },
    speaking:   { ring: "border-blue-400/60    shadow-blue-500/20",   dot: "bg-blue-400",    label: "Speaking…",   pill: "border-blue-500/30  bg-blue-500/[0.08]    text-blue-400"    },
    error:      { ring: "border-red-400/40     shadow-black/50",      dot: "bg-red-400",     label: "Error",        pill: "border-red-500/30   bg-red-500/[0.08]    text-red-400"     },
  };
  const c = cfg[phase] ?? cfg.greeting;
  const pulsing = phase !== "error";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between pb-12 pt-10 px-6 select-none"
      style={{
        background: "linear-gradient(160deg,rgba(5,9,18,0.82) 0%,rgba(8,14,28,0.88) 60%,rgba(5,9,18,0.82) 100%)",
        backdropFilter: "blur(24px) saturate(1.2)",
        WebkitBackdropFilter: "blur(24px) saturate(1.2)",
      }}
    >
      {/* Status pill */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all duration-500 ${c.pill}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot} ${pulsing ? "animate-pulse" : ""}`} />
        {c.label}
      </div>

      {/* Orb with ring animations */}
      <div className="relative flex items-center justify-center">
        {phase === "listening" && (
          <>
            <div className="absolute w-[380px] h-[380px] rounded-full border border-emerald-400/[0.07] animate-ping" style={{ animationDuration: "2.4s" }} />
            <div className="absolute w-[300px] h-[300px] rounded-full border border-emerald-400/[0.10] animate-ping" style={{ animationDuration: "1.7s", animationDelay: "0.7s" }} />
            <div className="absolute w-60 h-60 rounded-full bg-emerald-500/[0.06] blur-3xl" />
          </>
        )}
        {phase === "speaking" && (
          <>
            <div className="absolute w-[380px] h-[380px] rounded-full border border-blue-400/[0.07] animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute w-[300px] h-[300px] rounded-full border border-blue-400/[0.10] animate-ping" style={{ animationDuration: "1.4s", animationDelay: "0.5s" }} />
            <div className="absolute w-60 h-60 rounded-full bg-blue-500/[0.06] blur-3xl" />
          </>
        )}
        {phase === "processing" && (
          <div className="absolute w-64 h-64 rounded-full bg-purple-600/[0.10] blur-3xl animate-pulse" />
        )}

        <div className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden border-[3px] shadow-2xl transition-all duration-700 ${c.ring}`}>
          <img src="/ai.gif" alt="AI" className="w-full h-full object-cover pointer-events-none" draggable={false} />
          {phase === "processing" && (
            <div className="absolute inset-0 bg-[#050912]/60 backdrop-blur-[4px] flex items-center justify-center">
              <Loader2 size={52} className="animate-spin text-purple-300/80" />
            </div>
          )}
        </div>
      </div>

      {/* Caption / transcript / error */}
      <div className="w-full max-w-sm min-h-[64px] flex flex-col items-center justify-center gap-2 text-center px-4">
        {errMsg ? (
          <div className="flex flex-col items-center gap-2">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-400 leading-relaxed">{errMsg}</p>
          </div>
        ) : phase === "listening" && liveText ? (
          <p className="text-sm text-white/75 italic leading-relaxed">
            &ldquo;{liveText}&rdquo;
          </p>
        ) : phase === "listening" ? (
          <p className="text-xs text-gray-600 animate-pulse tracking-wide">Speak now…</p>
        ) : phase === "processing" && caption ? (
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{caption}</p>
        ) : phase === "speaking" && caption ? (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{caption}</p>
        ) : null}
      </div>

      {/* End conversation button */}
      <button
        onClick={handleExit}
        className="flex items-center gap-2.5 px-7 py-3 rounded-2xl bg-red-600/[0.12] hover:bg-red-600/[0.22] border border-red-500/25 hover:border-red-500/45 text-red-400 hover:text-red-300 text-sm font-semibold transition-all active:scale-95"
      >
        <PhoneOff size={16} />
        End conversation
      </button>
    </div>
  );
}

/* ── Suggestion chips shown on the welcome screen ──────────── */
const SUGGESTIONS = [
  { icon: "💼", label: "Career advice",    prompt: "Give me actionable career advice for a developer looking to grow professionally." },
  { icon: "🔍", label: "Code review",      prompt: "Help me review and improve a piece of code." },
  { icon: "🎯", label: "Interview prep",   prompt: "Help me prepare for a technical interview with common questions and tips." },
  { icon: "💡", label: "Project ideas",    prompt: "Give me 5 creative portfolio project ideas for a developer." },
  { icon: "✍️", label: "Cover letter",     prompt: "Help me write a professional cover letter for a senior developer role." },
  { icon: "📚", label: "Learn a concept",  prompt: "Explain async/await in JavaScript with clear, practical examples." },
];

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function BeoneofusAiPage() {
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [talkMode, setTalkMode] = useState(false);
  const [copied,   setCopied]   = useState(null);

  const messagesRef = useRef([]);
  const greetingRef = useRef(null);
  const endRef      = useRef(null);
  const textareaRef = useRef(null);
  const abortRef    = useRef(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const scrollDown = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
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
      setTimeout(() => textareaRef.current?.focus(), 100);
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

  /* ── Activate talk mode
     withGreeting=true → speak greeting synchronously inside the click handler so
     Chrome's autoplay policy allows it. withGreeting=false → skip greeting (URL nav). ── */
  const activateTalkMode = useCallback((withGreeting = true) => {
    if (withGreeting) {
      try {
        window.speechSynthesis.cancel();
        const greet = messagesRef.current.length > 0
          ? "Welcome back! What would you like to discuss?"
          : "Hey! I'm beoneofus AI. What's on your mind?";
        const utt  = new SpeechSynthesisUtterance(greet);
        utt.lang   = "en-US";
        utt.rate   = 1.0;
        utt.pitch  = 1.0;
        greetingRef.current = { utt, done: false };
        utt.onend  = () => { if (greetingRef.current) greetingRef.current.done = true; };
        utt.onerror = () => { if (greetingRef.current) greetingRef.current.done = true; };
        /* Speak synchronously — must stay inside click handler for Chrome autoplay policy */
        window.speechSynthesis.speak(utt);
      } catch {}
    } else {
      greetingRef.current = null; // VoiceMode will skip to listen() immediately
    }
    setTalkMode(true);
  }, []);

  /* ── Auto-start voice mode when ?talk=1 is in URL ── */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("talk") === "1") {
      /* No user gesture context after navigation — skip greeting, go straight to listening */
      setTimeout(() => activateTalkMode(false), 300);
    }
  }, [activateTalkMode]);

  /* ── Shared API call ── */
  const callApi = async (history) => {
    const res  = await fetch("/api/chats", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data.message.content;
  };

  /* ── Text send ── */
  const send = async (e, override) => {
    e?.preventDefault();
    const text = (override ?? input).trim();
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

      abortRef.current = new AbortController();
      const history = [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content }));
      const content = await callApi(history);

      setMessages(prev => [...prev, { role: "assistant", content, isNew: true }]);
      if (session) {
        await supabase.from("ai_chat_messages").insert({ user_id: session.user.id, role: "assistant", content });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  /* ── Voice send — called by VoiceMode, returns reply text ── */
  const voiceSend = useCallback(async (text) => {
    const userMsg = { role: "user", content: text };
    const history = [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("ai_chat_messages").insert({ user_id: session.user.id, role: "user", content: text });
      }
      const content = await callApi(history);
      setMessages(prev => [...prev, { role: "assistant", content }]);
      if (session) {
        await supabase.from("ai_chat_messages").insert({ user_id: session.user.id, role: "assistant", content });
      }
      return content;
    } catch {
      return null;
    }
  }, []); // eslint-disable-line

  const clearChat = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await supabase.from("ai_chat_messages").delete().eq("user_id", session.user.id);
    setMessages([]);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const copyMsg = async (content, idx) => {
    await navigator.clipboard.writeText(content);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const hasMessages = messages.length > 0;

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div
      className="relative flex flex-col h-screen text-white overflow-hidden"
      style={{
        background: "#06090f",
        backgroundImage: "radial-gradient(rgba(59,130,246,0.04) 1px,transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* Voice mode full-screen overlay */}
      {talkMode && (
        <VoiceMode
          greetingRef={greetingRef}
          onSend={voiceSend}
          onExit={() => setTalkMode(false)}
        />
      )}

      {/* ══ HEADER ══ */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 h-14 border-b border-white/[0.06] bg-[#0a1020]/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.08] transition-all"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 shrink-0">
              <img src="/ai.gif" alt="AI" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-black text-white leading-none tracking-tight">beoneofus AI</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-semibold">Online</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={activateTalkMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all text-xs font-semibold"
            title="Start voice conversation"
          >
            <PhoneCall size={13} />
            <span className="hidden sm:inline">Talk</span>
          </button>
          {hasMessages && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.07] transition-all"
            >
              <RotateCcw size={11} /> New chat
            </button>
          )}
        </div>
      </header>

      {/* ══ BODY ══ */}
      {fetching ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={22} className="animate-spin text-blue-500" />
        </div>

      ) : !hasMessages ? (
        /* ── Welcome screen ── */
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6 overflow-hidden">
          {/* Orb — tap to start voice */}
          <button
            onClick={activateTalkMode}
            className="relative flex items-center justify-center group focus:outline-none"
            aria-label="Start voice conversation"
          >
            <div className="absolute w-52 h-52 rounded-full border border-blue-500/[0.08] animate-ping" style={{ animationDuration: "3s" }} />
            <div className="absolute w-40 h-40 rounded-full border border-blue-400/[0.11] animate-ping" style={{ animationDuration: "2.2s", animationDelay: "0.6s" }} />
            <div className="absolute w-36 h-36 rounded-full bg-blue-600/[0.08] blur-2xl" />
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-blue-500/30 shadow-2xl shadow-blue-500/15 transition-all duration-500 group-hover:scale-105 group-active:scale-95">
              <img src="/ai.gif" alt="beoneofus AI" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center border-2 border-[#06090f] shadow-lg group-hover:from-blue-500 group-hover:to-indigo-500 transition-all">
              <Mic size={12} className="text-white" />
            </div>
          </button>

          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              What can I{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                help with?
              </span>
            </h1>
            <p className="text-xs text-gray-600">Tap the orb to talk · or type below</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-md">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => send(null, s.prompt)}
                className="group flex flex-col gap-1.5 text-left px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] hover:border-blue-500/25 transition-all active:scale-95"
              >
                <span className="text-base leading-none">{s.icon}</span>
                <span className="text-[11px] font-semibold text-gray-500 group-hover:text-gray-200 transition-colors leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

      ) : (
        /* ── Chat history ── */
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === "assistant" ? (
                  <div className="group flex gap-3">
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 border border-white/[0.08]">
                      <img src="/ai.gif" alt="AI" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-blue-400 tracking-wide mb-1.5">beoneofus AI</p>
                      <div className="relative pl-3">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b from-blue-500 to-purple-600 opacity-60" />
                        <div className="text-sm text-gray-200 leading-relaxed">
                          {msg.isNew
                            ? <Typewriter content={msg.content} onUpdate={scrollDown} />
                            : <ReactMarkdown components={md}>{msg.content}</ReactMarkdown>
                          }
                        </div>
                      </div>
                      <button
                        onClick={() => copyMsg(msg.content, i)}
                        className="mt-2 flex items-center gap-1 text-[10px] text-gray-700 hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {copied === i
                          ? <><Check size={9} className="text-emerald-400" /> Copied</>
                          : <><Copy size={9} /> Copy</>
                        }
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-blue-600 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 leading-relaxed whitespace-pre-wrap shadow-lg shadow-blue-600/20">
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/[0.08]">
                  <img src="/ai.gif" alt="AI" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-blue-400 tracking-wide mb-1.5">beoneofus AI</p>
                  <div className="flex items-center gap-1 pl-3">
                    {[0, 120, 240].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>
      )}

      {/* ══ INPUT BAR ══ */}
      <div className="shrink-0 border-t border-white/[0.06] bg-[#0a1020]/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2 focus-within:border-blue-500/35 focus-within:bg-white/[0.06] transition-all">

            {/* Mic button */}
            <button
              onClick={activateTalkMode}
              title="Start voice conversation"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all shrink-0 mb-0.5"
            >
              <Mic size={16} />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything… (Shift+Enter for new line)"
              disabled={loading || fetching}
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 resize-none focus:outline-none disabled:opacity-40 leading-relaxed py-1"
              style={{ maxHeight: "160px", overflowY: "auto" }}
            />

            {/* Send / Stop */}
            {loading ? (
              <button
                onClick={() => abortRef.current?.abort()}
                title="Stop generating"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-700 hover:bg-gray-600 text-white transition-all shrink-0 active:scale-95 border border-white/10"
              >
                <Square size={13} fill="white" />
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-25 disabled:cursor-not-allowed text-white transition-all shrink-0 shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <Send size={14} />
              </button>
            )}
          </div>

          <p className="text-center text-[10px] text-gray-700 mt-2">
            beoneofus AI · Verify important information independently
          </p>
        </div>
      </div>
    </div>
  );
}
