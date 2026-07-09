"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Star, BookOpen, Plus, X, Crown, Lock, Loader2,
  Sparkles, Clock, BadgeCheck, Edit2, Check, ChevronRight,
  GraduationCap, Handshake, Search, ShieldCheck, AlertTriangle,
  Camera, FileText, Award,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { useLanguage } from "../../../lib/i18n";

function availLabel(v, t) {
  if (!v) return "";
  return t(`mentorship.avail.${String(v).toLowerCase()}`);
}

const SKILL_SUGGESTIONS = [
  "React", "Next.js", "TypeScript", "Node.js", "Python", "Go", "Rust",
  "System Design", "Career Guidance", "Code Review", "Interview Prep",
  "AWS", "Docker", "PostgreSQL", "GraphQL", "AI/ML", "Web3", "DevOps",
  "Leadership", "Agile", "Mobile", "Flutter", "Swift", "Kotlin",
];

const AVAILABILITY_OPTIONS = ["Flexible", "Weekdays", "Weekends", "Evenings", "Mornings"];

const inputCls =
  "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all";

function SkillTag({ skill, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
      {skill}
      {onRemove && (
        <button type="button" onClick={() => onRemove(skill)} className="hover:text-red-500 transition-colors">
          <X size={10} />
        </button>
      )}
    </span>
  );
}

function MentorCard({ mentor, isPremium, onBook, isMe, onEdit }) {
  const { t } = useLanguage();
  const profile = mentor.profiles;
  const initials = profile?.username?.[0]?.toUpperCase() || "M";
  const rating = mentor.rating ? Number(mentor.rating).toFixed(1) : "5.0";

  return (
    <div className="group relative bg-white dark:bg-gray-900/80 border border-gray-100 dark:border-white/[0.06] rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col">

      {/* Gradient header band */}
      <div className="relative h-24 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 shrink-0">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "16px 16px" }}
        />
        <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl" />

        {/* Rating pill */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-1 bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-1">
          <Star size={11} className="text-amber-300" fill="currentColor" strokeWidth={0} />
          <span className="text-[11px] font-black text-white">{rating}</span>
        </div>

        {/* "You" label */}
        {isMe && (
          <div className="absolute top-3.5 left-3.5 text-[9px] font-black text-white/90 bg-white/20 border border-white/25 px-2 py-1 rounded-lg uppercase tracking-[1.5px]">
            {t("mentorship.your_card")}
          </div>
        )}
      </div>

      {/* Avatar — overlaps the header */}
      <div className="px-5 -mt-8 mb-1 flex items-end gap-3">
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br from-indigo-400 to-violet-500 border-[3px] border-white dark:border-gray-900 shadow-lg flex items-center justify-center">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <span className="text-white font-black text-2xl leading-none">{initials}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mb-2 pb-0.5">
          {profile?.is_verified && (
            <BadgeCheck size={17} className="text-blue-500" fill="currentColor" stroke="white" />
          )}
          {profile?.is_premium && (
            <Crown size={15} className="text-amber-500" fill="currentColor" strokeWidth={1} />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-6 flex flex-col gap-4 flex-1">

        {/* Name & headline */}
        <div>
          <p className="text-base font-black text-gray-900 dark:text-white leading-tight">
            @{profile?.username}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {mentor.headline || t("mentorship.available_for_mentorship")}
          </p>
        </div>

        {/* Bio */}
        {mentor.bio && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 border-l-2 border-indigo-200 dark:border-indigo-500/30 pl-3">
            {mentor.bio}
          </p>
        )}

        {/* Skills */}
        {mentor.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mentor.skills.slice(0, 5).map(skill => (
              <SkillTag key={skill} skill={skill} />
            ))}
            {mentor.skills.length > 5 && (
              <span className="text-[10px] font-bold px-2.5 py-1 bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 rounded-lg border border-gray-200 dark:border-white/[0.06]">
                {t("mentorship.more_count",{n:mentor.skills.length - 5})}
              </span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-4 pt-1 border-t border-gray-100 dark:border-white/[0.05]">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
              <BookOpen size={11} className="text-indigo-500" />
            </div>
            {t("mentorship.sessions_count",{n:mentor.session_count || 0})}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Clock size={11} className="text-indigo-500" />
            </div>
            {mentor.availability ? availLabel(mentor.availability, t) : t("mentorship.avail.flexible")}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-1">
          {isMe ? (
            <button
              onClick={onEdit}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.08] text-gray-700 dark:text-gray-300 text-sm font-bold rounded-2xl transition-all"
            >
              <Edit2 size={13} /> {t("mentorship.edit_profile_card")}
            </button>
          ) : isPremium ? (
            <button
              onClick={() => onBook(mentor)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
            >
              <Sparkles size={13} /> {t("mentorship.book_a_session")}
            </button>
          ) : (
            <Link
              href="/dash/premium"
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-bold rounded-2xl transition-all border border-amber-200 dark:border-amber-500/25"
            >
              <Crown size={13} /> {t("mentorship.unlock_premium")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function MentorForm({ initial, onSave, onCancel, saving }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    headline: initial?.headline || "",
    bio: initial?.bio || "",
    skills: initial?.skills || [],
    availability: initial?.availability || "Flexible",
  });
  const [skillInput, setSkillInput] = useState("");

  const addSkill = (s) => {
    const trimmed = s.trim();
    if (trimmed && !form.skills.includes(trimmed) && form.skills.length < 15) {
      setForm(f => ({ ...f, skills: [...f.skills, trimmed] }));
    }
    setSkillInput("");
  };

  const removeSkill = (s) => setForm(f => ({ ...f, skills: f.skills.filter(x => x !== s) }));

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
      <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 text-sm">
        <Handshake size={16} className="text-indigo-500" />
        {initial ? t("mentorship.edit_mentor_profile") : t("mentorship.become_mentor")}
      </h3>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("mentorship.mentor_headline")}</label>
        <input
          value={form.headline}
          onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
          placeholder={t("mentorship.headline_ph")}
          className={inputCls}
          maxLength={80}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("mentorship.mentor_bio")}</label>
        <textarea
          value={form.bio}
          onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          placeholder={t("mentorship.bio_ph")}
          rows={3}
          className={inputCls + " resize-none"}
          maxLength={300}
        />
        <p className="text-[10px] text-gray-400 text-right">{t("mentorship.bio_count",{n:form.bio.length})}</p>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("mentorship.mentor_skills")}</label>
        <div className="flex flex-wrap gap-1.5 min-h-[32px]">
          {form.skills.map(s => <SkillTag key={s} skill={s} onRemove={removeSkill} />)}
        </div>
        <div className="flex gap-2">
          <input
            value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
            placeholder={t("mentorship.skill_ph")}
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => addSkill(skillInput)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shrink-0"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SKILL_SUGGESTIONS.filter(s => !form.skills.includes(s)).slice(0, 8).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addSkill(s)}
              className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/30"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("mentorship.mentor_availability")}</label>
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setForm(f => ({ ...f, availability: opt }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                form.availability === opt
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300"
              }`}
            >
              {availLabel(opt, t)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl transition-all"
        >
          {t("mentorship.cancel")}
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || form.skills.length === 0 || !form.headline.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {saving ? t("mentorship.saving") : t("mentorship.save_profile")}
        </button>
      </div>
    </div>
  );
}

export default function MentorshipContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myMentor, setMyMentor] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMentors = useCallback(async () => {
    const { data } = await supabase
      .from("mentors")
      .select("*, profiles:user_id(id, username, avatar_url, is_verified, is_premium)")
      .eq("is_active", true)
      .order("session_count", { ascending: false });
    if (data) setMentors(data);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: prof } = await supabase.from("profiles").select("id, username, avatar_url, is_verified, is_premium, is_admin, role, status, bio").eq("id", session.user.id).single();
        if (prof) setProfile(prof);
        const { data: me } = await supabase.from("mentors").select("*").eq("user_id", session.user.id).maybeSingle();
        if (me) setMyMentor(me);
      }
      await fetchMentors();
      setLoading(false);
    };
    init();

    const ch = supabase.channel("mentors-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "mentors" }, fetchMentors)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchMentors]);

  const isVerified       = !!profile?.is_verified;
  const isPremium        = !!(profile?.is_premium || profile?.is_admin || profile?.role === "founder");
  const profileComplete  = !!(profile?.avatar_url && (profile?.status || profile?.bio));
  /* Must be verified OR premium/admin to become a mentor */
  const canBeMentor      = isVerified || isPremium;

  const handleSave = async (form) => {
    if (!user) return;
    setSaving(true);
    try {
      if (myMentor) {
        const { error } = await supabase.from("mentors").update(form).eq("user_id", user.id);
        if (error) throw error;
        setMyMentor({ ...myMentor, ...form });
        showToast(t("mentorship.toast_updated"));
      } else {
        const { data, error } = await supabase
          .from("mentors")
          .insert({ user_id: user.id, ...form })
          .select("*")
          .single();
        if (error) throw error;
        setMyMentor(data);
        showToast(t("mentorship.toast_now_mentor"));
      }
      setShowForm(false);
      fetchMentors();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleBook = async (mentor) => {
    if (!user || !isPremium) return;
    setBooking(mentor.user_id);
    try {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .insert({
          user_id: user.id,
          coach_id: mentor.user_id,
          topic: "Mentorship",
          notes: `Requested mentorship with @${mentor.profiles?.username}`,
          status: "accepted",
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("notifications").insert({
        receiver_id: mentor.user_id,
        actor_id: user.id,
        type: "message",
        content: `booked a mentorship session with you. /dash/coaching`,
      });

      await supabase.from("mentors")
        .update({ session_count: (mentor.session_count || 0) + 1 })
        .eq("user_id", mentor.user_id);

      showToast(t("mentorship.toast_booked"));
      setTimeout(() => router.push("/dash/coaching"), 1200);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBooking(null);
    }
  };

  const tierWeight = (m) => {
    if (m.profiles?.is_premium || m.profiles?.is_admin) return 3;
    if (m.profiles?.is_verified) return 2;
    return 1;
  };

  const filtered = mentors
    .filter(m => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        m.profiles?.username?.toLowerCase().includes(q) ||
        m.headline?.toLowerCase().includes(q) ||
        m.bio?.toLowerCase().includes(q) ||
        m.skills?.some(s => s.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => tierWeight(b) - tierWeight(a) || (b.session_count || 0) - (a.session_count || 0));

  if (loading) return (
    <div className="flex items-center justify-center h-52">
      <Loader2 size={24} className="animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-bold text-white animate-in fade-in slide-in-from-top-2 duration-200 ${toast.type === "error" ? "bg-red-600" : "bg-indigo-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-200 dark:border-indigo-800/50 bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 dark:from-indigo-950/20 dark:via-violet-950/20 dark:to-transparent p-8">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-200/30 dark:bg-indigo-500/10" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-violet-200/30 dark:bg-violet-500/10" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <Handshake size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t("mentorship.title")}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-0.5">
                {t("mentorship.mentors_available",{count:mentors.length})}
              </p>
            </div>
          </div>
          {user && !myMentor && !showForm && (
            canBeMentor && profileComplete ? (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 active:scale-95 shrink-0"
              >
                <Plus size={15} /> {t("mentorship.become_mentor")}
              </button>
            ) : canBeMentor && !profileComplete ? (
              <Link href="/dash/profile"
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm font-bold rounded-xl transition-all shrink-0">
                <Camera size={14} /> {t("mentorship.complete_profile_first")}
              </Link>
            ) : null
          )}
        </div>
      </div>

      {/* Privilege info */}
      {user && !canBeMentor && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl space-y-3">
          <p className="text-sm font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <Award size={16} /> {t("mentorship.how_to_title")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Camera, label: t("mentorship.check_photo"), done: !!profile?.avatar_url },
              { icon: FileText, label: t("mentorship.check_bio"), done: !!(profile?.status || profile?.bio) },
              { icon: ShieldCheck, label: t("mentorship.check_verified"), done: isVerified || isPremium },
            ].map(({ icon: Icon, label, done }) => (
              <div key={label} className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold ${done ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400"}`}>
                {done ? <Check size={14} className="text-emerald-500 shrink-0" /> : <Icon size={14} className="shrink-0 opacity-50" />}
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Become a mentor form */}
      {showForm && (
        <MentorForm
          initial={null}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* My mentor profile — edit inline */}
      {myMentor && showForm === "edit" && (
        <MentorForm
          initial={myMentor}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* Premium notice for non-premium */}
      {user && !isPremium && mentors.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
          <Crown size={18} className="text-amber-500 shrink-0" fill="currentColor" strokeWidth={1} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{t("mentorship.premium_can_book")}</p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">{t("mentorship.premium_can_book_desc")}</p>
          </div>
          <Link href="/dash/premium" className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold rounded-xl transition-all">
            {t("mentorship.upgrade")}
          </Link>
        </div>
      )}

      {/* Search */}
      {mentors.length > 0 && (
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("mentorship.search_ph")}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-sm"
          />
        </div>
      )}

      {/* Mentors grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filtered.map(mentor => (
            <div key={mentor.id} className="relative">
              {booking === mentor.user_id && (
                <div className="absolute inset-0 z-10 bg-white/70 dark:bg-gray-900/70 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Loader2 size={20} className="animate-spin text-indigo-600" />
                </div>
              )}
              <MentorCard
                mentor={mentor}
                isPremium={isPremium}
                isMe={user?.id === mentor.user_id}
                onBook={handleBook}
                onEdit={() => setShowForm("edit")}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl bg-gray-50 dark:bg-gray-800/30 text-center gap-3">
          <div className="w-16 h-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-center">
            <Users size={28} className="text-gray-400" />
          </div>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {search ? t("mentorship.no_mentors_search") : t("mentorship.no_mentors")}
          </p>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
            {search
              ? t("mentorship.search_hint")
              : t("mentorship.empty_hint")}
          </p>
          {user && canBeMentor && !myMentor && !search && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
            >
              <Plus size={15} /> {t("mentorship.be_first_mentor")}
            </button>
          )}
        </div>
      )}

      {/* Link to Coaching */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-100 dark:bg-violet-500/10 rounded-xl flex items-center justify-center">
            <GraduationCap size={16} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{t("mentorship.coaching_title")}</p>
            <p className="text-xs text-gray-500">{t("mentorship.coaching_desc")}</p>
          </div>
        </div>
        <Link href="/dash/coaching" className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
          {t("mentorship.open")} <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
