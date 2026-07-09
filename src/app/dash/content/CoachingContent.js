"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  GraduationCap, Crown, Lock, CheckCircle2, Clock, MessageSquare,
  Send, Loader2, X, Play, Sparkles, ChevronRight, Star, Calendar,
  RefreshCw, Timer, Check,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { useLanguage } from "../../../lib/i18n";
import Link from "next/link";

const TOPICS = [
  { id: "code_review",    label: "Code Review",     labelKey: "coaching.topics.code_review",    descKey: "coaching.topic_descs.code_review" },
  { id: "career",         label: "Career Guidance",  labelKey: "coaching.topics.career",         descKey: "coaching.topic_descs.career" },
  { id: "system_design",  label: "System Design",    labelKey: "coaching.topics.system_design",  descKey: "coaching.topic_descs.system_design" },
  { id: "project_help",   label: "Project Help",     labelKey: "coaching.topics.project_help",   descKey: "coaching.topic_descs.project_help" },
  { id: "interview_prep", label: "Interview Prep",   labelKey: "coaching.topics.interview_prep", descKey: "coaching.topic_descs.interview_prep" },
  { id: "mentorship",     label: "Mentorship",       labelKey: "coaching.topics.mentorship",     descKey: "coaching.topic_descs.mentorship" },
  { id: "custom",         label: "Custom Topic",     labelKey: "coaching.topics.custom",         descKey: "coaching.topic_descs.custom" },
];

const STATUS_META = {
  pending:   { labelKey: "coaching.status_pending",   color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-500/10",       icon: Clock       },
  accepted:  { labelKey: "coaching.status_accepted",  color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-500/10",         icon: CheckCircle2 },
  active:    { labelKey: "coaching.status_active",    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10",   icon: Play        },
  completed: { labelKey: "coaching.status_completed", color: "text-gray-500 dark:text-gray-400",       bg: "bg-gray-100 dark:bg-gray-800",           icon: CheckCircle2 },
  cancelled: { labelKey: "coaching.status_cancelled", color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-500/10",           icon: X           },
};

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const m = STATUS_META[status] || STATUS_META.pending;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${m.color} ${m.bg}`}>
      <Icon size={11} className={status === "pending" ? "animate-pulse" : status === "active" ? "animate-pulse" : ""} />
      {t(m.labelKey)}
    </span>
  );
}

function ChatMessages({ messages, userId, messagesEndRef }) {
  const { t } = useLanguage();
  return (
    <div className="h-72 overflow-y-auto p-4 space-y-3 custom-scrollbar">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-600">{t("coaching.chat_placeholder")}</p>
        </div>
      )}
      {messages.map(msg => {
        const isMe = msg.sender_id === userId;
        const initials = msg.profiles?.username?.[0]?.toUpperCase() || "?";
        return (
          <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isMe ? "bg-violet-500" : "bg-gray-400 dark:bg-gray-600"}`}>
              {initials}
            </div>
            <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
              isMe
                ? "bg-violet-600 text-white rounded-tr-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

function ChatInput({ value, onChange, onSend, sending }) {
  const { t } = useLanguage();
  return (
    <div className="flex gap-2 p-3 border-t border-gray-100 dark:border-gray-800">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        placeholder={t("coaching.type_message")}
        className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
      />
      <button
        onClick={onSend}
        disabled={!value.trim() || sending}
        className="p-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl transition-all active:scale-95"
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
      </button>
    </div>
  );
}

function formatDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return null;
  const ms = new Date(endedAt) - new Date(startedAt);
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(null)}
          onClick={() => !readonly && onChange?.(star)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"} ${
            (hovered ?? value) >= star ? "text-amber-400" : "text-gray-300 dark:text-gray-700"
          }`}
        >
          <Star size={14} fill="currentColor" strokeWidth={0} />
        </button>
      ))}
    </div>
  );
}

function CoachAvatar({ coach, size = "sm" }) {
  if (!coach) return null;
  const initials = coach.username?.[0]?.toUpperCase() || "C";
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${dim} bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function SessionCard({ session, onAccept, onSelect, isSelected }) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left bg-white dark:bg-gray-900 border rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm transition-all ${
        isSelected ? "border-violet-400 dark:border-violet-500" : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 bg-violet-500 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0">
          {session.profiles?.username?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">@{session.profiles?.username || "user"}</p>
          <p className="text-xs text-gray-500 truncate">{session.topic}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={session.status} />
        {session.status === "pending" && onAccept && (
          <button
            onClick={e => { e.stopPropagation(); onAccept(); }}
            className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-all"
          >
            {t("coaching.accept")}
          </button>
        )}
        <ChevronRight size={14} className="text-gray-400" />
      </div>
    </button>
  );
}

export default function CoachingContent() {
  const { t } = useLanguage();
  const [profile, setProfile]           = useState(null);
  const [user, setUser]                 = useState(null);
  const [sessions, setSessions]         = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [topic, setTopic]               = useState("code_review");
  const [notes, setNotes]               = useState("");
  const [scheduledAt, setScheduledAt]   = useState("");
  const [requesting, setRequesting]     = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending]           = useState(false);
  const [ratingState, setRatingState]   = useState({});
  const [mentors, setMentors]           = useState([]);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const messagesEndRef                  = useRef(null);

  useEffect(() => {
    if (topic !== "mentorship") return;
    supabase
      .from("mentors")
      .select("*, profiles:user_id(id, username, avatar_url)")
      .eq("is_active", true)
      .then(({ data }) => { if (data) setMentors(data); });
  }, [topic]);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUser(session.user);

    const [profileRes, sessionsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("coaching_sessions")
        .select("*, profiles:user_id(id, username, avatar_url), coach:coach_id(id, username, avatar_url)")
        .order("created_at", { ascending: false }),
    ]);

    if (profileRes.data) setProfile(profileRes.data);

    if (sessionsRes.data) {
      setSessions(sessionsRes.data);
      const isAdm = profileRes.data?.is_admin;
      const open = sessionsRes.data.find(s =>
        (isAdm || s.user_id === session.user.id) &&
        ["pending", "accepted", "active"].includes(s.status)
      );
      setActiveSession(prev => prev ? (sessionsRes.data.find(s => s.id === prev.id) || open || null) : (open || null));
    }
    setLoading(false);
  }, []);

  useEffect(() => { (async () => { await fetchData(); })(); }, [fetchData]);

  const fetchMessages = useCallback(async (sessionId) => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("coaching_messages")
      .select("*, profiles:sender_id(id, username, avatar_url)")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  }, []);

  useEffect(() => {
    const sid = activeSession?.id;
    (async () => {
      if (sid) await fetchMessages(sid);
      else setMessages([]);
    })();
  }, [activeSession?.id, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Realtime: session changes */
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("coaching-sessions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "coaching_sessions" }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user, fetchData]);

  /* Realtime: messages for active session */
  useEffect(() => {
    const sid = activeSession?.id;
    if (!sid) return;
    const ch = supabase
      .channel(`coaching-msgs-${sid}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "coaching_messages",
        filter: `session_id=eq.${sid}`,
      }, async (payload) => {
        const { data } = await supabase
          .from("coaching_messages")
          .select("*, profiles:sender_id(id, username, avatar_url)")
          .eq("id", payload.new.id)
          .single();
        if (data) setMessages(prev => [...prev.filter(m => m.id !== data.id), data]);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [activeSession?.id]);

  const handleRequest = async () => {
    if (!user || requesting) return;
    setRequesting(true);
    try {
      const topicLabel = TOPICS.find(t => t.id === topic)?.label || topic;
      const insertPayload = {
        user_id: user.id,
        topic: topicLabel,
        notes: notes.trim() || null,
        status: "pending",
        scheduled_at: scheduledAt || null,
        ...(selectedMentor ? { coach_id: selectedMentor.user_id } : {}),
      };
      const { data, error } = await supabase
        .from("coaching_sessions")
        .insert(insertPayload)
        .select("*, profiles:user_id(id, username, avatar_url)")
        .single();
      if (error) throw error;
      setSessions(prev => [data, ...prev]);
      setActiveSession(data);
      setNotes("");
      setScheduledAt("");
      setSelectedMentor(null);
      if (selectedMentor) {
        await supabase.from("notifications").insert({
          receiver_id: selectedMentor.user_id,
          actor_id: user.id,
          type: "message",
          content: `booked a mentorship session with you. /dash/coaching`,
        });
      }
      const { data: { session: authSession } } = await supabase.auth.getSession();
      await fetch("/api/coaching/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authSession ? { Authorization: `Bearer ${authSession.access_token}` } : {}),
        },
        body: JSON.stringify({ topic: topicLabel }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setRequesting(false);
    }
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !activeSession || sending) return;
    const content = messageInput.trim();
    setMessageInput("");
    setSending(true);
    try {
      await supabase.from("coaching_messages").insert({
        session_id: activeSession.id,
        sender_id: user.id,
        content,
      });
    } catch {
      setMessageInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleAdminAction = async (sessionId, action) => {
    const updates = {
      accept: { status: "accepted", coach_id: user.id, updated_at: new Date().toISOString() },
      start:  { status: "active", started_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      end:    { status: "completed", ended_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    };
    await supabase.from("coaching_sessions").update(updates[action]).eq("id", sessionId);
  };

  const handleRateSession = async (sessionId, rating) => {
    setRatingState(prev => ({ ...prev, [sessionId]: { submitting: true, value: rating } }));
    try {
      await supabase.from("coaching_sessions").update({ rating }).eq("id", sessionId);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, rating } : s));
    } finally {
      setRatingState(prev => ({ ...prev, [sessionId]: { submitting: false, value: rating } }));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={22} className="animate-spin text-violet-500" />
    </div>
  );

  const isPremium = profile?.is_premium || profile?.is_admin;
  const isAdmin   = profile?.is_admin;

  /* ── Premium gate ──────────────────────────────────────────────────────── */
  if (!isPremium) return (
    <div className="max-w-lg mx-auto flex flex-col items-center justify-center h-80 text-center gap-4 animate-in fade-in duration-300">
      <div className="w-16 h-16 bg-violet-50 dark:bg-violet-500/10 rounded-2xl flex items-center justify-center">
        <Lock size={24} className="text-violet-500" />
      </div>
      <div>
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-1">{t("coaching.premium_feature")}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
          {t("coaching.premium_gate_desc")}
        </p>
      </div>
      <Link href="/dash/premium" className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-amber-500/25">
        <Crown size={14} fill="currentColor" strokeWidth={1.5} stroke="white" />
        {t("coaching.upgrade")}
      </Link>
    </div>
  );

  /* ── Admin view ────────────────────────────────────────────────────────── */
  if (isAdmin) {
    const pending   = sessions.filter(s => s.status === "pending");
    const open      = sessions.filter(s => ["accepted", "active"].includes(s.status));
    const past      = sessions.filter(s => ["completed", "cancelled"].includes(s.status)).slice(0, 5);

    return (
      <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap size={22} className="text-violet-500" /> {t("coaching.admin_title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("coaching.admin_subtitle")}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t("coaching.stat_pending"),   value: pending.length,                           color: "text-amber-600 dark:text-amber-400"   },
            { label: t("coaching.stat_active"),    value: open.length,                              color: "text-emerald-600 dark:text-emerald-400" },
            { label: t("coaching.stat_completed"), value: sessions.filter(s => s.status === "completed").length, color: "text-gray-500 dark:text-gray-400" },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center shadow-sm">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Session list */}
          <div className="space-y-3">
            {pending.length > 0 && (
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t("coaching.pending_count",{n:pending.length})}</p>
                <div className="space-y-2">
                  {pending.map(s => (
                    <SessionCard key={s.id} session={s} isSelected={activeSession?.id === s.id}
                      onAccept={() => handleAdminAction(s.id, "accept")}
                      onSelect={() => setActiveSession(s)} />
                  ))}
                </div>
              </div>
            )}
            {open.length > 0 && (
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t("coaching.active_count",{n:open.length})}</p>
                <div className="space-y-2">
                  {open.map(s => (
                    <SessionCard key={s.id} session={s} isSelected={activeSession?.id === s.id}
                      onSelect={() => setActiveSession(s)} />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t("coaching.recent_past")}</p>
                <div className="space-y-2">
                  {past.map(s => (
                    <SessionCard key={s.id} session={s} isSelected={activeSession?.id === s.id}
                      onSelect={() => setActiveSession(s)} />
                  ))}
                </div>
              </div>
            )}
            {sessions.length === 0 && (
              <div className="text-center py-10 text-gray-400 dark:text-gray-600">
                <GraduationCap size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">{t("coaching.no_requests")}</p>
              </div>
            )}
          </div>

          {/* Chat panel */}
          {activeSession ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">@{activeSession.profiles?.username}</p>
                  <p className="text-xs text-gray-500">{activeSession.topic}</p>
                  {activeSession.scheduled_at && (
                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Calendar size={9} />
                      {new Date(activeSession.scheduled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={activeSession.status} />
                  {activeSession.status === "accepted" && (
                    <button onClick={() => handleAdminAction(activeSession.id, "start")}
                      className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-all">
                      {t("coaching.start")}
                    </button>
                  )}
                  {activeSession.status === "active" && (
                    <button onClick={() => handleAdminAction(activeSession.id, "end")}
                      className="px-2.5 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg transition-all">
                      {t("coaching.end")}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <ChatMessages messages={messages} userId={user.id} messagesEndRef={messagesEndRef} />
              </div>
              {["accepted", "active"].includes(activeSession.status) && (
                <ChatInput value={messageInput} onChange={setMessageInput} onSend={handleSend} sending={sending} />
              )}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex items-center justify-center h-64">
              <div className="text-center text-gray-400 dark:text-gray-600">
                <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">{t("coaching.select_session")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── User view ─────────────────────────────────────────────────────────── */
  const mySession  = sessions.find(s => s.user_id === user.id && ["pending", "accepted", "active"].includes(s.status));
  const pastMine   = sessions.filter(s => s.user_id === user.id && ["completed", "cancelled"].includes(s.status));
  const showChat   = mySession && ["accepted", "active"].includes(mySession.status);

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-500/20 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-500/10 dark:via-violet-500/5 dark:to-transparent p-6">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-violet-200/40 dark:bg-violet-500/10" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/25">
            <GraduationCap size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">{t("coaching.coaching_1on1")}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t("coaching.coaching_1on1_desc")}</p>
          </div>
        </div>
      </div>

      {/* Current session status */}
      {mySession && (
        <div className={`rounded-2xl border p-5 shadow-sm ${
          mySession.status === "pending"  ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" :
          mySession.status === "accepted" ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" :
          "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
        }`}>
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <StatusBadge status={mySession.status} />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{mySession.topic}</p>
              {mySession.notes && <p className="text-xs text-gray-500 mt-0.5">{mySession.notes}</p>}
            </div>
            {mySession.status === "pending" && <Loader2 size={15} className="animate-spin text-amber-500 shrink-0 mt-1" />}
          </div>
          {mySession.coach && (mySession.status === "accepted" || mySession.status === "active") && (
            <div className="flex items-center gap-2 mt-2">
              <CoachAvatar coach={mySession.coach} size="sm" />
              <div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{t("coaching.coach_prefix")} @{mySession.coach.username}</p>
              </div>
            </div>
          )}
          {mySession.scheduled_at && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
              <Calendar size={10} />
              {t("coaching.preferred_prefix")} {new Date(mySession.scheduled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {mySession.status === "pending"  && t("coaching.msg_pending")}
            {mySession.status === "accepted" && t("coaching.msg_accepted")}
            {mySession.status === "active"   && t("coaching.msg_active")}
          </p>
        </div>
      )}

      {/* Live chat */}
      {showChat && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{t("coaching.private_channel")}</p>
            </div>
            {mySession.coach && (
              <div className="flex items-center gap-1.5">
                <CoachAvatar coach={mySession.coach} size="sm" />
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">@{mySession.coach.username}</span>
              </div>
            )}
          </div>
          <ChatMessages messages={messages} userId={user.id} messagesEndRef={messagesEndRef} />
          <ChatInput value={messageInput} onChange={setMessageInput} onSend={handleSend} sending={sending} />
        </div>
      )}

      {/* Request form */}
      {!mySession && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <h3 className="font-black text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <Sparkles size={15} className="text-violet-500" />
            {t("coaching.book_session")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
            {t("coaching.form_desc")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {TOPICS.map(tp => (
              <button
                key={tp.id}
                onClick={() => setTopic(tp.id)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  topic === tp.id
                    ? "border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <p className="text-sm font-bold text-gray-900 dark:text-white">{t(tp.labelKey)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{t(tp.descKey)}</p>
              </button>
            ))}
          </div>

          {/* Mentor picker — only shown when Mentorship topic is selected */}
          {topic === "mentorship" && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <GraduationCap size={11} /> {t("coaching.choose_mentor")} <span className="font-normal opacity-60">{t("coaching.optional")}</span>
              </p>
              {mentors.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  {t("coaching.no_mentors_registered")}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {mentors.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMentor(selectedMentor?.user_id === m.user_id ? null : m)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                        selectedMentor?.user_id === m.user_id
                          ? "border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {m.profiles?.username?.[0]?.toUpperCase() || "M"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">@{m.profiles?.username}</p>
                        <p className="text-[10px] text-gray-400 truncate">{m.skills?.slice(0, 2).join(", ")}</p>
                      </div>
                      {selectedMentor?.user_id === m.user_id && (
                        <Check size={13} className="text-violet-600 dark:text-violet-400 shrink-0 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedMentor && (
                <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
                  {t("coaching.selected_prefix")} @{selectedMentor.profiles?.username}
                </p>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Calendar size={11} /> {t("coaching.preferred_time")} <span className="font-normal opacity-60">{t("coaching.optional")}</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t("coaching.notes_placeholder")}
            rows={3}
            className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 mb-4"
          />

          <button
            onClick={handleRequest}
            disabled={requesting}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 active:scale-[0.98] text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-violet-500/25 text-sm"
          >
            {requesting ? <Loader2 size={16} className="animate-spin" /> : <GraduationCap size={16} />}
            {requesting ? t("coaching.requesting") : t("coaching.request_session")}
          </button>
        </div>
      )}

      {/* Past sessions */}
      {pastMine.length > 0 && (
        <div>
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">{t("coaching.past_sessions")}</p>
          <div className="space-y-2">
            {pastMine.map(s => {
              const duration = formatDuration(s.started_at, s.ended_at);
              const rs = ratingState[s.id];
              const currentRating = rs?.value ?? s.rating ?? 0;
              return (
                <div key={s.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{s.topic}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-500">{new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        {duration && (
                          <span className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1">
                            <Timer size={10} /> {duration}
                          </span>
                        )}
                        {s.coach && (
                          <span className="text-xs text-gray-400 dark:text-gray-600">
                            {t("coaching.coach_prefix")} @{s.coach.username}
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  {s.status === "completed" && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      {currentRating > 0 ? (
                        <div className="flex items-center gap-2">
                          <StarRating value={currentRating} readonly />
                          <span className="text-xs text-gray-400">{t("coaching.rating_out_of",{n:currentRating})}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-gray-400 dark:text-gray-600">{t("coaching.rate_session")}</p>
                          <StarRating
                            value={0}
                            onChange={rating => handleRateSession(s.id, rating)}
                          />
                          {rs?.submitting && <Loader2 size={12} className="animate-spin text-violet-500" />}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
