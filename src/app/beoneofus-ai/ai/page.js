"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, Send, RotateCcw, Copy, Check,
  PhoneCall, PhoneOff, Loader2, Mic,
  AlertCircle, Square, Code2,
  Briefcase, BookOpen, FileText, Lightbulb, Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { supabase } from "../../supabaseClient";

/* ── Code block with per-block copy button ──────────────────── */
function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden my-3 border border-white/[0.08]">
      <div className="bg-[#0b1424] px-3 py-2 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500/60" />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{language}</span>
        </div>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-md hover:bg-white/[0.06]"
        >
          {copied
            ? <><Check size={9} className="text-emerald-400" /> Copied</>
            : <><Copy size={9} /> Copy</>}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, padding: "0.875rem", background: "#060c18", fontSize: "0.775rem", lineHeight: 1.65 }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

/* ── Markdown renderers ─────────────────────────────────────── */
const md = {
  p:          ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
  ul:         ({ node, ...props }) => <ul className="list-disc ml-5 mb-3 space-y-1.5" {...props} />,
  ol:         ({ node, ...props }) => <ol className="list-decimal ml-5 mb-3 space-y-1.5" {...props} />,
  li:         ({ node, ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
  h1:         ({ node, ...props }) => <h1 className="text-xl font-black mb-3 mt-5 text-white" {...props} />,
  h2:         ({ node, ...props }) => <h2 className="text-lg font-bold mb-2 mt-4 text-white" {...props} />,
  h3:         ({ node, ...props }) => <h3 className="text-base font-semibold mb-2 mt-3 text-white/90" {...props} />,
  a:          ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
  strong:     ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
  em:         ({ node, ...props }) => <em className="italic text-gray-300" {...props} />,
  blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-blue-500/40 pl-4 my-2 text-gray-400 italic" {...props} />,
  hr:         ({ node, ...props }) => <hr className="border-white/[0.08] my-4" />,
  table:      ({ node, ...props }) => <div className="overflow-x-auto my-3"><table className="text-sm w-full border-collapse" {...props} /></div>,
  thead:      ({ node, ...props }) => <thead className="bg-white/[0.04]" {...props} />,
  th:         ({ node, ...props }) => <th className="border border-white/[0.08] px-3 py-2 text-left text-xs font-semibold text-gray-300" {...props} />,
  td:         ({ node, ...props }) => <td className="border border-white/[0.06] px-3 py-2 text-xs text-gray-400" {...props} />,
  code({ node, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    if (match) {
      return <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} />;
    }
    return (
      <code {...props} className="bg-white/[0.08] text-blue-300 px-1.5 py-0.5 rounded font-mono text-[12px]">
        {children}
      </code>
    );
  },
};

/* ── Strip markdown for TTS ─────────────────────────────────── */
const stripMd = (t) =>
  t.replace(/```[\s\S]*?```/g, "code block")
   .replace(/`([^`]+)`/g, "$1")
   .replace(/#{1,6}\s?/g, "")
   .replace(/\*\*([^*]+)\*\*/g, "$1")
   .replace(/\*([^*]+)\*/g, "$1")
   .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
   .replace(/[-*+]\s/gm, "")
   .replace(/\|[^\n]+\|/g, "")
   .replace(/\n+/g, " ")
   .trim();

/* ── Animated waveform bars ─────────────────────────────────── */
function WaveformBars({ active, color = "#3b82f6" }) {
  const heights = [0.55, 0.80, 1.00, 0.70, 0.90, 0.60, 0.85];
  const delays  = [0.00, 0.12, 0.25, 0.38, 0.50, 0.62, 0.35];
  const speeds  = [0.70, 0.85, 0.75, 0.90, 0.80, 0.70, 0.85];
  return (
    <div className="flex items-center justify-center gap-[5px]" style={{ height: 52 }}>
      {heights.map((_, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: active ? 36 * heights[i] : 5,
            borderRadius: 3,
            background: color,
            transformOrigin: "center",
            animationName: active ? "waveBar" : "none",
            animationDuration: `${speeds[i]}s`,
            animationDelay: `${delays[i]}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            transition: "height 0.4s ease, opacity 0.4s ease",
            opacity: active ? 0.80 : 0.25,
          }}
        />
      ))}
    </div>
  );
}

/* ── Typewriter with blinking cursor ────────────────────────── */
function Typewriter({ content, onUpdate }) {
  const [shown, setShown] = useState("");
  const [done,  setDone]  = useState(false);
  useEffect(() => {
    let i = 0;
    setShown("");
    setDone(false);
    const t = setInterval(() => {
      setShown(content.slice(0, ++i));
      onUpdate?.();
      if (i >= content.length) { clearInterval(t); setDone(true); }
    }, 10);
    return () => clearInterval(t);
  }, [content, onUpdate]);
  return (
    <>
      <ReactMarkdown components={md}>{shown}</ReactMarkdown>
      {!done && (
        <span className="inline-block w-0.5 h-3.5 bg-blue-400/80 animate-pulse ml-px rounded-sm align-middle" />
      )}
    </>
  );
}

/* ── Format timestamp ────────────────────────────────────────── */
const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

/* ══════════════════════════════════════════════════════════════
   VOICE MODE
   State machine: greeting → listening → processing → speaking → listening → …
══════════════════════════════════════════════════════════════ */
function VoiceMode({ greetingRef, onSend, onExit }) {
  const [phase,    setPhase]    = useState("greeting");
  const [liveText, setLiveText] = useState("");
  const [caption,  setCaption]  = useState("");
  const [errMsg,   setErrMsg]   = useState("");

  const S = useRef({ active: true, recog: null, resumeInt: null, watchdog: null, greetDog: null, silenceTimer: null });

  const clearTimers = () => {
    clearInterval(S.current.resumeInt);
    clearTimeout(S.current.watchdog);
    clearTimeout(S.current.greetDog);
    clearTimeout(S.current.silenceTimer);
  };
  const stopRecog = () => {
    try { S.current.recog?.abort(); } catch {}
    S.current.recog = null;
  };

  /* ── Pick the best available TTS voice ── */
  const pickVoice = (utt) => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    const preferred = [
      /google uk english female/i,
      /google us english/i,
      /microsoft aria online/i,
      /microsoft jenny online/i,
      /microsoft aria/i,
      /microsoft jenny/i,
      /microsoft zira/i,
      /microsoft david/i,
      /samantha/i,
      /karen/i,
      /moira/i,
      /tessa/i,
      /google english/i,
    ];
    for (const pat of preferred) {
      const v = voices.find(vv => pat.test(vv.name));
      if (v) { utt.voice = v; return; }
    }
    /* Fallback: any English voice */
    const eng = voices.find(vv => vv.lang === "en-US") || voices.find(vv => vv.lang.startsWith("en"));
    if (eng) utt.voice = eng;
  };

  /* ── speak(text, onDone): reliable TTS with voice selection and watchdog ── */
  const speak = (text, onDone) => {
    if (!S.current.active || !text) { onDone?.(); return; }
    setPhase("speaking");
    const clean = stripMd(text);
    setCaption(clean.slice(0, 200));
    clearTimers();
    window.speechSynthesis.cancel();

    const doSpeak = () => {
      if (!S.current.active) return;
      const utt  = new SpeechSynthesisUtterance(clean);
      utt.lang   = "en-US";
      utt.rate   = 0.92;
      utt.pitch  = 1.0;
      utt.volume = 1.0;
      pickVoice(utt);

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

      /* Chrome stall fix: resume every 5 s if paused */
      S.current.resumeInt = setInterval(() => {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      }, 5000);

      /* Watchdog: 500 ms/word, min 3 s, max 30 s */
      const words = clean.split(/\s+/).length;
      S.current.watchdog = setTimeout(finish, Math.min(Math.max(words * 500, 3000), 30000));

      window.speechSynthesis.speak(utt);
    };

    /* Wait for voices to load if not yet available, then speak */
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      const handler = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handler);
        doSpeak();
      };
      window.speechSynthesis.addEventListener("voiceschanged", handler);
      /* Safety net: if voiceschanged never fires (some browsers), speak anyway after 800ms */
      setTimeout(() => {
        if (!window.speechSynthesis.speaking && S.current.active) doSpeak();
      }, 800);
    }
  };

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

  /* ── listen(): continuous recognition with silence-based auto-send ── */
  const listen = () => {
    if (!S.current.active) return;

    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) {
      setErrMsg("Voice recognition requires Chrome or Edge.");
      setPhase("error");
      return;
    }

    stopRecog();
    clearTimeout(S.current.silenceTimer);
    setPhase("listening");
    setLiveText("");

    let finalText = "";
    let interim   = "";
    let sent      = false; // prevents double-send when silenceTimer + onend both fire

    const sendText = (text) => {
      if (sent || !text.trim() || !S.current.active) return;
      sent = true;
      clearTimeout(S.current.silenceTimer);
      stopRecog();
      processText(text.trim());
    };

    const r           = new SR();
    r.lang            = "en-US";
    r.continuous      = true;
    r.interimResults  = true;
    r.maxAlternatives = 1;

    r.onresult = (ev) => {
      interim = "";
      for (const res of Array.from(ev.results)) {
        if (res.isFinal) finalText += (finalText ? " " : "") + res[0].transcript.trim();
        else interim = res[0].transcript;
      }
      setLiveText((finalText + (interim ? " " + interim : "")).trim());

      if (finalText.trim()) {
        /* Send 1.5 s after the last finalized word */
        clearTimeout(S.current.silenceTimer);
        S.current.silenceTimer = setTimeout(() => sendText(finalText), 1500);
      }
    };

    r.onerror = (ev) => {
      clearTimeout(S.current.silenceTimer);
      setLiveText("");
      if (ev.error === "not-allowed") {
        setErrMsg("Microphone access was blocked. Please allow microphone access in your browser settings and refresh.");
        setPhase("error");
      } else if (ev.error !== "aborted" && S.current.active) {
        /* no-speech / network / audio-capture — restart silently */
        setTimeout(listen, 500);
      }
    };

    r.onend = () => {
      clearTimeout(S.current.silenceTimer);
      setLiveText("");
      if (!S.current.active || sent) return; // already handled by silenceTimer
      const text = finalText.trim() || interim.trim();
      if (text) sendText(text);
      else setTimeout(listen, 400);
    };

    S.current.recog = r;
    try { r.start(); } catch (e) {
      console.warn("STT start failed:", e);
      if (S.current.active) setTimeout(listen, 700);
    }
  };

  useEffect(() => {
    const s = S.current;
    s.active = true;
    const greet = greetingRef?.current;
    if (greet && !greet.done) {
      S.current.greetDog = setTimeout(() => { if (s.active) listen(); }, 2500);
      greet.utt.onend   = () => { clearTimeout(S.current.greetDog); greet.done = true; if (s.active) listen(); };
      greet.utt.onerror = () => { clearTimeout(S.current.greetDog); greet.done = true; if (s.active) listen(); };
    } else {
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

  /* ── Phase visual config ── */
  const PC = {
    greeting:   { color: "#60a5fa", label: "Starting…",  labelCls: "text-blue-400",    pillBorder: "border-blue-500/20",    pillBg: "bg-blue-500/[0.06]"    },
    listening:  { color: "#34d399", label: "Listening…", labelCls: "text-emerald-400", pillBorder: "border-emerald-500/20", pillBg: "bg-emerald-500/[0.06]" },
    processing: { color: "#a78bfa", label: "Thinking…",  labelCls: "text-purple-400",  pillBorder: "border-purple-500/20",  pillBg: "bg-purple-500/[0.06]"  },
    speaking:   { color: "#60a5fa", label: "Speaking…",  labelCls: "text-blue-400",    pillBorder: "border-blue-500/20",    pillBg: "bg-blue-500/[0.06]"    },
    error:      { color: "#f87171", label: "Error",       labelCls: "text-red-400",     pillBorder: "border-red-500/20",     pillBg: "bg-red-500/[0.06]"     },
  };
  const pc     = PC[phase] ?? PC.greeting;
  const isWave = phase === "listening" || phase === "speaking" || phase === "greeting";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={{ background: "linear-gradient(160deg,#050913 0%,#08101e 55%,#050913 100%)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-safe pt-5 pb-3">
        <button
          onClick={handleExit}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.07] transition-all"
        >
          <ArrowLeft size={16} />
        </button>

        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${pc.pillBorder} ${pc.pillBg}`}>
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
            style={{ background: pc.color }}
          />
          <span className={`text-xs font-semibold tracking-wide ${pc.labelCls}`}>{pc.label}</span>
        </div>

        <div className="w-9" />
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-5">

        {/* Orb */}
        <div className="relative flex items-center justify-center">
          {/* Ambient glow */}
          <div
            className="absolute w-80 h-80 rounded-full blur-3xl"
            style={{ background: `${pc.color}12` }}
          />
          {/* Pulse rings */}
          {phase !== "error" && (
            <>
              <div
                className="absolute w-64 h-64 rounded-full border animate-ping"
                style={{ borderColor: `${pc.color}22`, animationDuration: "2.6s" }}
              />
              <div
                className="absolute w-52 h-52 rounded-full border animate-ping"
                style={{ borderColor: `${pc.color}30`, animationDuration: "2.6s", animationDelay: "0.9s" }}
              />
            </>
          )}
          {/* Avatar */}
          <div
            className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden border-2 shadow-2xl transition-all duration-700"
            style={{ borderColor: `${pc.color}40`, boxShadow: `0 0 60px ${pc.color}18` }}
          >
            <img src="/ai.gif" alt="AI" className="w-full h-full object-cover" draggable={false} />
            {phase === "processing" && (
              <div className="absolute inset-0 bg-[#050913]/65 flex items-center justify-center backdrop-blur-sm">
                <Loader2 size={52} className="animate-spin text-purple-300/90" />
              </div>
            )}
          </div>
        </div>

        {/* Waveform */}
        <WaveformBars active={isWave} color={pc.color} />

        {/* Transcript / caption / error */}
        <div className="w-full max-w-xs min-h-[60px] flex flex-col items-center justify-center text-center">
          {errMsg ? (
            <div className="flex flex-col items-center gap-2">
              <AlertCircle size={20} className="text-red-400" />
              <p className="text-xs text-red-400 leading-relaxed">{errMsg}</p>
            </div>
          ) : phase === "listening" && liveText ? (
            <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 max-w-[280px]">
              <p className="text-sm text-white/80 italic leading-relaxed">&ldquo;{liveText}&rdquo;</p>
            </div>
          ) : phase === "listening" ? (
            <p className="text-xs text-gray-600 animate-pulse tracking-wider">Speak now…</p>
          ) : (phase === "processing" || phase === "speaking") && caption ? (
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl px-4 py-3 max-w-[280px]">
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{caption}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom: end button */}
      <div className="flex justify-center pb-safe pb-10">
        <button
          onClick={handleExit}
          className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-red-600/[0.10] hover:bg-red-600/[0.20] border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 text-sm font-semibold transition-all active:scale-95 shadow-lg"
        >
          <PhoneOff size={16} />
          End conversation
        </button>
      </div>
    </div>
  );
}

/* ── Suggestion chips ────────────────────────────────────────── */
const SUGGESTIONS = [
  { Icon: Briefcase, label: "Career advice",   desc: "Grow professionally",   prompt: "Give me actionable career advice for a developer looking to grow professionally." },
  { Icon: Code2,     label: "Code review",     desc: "Improve my code",       prompt: "Help me review and improve a piece of code I'm working on." },
  { Icon: Target,    label: "Interview prep",  desc: "Ace technical rounds",  prompt: "Help me prepare for a technical interview with common questions and tips." },
  { Icon: Lightbulb, label: "Project ideas",   desc: "Find inspiration",      prompt: "Give me 5 creative portfolio project ideas for a developer." },
  { Icon: FileText,  label: "Cover letter",    desc: "Land the job",          prompt: "Help me write a professional cover letter for a senior developer role." },
  { Icon: BookOpen,  label: "Learn a concept", desc: "Understand anything",   prompt: "Explain async/await in JavaScript with clear, practical examples." },
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

  /* ── Activate talk mode (withGreeting must stay inside click handler for Chrome autoplay) ── */
  const activateTalkMode = useCallback((withGreeting = true) => {
    if (withGreeting) {
      try {
        window.speechSynthesis.cancel();
        const greetText = messagesRef.current.length > 0
          ? "Welcome back! What would you like to discuss?"
          : "Hey! I'm beoneofus AI. How can I help you today?";
        const utt   = new SpeechSynthesisUtterance(greetText);
        utt.lang    = "en-US";
        utt.rate    = 0.92;
        utt.pitch   = 1.0;
        greetingRef.current = { utt, done: false };
        utt.onend   = () => { if (greetingRef.current) greetingRef.current.done = true; };
        utt.onerror = () => { if (greetingRef.current) greetingRef.current.done = true; };
        window.speechSynthesis.speak(utt);
      } catch {}
    } else {
      greetingRef.current = null;
    }
    setTalkMode(true);
  }, []);

  /* ── Auto-start voice when ?talk=1 ── */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("talk") === "1") {
      setTimeout(() => activateTalkMode(false), 300);
    }
  }, [activateTalkMode]);

  /* ── API call — signal enables the stop button to work ── */
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

  /* ── Send text message ── */
  const send = async (e, override) => {
    e?.preventDefault();
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const now     = Date.now();
    const userMsg = { role: "user", content: text, time: now };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("ai_chat_messages").insert({
          user_id: session.user.id, role: "user", content: text,
        });
      }

      abortRef.current = new AbortController();
      const history = [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content }));
      const content = await callApi(history, abortRef.current.signal);

      setMessages(prev => [...prev, { role: "assistant", content, isNew: true, time: Date.now() }]);
      if (session) {
        await supabase.from("ai_chat_messages").insert({
          user_id: session.user.id, role: "assistant", content,
        });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages(prev => [...prev, {
          role:    "assistant",
          content: `**Error:** ${err.message}\n\nPlease try again.`,
          time:    Date.now(),
        }]);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  /* ── Voice send (called by VoiceMode, returns reply text) ── */
  const voiceSend = useCallback(async (text) => {
    const userMsg = { role: "user", content: text, time: Date.now() };
    const history = [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("ai_chat_messages").insert({
          user_id: session.user.id, role: "user", content: text,
        });
      }
      const content = await callApi(history);
      setMessages(prev => [...prev, { role: "assistant", content, time: Date.now() }]);
      if (session) {
        await supabase.from("ai_chat_messages").insert({
          user_id: session.user.id, role: "assistant", content,
        });
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

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div
      className="relative flex flex-col h-screen text-white overflow-hidden"
      style={{
        background: "#050913",
        backgroundImage: "radial-gradient(rgba(59,130,246,0.025) 1px, transparent 1px)",
        backgroundSize: "30px 30px",
      }}
    >
      {/* Voice overlay */}
      {talkMode && (
        <VoiceMode greetingRef={greetingRef} onSend={voiceSend} onExit={() => setTalkMode(false)} />
      )}

      {/* ══ HEADER ══ */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-5 h-[60px] border-b border-white/[0.06] bg-[#07101e]/95 backdrop-blur-xl z-10">
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
              <img src="/ai.gif" alt="AI" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-black text-white leading-none tracking-tight">beoneofus AI</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium">Online · Ready to help</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={activateTalkMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-gray-400 hover:text-blue-400 hover:bg-blue-500/[0.08] border border-transparent hover:border-blue-500/20 transition-all text-xs font-semibold"
            title="Start voice conversation"
          >
            <PhoneCall size={13} />
            <span className="hidden sm:inline">Talk</span>
          </button>
          {hasMessages && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all"
              title="Start new chat"
            >
              <RotateCcw size={10} />
              <span className="hidden sm:inline">New chat</span>
            </button>
          )}
        </div>
      </header>

      {/* ══ BODY ══ */}
      {fetching ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-blue-500" />
            <p className="text-xs text-gray-600">Loading…</p>
          </div>
        </div>

      ) : !hasMessages ? (
        /* ── Welcome screen ── */
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-center px-4 gap-7 py-8">

            {/* Orb — tap to voice */}
            <button
              onClick={activateTalkMode}
              className="relative flex items-center justify-center group focus:outline-none"
              aria-label="Start voice conversation"
            >
              <div className="absolute w-60 h-60 rounded-full border border-blue-500/[0.07] animate-ping"
                style={{ animationDuration: "3s" }} />
              <div className="absolute w-48 h-48 rounded-full border border-blue-400/[0.10] animate-ping"
                style={{ animationDuration: "3s", animationDelay: "0.8s" }} />
              <div className="absolute w-44 h-44 rounded-full bg-blue-600/[0.07] blur-3xl" />
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-blue-500/25 shadow-2xl shadow-blue-600/10 transition-all duration-500 group-hover:scale-[1.04] group-hover:border-blue-500/40 group-active:scale-[0.96]">
                <img src="/ai.gif" alt="beoneofus AI" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center border-2 border-[#050913] shadow-lg transition-all group-hover:from-blue-400 group-hover:to-indigo-500">
                <Mic size={14} className="text-white" />
              </div>
            </button>

            {/* Heading */}
            <div className="text-center space-y-2 max-w-xs">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                What can I{" "}
                <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  help with?
                </span>
              </h1>
              <p className="text-xs text-gray-600">Tap the orb to talk · or type below</p>
            </div>

            {/* Suggestion grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full max-w-[26rem]">
              {SUGGESTIONS.map(({ Icon, label, desc, prompt }, i) => (
                <button
                  key={i}
                  onClick={() => send(null, prompt)}
                  className="group flex flex-col gap-2 text-left px-3.5 py-3 rounded-xl bg-white/[0.035] hover:bg-white/[0.07] border border-white/[0.07] hover:border-blue-500/20 transition-all duration-200 active:scale-[0.97]"
                >
                  <Icon size={16} className="text-blue-400/65 group-hover:text-blue-400 transition-colors" />
                  <div>
                    <p className="text-[11px] font-bold text-gray-300 group-hover:text-white transition-colors leading-snug">{label}</p>
                    <p className="text-[10px] text-gray-600 group-hover:text-gray-500 transition-colors mt-0.5 leading-snug">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

      ) : (
        /* ── Chat messages ── */
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === "assistant" ? (
                  /* AI message */
                  <div className="group flex gap-3">
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 border border-white/[0.08] shadow-sm">
                      <img src="/ai.gif" alt="AI" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-[11px] font-black text-blue-400 tracking-wide">beoneofus AI</p>
                        {msg.time && (
                          <span className="text-[10px] text-gray-700">{fmtTime(msg.time)}</span>
                        )}
                      </div>
                      <div className="relative pl-3">
                        <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-gradient-to-b from-blue-500/70 via-indigo-500/50 to-purple-600/40" />
                        <div className="text-sm text-gray-200 leading-relaxed">
                          {msg.isNew
                            ? <Typewriter content={msg.content} onUpdate={scrollDown} />
                            : <ReactMarkdown components={md}>{msg.content}</ReactMarkdown>
                          }
                        </div>
                      </div>
                      <button
                        onClick={() => copyMsg(msg.content, i)}
                        className="mt-2 ml-3 flex items-center gap-1 text-[10px] text-gray-700 hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {copied === i
                          ? <><Check size={9} className="text-emerald-400" /> Copied</>
                          : <><Copy size={9} /> Copy</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* User message */
                  <div className="flex justify-end">
                    <div className="flex flex-col items-end gap-1 max-w-[82%] sm:max-w-[70%]">
                      <div className="bg-blue-600 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 leading-relaxed whitespace-pre-wrap shadow-lg shadow-blue-700/20">
                        {msg.content}
                      </div>
                      {msg.time && (
                        <span className="text-[10px] text-gray-700 pr-1">{fmtTime(msg.time)}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/[0.08]">
                  <img src="/ai.gif" alt="AI" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-blue-400 tracking-wide mb-2">beoneofus AI</p>
                  <div className="flex items-center gap-1.5 pl-3">
                    {[0, 160, 320].map(d => (
                      <span
                        key={d}
                        className="w-2 h-2 rounded-full bg-blue-500/55 animate-bounce"
                        style={{ animationDelay: `${d}ms` }}
                      />
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
      <div className="shrink-0 border-t border-white/[0.05] bg-[#07101e]/95 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-safe pb-4">
          <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2.5 focus-within:border-blue-500/30 focus-within:bg-white/[0.055] transition-all duration-200">

            {/* Mic button */}
            <button
              onClick={activateTalkMode}
              title="Start voice conversation"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all shrink-0 mb-0.5"
            >
              <Mic size={15} />
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
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-700 resize-none focus:outline-none disabled:opacity-40 leading-relaxed py-1"
              style={{ maxHeight: "160px", overflowY: "auto" }}
            />

            {/* Send / Stop */}
            {loading ? (
              <button
                onClick={() => abortRef.current?.abort()}
                title="Stop generating"
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-gray-300 hover:text-white transition-all shrink-0 active:scale-95 mb-0.5 border border-white/[0.08]"
              >
                <Square size={11} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!input.trim()}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-20 disabled:cursor-not-allowed text-white transition-all shrink-0 shadow-md shadow-blue-600/25 active:scale-95 mb-0.5"
              >
                <Send size={13} />
              </button>
            )}
          </div>

          <p className="text-center text-[10px] text-gray-800 mt-2 select-none">
            beoneofus AI · Verify important information independently
          </p>
        </div>
      </div>
    </div>
  );
}
